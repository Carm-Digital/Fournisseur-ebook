import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  USE_SUPABASE,
} from "./config.js";
import { getCatalog } from "./catalog.js";

let adminClient = null;

export function getSupabaseAdmin() {
  if (!USE_SUPABASE) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return adminClient;
}

export async function verifyAccessToken(token) {
  if (!token || !USE_SUPABASE) return null;
  try {
    const client = getSupabaseAdmin();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function resolveUserIdByEmail(email) {
  if (!USE_SUPABASE || !email) return null;

  const client = getSupabaseAdmin();
  const normalized = email.toLowerCase().trim();
  const { data } = await client
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();

  return data?.id || null;
}

export async function getUserPurchaseIds(userId) {
  if (!USE_SUPABASE || !userId) return [];

  const client = getSupabaseAdmin();
  const { data } = await client.from("purchases").select("ebook_id").eq("user_id", userId);

  return (data || []).map((row) => row.ebook_id);
}

export async function userHasPurchase(userId, ebookId) {
  if (!USE_SUPABASE) return false;
  const client = getSupabaseAdmin();
  const { data } = await client
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("ebook_id", ebookId)
    .limit(1);

  return Boolean(data?.length);
}

export async function recordPurchases(userId, ebookIds, stripeSessionId = null) {
  if (!USE_SUPABASE || !userId) return;
  const CATALOG = getCatalog();
  const client = getSupabaseAdmin();
  const rows = ebookIds
    .filter((ebookId) => CATALOG[ebookId])
    .map((ebookId) => ({
      user_id: userId,
      ebook_id: ebookId,
      stripe_session_id: stripeSessionId,
    }));

  if (rows.length) {
    await client.from("purchases").upsert(rows, { onConflict: "user_id,ebook_id" });
  }
}
