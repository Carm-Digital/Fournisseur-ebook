const NAV_BASE = [
  { href: "index.html", label: "Accueil", id: "home" },
  { href: "ebook.html", label: "Ebooks", id: "ebook" },
];

const NAV_HOME_EXTRA = [
  { href: "index.html#how-it-works", label: "Comment ça marche", id: "how" },
  { href: "index.html#faq", label: "FAQ", id: "faq" },
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

function getAuthNavHtml() {
  const active = getActivePage();

  if (typeof UserStore !== "undefined" && UserStore.isLoggedIn()) {
    const user = UserStore.getCurrentUser();
    const firstName = escapeHtml((user?.name || "Utilisateur").split(" ")[0]);
    const email = escapeHtml(user?.email || "");
    return `
      <li class="nav__auth-item">
        <span class="nav__user-badge" title="${email}">
          <i class="bi bi-person-check-fill"></i>
          Connecté · ${firstName}
        </span>
      </li>
      <li class="nav__auth-item">
        <button type="button" class="nav__link nav__logout" id="nav-logout">Déconnexion</button>
      </li>
    `;
  }

  const authItems = [
    { href: "connexion.html", label: "Connexion", id: "connexion" },
    { href: "inscription.html", label: "Inscription", id: "inscription" },
  ];

  return authItems
    .map((item) => {
      const isActive = item.id === active;
      return `<li><a href="${item.href}" class="nav__link${isActive ? " nav__link--active" : ""}">${item.label}</a></li>`;
    })
    .join("");
}

function getNavLinksHtml() {
  const active = getActivePage();

  const staticLinks = getStaticNavItems()
    .map((item) => {
      const isActive = item.id === active;
      return `<li><a href="${item.href}" class="nav__link${isActive ? " nav__link--active" : ""}">${item.label}</a></li>`;
    })
    .join("");

  return staticLinks + getAuthNavHtml();
}

function bindNavLinkClose() {
  const navMenu = document.getElementById("nav-menu");
  const navToggle = document.getElementById("nav-toggle");

  navMenu?.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });
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
      <button class="landing-nav__toggle" type="button" aria-label="Menu" aria-expanded="false" id="nav-toggle">
        <span></span><span></span><span></span>
      </button>
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

  navToggle?.addEventListener("click", () => {
    const navMenu = document.getElementById("nav-menu");
    const open = navMenu?.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

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
