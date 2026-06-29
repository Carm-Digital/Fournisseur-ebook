import Stripe from "stripe";
import { getStripeSecretKey, USE_SUPABASE } from "./config.js";
import { recordPurchases } from "./supabase.js";

function escapeStripeSearchTerm(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function syncPurchasesFromStripe(userId, email, req) {
  if (!USE_SUPABASE || !userId || !email) return [];

  const { key, error } = getStripeSecretKey(req);
  if (error || !key) return [];

  const stripe = new Stripe(key);
  const escaped = escapeStripeSearchTerm(email.toLowerCase().trim());
  const allEbookIds = new Set();
  const processedSessions = new Set();

  const queries = [
    `metadata['user_email']:'${escaped}' AND payment_status:'paid'`,
    `customer_details.email:'${escaped}' AND payment_status:'paid'`,
  ];

  for (const query of queries) {
    let page;

    try {
      do {
        const result = await stripe.checkout.sessions.search({
          query,
          limit: 100,
          page: page || undefined,
        });

        for (const session of result.data) {
          if (processedSessions.has(session.id)) continue;
          processedSessions.add(session.id);

          const ebookIds = (session.metadata?.ebook_ids || "")
            .split(",")
            .filter(Boolean);

          if (ebookIds.length) {
            await recordPurchases(userId, ebookIds, session.id);
            ebookIds.forEach((id) => allEbookIds.add(id));
          }
        }

        page = result.has_more ? result.next_page : null;
      } while (page);
    } catch (searchError) {
      console.error("[stripe-sync] search failed:", searchError.message);
    }
  }

  return [...allEbookIds];
}
