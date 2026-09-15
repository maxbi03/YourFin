"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/basePath";

/** Enregistre le service worker en production uniquement (en dev il gênerait le rechargement à chaud). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {
      /* hors-ligne indisponible : l'app fonctionne quand même en ligne */
    });
  }, []);
  return null;
}
