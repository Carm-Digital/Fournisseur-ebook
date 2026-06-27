const UserStore = {
  USERS_KEY: "lbc_users",
  SESSION_KEY: "lbc_session",

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

  register(name, email, password) {
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

  login(email, password) {
    const users = this.getUsers();
    const key = email.toLowerCase();
    const user = users[key];

    if (!user || user.password !== password) {
      return { ok: false, error: "E-mail ou mot de passe incorrect." };
    }

    this.setSession(key);
    return { ok: true, user };
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  setSession(email) {
    localStorage.setItem(this.SESSION_KEY, email.toLowerCase());
  },

  getCurrentUser() {
    const email = localStorage.getItem(this.SESSION_KEY);
    if (!email) return null;
    return this.getUsers()[email] || null;
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  hasPurchased(ebookId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.purchases.includes(ebookId);
  },

  purchase(ebookId) {
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

  formatPrice(price) {
    if (price === 0) return "Gratuit";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  },
};
