const grid = document.getElementById("ebooks-grid");
const empty = document.getElementById("ebooks-empty");
const userBar = document.getElementById("ebooks-user");
const carouselWrap = document.getElementById("ebooks-carousel-wrap");
const carouselCounter = document.getElementById("ebooks-carousel-counter");

let carouselActiveIndex = 0;
let carouselWheelLock = false;
let carouselScrollTimer = null;
let carouselScrollRaf = null;
let carouselWheelAccum = 0;
let carouselDrag = null;
let carouselSuppressClick = false;

function isEbookFree(ebook) {
  return ebook.price === 0;
}

function isEbookUnlocked(ebook) {
  if (isEbookFree(ebook)) {
    return UserStore.isLoggedIn();
  }
  return UserStore.hasPurchased(ebook.id);
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
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      await UserStore.logout();
      window.updateNavAuth?.();
      renderEbooks();
    });
  } else {
    userBar.innerHTML = `
      <p class="ebooks__user-text">
        <a href="inscription.html?from=ebook.html" class="ebooks__user-link">Inscrivez-vous</a>
        pour débloquer les ebooks, dont les annuaires Livres, Plantes et Papeteries offerts.
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

const carouselViewport = document.getElementById("ebooks-carousel-viewport");
const carouselPrev = document.getElementById("ebooks-carousel-prev");
const carouselNext = document.getElementById("ebooks-carousel-next");

const CAROUSEL_BUFFER = 5;
const LOCKED_PREVIEW_SRC = "assets/ebooks/placeholder.svg";

function getCarouselCards() {
  return grid ? [...grid.querySelectorAll(".ebook-card")] : [];
}

function getCardElement(index) {
  return grid?.querySelector(`.ebook-card[data-ebook-index="${index}"]`);
}

function getCardScrollLeft(index) {
  const card = getCardElement(index);
  if (!card || !carouselViewport) return null;
  const cardCenter = card.offsetLeft + card.offsetWidth / 2;
  const ideal = cardCenter - carouselViewport.clientWidth / 2;
  const maxScroll = Math.max(0, carouselViewport.scrollWidth - carouselViewport.clientWidth);
  return Math.max(0, Math.min(ideal, maxScroll));
}

function isCardCentered(index, tolerance = 6) {
  const target = getCardScrollLeft(index);
  if (target === null || !carouselViewport) return true;
  return Math.abs(carouselViewport.scrollLeft - target) <= tolerance;
}
function updateCarouselPadding() {
  if (!grid || !carouselViewport) return;
  const card = grid.querySelector(".ebook-card");
  if (!card) return;
  const pad = Math.max(0, (carouselViewport.clientWidth - card.offsetWidth) / 2);
  grid.style.paddingLeft = `${pad}px`;
  grid.style.paddingRight = `${pad}px`;
}

function getCarouselCenterIndex() {
  const cards = getCarouselCards();
  if (!cards.length || !carouselViewport) return carouselActiveIndex;

  const center = carouselViewport.scrollLeft + carouselViewport.clientWidth / 2;
  let closest = carouselActiveIndex;
  let minDist = Infinity;

  cards.forEach((card) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - center);
    if (dist < minDist) {
      minDist = dist;
      closest = parseInt(card.dataset.ebookIndex, 10);
    }
  });

  return Number.isFinite(closest) ? closest : carouselActiveIndex;
}

function applyCarouselFocus(index) {
  if (!EBOOKS.length) return;

  carouselActiveIndex = Math.max(0, Math.min(EBOOKS.length - 1, index));

  getCarouselCards().forEach((card) => {
    const cardIndex = parseInt(card.dataset.ebookIndex, 10);
    const dist = Math.abs(cardIndex - carouselActiveIndex);

    card.classList.remove(
      "ebook-card--active",
      "ebook-card--near",
      "ebook-card--dist-1",
      "ebook-card--dist-2",
      "ebook-card--dist-3",
      "ebook-card--dist-4",
      "ebook-card--dist-5",
      "ebook-card--far"
    );

    if (dist === 0) {
      card.classList.add("ebook-card--active");
    } else if (dist <= CAROUSEL_BUFFER) {
      card.classList.add(`ebook-card--dist-${dist}`);
    } else {
      card.classList.add("ebook-card--far");
    }

    card.style.pointerEvents = dist <= CAROUSEL_BUFFER ? "auto" : "none";
    card.style.cursor = dist === 0 ? "" : dist <= CAROUSEL_BUFFER ? "pointer" : "";
  });

  if (carouselCounter) {
    carouselCounter.textContent = `${carouselActiveIndex + 1} / ${EBOOKS.length}`;
  }

  if (carouselPrev) carouselPrev.disabled = carouselActiveIndex === 0;
  if (carouselNext) carouselNext.disabled = carouselActiveIndex === EBOOKS.length - 1;
}

function scrollCarouselToIndex(index, behavior = "smooth") {
  if (!EBOOKS.length || !carouselViewport) return;

  const target = Math.max(0, Math.min(EBOOKS.length - 1, index));
  const scrollLeft = getCardScrollLeft(target);
  if (scrollLeft === null) return;

  carouselActiveIndex = target;
  applyCarouselFocus(target);

  carouselViewport.scrollTo({
    left: scrollLeft,
    behavior,
  });
}

function onCarouselScrollEnd() {
  if (carouselDrag || carouselViewport?.classList.contains("is-dragging")) return;

  const index = getCarouselCenterIndex();
  if (!isCardCentered(index)) {
    scrollCarouselToIndex(index, "smooth");
    return;
  }

  if (index !== carouselActiveIndex) {
    carouselActiveIndex = index;
  }
  applyCarouselFocus(index);
}

function onCarouselScroll() {
  if (carouselScrollRaf) return;
  carouselScrollRaf = requestAnimationFrame(() => {
    carouselScrollRaf = null;
    if (!carouselDrag) {
      applyCarouselFocus(getCarouselCenterIndex());
    }
  });
  scheduleCarouselScrollEnd();
}

function bindCarouselCardClicks() {
  getCarouselCards().forEach((card) => {
    card.addEventListener("click", (event) => {
      if (carouselSuppressClick) return;
      if (event.target.closest("a, button")) return;

      const index = parseInt(card.dataset.ebookIndex, 10);
      if (!Number.isFinite(index) || index === carouselActiveIndex) return;
      scrollCarouselToIndex(index);
    });
  });
}

function initCarouselDrag() {
  if (!carouselViewport || carouselViewport.dataset.dragBound) return;
  carouselViewport.dataset.dragBound = "true";

  const endDrag = (event) => {
    if (!carouselDrag || carouselDrag.pointerId !== event.pointerId) return;

    carouselViewport.releasePointerCapture(event.pointerId);
    carouselViewport.classList.remove("is-dragging");
    const moved = carouselDrag.moved;
    carouselDrag = null;

    if (moved) {
      carouselSuppressClick = true;
      requestAnimationFrame(() => {
        carouselSuppressClick = false;
      });
      scrollCarouselToIndex(getCarouselCenterIndex(), "smooth");
    }
  };

  carouselViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("a, button")) return;

    carouselDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: carouselViewport.scrollLeft,
      moved: false,
    };

    carouselViewport.setPointerCapture(event.pointerId);
    carouselViewport.classList.add("is-dragging");
  });

  carouselViewport.addEventListener("pointermove", (event) => {
    if (!carouselDrag || carouselDrag.pointerId !== event.pointerId) return;

    const delta = event.clientX - carouselDrag.startX;
    if (Math.abs(delta) > 4) carouselDrag.moved = true;
    carouselViewport.scrollLeft = carouselDrag.startScrollLeft - delta;
    applyCarouselFocus(getCarouselCenterIndex());
  });

  carouselViewport.addEventListener("pointerup", endDrag);
  carouselViewport.addEventListener("pointercancel", endDrag);
}

function scheduleCarouselScrollEnd() {
  clearTimeout(carouselScrollTimer);
  carouselScrollTimer = setTimeout(onCarouselScrollEnd, 120);
}

function updateCarouselButtons() {
  applyCarouselFocus(getCarouselCenterIndex());
}

function initEbooksCarousel() {
  if (!carouselViewport || !carouselPrev || !carouselNext) return;

  updateCarouselPadding();
  scrollCarouselToIndex(carouselActiveIndex, "auto");

  carouselPrev.onclick = () => scrollCarouselToIndex(carouselActiveIndex - 1);
  carouselNext.onclick = () => scrollCarouselToIndex(carouselActiveIndex + 1);

  if (!carouselViewport.dataset.bound) {
    carouselViewport.dataset.bound = "true";

    initCarouselDrag();

    carouselViewport.addEventListener("scroll", onCarouselScroll, { passive: true });

    if ("onscrollend" in carouselViewport) {
      carouselViewport.addEventListener("scrollend", onCarouselScrollEnd, { passive: true });
    }

    const onCarouselWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (carouselWheelLock || carouselDrag) return;

      carouselWheelAccum += e.deltaY;
      if (Math.abs(carouselWheelAccum) < 36) return;

      const direction = carouselWheelAccum > 0 ? 1 : -1;
      carouselWheelAccum = 0;
      carouselWheelLock = true;
      scrollCarouselToIndex(carouselActiveIndex + direction);

      setTimeout(() => {
        carouselWheelLock = false;
      }, 380);
    };

    carouselViewport.addEventListener("wheel", onCarouselWheel, { passive: false });
    carouselWrap?.addEventListener("wheel", onCarouselWheel, { passive: false });

    carouselViewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollCarouselToIndex(carouselActiveIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollCarouselToIndex(carouselActiveIndex + 1);
      }
    });

    window.addEventListener("resize", () => {
      updateCarouselPadding();
      scrollCarouselToIndex(carouselActiveIndex, "auto");
    });
  }

  updateCarouselButtons();
}

function buildEbookCard(ebook, ebookIndex) {
  const unlocked = isEbookUnlocked(ebook);
  const free = isEbookFree(ebook);
  const inCart = CartStore.has(ebook.id);
  const priceLabel = UserStore.formatPrice(ebook.price);
  const card = document.createElement("article");
  card.className = `ebook-card${unlocked ? " ebook-card--unlocked" : " ebook-card--locked"}${free ? " ebook-card--free" : ""}`;
  card.dataset.ebookIndex = String(ebookIndex);

  const coverSrc = unlocked
    ? ebook.cover || LOCKED_PREVIEW_SRC
    : LOCKED_PREVIEW_SRC;
  const suppliersLabel = formatSuppliers(ebook.suppliers);
  const lockedDesc = "Aperçu masqué. Le contenu complet sera disponible après achat ou inscription.";

  let actionHtml = "";
  if (unlocked) {
    const protectedDownload = UserStore.getDownloadUrl(ebook.id);
    if (protectedDownload) {
      actionHtml = `<button type="button" class="ebook-card__btn ebook-card__btn--download" data-download="${ebook.id}">Télécharger le ZIP</button>`;
    } else {
      actionHtml = `<a href="${ebook.file}" class="ebook-card__btn ebook-card__btn--download" download>Télécharger le ZIP</a>`;
    }
  } else if (free) {
    actionHtml = `<a href="inscription.html?from=ebook.html" class="ebook-card__btn">Inscrivez-vous — Gratuit</a>`;
  } else if (inCart) {
    actionHtml = `
      <span class="ebook-card__btn ebook-card__btn--in-cart">Dans le panier</span>
      <a href="panier.html" class="ebook-card__btn ebook-card__btn--secondary">Voir le panier</a>
    `;
  } else {
    actionHtml = `<button type="button" class="ebook-card__btn" data-add-cart="${ebook.id}">Ajouter au panier — ${priceLabel}</button>`;
  }

  card.innerHTML = `
    <div class="ebook-card__cover${unlocked ? "" : " ebook-card__cover--locked"}">
      <img
        src="${coverSrc}"
        alt="${unlocked ? `Couverture : ${ebook.title}` : "Aperçu masqué"}"
        loading="lazy"
        draggable="false"
        class="${unlocked ? "" : "ebook-card__img--locked"}"
      >
      ${suppliersLabel ? `<span class="ebook-card__suppliers">${suppliersLabel}</span>` : ""}
      ${unlocked ? "" : `
        <div class="ebook-card__lock">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="ebook-card__price">${free ? "Gratuit" : priceLabel}</span>
          ${inCart ? `<span class="ebook-card__lock-note">Dans le panier — contenu masqué</span>` : ""}
        </div>
      `}
    </div>
    <div class="ebook-card__body">
      <h2 class="ebook-card__title">${ebook.title}</h2>
      ${suppliersLabel ? `<p class="ebook-card__count">${suppliersLabel}</p>` : ""}
      ${unlocked && ebook.description ? `<p class="ebook-card__desc">${ebook.description}</p>` : !unlocked ? `<p class="ebook-card__desc ebook-card__desc--locked">${lockedDesc}</p>` : ""}
      <div class="ebook-card__actions">${actionHtml}</div>
    </div>
  `;

    card.querySelector("[data-add-cart]")?.addEventListener("click", () => handleAddToCart(ebook.id));
    card.querySelector("[data-download]")?.addEventListener("click", async () => {
      await UserStore.downloadEbook(ebook.id);
    });

  return card;
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
    if (carouselWrap) carouselWrap.hidden = true;
    return;
  }

  empty.hidden = true;
  if (carouselWrap) carouselWrap.hidden = false;
  const prevIndex = carouselActiveIndex;
  carouselActiveIndex = Math.min(prevIndex, EBOOKS.length - 1);

  EBOOKS.forEach((ebook, i) => {
    grid.appendChild(buildEbookCard(ebook, i));
  });

  initEbooksCarousel();
  bindCarouselCardClicks();
}

document.addEventListener("cart-updated", renderEbooks);
document.addEventListener("user-ready", renderEbooks);
