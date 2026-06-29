import { verifyCheckoutSession } from "../lib/stripe-checkout.js";
import { STRIPE_SECRET_KEY } from "../lib/config.js";
import { methodNotAllowed, sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  if (!STRIPE_SECRET_KEY) {
    return sendJson(res, 500, { ok: false, error: "Stripe non configuré" });
  }

  const sessionId = String(req.query.session_id || "").trim();
  if (!sessionId) {
    return sendJson(res, 400, { ok: false, error: "Session manquante" });
  }

  try {
    const data = await verifyCheckoutSession(sessionId);
    return sendJson(res, 200, data);
  } catch (error) {
    return sendJson(res, error.status || 400, { ok: false, error: error.message });
  }
}
