const grid = document.getElementById("ebooks-grid");
const empty = document.getElementById("ebooks-empty");
const userBar = document.getElementById("ebooks-user");

function isEbookFree(ebook) {
  return ebook.price === 0;
}

function isEbookUnlocked(ebook) {
  return isEbookFree(ebook) || UserStore.hasPurchased(ebook.id);
}

function formatSuppliers(count) {
  if (count == null) return "";
  const label = count <= 1 ? "fournisseur" : "fournisseurs";
  return `${count.toLocaleString("fr-FR")} ${label}`;
}

function updateUserBar() {
  if (!userBar) return;
  const user = UserStore.getCurrentUser();

  if (user) {
    userBar.innerHTML = `
      <span class="ebooks__user-text">Connecté : <strong>${user.name}</strong></span>
      <button type="button" class="ebooks__logout" id="logout-btn">Déconnexion</button>
    `;
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      UserStore.logout();
      renderEbooks();
    });
  } else {
    userBar.innerHTML = `
      <p class="ebooks__user-text">
        <a href="inscription.html?from=ebook.html" class="ebooks__user-link">Inscrivez-vous</a>
        pour acheter et débloquer les ebooks.
      </p>
    `;
  }
}

function handleAddToCart(ebookId) {
  const result = CartStore.add(ebookId);
  if (result.ok) {
    renderEbooks();
  } else {
    alert(result.error);
  }
}

function renderEbooks() {
  if (!grid || typeof EBOOKS === "undefined") return;

  CartStore.cleanPurchased();

  const totalEl = document.getElementById("ebooks-total");
  if (totalEl && typeof EBOOKS_TOTAL_SUPPLIERS !== "undefined") {
    totalEl.textContent = `${EBOOKS_TOTAL_SUPPLIERS.toLocaleString("fr-FR")} fournisseurs au total`;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("achat") === "ok") {
    const notice = document.getElementById("ebooks-notice");
    if (notice) {
      notice.hidden = false;
      notice.textContent = "Merci ! Vos ebooks ont été débloqués.";
    }
    window.history.replaceState({}, "", "ebook.html");
  }

  updateUserBar();
  grid.innerHTML = "";

  if (EBOOKS.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  EBOOKS.forEach((ebook) => {
    const unlocked = isEbookUnlocked(ebook);
    const free = isEbookFree(ebook);
    const inCart = CartStore.has(ebook.id);
    const priceLabel = UserStore.formatPrice(ebook.price);
    const card = document.createElement("article");
    card.className = `ebook-card${unlocked ? " ebook-card--unlocked" : " ebook-card--locked"}${free ? " ebook-card--free" : ""}`;

    const coverSrc = ebook.cover || "assets/ebooks/placeholder.svg";
    const suppliersLabel = formatSuppliers(ebook.suppliers);

    let actionHtml = "";
    if (unlocked) {
      actionHtml = `<a href="${ebook.file}" class="ebook-card__btn ebook-card__btn--download" download>Télécharger le ZIP</a>`;
    } else if (inCart) {
      actionHtml = `
        <span class="ebook-card__btn ebook-card__btn--in-cart">Dans le panier</span>
        <a href="panier.html" class="ebook-card__btn ebook-card__btn--secondary">Voir le panier</a>
      `;
    } else {
      actionHtml = `<button type="button" class="ebook-card__btn" data-add-cart="${ebook.id}">Ajouter au panier — ${priceLabel}</button>`;
    }

    card.innerHTML = `
      <div class="ebook-card__cover">
        <img src="${coverSrc}" alt="Couverture : ${ebook.title}" loading="lazy"${unlocked ? "" : ' class="ebook-card__img--blur"'}>
        ${suppliersLabel ? `<span class="ebook-card__suppliers">${suppliersLabel}</span>` : ""}
        ${unlocked ? "" : `
          <div class="ebook-card__lock">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span class="ebook-card__price">${priceLabel}</span>
          </div>
        `}
      </div>
      <div class="ebook-card__body">
        <h2 class="ebook-card__title">${ebook.title}</h2>
        ${suppliersLabel ? `<p class="ebook-card__count">${suppliersLabel}</p>` : ""}
        ${ebook.description ? `<p class="ebook-card__desc${unlocked ? "" : " ebook-card__desc--blur"}">${ebook.description}</p>` : ""}
        <div class="ebook-card__actions">${actionHtml}</div>
      </div>
    `;

    card.querySelector("[data-add-cart]")?.addEventListener("click", () => handleAddToCart(ebook.id));

    grid.appendChild(card);
  });
}

document.addEventListener("cart-updated", renderEbooks);
renderEbooks();
