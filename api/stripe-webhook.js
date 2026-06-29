import Stripe from "stripe";
import { recordPurchases, resolveUserIdByEmail } from "../lib/supabase.js";
import { getStripeSecretKey, STRIPE_WEBHOOK_SECRET, USE_SUPABASE } from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(req, res);

  if (!STRIPE_WEBHOOK_SECRET) {
    return sendJson(req, res, 500, { error: "Webhook non configuré" });
  }

  const { key: stripeSecretKey, error: stripeKeyError } = getStripeSecretKey(req);
  if (stripeKeyError) {
    return sendJson(req, res, 500, { error: stripeKeyError });
  }

  const payload = await readRawBody(req);
  const sigHeader = req.headers["stripe-signature"] || "";

  try {
    const stripe = new Stripe(stripeSecretKey);
    const event = stripe.webhooks.constructEvent(payload, sigHeader, STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const ebookIds = (session.metadata?.ebook_ids || "")
          .split(",")
          .filter(Boolean);
        const sessionEmail = String(
          session.metadata?.user_email || session.customer_details?.email || session.customer_email || ""
        )
          .toLowerCase()
          .trim();
        let userId = session.metadata?.user_id || "";

        if (USE_SUPABASE && sessionEmail) {
          userId = (await resolveUserIdByEmail(sessionEmail)) || userId;
        }

        await recordPurchases(userId, ebookIds, session.id);
      }
    }

    return sendJson(req, res, 200, { received: true });
  } catch (error) {
    const message = error.message || "Webhook invalide";
    return sendJson(req, res, 400, { error: message });
  }
}

export default withApi(handler);
