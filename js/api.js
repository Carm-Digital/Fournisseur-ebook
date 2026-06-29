const ApiClient = {
  _base: null,

  isLocalHost() {
    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
  },

  sanitizeBase(url) {
    if (!url) return window.location.origin;

    const cleaned = String(url).replace(/\/$/, "");

    if (
      (cleaned.includes("localhost") || cleaned.includes("127.0.0.1")) &&
      !this.isLocalHost()
    ) {
      console.warn(
        "[ApiClient] apiBase localhost ignoré en production, utilisation de",
        window.location.origin
      );
      return window.location.origin;
    }

    if (cleaned.startsWith("http://") && window.location.protocol === "https:") {
      console.warn(
        "[ApiClient] apiBase HTTP ignoré sur une page HTTPS, utilisation de",
        window.location.origin
      );
      return window.location.origin;
    }

    return cleaned;
  },

  getBase() {
    if (this._base) return this.sanitizeBase(this._base);

    const meta = document.querySelector('meta[name="api-base"]')?.content?.trim();
    if (meta) {
      this._base = this.sanitizeBase(meta);
      return this._base;
    }

    this._base = window.location.origin;
    return this._base;
  },

  setBase(url) {
    if (!url) return;
    this._base = this.sanitizeBase(url);
    console.log("[ApiClient] apiBase =", this._base);
  },

  buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${this.getBase()}${normalized}`;
  },

  async parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (contentType.includes("application/json") || /^[\[{]/.test(text.trim())) {
      try {
        return { data: JSON.parse(text), text };
      } catch {
        throw new Error(`Réponse JSON invalide : ${text.slice(0, 200)}`);
      }
    }

    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 180);

    if (response.status === 404) {
      throw new Error(
        `Route API introuvable (${response.url}). Vérifiez le déploiement des routes /api sur Vercel.`
      );
    }

    if (response.status >= 500) {
      throw new Error(`Erreur serveur (${response.status}) : ${snippet || "réponse vide"}`);
    }

    throw new Error(`Réponse non-JSON (${response.status}) : ${snippet || "réponse vide"}`);
  },

  async fetchJson(path, options = {}) {
    const url = this.buildUrl(path);
    console.log("[ApiClient] fetch", options.method || "GET", url);

    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
        },
      });
    } catch (error) {
      console.error("[ApiClient] échec réseau", url, error);
      throw new Error(
        `Impossible de contacter l'API (${url}). ${error.message || "Failed to fetch"}`
      );
    }

    console.log("[ApiClient] réponse", response.status, url);

    const { data } = await this.parseResponse(response);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Erreur HTTP ${response.status}`);
    }

    return data;
  },
};

window.ApiClient = ApiClient;
