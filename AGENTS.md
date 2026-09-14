<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# YourFin — repères projet

Voir README.md pour la vue d'ensemble. Points non évidents :

- **Export statique** (`output: "export"`) : pas de Server Actions, pas de route dynamique sans `generateStaticParams`, les fichiers metadata (manifest) doivent déclarer `export const dynamic = "force-static"`.
- **Tout le rendu utile est côté client** : `AppShell` affiche un splash tant que Dexie n'est pas prêt, puis rend les pages. Les pages sont des Client Components qui lisent IndexedDB via `useLiveQuery` (`src/lib/hooks/useDb.ts`).
- **Écritures** : uniquement via `src/lib/db/repo.ts`. Ne pas appeler `db.*.put` depuis un composant.
- **Argent** : centimes entiers (`Cents`), formatage via `formatCHF` (`CHF 1'234.50`). Saisie via `parseAmountInput`.
- **Tailwind v4** : tokens dans `src/app/globals.css` (`@theme inline`), mode sombre par classe `.dark` sur `<html>` (`@custom-variant dark`). Les styles de base doivent rester dans `@layer base`, sinon ils écrasent les utilitaires.
- **Lint React Compiler** (`react-hooks/set-state-in-effect`, `static-components`) : pas de `setState` synchrone dans un `useEffect`, pas de composant défini dans un rendu. Réinitialiser un formulaire = le (re)monter avec une `key`, pas un effet.
- **Graphiques** : couleurs des catégories fixes (`src/lib/domain/categories.ts`, version claire/sombre), donut limité à 5 segments + « Autres », toujours accompagné d'une liste icône + nom + montant.
- **Pro** : `settings.pro` (démo). Le gating passe par `<ProGate>` dans `src/components/pro/Paywall.tsx`.
- Vérifier : `npm run typecheck && npm run lint && npm test && npm run build`.
