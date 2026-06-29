import {
  getApiBase,
  PROTECT_DOWNLOADS,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  USE_SUPABASE,
} from "../lib/config.js";
import { methodNotAllowed, sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(req, res);

  return sendJson(req, res, 200, {
    useSupabase: USE_SUPABASE,
    supabaseUrl: USE_SUPABASE ? SUPABASE_URL : "",
    supabaseAnonKey: USE_SUPABASE ? SUPABASE_ANON_KEY : "",
    protectDownloads: PROTECT_DOWNLOADS,
    apiBase: getApiBase(req),
  });
}

export default withApi(handler);
