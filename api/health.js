import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, USE_SUPABASE } from "../lib/config.js";
import { methodNotAllowed, sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  return sendJson(res, 200, {
    ok: true,
    supabase: USE_SUPABASE,
    stripe: Boolean(STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.startsWith("sk_test_VOTRE")),
  });
}
