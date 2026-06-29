import {
  getStripeMode,
  getStripePublishableKey,
  getStripeSecretKey,
  USE_SUPABASE,
} from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(req, res);

  const { key: secretKey, error: secretError } = getStripeSecretKey(req);
  const { error: publishableError } = getStripePublishableKey(req);

  return sendJson(req, res, 200, {
    ok: true,
    supabase: USE_SUPABASE,
    stripe: Boolean(secretKey && !secretError),
    stripeMode: getStripeMode(req),
    stripeKeyError: secretError || null,
    stripePublishableKeyError: publishableError || null,
  });
}

export default withApi(handler);
