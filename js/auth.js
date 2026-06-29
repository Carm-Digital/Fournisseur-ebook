const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showLoggedInNotice() {
  const user = UserStore.getCurrentUser();
  if (!user) return;

  const card = document.querySelector(".auth__card");
  if (!card) return;

  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get("from") || "ebook.html";
  const safeReturn = returnUrl.includes("://") ? "ebook.html" : returnUrl;

  const firstName = escapeHtml(user.name.split(" ")[0]);
  const email = escapeHtml(user.email);
  card.innerHTML = `
    <h1 class="auth__title">Vous êtes connecté</h1>
    <p class="auth__subtitle">Bonjour <strong>${firstName}</strong>, vous êtes déjà connecté avec <strong>${email}</strong>.</p>
    <div class="auth__logged-actions">
      <a href="${escapeHtml(safeReturn)}" class="auth__btn auth__btn--link">Retour aux ebooks</a>
      <button type="button" class="auth__btn auth__btn--outline" id="auth-logout-btn">Se déconnecter</button>
    </div>
  `;

  document.getElementById("auth-logout-btn")?.addEventListener("click", async () => {
    await UserStore.logout();
    window.updateNavAuth?.();
    window.location.reload();
  });
}

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  const sessionId = params.get("session_id");

  if (from === "success.html" && sessionId) {
    return `success.html?session_id=${encodeURIComponent(sessionId)}`;
  }

  if (from && !from.includes("://")) {
    return from;
  }

  return "ebook.html";
}

function bindAuthForms() {
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("login-error");
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      showError(errorEl, "Veuillez remplir tous les champs.");
      return;
    }

    const result = await UserStore.login(email, password);

    if (!result.ok) {
      showError(errorEl, result.error);
      return;
    }

    hideError(errorEl);
    window.location.href = getRedirectUrl();
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("register-error");
    const name = registerForm.name.value.trim();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;
    const confirm = registerForm.confirm.value;
    const terms = registerForm.terms.checked;

    if (!name || !email || !password || !confirm) {
      showError(errorEl, "Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 8) {
      showError(errorEl, "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirm) {
      showError(errorEl, "Les mots de passe ne correspondent pas.");
      return;
    }

    if (!terms) {
      showError(errorEl, "Veuillez accepter les conditions d'utilisation.");
      return;
    }

    const result = await UserStore.register(name, email, password);

    if (!result.ok) {
      if (result.existingAccount) {
        showExistingAccountNotice(errorEl, result.error);
      } else {
        showError(errorEl, result.error);
      }
      return;
    }

    hideError(errorEl);

    if (result.needsConfirmation && result.message) {
      showRegisterSuccessNotice(errorEl, result.message);
      return;
    }

    window.location.href = getRedirectUrl();
  });

  document.getElementById("forgot-password-link")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("login-error");
    const email = loginForm?.email?.value?.trim();

    if (!email) {
      showError(errorEl, "Entrez votre e-mail ci-dessus, puis cliquez sur « Mot de passe oublié ».");
      loginForm?.email?.focus();
      return;
    }

    const result = await UserStore.requestPasswordReset(email);

    if (!result.ok) {
      showError(errorEl, result.error);
      return;
    }

    showNotice(errorEl, escapeHtml(result.message));
  });
}

function showNotice(el, message) {
  if (!el) return;
  el.innerHTML = message;
  el.hidden = false;
  el.classList.add("auth__notice");
}

function buildAuthLink(path, label) {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  const href = from && !from.includes("://") ? `${path}?from=${encodeURIComponent(from)}` : path;
  return `<a href="${href}" class="auth__link auth__link--bold">${label}</a>`;
}

function showRegisterSuccessNotice(el, message) {
  showNotice(
    el,
    `${escapeHtml(message)} ${buildAuthLink("connexion.html", "Se connecter")}`
  );

  registerForm?.querySelector('button[type="submit"]')?.setAttribute("disabled", "disabled");
}

function showExistingAccountNotice(el, message) {
  showNotice(
    el,
    `${escapeHtml(message)} ${buildAuthLink("connexion.html", "Se connecter")}`
  );
}

function hideError(el) {
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
  el.innerHTML = "";
  el.classList.remove("auth__notice");
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.remove("auth__notice");
}

UserStore.init().then(async () => {
  if (UserStore.isLoggedIn()) {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const page = document.body.dataset.page;

    if (from && !from.includes("://")) {
      await UserStore.refreshPurchases?.();
      window.location.href = from;
      return;
    }

    if (page === "inscription") {
      window.location.href = getRedirectUrl();
      return;
    }

    showLoggedInNotice();
  }
  bindAuthForms();
});
