const CartStore = {
  CART_KEY: "lbc_cart",

  getCart() {
    try {
      return JSON.parse(localStorage.getItem(this.CART_KEY)) || [];
    } catch {
      return [];
    }
  },

  saveCart(ids) {
    localStorage.setItem(this.CART_KEY, JSON.stringify(ids));
    document.dispatchEvent(new CustomEvent("cart-updated"));
  },

  getEbook(id) {
    if (typeof EBOOKS === "undefined") return null;
    return EBOOKS.find((e) => e.id === id) || null;
  },

  canAdd(ebookId) {
    const ebook = this.getEbook(ebookId);
    if (!ebook || ebook.price === 0) return false;
    if (UserStore.hasPurchased(ebookId)) return false;
    if (this.getCart().includes(ebookId)) return false;
    return true;
  },

  add(ebookId) {
    if (!this.canAdd(ebookId)) {
      return { ok: false, error: "Cet ebook ne peut pas être ajouté au panier." };
    }
    const cart = this.getCart();
    cart.push(ebookId);
    this.saveCart(cart);
    return { ok: true };
  },

  remove(ebookId) {
    const cart = this.getCart().filter((id) => id !== ebookId);
    this.saveCart(cart);
    return { ok: true };
  },

  clear() {
    this.saveCart([]);
  },

  count() {
    return this.getCart().length;
  },

  has(ebookId) {
    return this.getCart().includes(ebookId);
  },

  getItems() {
    return this.getCart()
      .map((id) => this.getEbook(id))
      .filter(Boolean);
  },

  getTotal() {
    return this.getItems().reduce((sum, ebook) => sum + ebook.price, 0);
  },

  cleanPurchased() {
    const cart = this.getCart().filter((id) => !UserStore.hasPurchased(id));
    if (cart.length !== this.getCart().length) {
      this.saveCart(cart);
    }
  },

  checkout() {
    return { ok: false, error: "stripe", message: "Utilisez le paiement Stripe depuis le panier." };
  },
};
