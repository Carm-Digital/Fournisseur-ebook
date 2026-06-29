import { createCheckoutSession } from "../lib/stripe-checkout.js";
import { STRIPE_SECRET_KEY_ERROR } from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(req, res);

  if (STRIPE_SECRET_KEY_ERROR) {
    return sendJson(req, res, 500, { error: STRIPE_SECRET_KEY_ERROR });
  }

  try {
    const url = await createCheckoutSession(req.body || {}, req);
    return sendJson(req, res, 200, { url });
  } catch (error) {
    return sendJson(req, res, error.status || 400, { error: error.message });
  }
}

export default withApi(handler);
