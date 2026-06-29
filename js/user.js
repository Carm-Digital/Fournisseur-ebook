const UserStore = {
  USERS_KEY: "lbc_users",
  SESSION_KEY: "lbc_session",

  _initPromise: null,
  _useSupabase: false,
  _supabase: null,
  _session: null,
  _profile: null,
  _purchases: new Set(),
  _protectDownloads: false,
  _stripePublishableKey: "",
  _stripeMode: "test",
  _stripePublishableKeyError: null,

  async init() {
    if (!this._initPromise) {
      this._initPromise = this._doInit();
    }
    return this._initPromise;
  },

  async _doInit() {
    try {
      const config = await ApiClient.fetchJson("/api/public-config");
      if (config.apiBase) ApiClient.setBase(config.apiBase);
      this._protectDownloads = Boolean(config.protectDownloads);
      this._stripePublishableKey = config.stripePublishableKey || "";
      this._stripeMode = config.stripeMode || "test";
      this._stripePublishableKeyError = config.stripePublishableKeyError || null;

      if (this._stripePublishableKey) {
        console.log("[Stripe] mode =", this._stripeMode, "pk =", `${this._stripePublishableKey.slice(0, 12)}…`);
      }

      if (config.useSupabase && config.supabaseUrl && config.supabaseAnonKey) {
        await this._loadSupabaseLib();
        this._useSupabase = true;
        this._supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        const { data } = await this._supabase.auth.getSession();
        if (data.session) {
          await this._applySupabaseSession(data.session);
        }
        this._supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            this._applySupabaseSession(session);
          } else {
            this._clearSupabaseSession();
          }
        });
      }
    } catch {
      this._useSupabase = false;
    }

    document.dispatchEvent(new Event("user-ready"));
  },

  _loadSupabaseLib() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Impossible de charger Supabase."));
      document.head.appendChild(script);
    });
  },

  async _applySupabaseSession(session) {
    this._session = session;
    const metaName = session.user.user_metadata?.name;
    this._profile = {
      name: metaName || session.user.email?.split("@")[0] || "Utilisateur",
      email: session.user.email?.toLowerCase() || "",
    };
    await this.refreshPurchases();
    window.updateNavAuth?.();
  },

  _clearSupabaseSession() {
    this._session = null;
    this._profile = null;
    this._purchases = new Set();
    window.updateNavAuth?.();
  },

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || {};
    } catch {
      return {};
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  async register(name, email, password) {
    if (this._useSupabase) {
      const { data, error } = await this._supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { name: name.trim() } },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.session) {
        await this._applySupabaseSession(data.session);
      } else {
        return {
          ok: true,
          message: "Compte créé. Vérifiez votre e-mail pour confirmer l'inscription.",
        };
      }

      return { ok: true };
    }

    const users = this.getUsers();
    const key = email.toLowerCase();

    if (users[key]) {
      return { ok: false, error: "Un compte existe déjà avec cet e-mail." };
    }

    users[key] = {
      name,
      email: key,
      password,
      purchases: [],
      createdAt: Date.now(),
    };

    this.saveUsers(users);
    this.setSession(key);
    return { ok: true };
  },

  async login(email, password) {
    if (this._useSupabase) {
      const { data, error } = await this._supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return { ok: false, error: "E-mail ou mot de passe incorrect." };
      }

      await this._applySupabaseSession(data.session);
      return { ok: true, user: this.getCurrentUser() };
    }

    const users = this.getUsers();
    const key = email.toLowerCase();
    const user = users[key];

    if (!user || user.password !== password) {
      return { ok: false, error: "E-mail ou mot de passe incorrect." };
    }

    this.setSession(key);
    return { ok: true, user };
  },

  async logout() {
    if (this._useSupabase && this._supabase) {
      await this._supabase.auth.signOut();
      this._clearSupabaseSession();
      return;
    }
    localStorage.removeItem(this.SESSION_KEY);
  },

  setSession(email) {
    localStorage.setItem(this.SESSION_KEY, email.toLowerCase());
  },

  getCurrentUser() {
    if (this._useSupabase && this._profile) {
      return this._profile;
    }

    const email = localStorage.getItem(this.SESSION_KEY);
    if (!email) return null;
    return this.getUsers()[email] || null;
  },

  getUserId() {
    return this._session?.user?.id || null;
  },

  isLoggedIn() {
    if (this._useSupabase) {
      return Boolean(this._session?.user);
    }
    return Boolean(this.getCurrentUser());
  },

  async getAccessToken() {
    if (!this._useSupabase || !this._supabase) return null;
    await this.init();

    const { data: sessionData } = await this._supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      return sessionData.session.access_token;
    }

    const { data: refreshed, error } = await this._supabase.auth.refreshSession();
    if (error || !refreshed.session?.access_token) {
      return null;
    }

    await this._applySupabaseSession(refreshed.session);
    return refreshed.session.access_token;
  },

  hasPurchased(ebookId) {
    if (this._useSupabase) {
      return this._purchases.has(ebookId);
    }

    const user = this.getCurrentUser();
    if (!user) return false;
    return user.purchases.includes(ebookId);
  },

  async refreshPurchases() {
    if (!this._useSupabase || !this._session) {
      return;
    }

    const token = await this.getAccessToken();
    if (!token) return;

    try {
      const data = await ApiClient.fetchJson("/api/my-purchases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      this._purchases = new Set(data.ebookIds || []);
    } catch {
      return;
    }
  },

  purchase(ebookId) {
    if (this._useSupabase) {
      this._purchases.add(ebookId);
      return { ok: true };
    }

    const email = localStorage.getItem(this.SESSION_KEY);
    if (!email) return { ok: false, error: "Connectez-vous pour acheter." };

    const users = this.getUsers();
    const user = users[email];
    if (!user) return { ok: false, error: "Session invalide." };

    if (!user.purchases.includes(ebookId)) {
      user.purchases.push(ebookId);
      users[email] = user;
      this.saveUsers(users);
    }

    return { ok: true };
  },

  getDownloadUrl(ebookId) {
    if (this._protectDownloads || this._useSupabase) {
      return `/api/download/${encodeURIComponent(ebookId)}`;
    }
    return null;
  },

  async downloadEbook(ebookId) {
    await this.init();
    await this.refreshPurchases();

    const url = this.getDownloadUrl(ebookId);
    if (!url) return false;

    const token = await this.getAccessToken();
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `connexion.html?from=${encodeURIComponent(returnTo)}`;
      return true;
    }

    try {
      const response = await fetch(ApiClient.buildUrl(url), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        try {
          const { data } = await ApiClient.parseResponse(response);
          alert(data.error || "Téléchargement impossible.");
        } catch (error) {
          alert(error.message || "Téléchargement impossible.");
        }
        return true;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `${ebookId}.zip`;

      if (navigator.canShare && navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        try {
          const file = new File([blob], filename, { type: "application/zip" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: filename });
            return true;
          }
        } catch (shareError) {
          if (shareError?.name === "AbortError") return true;
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      return true;
    } catch (error) {
      alert(error.message || "Téléchargement impossible.");
      return true;
    }
  },

  usesSupabase() {
    return this._useSupabase;
  },

  getStripePublishableKey() {
    return this._stripePublishableKey;
  },

  getStripeMode() {
    return this._stripeMode;
  },

  getStripePublishableKeyError() {
    return this._stripePublishableKeyError;
  },

  assertStripeReady() {
    if (this._stripePublishableKeyError) {
      throw new Error(this._stripePublishableKeyError);
    }

    const isProduction =
      this._stripeMode === "live" ||
      (!["localhost", "127.0.0.1"].includes(window.location.hostname) &&
        window.location.protocol === "https:");

    if (isProduction) {
      if (!this._stripePublishableKey) {
        throw new Error(
          "STRIPE_PUBLISHABLE_KEY manquante. Ajoutez pk_live_... dans Vercel → Production."
        );
      }
      if (!this._stripePublishableKey.startsWith("pk_live_")) {
        throw new Error(
          "Clé publique Stripe live requise (pk_live_...). Une clé pk_test_ est configurée en production."
        );
      }
    }
  },

  formatPrice(price) {
    if (price === 0) return "Gratuit";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  },
};

UserStore.init();
