function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge || typeof CartStore === "undefined") return;

  CartStore.cleanPurchased?.();
  const count = CartStore.count();
  badge.textContent = count;
  badge.hidden = count === 0;
}

function injectCartLink() {
  const nav = document.querySelector(".header .nav, .landing-nav .nav");
  if (!nav || nav.querySelector(".nav__cart")) return;

  const li = document.createElement("li");
  li.innerHTML = `<a href="panier.html" class="nav__link nav__cart">Panier <span class="nav__cart-count" id="cart-count" hidden>0</span></a>`;
  nav.appendChild(li);
  updateCartBadge();
}

window.injectCartLink = injectCartLink;

document.addEventListener("cart-updated", updateCartBadge);
injectCartLink();
if (typeof window.updateNavAuth === "function") {
  window.updateNavAuth();
}
