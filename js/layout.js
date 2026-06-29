const NAV_BASE = [
  { href: "index.html", label: "Accueil", id: "home", icon: "bi-house-door" },
  { href: "ebook.html", label: "Ebooks", id: "ebook", icon: "bi-journal-bookmark" },
];

const NAV_HOME_EXTRA = [
  { href: "index.html#how-it-works", label: "Comment ça marche", id: "how", icon: "bi-lightning" },
  { href: "index.html#faq", label: "FAQ", id: "faq", icon: "bi-question-circle" },
];

function getActivePage() {
  return document.body.dataset.page || "";
}

function getStaticNavItems() {
  if (document.body.classList.contains("page-home")) {
    return [NAV_BASE[0], ...NAV_HOME_EXTRA, NAV_BASE[1]];
  }
  return [...NAV_BASE];
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderNavLink(item, active) {
  const isActive = item.id === active;
  const icon = item.icon
    ? `<i class="bi ${item.icon} nav__link-icon" aria-hidden="true"></i>`
    : "";
  return `<li><a href="${item.href}" class="nav__link${isActive ? " nav__link--active" : ""}">${icon}<span>${item.label}</span></a></li>`;
}

function getMobileNavHeadHtml() {
  return `
    <li class="nav__mobile-head">
      <span class="nav__mobile-title">Menu</span>
      <button type="button" class="nav__mobile-close" id="nav-close" aria-label="Fermer le menu">
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </li>
  `;
}

function getAuthNavHtml() {
  const active = getActivePage();

  if (typeof UserStore !== "undefined" && UserStore.isLoggedIn()) {
    const user = UserStore.getCurrentUser();
    const firstName = escapeHtml((user?.name || "Utilisateur").split(" ")[0]);
    const email = escapeHtml(user?.email || "");
    return `
      <li class="nav__auth-item nav__auth-item--user">
        <div class="nav__mobile-user">
          <span class="nav__mobile-user-icon" aria-hidden="true"><i class="bi bi-person-circle"></i></span>
          <span class="nav__mobile-user-info">
            <strong>${firstName}</strong>
            <small>${email}</small>
          </span>
        </div>
        <span class="nav__user-badge nav__user-badge--desktop" title="${email}">
          <i class="bi bi-person-check-fill"></i>
          Connecté · ${firstName}
        </span>
      </li>
      <li class="nav__auth-item">
        <button type="button" class="nav__link nav__logout" id="nav-logout">
          <i class="bi bi-box-arrow-right nav__link-icon" aria-hidden="true"></i>
          <span>Déconnexion</span>
        </button>
      </li>
    `;
  }

  const authItems = [
    { href: "connexion.html", label: "Connexion", id: "connexion", icon: "bi-box-arrow-in-right" },
    { href: "inscription.html", label: "Inscription", id: "inscription", icon: "bi-person-plus" },
  ];

  return `
    <li class="nav__auth-divider" aria-hidden="true"><span>Mon compte</span></li>
    ${authItems.map((item) => renderNavLink(item, active)).join("")}
  `;
}

function getNavLinksHtml() {
  const active = getActivePage();

  const staticLinks = getStaticNavItems()
    .map((item) => renderNavLink(item, active))
    .join("");

  return getMobileNavHeadHtml() + staticLinks + getAuthNavHtml();
}

function setNavOpen(open) {
  const navMenu = document.getElementById("nav-menu");
  const navToggle = document.getElementById("nav-toggle");
  const backdrop = document.getElementById("nav-backdrop");

  navMenu?.classList.toggle("is-open", open);
  navToggle?.classList.toggle("is-active", open);
  navToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  backdrop?.classList.toggle("is-visible", open);
  backdrop?.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("nav-open", open);
}

function closeNav() {
  setNavOpen(false);
}

function bindNavLinkClose() {
  const navMenu = document.getElementById("nav-menu");

  navMenu?.querySelectorAll(".nav__link:not(.nav__logout)").forEach((link) => {
    if (link.dataset.closeBound) return;
    link.dataset.closeBound = "true";
    link.addEventListener("click", closeNav);
  });

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn && !logoutBtn.dataset.closeBound) {
    logoutBtn.dataset.closeBound = "true";
    logoutBtn.addEventListener("click", closeNav);
  }
}

function bindNavLogout() {
  const btn = document.getElementById("nav-logout");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "true";

  btn.addEventListener("click", async () => {
    await UserStore.logout();
    updateNavAuth();
    if (document.body.dataset.page === "connexion" || document.body.dataset.page === "inscription") {
      return;
    }
    window.location.reload();
  });
}

function updateNavAuth() {
  const navMenu = document.getElementById("nav-menu");
  if (!navMenu) return;

  const cartItem = navMenu.querySelector(".nav__cart")?.closest("li");
  navMenu.innerHTML = getNavLinksHtml();

  if (cartItem) {
    navMenu.appendChild(cartItem);
  } else if (typeof CartStore !== "undefined") {
    window.injectCartLink?.();
  }

  bindNavLogout();
  bindNavLinkClose();
}

window.updateNavAuth = updateNavAuth;

function renderNav() {
  if (document.getElementById("site-nav")) return;

  const isHome = document.body.classList.contains("page-home");
  const nav = document.createElement("nav");
  nav.className = `landing-nav header${isHome ? "" : " landing-nav--solid"}`;
  nav.id = "site-nav";

  nav.innerHTML = `
    <div class="container landing-nav__inner">
      <a href="index.html" class="landing-nav__brand">
        <img
          src="assets/icon-les-bons-contacts.png"
          alt=""
          class="landing-nav__brand-icon"
          width="40"
          height="40"
          decoding="async"
        >
        <span
          data-true-focus
          data-sentence="Les bons contacts"
          data-border-color="#E8341A"
          data-entrance-duration="0.4"
          data-stagger-delay="0.08"
          data-animation-duration="0.4"
          data-pause-between="0.35"
          aria-label="Les bons contacts"
        >Les bons contacts</span>
      </a>
      <button class="landing-nav__toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false" id="nav-toggle">
        <span class="landing-nav__toggle-bar"></span>
        <span class="landing-nav__toggle-bar"></span>
        <span class="landing-nav__toggle-bar"></span>
      </button>
      <div class="landing-nav__backdrop" id="nav-backdrop" aria-hidden="true"></div>
      <ul class="nav" id="nav-menu">${getNavLinksHtml()}</ul>
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);
  bindNavLogout();
  initNavBehavior();
  window.initAllTrueFocus?.(nav);
}

function renderFooter() {
  if (document.getElementById("site-footer")) return;

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.id = "site-footer";
  footer.innerHTML = `
    <div class="site-footer__shell">
      <div class="container">
        <div class="site-footer__grid">
          <div class="site-footer__brand">
            <a href="index.html" class="site-footer__logo">
              <img
                src="assets/icon-les-bons-contacts.png"
                alt=""
                class="site-footer__logo-icon"
                width="44"
                height="44"
                decoding="async"
              >
              <span class="site-footer__logo-text">Les bons contacts</span>
            </a>
            <p class="site-footer__desc">
              Les bons contacts vous aide à trouver rapidement des fournisseurs fiables grâce à des annuaires professionnels classés par secteur d'activité.
            </p>
          </div>

          <nav class="site-footer__col" aria-label="Navigation du pied de page">
            <h3 class="site-footer__title">Navigation</h3>
            <ul class="site-footer__links">
              <li><a href="index.html">Accueil</a></li>
              <li><a href="index.html#how-it-works">Comment ça marche</a></li>
              <li><a href="index.html#faq">FAQ</a></li>
              <li><a href="ebook.html">Ebooks</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </nav>

          <nav class="site-footer__col" aria-label="Informations légales">
            <h3 class="site-footer__title">
              <i class="bi bi-shield-check site-footer__title-icon" aria-hidden="true"></i>
              Informations légales
            </h3>
            <ul class="site-footer__links">
              <li><a href="mentions-legales.html">Mentions légales</a></li>
              <li><a href="politique-confidentialite.html">Politique de confidentialité</a></li>
              <li><a href="cgu.html">CGU</a></li>
              <li><a href="cgv.html">CGV</a></li>
              <li><a href="politique-cookies.html">Cookies</a></li>
            </ul>
          </nav>

          <div class="site-footer__col">
            <h3 class="site-footer__title">Contact</h3>
            <ul class="site-footer__links site-footer__links--contact">
              <li>
                <a href="mailto:ebookworld.dev@hotmail.com" class="site-footer__contact-link">
                  <span class="site-footer__contact-icon" aria-hidden="true">
                    <i class="bi bi-envelope"></i>
                  </span>
                  ebookworld.dev@hotmail.com
                </a>
              </li>
              <li><a href="contact.html">Support client</a></li>
            </ul>
          </div>
        </div>

        <div class="site-footer__bar">
          <p class="site-footer__copy">© 2026 Les bons contacts. Tous droits réservés.</p>
          <p class="site-footer__credit">Site créé par <span>DevCraft</span></p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(footer);
}

function renderCookieBanner() {
  if (localStorage.getItem("lbc_cookies_consent")) return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.id = "cookie-banner";
  banner.innerHTML = `
    <p>
      Nous utilisons des cookies pour améliorer votre expérience et mesurer l'audience du site.
      En continuant, vous acceptez notre
      <a href="politique-cookies.html">politique de cookies</a>.
    </p>
    <div class="cookie-banner__actions">
      <button type="button" class="cookie-banner__btn cookie-banner__btn--accept" id="cookie-accept">Accepter</button>
      <button type="button" class="cookie-banner__btn cookie-banner__btn--refuse" id="cookie-refuse">Refuser</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("cookie-accept")?.addEventListener("click", () => {
    localStorage.setItem("lbc_cookies_consent", "accepted");
    banner.remove();
  });

  document.getElementById("cookie-refuse")?.addEventListener("click", () => {
    localStorage.setItem("lbc_cookies_consent", "refused");
    banner.remove();
  });
}

function initNavBehavior() {
  const nav = document.getElementById("site-nav");
  const navToggle = document.getElementById("nav-toggle");
  const isHome = document.body.classList.contains("page-home");

  if (isHome) {
    window.addEventListener("scroll", () => {
      nav?.classList.toggle("scrolled", window.scrollY > 60);
    }, { passive: true });
    nav?.classList.toggle("scrolled", window.scrollY > 60);
  }

  if (!document.body.dataset.navBound) {
    document.body.dataset.navBound = "true";

    navToggle?.addEventListener("click", () => {
      const open = !document.getElementById("nav-menu")?.classList.contains("is-open");
      setNavOpen(open);
    });

    document.getElementById("nav-backdrop")?.addEventListener("click", closeNav);

    document.addEventListener("click", (event) => {
      if (event.target.closest("#nav-close")) {
        closeNav();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNav();
      }
    });
  }

  bindNavLinkClose();
}

renderNav();
renderFooter();
renderCookieBanner();

document.addEventListener("user-ready", () => {
  if (typeof UserStore !== "undefined") {
    updateNavAuth();
  }
});
