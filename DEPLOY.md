# Guide de publication — Les bons contacts

Ce guide décrit les étapes pour mettre le site en production avec **Supabase** (auth + achats) et **Stripe** (paiements).

---

## Checklist avant publication

- [ ] Compte [Supabase](https://supabase.com) créé
- [ ] Compte [Stripe](https://stripe.com) en mode Live (ou Test pour essais)
- [ ] Hébergeur choisi (Render, Railway, Fly.io, VPS…)
- [ ] Nom de domaine configuré (ex. `lesbonscontacts.fr`)
- [ ] Fichiers ZIP des annuaires uploadés sur le serveur (`assets/ebooks/extracted/`)

---

## 1. Supabase

### 1.1 Créer le projet

1. [supabase.com](https://supabase.com) → **New project**
2. Notez l’**URL** et les clés **anon** / **service_role** (Settings → API)

### 1.2 Exécuter le schéma SQL

1. Supabase → **SQL Editor** → New query
2. Collez le contenu de `supabase/schema.sql`
3. Cliquez **Run**

Cela crée les tables `profiles` et `purchases` + les règles de sécurité (RLS).

### 1.3 Auth

1. Supabase → **Authentication** → **Providers** → Email : activé
2. **Authentication** → **URL Configuration** :
   - Site URL : `https://votre-domaine.fr`
   - Redirect URLs : `https://votre-domaine.fr/**`

Pour les tests locaux, ajoutez aussi `http://localhost:4242/**`.

---

## 2. Stripe

### 2.1 Clés API

1. [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copiez la **Secret key** (`sk_live_...` ou `sk_test_...`)

### 2.2 Webhook (obligatoire en production)

1. Stripe → **Developers** → **Webhooks** → Add endpoint
2. URL : `https://votre-domaine.fr/api/stripe-webhook`
3. Événements : `checkout.session.completed`
4. Copiez le **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET` dans `.env`

Sans webhook, les achats ne sont enregistrés que si l’utilisateur ouvre `success.html`.

---

## 3. Variables d’environnement

Copiez `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Remplissez :

| Variable | Description |
|----------|-------------|
| `DOMAIN` | URL publique du site (sans slash final) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon (publique, côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (serveur uniquement, jamais côté client) |
| `PROTECT_DOWNLOADS` | `true` — bloque l’accès direct aux ZIP |
| `FLASK_DEBUG` | `false` en production |

---

## 4. Lancer en local

```bash
pip install -r server/requirements.txt
python server/app.py
```

Site : [http://localhost:4242](http://localhost:4242)

**Sans Supabase** : le site repasse en mode localStorage (développement uniquement).

---

## 5. Déployer le serveur

Le site est une app **Flask** qui sert les fichiers statiques + les API.

### Option A — Render

1. Connectez le repo GitHub
2. **New Web Service** → Environment : Python
3. Build : `pip install -r server/requirements.txt`
4. Start : `gunicorn server.app:app --bind 0.0.0.0:$PORT`
5. Ajoutez toutes les variables `.env` dans **Environment**

### Option B — Docker

```bash
docker build -t les-bons-contacts .
docker run -p 8080:8080 --env-file .env les-bons-contacts
```

### Option C — Railway / Fly.io

Même principe : Python 3.12, commande Gunicorn, variables d’environnement.

---

## 6. Fichiers volumineux (ZIP)

Les annuaires ZIP ne sont pas sur GitHub (> 100 Mo). Sur le serveur de production :

1. Uploadez `assets/ebooks/extracted/*.zip` via SFTP ou le panneau hébergeur
2. Vérifiez que `PROTECT_DOWNLOADS=true` — les ZIP ne sont accessibles que via `/api/download/:id` après connexion + achat

---

## 7. Vérifications finales

| Test | Résultat attendu |
|------|------------------|
| `GET /api/health` | `{ ok: true, supabase: true, stripe: true }` |
| Inscription | Compte créé dans Supabase Auth |
| Connexion | Session active, nav mise à jour |
| Ebooks gratuits | Téléchargement après inscription |
| Paiement test Stripe | Achats dans table `purchases` |
| URL directe ZIP | Erreur 403 |
| Webhook Stripe | Entrées dans `purchases` même sans ouvrir success.html |

---

## 8. Sécurité

- Ne commitez **jamais** `.env`
- `SUPABASE_SERVICE_ROLE_KEY` uniquement sur le serveur
- Passez Stripe en **mode Live** uniquement quand tout est testé
- Désactivez `FLASK_DEBUG` en production

---

## 9. Support

Contact : ebookworld.dev@hotmail.com

Site créé par **DevCraft**.
