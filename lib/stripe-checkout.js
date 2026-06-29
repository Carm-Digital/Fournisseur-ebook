import { buildLineItems } from "../lib/catalog.js";
import { getDomain, getStripeSecretKey, USE_SUPABASE } from "../lib/config.js";
import { recordPurchases, resolveUserIdByEmail } from "../lib/supabase.js";
import Stripe from "stripe";

export async function createCheckoutSession(body, req) {
  const ebookIds = body?.ebookIds;
  const email = String(body?.email || "")
    .toLowerCase()
    .trim();
  const userId = String(body?.userId || "").trim();

  if (!email || !Array.isArray(ebookIds) || !ebookIds.length) {
    const error = new Error("Requête invalide");
    error.status = 400;
    throw error;
  }

  if (USE_SUPABASE && !userId) {
    const error = new Error("Identifiant utilisateur manquant.");
    error.status = 400;
    throw error;
  }

  const { lineItems, validIds } = buildLineItems(ebookIds);

  if (!lineItems.length) {
    const error = new Error("Aucun ebook payable dans le panier");
    error.status = 400;
    throw error;
  }

  const metadata = {
    ebook_ids: validIds.join(","),
    user_email: email,
  };
  if (userId) metadata.user_id = userId;

  const { key: stripeSecretKey, error: stripeKeyError } = getStripeSecretKey(req);
  if (stripeKeyError) {
    const error = new Error(stripeKeyError);
    error.status = 500;
    throw error;
  }

  const stripe = new Stripe(stripeSecretKey);
  const domain = getDomain(req);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email,
      success_url: `${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/panier.html?cancel=1`,
      metadata,
    });

    return session.url;
  } catch (err) {
    const error = new Error(err.message || "Impossible de créer la session Stripe.");
    error.status = 400;
    throw error;
  }
}

export async function verifyCheckoutSession(sessionId, req, authenticatedUserId = null) {
  const { key: stripeSecretKey, error: stripeKeyError } = getStripeSecretKey(req);
  if (stripeKeyError) {
    const error = new Error(stripeKeyError);
    error.status = 500;
    throw error;
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    const error = new Error("Paiement non confirmé");
    error.status = 400;
    throw error;
  }

  const ebookIds = (session.metadata?.ebook_ids || "")
    .split(",")
    .filter(Boolean);
  const sessionEmail = String(
    session.metadata?.user_email || session.customer_details?.email || session.customer_email || ""
  )
    .toLowerCase()
    .trim();
  let userId = session.metadata?.user_id || "";

  if (USE_SUPABASE) {
    if (authenticatedUserId) {
      userId = authenticatedUserId;
    } else if (sessionEmail) {
      userId = (await resolveUserIdByEmail(sessionEmail)) || userId;
    }

    if (userId) {
      await recordPurchases(userId, ebookIds, sessionId);
    }
  }

  return { ok: true, ebookIds, email: sessionEmail, userId };
}
