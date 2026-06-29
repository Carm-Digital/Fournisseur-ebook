const ApiClient = {
  _base: null,

  getBase() {
    if (this._base) return this._base;

    const meta = document.querySelector('meta[name="api-base"]')?.content?.trim();
    if (meta) {
      this._base = meta.replace(/\/$/, "");
      return this._base;
    }

    this._base = window.location.origin;
    return this._base;
  },

  setBase(url) {
    if (url) this._base = String(url).replace(/\/$/, "");
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
        `Route API introuvable (${response.url}). ` +
          "Vérifiez que le backend Flask tourne (python server/app.py) ou que les fonctions /api sont déployées sur Vercel."
      );
    }

    if (response.status >= 500) {
      throw new Error(`Erreur serveur (${response.status}) : ${snippet || "réponse vide"}`);
    }

    throw new Error(`Réponse non-JSON (${response.status}) : ${snippet || "réponse vide"}`);
  },

  async fetchJson(path, options = {}) {
    const response = await fetch(this.buildUrl(path), options);
    const { data } = await this.parseResponse(response);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Erreur HTTP ${response.status}`);
    }

    return data;
  },
};

window.ApiClient = ApiClient;
