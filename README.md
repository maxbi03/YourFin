<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="YourFin" />
</p>

<h1 align="center">YourFin</h1>
<p align="center"><strong>Your money, Your control.</strong></p>
<p align="center">Budget, suivi des dépenses et analyse — gratuit, sans compte, tes données restent sur ton appareil.<br/>Pensé pour la Suisse : CHF, banques suisses, pilier 3a, impôts cantonaux.</p>

---

## Fonctionnalités

**Gratuit, pour toujours**

- **Budget** par catégorie et par mois, reste à dépenser, montant journalier « pour tenir le mois », suggestions automatiques (moyenne des 3 derniers mois ou règle 50/30/20).
- **Transactions** : saisie en 3 taps, catégorisation automatique (dictionnaire de commerces suisses + règles apprises), recherche, filtres.
- **Import CSV** des relevés bancaires (UBS, PostFinance, Raiffeisen, ZKB, Yuh, Neon, Revolut…) avec détection automatique des colonnes et dédoublonnage.
- **Récurrences** : loyer, salaire, abonnements créés automatiquement à chaque échéance.
- **Objectifs d'épargne** avec échéance et montant mensuel nécessaire.
- **Analyse** : score de santé financière, taux d'épargne, réserve de sécurité, abonnements détectés, top catégories vs mois précédent, pistes d'amélioration.
- **Comptes multiples** (courant, épargne, cash, carte, investissements, 3a), sauvegarde/restauration JSON, mode sombre, PWA installable.

**YourFin Pro** (simulé en v1 — s'active en mode démo dans les réglages)

- **Simulateur d'investissement** : compare compte épargne, obligations, portefeuille 60/40 et ETF actions monde avec ton épargne réelle, fourchette plausible, exemples d'allocation par profil. *Exemples pédagogiques, pas un conseil en placement.*
- **Assistant 3a & impôts** : plafond de l'année, versements suivis, économie d'impôt estimée selon canton et revenu, comparaison 3a banque vs 3a titres jusqu'à la retraite, rappel avant le 31 décembre. *Estimations indicatives.*

## Stack

- [Next.js 16](https://nextjs.org) (App Router, export statique) + React 19 + TypeScript
- Tailwind CSS v4, icônes [lucide](https://lucide.dev), graphiques [Recharts](https://recharts.org)
- [Dexie](https://dexie.org) (IndexedDB) — 100 % local, aucun backend
- Vitest pour la logique métier

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

Autres commandes :

```bash
npm run build      # export statique dans ./out
npm start          # sert ./out en local
npm test           # tests unitaires (vitest)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run icons      # régénère les icônes PWA depuis le logo SVG
```

Pour explorer l'app avec des données réalistes : **Réglages → Données → Charger des données de démo**.

## Déployer

`npm run build` produit un site statique dans `out/` : hébergeable gratuitement sur Vercel, Cloudflare Pages, Netlify ou GitHub Pages (ajouter `basePath` dans `next.config.ts` si le site n'est pas à la racine).

## Architecture

```
src/
  app/                 pages (App Router) : accueil, transactions, budget, goals, insights, invest, pillar3a, settings…
  components/
    layout/AppShell    navigation (barre d'onglets mobile / sidebar desktop), bouton +, démarrage
    transactions/      feuille d'ajout/édition, import CSV, ligne de transaction
    charts/            donut, colonnes, courbes (Recharts, thème via variables CSS)
    pro/               paywall & gating des fonctions Pro
    ui/                primitives (Button, Card, Sheet, Field, Ring, ProgressBar…)
  lib/
    db/                Dexie : schéma, seed, repo (toutes les écritures), démo, sauvegarde
    domain/            logique métier pure et testée : money, dates, categorize, csv, analytics, invest, tax, pillar3a
    hooks/             hooks réactifs (live queries), thème
    i18n/              dictionnaire FR (structure prête pour DE/EN/IT)
    features.ts        drapeaux Pro
```

Principes : montants en **centimes entiers**, dates en `YYYY-MM-DD` local, la couleur d'une catégorie **suit l'entité** (jamais son rang), toutes les écritures passent par `lib/db/repo.ts` pour pouvoir brancher un backend (Supabase) plus tard sans toucher aux écrans.

## Constantes à vérifier chaque année

- `src/lib/domain/pillar3a.ts` : plafonds 3a (7'258 / 36'288 CHF pour 2025-2026).
- `src/lib/domain/tax.ts` : taux marginaux approximatifs par canton (ordres de grandeur, personne seule, chef-lieu).

## Avertissement

YourFin fournit des outils de suivi et des **exemples pédagogiques**. Il ne s'agit ni d'un conseil financier, ni d'un conseil fiscal. Les projections reposent sur des hypothèses simplifiées ; les performances passées ne préjugent pas des performances futures.
