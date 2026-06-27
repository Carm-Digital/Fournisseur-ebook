function renderFooter() {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <span class="site-footer__name">Les bons contacts</span>
        <p>Annuaires professionnels de fournisseurs pour développer votre activité.</p>
      </div>
      <div class="site-footer__col">
        <h4>Légal</h4>
        <a href="mentions-legales.html">Mentions légales</a>
        <a href="politique-confidentialite.html">Politique de confidentialité</a>
        <a href="politique-cookies.html">Politique de cookies</a>
      </div>
      <div class="site-footer__col">
        <h4>Conditions</h4>
        <a href="cgu.html">Conditions d'utilisation</a>
        <a href="cgv.html">Conditions générales de vente</a>
      </div>
      <div class="site-footer__col">
        <h4>Site</h4>
        <a href="ebook.html">Ebooks</a>
        <a href="panier.html">Panier</a>
        <a href="connexion.html">Connexion</a>
        <a href="inscription.html">Inscription</a>
        <a href="contact.html">Contact</a>
      </div>
    </div>
    <div class="site-footer__bottom">
      <p class="site-footer__copy">© ${new Date().getFullYear()} Les bons contacts. Tous droits réservés.</p>
    </div>
  `;

  const page = document.querySelector(".page");
  document.body.classList.add("page-with-footer");
  if (page) {
    page.classList.add("page--flex");
    page.appendChild(footer);
  } else {
    document.body.appendChild(footer);
  }
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

renderFooter();
renderCookieBanner();
