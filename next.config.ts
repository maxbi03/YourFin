import type { NextConfig } from "next";

// YourFin est une app 100 % locale (local-first) : export statique, aucun serveur requis.
// Le dossier `out/` se déploie sur n'importe quel hébergeur statique (Vercel, Cloudflare Pages, Netlify…).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
