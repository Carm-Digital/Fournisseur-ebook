const statusEl = document.getElementById("success-status");

async function handleSuccess() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  if (!sessionId) {
    statusEl.textContent = "Session de paiement introuvable.";
    return;
  }

  if (!UserStore.isLoggedIn()) {
    window.location.href = `connexion.html?from=success.html&session_id=${encodeURIComponent(sessionId)}`;
    return;
  }

  try {
    statusEl.textContent = "Vérification du paiement en cours…";
    const data = await verifyStripeSession(sessionId);
    const user = UserStore.getCurrentUser();

    if (data.email && user.email !== data.email.toLowerCase()) {
      statusEl.textContent = "Ce paiement est associé à un autre compte.";
      return;
    }

    data.ebookIds.forEach((id) => UserStore.purchase(id));
    CartStore.clear();

    window.location.href = "ebook.html?achat=ok";
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

handleSuccess();
