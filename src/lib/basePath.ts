/**
 * Sous-chemin de déploiement (ex. "/YourFin" sur GitHub Pages, qui sert les sites de projet
 * sous github.io/<repo>/ ; "" en local et sur un hébergeur à la racine comme Vercel ou
 * Cloudflare Pages). Doit rester en phase avec `basePath`/`assetPrefix` dans next.config.ts —
 * les deux lisent la même variable d'environnement pour ne jamais diverger.
 *
 * Préfixe NEXT_PUBLIC_ obligatoire : cette valeur est aussi utilisée côté client
 * (enregistrement du service worker), qui n'a accès qu'aux variables d'env exposées ainsi.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
