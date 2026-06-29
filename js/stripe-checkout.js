async function startStripeCheckout(ebookIds, email, userId) {
  await UserStore.init();
  UserStore.assertStripeReady();

  const checkoutUrl = ApiClient.buildUrl("/api/create-checkout-session");
  console.log("[Stripe] mode =", UserStore.getStripeMode());
  console.log("[Stripe] pk =", UserStore.getStripePublishableKey()?.slice(0, 14) + "…");
  console.log("[Stripe] création session →", checkoutUrl, { ebookIds, email, userId });

  const data = await ApiClient.fetchJson("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ebookIds, email, userId }),
  });

  if (!data.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  }

  console.log("[Stripe] redirection →", data.url);
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
