function isLocalhostUrl(url) {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return url.includes("localhost") || url.includes("127.0.0.1");
  }
}

export function getRequestOrigin(req) {
  if (!req?.headers) return "";

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return "";

  const hostname = String(host).split(":")[0];
  if (hostname === "localhost" || hostname === "127.0.0.1") return "";

  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function getDomain(req) {
  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin) return requestOrigin;

  const envDomain = process.env.DOMAIN?.replace(/\/$/, "");
  if (envDomain && !isLocalhostUrl(envDomain)) return envDomain;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return envDomain || "http://localhost:4242";
}

export function getApiBase(req) {
  const requestOrigin = getRequestOrigin(req);
  const envApiBase = process.env.API_BASE?.replace(/\/$/, "");

  if (requestOrigin) {
    if (!envApiBase || isLocalhostUrl(envApiBase)) return requestOrigin;
    return envApiBase;
  }

  if (envApiBase && !isLocalhostUrl(envApiBase)) return envApiBase;

  return getDomain(req);
}

export const USE_SUPABASE = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const PROTECT_DOWNLOADS = process.env.PROTECT_DOWNLOADS !== "false";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Valide STRIPE_SECRET_KEY — refuse pk_ (clé publique) et clés invalides. */
export function getStripeSecretKey() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();

  if (!key || key.startsWith("sk_test_VOTRE")) {
    return {
      key: "",
      error:
        "STRIPE_SECRET_KEY manquante. Ajoutez la clé secrète (sk_live_... ou sk_test_...) dans Vercel → Settings → Environment Variables → Production.",
    };
  }

  if (key.startsWith("pk_")) {
    return {
      key: "",
      error:
        "STRIPE_SECRET_KEY contient une clé publique (pk_). Remplacez-la par la clé secrète (sk_...) : Stripe Dashboard → Developers → API keys → Secret key.",
    };
  }

  if (!key.startsWith("sk_")) {
    return {
      key: "",
      error: "STRIPE_SECRET_KEY invalide : elle doit commencer par sk_ (clé secrète Stripe).",
    };
  }

  return { key, error: null };
}

export const STRIPE_SECRET_KEY = getStripeSecretKey().key;
export const STRIPE_SECRET_KEY_ERROR = getStripeSecretKey().error;
