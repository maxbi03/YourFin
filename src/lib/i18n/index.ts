"use client";

import { fr, type Dictionary } from "./fr";

export type Locale = "fr";

const dictionaries: Record<Locale, Dictionary> = { fr };

/** Retourne le dictionnaire de la langue active (fr pour l'instant ; DE/EN/IT s'ajoutent dans `dictionaries`). */
export function useT(locale: Locale = "fr"): Dictionary {
  return dictionaries[locale];
}

export { fr };
export type { Dictionary };
