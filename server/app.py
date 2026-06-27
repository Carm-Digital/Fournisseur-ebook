import json
import os
from pathlib import Path

import stripe
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
DOMAIN = os.getenv("DOMAIN", "http://localhost:4242").rstrip("/")

app = Flask(__name__)
CORS(app)

with open(ROOT / "data" / "ebooks.json", encoding="utf-8") as f:
    CATALOG = {e["id"]: e for e in json.load(f)}


def build_line_items(ebook_ids):
    line_items = []
    valid_ids = []

    for eid in ebook_ids:
        ebook = CATALOG.get(eid)
        if not ebook or ebook["price"] <= 0:
            continue
        valid_ids.append(eid)
        line_items.append(
            {
                "price_data": {
                    "currency": "eur",
                    "unit_amount": int(round(ebook["price"] * 100)),
                    "product_data": {
                        "name": ebook["title"],
                        "description": f"{ebook.get('suppliers', 0):,} fournisseurs".replace(",", " "),
                    },
                },
                "quantity": 1,
            }
        )

    return line_items, valid_ids


@app.post("/api/create-checkout-session")
def create_checkout_session():
    if not stripe.api_key or stripe.api_key.startswith("sk_test_VOTRE"):
        return jsonify(error="Clé Stripe non configurée. Remplissez le fichier .env"), 500

    data = request.get_json(silent=True) or {}
    ebook_ids = data.get("ebookIds", [])
    email = (data.get("email") or "").lower().strip()

    if not email or not isinstance(ebook_ids, list) or not ebook_ids:
        return jsonify(error="Requête invalide"), 400

    line_items, valid_ids = build_line_items(ebook_ids)

    if not line_items:
        return jsonify(error="Aucun ebook payable dans le panier"), 400

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            customer_email=email,
            success_url=f"{DOMAIN}/success.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{DOMAIN}/panier.html?cancel=1",
            metadata={
                "ebook_ids": ",".join(valid_ids),
                "user_email": email,
            },
        )
    except stripe.error.StripeError as exc:
        return jsonify(error=str(exc.user_message or exc)), 400

    return jsonify(url=session.url)


@app.get("/api/verify-session")
def verify_session():
    if not stripe.api_key:
        return jsonify(ok=False, error="Stripe non configuré"), 500

    session_id = request.args.get("session_id", "").strip()
    if not session_id:
        return jsonify(ok=False, error="Session manquante"), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as exc:
        return jsonify(ok=False, error=str(exc.user_message or exc)), 400

    if session.payment_status != "paid":
        return jsonify(ok=False, error="Paiement non confirmé"), 400

    ebook_ids = [x for x in session.metadata.get("ebook_ids", "").split(",") if x]
    email = session.metadata.get("user_email", "")

    return jsonify(ok=True, ebookIds=ebook_ids, email=email)


@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def serve_static(path):
    if path.startswith("api/"):
        return jsonify(error="Not found"), 404

    target = ROOT / path
    if target.is_file():
        return send_from_directory(ROOT, path)

    html_target = ROOT / f"{path.rstrip('/')}.html" if not path.endswith(".html") else target
    if html_target.is_file():
        return send_from_directory(ROOT, html_target.relative_to(ROOT).as_posix())

    return send_from_directory(ROOT, "index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4242"))
    print(f"Serveur : {DOMAIN}")
    print("Configurez STRIPE_SECRET_KEY dans .env pour activer les paiements.")
    app.run(host="0.0.0.0", port=port, debug=True)
