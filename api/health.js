import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, USE_SUPABASE } from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(req, res);

  return sendJson(req, res, 200, {
    ok: true,
    supabase: USE_SUPABASE,
    stripe: Boolean(STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.startsWith("sk_test_VOTRE")),
  });
}

export default withApi(handler);
