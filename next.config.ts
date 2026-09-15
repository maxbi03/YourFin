import type { NextConfig } from "next";

// Doit rester synchronisé avec src/lib/basePath.ts (même variable d'environnement) :
// "" en local et sur un hébergeur à la racine (Vercel, Cloudflare Pages…), "/YourFin" sur
// GitHub Pages (site de projet servi sous github.io/YourFin/). Défini par le workflow CI.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// YourFin est une app 100 % locale (local-first) : export statique, aucun serveur requis.
// Le dossier `out/` se déploie sur n'importe quel hébergeur statique (Vercel, Cloudflare Pages, GitHub Pages…).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  basePath: BASE_PATH || undefined,
  assetPrefix: BASE_PATH || undefined,
  // Autorise l'accès au serveur de dev depuis un autre appareil du réseau local (ex. test sur téléphone).
  // Next.js bloque par défaut les requêtes internes (RSC, HMR) hors localhost pour éviter le DNS rebinding.
  // Sans effet en production (uniquement pris en compte par `next dev`).
  allowedDevOrigins: ["192.168.1.145", "192.168.1.*"],
};

export default nextConfig;
