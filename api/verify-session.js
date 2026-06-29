import { verifyCheckoutSession } from "../lib/stripe-checkout.js";
import { STRIPE_SECRET_KEY } from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(req, res);

  if (!STRIPE_SECRET_KEY) {
    return sendJson(req, res, 500, { ok: false, error: "Stripe non configuré" });
  }

  const sessionId = String(req.query.session_id || "").trim();
  if (!sessionId) {
    return sendJson(req, res, 400, { ok: false, error: "Session manquante" });
  }

  try {
    const data = await verifyCheckoutSession(sessionId);
    return sendJson(req, res, 200, data);
  } catch (error) {
    return sendJson(req, res, error.status || 400, { ok: false, error: error.message });
  }
}

export default withApi(handler);
