function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge || typeof CartStore === "undefined") return;

  CartStore.cleanPurchased?.();
  const count = CartStore.count();
  badge.textContent = count;
  badge.hidden = count === 0;
}

function injectCartLink() {
  const nav = document.querySelector(".header .nav");
  if (!nav || nav.querySelector(".nav__cart")) return;

  const link = document.createElement("a");
  link.href = "panier.html";
  link.className = "nav__link nav__cart";
  link.innerHTML = `Panier <span class="nav__cart-count" id="cart-count" hidden>0</span>`;
  nav.appendChild(link);
  updateCartBadge();
}

document.addEventListener("cart-updated", updateCartBadge);
injectCartLink();
