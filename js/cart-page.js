const cartList = document.getElementById("cart-list");
const cartEmpty = document.getElementById("cart-empty");
const cartSummary = document.getElementById("cart-summary");
const cartSubtotal = document.getElementById("cart-subtotal");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("cart-checkout");
const checkoutModal = document.getElementById("checkout-modal");
const checkoutConfirmBtn = document.getElementById("checkout-confirm");

const LOCKED_PREVIEW_SRC = "assets/ebooks/placeholder.svg";

function renderCart() {
  if (!cartList || typeof CartStore === "undefined") return;

  CartStore.cleanPurchased();
  const items = CartStore.getItems();

  cartList.innerHTML = "";

  if (items.length === 0) {
    cartEmpty.hidden = false;
    cartSummary.hidden = true;
    return;
  }

  cartEmpty.hidden = true;
  cartSummary.hidden = false;

  items.forEach((ebook) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item__cover cart-item__cover--locked">
        <img src="${LOCKED_PREVIEW_SRC}" alt="" loading="lazy" draggable="false" class="cart-item__img--locked">
        <span class="cart-item__lock" aria-hidden="true"><i class="bi bi-lock-fill"></i></span>
      </div>
      <div class="cart-item__info">
        <h2 class="cart-item__title">${ebook.title}</h2>
        <p class="cart-item__suppliers">${ebook.suppliers?.toLocaleString("fr-FR") || 0} fournisseurs</p>
      </div>
      <p class="cart-item__price">${UserStore.formatPrice(ebook.price)}</p>
      <button type="button" class="cart-item__remove" data-remove="${ebook.id}" aria-label="Retirer du panier">×</button>
    `;

    row.querySelector("[data-remove]")?.addEventListener("click", () => {
      CartStore.remove(ebook.id);
      renderCart();
    });

    cartList.appendChild(row);
  });

  const total = CartStore.getTotal();
  const totalLabel = UserStore.formatPrice(total);
  if (cartSubtotal) cartSubtotal.textContent = totalLabel;
  if (cartTotal) cartTotal.textContent = totalLabel;
}

function showCancelNotice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("cancel") === "1") {
    alert("Paiement annulé. Votre panier a été conservé.");
    window.history.replaceState({}, "", "panier.html");
  }
}

checkoutBtn?.addEventListener("click", () => {
  if (!UserStore.isLoggedIn()) {
    window.location.href = "inscription.html?from=panier.html";
    return;
  }

  const items = CartStore.getItems();
  if (items.length === 0) return;

  if (checkoutModal) {
    checkoutModal.querySelector("[data-checkout-count]").textContent = items.length;
    checkoutModal.querySelector("[data-checkout-total]").textContent = UserStore.formatPrice(CartStore.getTotal());
    checkoutModal.hidden = false;
  }
});

checkoutModal?.querySelector("[data-checkout-cancel]")?.addEventListener("click", () => {
  checkoutModal.hidden = true;
});

checkoutModal?.querySelector(".pay-modal__backdrop")?.addEventListener("click", () => {
  checkoutModal.hidden = true;
});

checkoutConfirmBtn?.addEventListener("click", async () => {
  const user = UserStore.getCurrentUser();
  const ebookIds = CartStore.getCart();

  if (!user || ebookIds.length === 0) return;

  checkoutConfirmBtn.disabled = true;
  checkoutConfirmBtn.textContent = "Redirection Stripe…";

  try {
    await UserStore.init();
    await startStripeCheckout(ebookIds, user.email, UserStore.getUserId());
  } catch (error) {
    console.error("[Stripe] erreur checkout", error);
    alert(error.message);
    checkoutConfirmBtn.disabled = false;
    checkoutConfirmBtn.textContent = "Payer avec Stripe";
    checkoutModal.hidden = true;
  }
});

showCancelNotice();
UserStore.init().then(renderCart);
