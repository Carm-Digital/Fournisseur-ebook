const API_BASE = window.location.origin;

async function startStripeCheckout(ebookIds, email, userId) {
  const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ebookIds, email, userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Impossible de démarrer le paiement Stripe.");
  }

  window.location.href = data.url;
}

async function verifyStripeSession(sessionId) {
  const response = await fetch(
    `${API_BASE}/api/verify-session?session_id=${encodeURIComponent(sessionId)}`
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Paiement non vérifié.");
  }

  return data;
}
