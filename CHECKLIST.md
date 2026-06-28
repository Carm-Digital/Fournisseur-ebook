# À faire avant de publier

Cochez chaque étape dans l’ordre. Guide détaillé : [DEPLOY.md](./DEPLOY.md)

## Supabase
- [ ] Créer un projet sur [supabase.com](https://supabase.com)
- [ ] Exécuter `supabase/schema.sql` dans le SQL Editor
- [ ] Copier URL + clés anon et service_role
- [ ] Configurer Site URL et Redirect URLs (Auth)

## Stripe
- [ ] Créer un compte Stripe
- [ ] Récupérer la clé secrète (`STRIPE_SECRET_KEY`)
- [ ] Créer le webhook → `/api/stripe-webhook` (événement `checkout.session.completed`)
- [ ] Copier `STRIPE_WEBHOOK_SECRET`

## Configuration
- [ ] Copier `.env.example` → `.env`
- [ ] Remplir toutes les variables
- [ ] Mettre `DOMAIN` sur votre URL finale
- [ ] `PROTECT_DOWNLOADS=true` et `FLASK_DEBUG=false`

## Fichiers serveur
- [ ] Uploader les ZIP dans `assets/ebooks/extracted/` sur l’hébergeur
- [ ] Vérifier que les couvertures sont dans `assets/ebooks/covers/`

## Déploiement
- [ ] Choisir un hébergeur (Render, Railway, Docker…)
- [ ] Déployer avec `gunicorn server.app:app`
- [ ] Tester `/api/health`
- [ ] Tester inscription → connexion → achat → téléchargement

## Domaine & légal
- [ ] Pointer le nom de domaine vers l’hébergeur
- [ ] HTTPS activé (automatique sur Render/Railway)
- [ ] Relire les pages légales (e-mail : ebookworld.dev@hotmail.com)

## Mise en production Stripe
- [ ] Tout tester en mode **Test**
- [ ] Passer Stripe en mode **Live**
- [ ] Remplacer les clés `sk_test_` par `sk_live_`
