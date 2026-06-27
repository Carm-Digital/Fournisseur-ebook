const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

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

loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("login-error");
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || !password) {
    showError(errorEl, "Veuillez remplir tous les champs.");
    return;
  }

  const result = UserStore.login(email, password);

  if (!result.ok) {
    showError(errorEl, result.error);
    return;
  }

  hideError(errorEl);
  window.location.href = getRedirectUrl();
});

registerForm?.addEventListener("submit", (e) => {
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

  const result = UserStore.register(name, email, password);

  if (!result.ok) {
    showError(errorEl, result.error);
    return;
  }

  hideError(errorEl);
  window.location.href = getRedirectUrl();
});

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function hideError(el) {
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}
