import { createCheckoutSession } from "../lib/stripe-checkout.js";
import { STRIPE_SECRET_KEY } from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(req, res);

  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.startsWith("sk_test_VOTRE")) {
    return sendJson(req, res, 500, {
      error: "Clé Stripe non configurée. Ajoutez STRIPE_SECRET_KEY dans Vercel → Production.",
    });
  }

  try {
    const url = await createCheckoutSession(req.body || {}, req);
    return sendJson(req, res, 200, { url });
  } catch (error) {
    return sendJson(req, res, error.status || 400, { error: error.message });
  }
}

export default withApi(handler);
