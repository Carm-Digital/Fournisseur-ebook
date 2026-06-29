import { verifyCheckoutSession } from "../lib/stripe-checkout.js";
import { getStripeSecretKey } from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(req, res);

  const { error: secretError } = getStripeSecretKey(req);
  if (secretError) {
    return sendJson(req, res, 500, { ok: false, error: secretError });
  }

  const sessionId = String(req.query.session_id || "").trim();
  if (!sessionId) {
    return sendJson(req, res, 400, { ok: false, error: "Session manquante" });
  }

  try {
    const data = await verifyCheckoutSession(sessionId, req);
    return sendJson(req, res, 200, data);
  } catch (error) {
    return sendJson(req, res, error.status || 400, { ok: false, error: error.message });
  }
}

export default withApi(handler);
