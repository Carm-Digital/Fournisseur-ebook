import json
import os
from pathlib import Path

import stripe
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
DOMAIN = os.getenv("DOMAIN", "http://localhost:4242").rstrip("/")
API_BASE = os.getenv("API_BASE", DOMAIN).rstrip("/")
PROTECT_DOWNLOADS = os.getenv("PROTECT_DOWNLOADS", "true").lower() == "true"

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

FREE_EBOOK_IDS = {"livres", "papeteries", "plantes"}


def is_production_env(host=None):
    mode = (os.getenv("STRIPE_MODE") or "").strip().lower()
    if mode == "live":
        return True
    if mode == "test":
        return False
    if os.getenv("VERCEL_ENV") == "production":
        return True
    if os.getenv("NODE_ENV") == "production":
        return True
    if host and "localhost" not in host and "127.0.0.1" not in host:
        return True
    domain = (os.getenv("DOMAIN") or "").strip()
    if domain and "localhost" not in domain and "127.0.0.1" not in domain:
        return True
    return False


def validate_stripe_secret_key(host=None):
    key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    production = is_production_env(host)

    if not key or key.startswith("sk_test_VOTRE") or key.startswith("sk_live_VOTRE"):
        msg = (
            "STRIPE_SECRET_KEY manquante. Ajoutez sk_live_... sur Vercel → Production."
            if production
            else "STRIPE_SECRET_KEY manquante. Ajoutez sk_test_... ou sk_live_... dans .env."
        )
        return None, msg
    if key.startswith("pk_"):
        return None, (
            "STRIPE_SECRET_KEY contient une clé publique (pk_). "
            "Utilisez sk_live_... ou sk_test_... (Secret key)."
        )
    if not key.startswith("sk_"):
        return None, "STRIPE_SECRET_KEY invalide : elle doit commencer par sk_."
    if production and key.startswith("sk_test_"):
        return None, (
            "STRIPE_SECRET_KEY est en mode test (sk_test_) en production. "
            "Remplacez par sk_live_... sur Vercel."
        )
    return key, None


def validate_stripe_publishable_key(host=None):
    key = (os.getenv("STRIPE_PUBLISHABLE_KEY") or "").strip()
    production = is_production_env(host)

    if not key or key.startswith("pk_test_VOTRE") or key.startswith("pk_live_VOTRE"):
        if production:
            return "", "STRIPE_PUBLISHABLE_KEY manquante. Ajoutez pk_live_... sur Vercel → Production."
        return "", None
    if key.startswith("sk_"):
        return "", (
            "STRIPE_PUBLISHABLE_KEY contient une clé secrète (sk_). "
            "Utilisez pk_live_... ou pk_test_... (Publishable key)."
        )
    if not key.startswith("pk_"):
        return "", "STRIPE_PUBLISHABLE_KEY invalide : elle doit commencer par pk_."
    if production and key.startswith("pk_test_"):
        return "", (
            "STRIPE_PUBLISHABLE_KEY est en mode test (pk_test_) en production. "
            "Remplacez par pk_live_... sur Vercel."
        )
    return key, None


STRIPE_SECRET_KEY, STRIPE_SECRET_KEY_ERROR = validate_stripe_secret_key()
STRIPE_PUBLISHABLE_KEY, STRIPE_PUBLISHABLE_KEY_ERROR = validate_stripe_publishable_key()
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

app = Flask(__name__)
CORS(app)

with open(ROOT / "data" / "ebooks.json", encoding="utf-8") as f:
    CATALOG = {e["id"]: e for e in json.load(f)}

with open(ROOT / "data" / "ebook-files.json", encoding="utf-8") as f:
    EBOOK_FILES = json.load(f)

_supabase_admin = None


def get_supabase_admin():
    global _supabase_admin
    if not USE_SUPABASE:
        return None
    if _supabase_admin is None:
        from supabase import create_client

        _supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin


def verify_access_token(token):
    if not token or not USE_SUPABASE:
        return None
    try:
        client = get_supabase_admin()
        response = client.auth.get_user(token)
        return response.user
    except Exception:
        return None


def user_has_purchase(user_id, ebook_id):
    if not USE_SUPABASE:
        return False
    client = get_supabase_admin()
    result = (
        client.table("purchases")
        .select("id")
        .eq("user_id", user_id)
        .eq("ebook_id", ebook_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def record_purchases(user_id, ebook_ids, stripe_session_id=None):
    if not USE_SUPABASE or not user_id:
        return
    client = get_supabase_admin()
    rows = [
        {
            "user_id": user_id,
            "ebook_id": ebook_id,
            "stripe_session_id": stripe_session_id,
        }
        for ebook_id in ebook_ids
        if ebook_id in CATALOG
    ]
    if rows:
        client.table("purchases").upsert(rows, on_conflict="user_id,ebook_id").execute()


def can_download(user, ebook_id):
    ebook = CATALOG.get(ebook_id)
    if not ebook or ebook_id not in EBOOK_FILES:
        return False, "Ebook introuvable."
    if not user:
        return False, "Connectez-vous pour télécharger."
    if ebook["price"] == 0 and ebook_id in FREE_EBOOK_IDS:
        return True, None
    if user_has_purchase(user.id, ebook_id):
        return True, None
    return False, "Achat requis pour télécharger cet annuaire."


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


@app.get("/api/public-config")
def public_config():
    request_origin = request.host_url.rstrip("/")
    api_base = API_BASE
    if "localhost" in api_base and "localhost" not in request.host:
        api_base = request_origin

    _, pk_error = validate_stripe_publishable_key(request.host)
    pk_key = (os.getenv("STRIPE_PUBLISHABLE_KEY") or "").strip()
    if pk_error:
        pk_key = ""

    return jsonify(
        useSupabase=USE_SUPABASE,
        supabaseUrl=SUPABASE_URL if USE_SUPABASE else "",
        supabaseAnonKey=SUPABASE_ANON_KEY if USE_SUPABASE else "",
        protectDownloads=PROTECT_DOWNLOADS,
        apiBase=api_base,
        stripeMode="live" if is_production_env(request.host) else "test",
        stripePublishableKey=pk_key if not pk_error else "",
        stripePublishableKeyError=pk_error,
    )


@app.get("/api/health")
def health():
    _, pk_error = validate_stripe_publishable_key(request.host)
    _, sk_error = validate_stripe_secret_key(request.host)
    return jsonify(
        ok=True,
        supabase=USE_SUPABASE,
        stripe=bool(STRIPE_SECRET_KEY and not sk_error),
        stripeMode="live" if is_production_env(request.host) else "test",
        stripeKeyError=sk_error,
        stripePublishableKeyError=pk_error,
    )


@app.get("/api/my-purchases")
def my_purchases():
    token = (request.headers.get("Authorization") or "").replace("Bearer ", "").strip()
    user = verify_access_token(token)
    if not user:
        return jsonify(error="Non authentifié"), 401

    client = get_supabase_admin()
    result = client.table("purchases").select("ebook_id").eq("user_id", user.id).execute()
    ebook_ids = [row["ebook_id"] for row in (result.data or [])]
    return jsonify(ebookIds=ebook_ids)


@app.get("/api/download/<ebook_id>")
def download_ebook(ebook_id):
    token = (request.headers.get("Authorization") or "").replace("Bearer ", "").strip()
    user = verify_access_token(token)
    allowed, message = can_download(user, ebook_id)
    if not allowed:
        return jsonify(error=message), 403 if user else 401

    rel_path = EBOOK_FILES.get(ebook_id)
    file_path = ROOT / rel_path
    if not file_path.is_file():
        return jsonify(error="Fichier indisponible sur le serveur."), 404

    return send_from_directory(
        file_path.parent,
        file_path.name,
        as_attachment=True,
        download_name=file_path.name,
    )


@app.post("/api/create-checkout-session")
def create_checkout_session():
    _, sk_error = validate_stripe_secret_key(request.host)
    if sk_error:
        return jsonify(error=sk_error), 500

    data = request.get_json(silent=True) or {}
    ebook_ids = data.get("ebookIds", [])
    email = (data.get("email") or "").lower().strip()
    user_id = (data.get("userId") or "").strip()

    if not email or not isinstance(ebook_ids, list) or not ebook_ids:
        return jsonify(error="Requête invalide"), 400

    if USE_SUPABASE and not user_id:
        return jsonify(error="Identifiant utilisateur manquant."), 400

    line_items, valid_ids = build_line_items(ebook_ids)

    if not line_items:
        return jsonify(error="Aucun ebook payable dans le panier"), 400

    metadata = {
        "ebook_ids": ",".join(valid_ids),
        "user_email": email,
    }
    if user_id:
        metadata["user_id"] = user_id

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            customer_email=email,
            success_url=f"{DOMAIN}/success.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{DOMAIN}/panier.html?cancel=1",
            metadata=metadata,
        )
    except stripe.error.StripeError as exc:
        return jsonify(error=str(exc.user_message or exc)), 400

    return jsonify(url=session.url)


@app.post("/api/stripe-webhook")
def stripe_webhook():
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify(error="Webhook non configuré"), 500

    payload = request.data
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        return jsonify(error="Payload invalide"), 400
    except stripe.error.SignatureVerificationError:
        return jsonify(error="Signature invalide"), 400

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("payment_status") == "paid":
            ebook_ids = [x for x in session.get("metadata", {}).get("ebook_ids", "").split(",") if x]
            user_id = session.get("metadata", {}).get("user_id", "")
            record_purchases(user_id, ebook_ids, session.get("id"))

    return jsonify(received=True)


@app.get("/api/verify-session")
def verify_session():
    _, sk_error = validate_stripe_secret_key(request.host)
    if sk_error:
        return jsonify(ok=False, error=sk_error), 500

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
    user_id = session.metadata.get("user_id", "")

    if USE_SUPABASE and user_id:
        record_purchases(user_id, ebook_ids, session_id)

    return jsonify(ok=True, ebookIds=ebook_ids, email=email, userId=user_id)


@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def serve_static(path):
    if path.startswith("api/"):
        return jsonify(error="Not found"), 404

    if PROTECT_DOWNLOADS and path.startswith("assets/ebooks/extracted/"):
        return jsonify(error="Téléchargement protégé. Connectez-vous et utilisez votre espace ebooks."), 403

    target = ROOT / path
    if target.is_file():
        return send_from_directory(ROOT, path)

    html_target = ROOT / f"{path.rstrip('/')}.html" if not path.endswith(".html") else target
    if html_target.is_file():
        return send_from_directory(ROOT, html_target.relative_to(ROOT).as_posix())

    return send_from_directory(ROOT, "index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4242"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"Serveur : {DOMAIN}")
    print(f"Supabase : {'activé' if USE_SUPABASE else 'désactivé (mode localStorage)'}")
    print("Configurez STRIPE_SECRET_KEY et SUPABASE_* dans .env pour la production.")
    app.run(host="0.0.0.0", port=port, debug=debug)
