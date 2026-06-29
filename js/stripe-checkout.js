async function startStripeCheckout(ebookIds, email, userId) {
  const data = await ApiClient.fetchJson("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ebookIds, email, userId }),
  });

  if (!data.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  }

  window.location.href = data.url;
}

async function verifyStripeSession(sessionId) {
  const data = await ApiClient.fetchJson(
    `/api/verify-session?session_id=${encodeURIComponent(sessionId)}`
  );

  if (!data.ok) {
    throw new Error(data.error || "Paiement non vérifié.");
  }

  return data;
}
