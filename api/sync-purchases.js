import { syncPurchasesFromStripe } from "../lib/stripe-sync.js";
import { getUserPurchaseIds, verifyAccessToken } from "../lib/supabase.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(req, res);

  const token = String(req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const user = await verifyAccessToken(token);

  if (!user) {
    return sendJson(req, res, 401, { error: "Non authentifié" });
  }

  const email = String(user.email || "").toLowerCase().trim();

  try {
    await syncPurchasesFromStripe(user.id, email, req);
    const ebookIds = await getUserPurchaseIds(user.id);

    return sendJson(req, res, 200, { ebookIds, synced: true });
  } catch (error) {
    const ebookIds = await getUserPurchaseIds(user.id);
    return sendJson(req, res, 200, {
      ebookIds,
      synced: false,
      warning: error.message || "Synchronisation Stripe partielle.",
    });
  }
}

export default withApi(handler);
