import { createCheckoutSession } from "../lib/stripe-checkout.js";
import { STRIPE_SECRET_KEY } from "../lib/config.js";
import { methodNotAllowed, sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.startsWith("sk_test_VOTRE")) {
    return sendJson(res, 500, {
      error: "Clé Stripe non configurée. Ajoutez STRIPE_SECRET_KEY dans les variables Vercel.",
    });
  }

  try {
    const url = await createCheckoutSession(req.body || {});
    return sendJson(res, 200, { url });
  } catch (error) {
    return sendJson(res, error.status || 400, { error: error.message });
  }
}
