# YourFin — backend Supabase (compte optionnel)

Le local reste le fonctionnement par défaut, gratuit et sans compte. Ce dossier ne sert qu'à
la fonctionnalité optionnelle de compte + synchronisation — compte simple (e-mail suffit),
données minimales, chaque table cloisonnée par utilisateur via Row Level Security.

## Créer le projet (une seule fois, à faire toi-même)

Je ne peux pas créer le compte à ta place (ça demande ta propre connexion) — 2 minutes :

1. Va sur [supabase.com](https://supabase.com) → crée un compte (GitHub, Google ou e-mail).
2. **New project** → nom `yourfin` (ou ce que tu veux) → mot de passe de base de données
   (génère-le et note-le dans un gestionnaire de mots de passe, pas ailleurs) → **Region : Central
   EU (Zurich)** (`eu-central-2`) — c'est celle qui compte pour l'hébergement en Suisse, ne prends
   pas la région générique "Europe".
3. Une fois le projet créé (~1 minute de provisionnement) : **SQL Editor** → **New query** → colle
   le contenu de [`migrations/0001_init.sql`](migrations/0001_init.sql) → **Run**.
4. **Project Settings → API** : copie l'**URL** du projet et la clé **`anon` `public`**.

## Ce qu'il faut me redonner

Colle-moi les deux valeurs de l'étape 4 (l'URL et la clé `anon` — jamais la clé `service_role`,
qui elle est secrète) : je les mets dans `.env.local` et je branche l'écran de connexion.

## Garder le projet éveillé sur le plan gratuit

Le plan gratuit met le projet en pause après 7 jours sans requête. Un workflow GitHub Actions
(`.github/workflows/supabase-keepalive.yml`) le ping toutes les 3 jours pour l'empêcher — il a
besoin de deux secrets sur le dépôt GitHub (**Settings → Secrets and variables → Actions**) :

- `SUPABASE_URL` — la même URL qu'à l'étape 4
- `SUPABASE_ANON_KEY` — la même clé `anon` qu'à l'étape 4

## Activer les passkeys (optionnel, bêta chez Supabase)

**Authentication → Passkeys** dans le dashboard → active-les quand tu veux ; l'app démarre avec
la connexion par lien magique (e-mail) qui suffit seule, et les passkeys s'ajouteront ensuite
sans rien casser côté utilisateurs déjà inscrits.
