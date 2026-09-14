import { db, nowISO } from "./index";
import { SYSTEM_CATEGORIES } from "@/lib/domain/categories";
import type { Settings } from "@/lib/domain/types";

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  firstName: "",
  currency: "CHF",
  locale: "fr-CH",
  theme: "system",
  onboardingDone: false,
  pro: false,
  canton: "VD",
  hasPensionFund: true,
  maritalStatus: "single",
  createdAt: "",
  updatedAt: "",
};

/** Garantit la présence des réglages et des catégories système (idempotent, appelé au démarrage). */
export async function ensureSeeded(): Promise<void> {
  await db.transaction("rw", db.settings, db.categories, async () => {
    const settings = await db.settings.get("app");
    if (!settings) {
      const ts = nowISO();
      await db.settings.put({ ...DEFAULT_SETTINGS, createdAt: ts, updatedAt: ts });
    }
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkPut(SYSTEM_CATEGORIES);
    } else {
      // Ajoute les catégories système apparues dans une version ultérieure sans écraser les modifications.
      const existing = new Set((await db.categories.toCollection().primaryKeys()) as string[]);
      const missing = SYSTEM_CATEGORIES.filter((c) => !existing.has(c.id));
      if (missing.length) await db.categories.bulkPut(missing);
    }
  });
}
