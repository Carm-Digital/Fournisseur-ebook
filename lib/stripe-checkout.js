import Stripe from "stripe";
import { buildLineItems } from "../lib/catalog.js";
import { getDomain, STRIPE_SECRET_KEY, USE_SUPABASE } from "../lib/config.js";
import { recordPurchases } from "../lib/supabase.js";

export async function createCheckoutSession(body) {
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

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const domain = getDomain();

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

export async function verifyCheckoutSession(sessionId) {
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    const error = new Error("Paiement non confirmé");
    error.status = 400;
    throw error;
  }

  const ebookIds = (session.metadata?.ebook_ids || "")
    .split(",")
    .filter(Boolean);
  const email = session.metadata?.user_email || "";
  const userId = session.metadata?.user_id || "";

  if (USE_SUPABASE && userId) {
    await recordPurchases(userId, ebookIds, sessionId);
  }

  return { ok: true, ebookIds, email, userId };
}
