import type { MetadataRoute } from "next";

// Requis par l'export statique : le manifest est généré au build.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YourFin — Your money, Your control",
    short_name: "YourFin",
    description:
      "Budget, suivi des dépenses et analyse — 100 % gratuit, tes données restent sur ton appareil.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f4f8",
    theme_color: "#5b4cff",
    lang: "fr",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
