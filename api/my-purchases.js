import { verifyAccessToken } from "../lib/supabase.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(req, res);

  const token = String(req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const user = await verifyAccessToken(token);

  if (!user) {
    return sendJson(req, res, 401, { error: "Non authentifié" });
  }

  const client = (await import("../lib/supabase.js")).getSupabaseAdmin();
  const { data, error } = await client
    .from("purchases")
    .select("ebook_id")
    .eq("user_id", user.id);

  if (error) {
    return sendJson(req, res, 500, { error: error.message });
  }

  return sendJson(req, res, 200, {
    ebookIds: (data || []).map((row) => row.ebook_id),
  });
}

export default withApi(handler);
