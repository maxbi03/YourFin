import type { Cents, MaritalStatus } from "./types";

/**
 * Estimation SIMPLIFIÉE du taux marginal d'imposition (fédéral + cantonal + communal),
 * personne seule sans enfant, domiciliée au chef-lieu du canton, sans impôt ecclésiastique.
 * Valeurs approximatives (ordre de grandeur des barèmes 2024-2025) interpolées entre 4 niveaux
 * de revenu imposable. À rafraîchir chaque année — c'est un ordre de grandeur, pas un calcul officiel.
 */
export const CANTONS: Array<{ code: string; name: string }> = [
  { code: "AG", name: "Argovie" },
  { code: "AI", name: "Appenzell Rhodes-Intérieures" },
  { code: "AR", name: "Appenzell Rhodes-Extérieures" },
  { code: "BE", name: "Berne" },
  { code: "BL", name: "Bâle-Campagne" },
  { code: "BS", name: "Bâle-Ville" },
  { code: "FR", name: "Fribourg" },
  { code: "GE", name: "Genève" },
  { code: "GL", name: "Glaris" },
  { code: "GR", name: "Grisons" },
  { code: "JU", name: "Jura" },
  { code: "LU", name: "Lucerne" },
  { code: "NE", name: "Neuchâtel" },
  { code: "NW", name: "Nidwald" },
  { code: "OW", name: "Obwald" },
  { code: "SG", name: "Saint-Gall" },
  { code: "SH", name: "Schaffhouse" },
  { code: "SO", name: "Soleure" },
  { code: "SZ", name: "Schwyz" },
  { code: "TG", name: "Thurgovie" },
  { code: "TI", name: "Tessin" },
  { code: "UR", name: "Uri" },
  { code: "VD", name: "Vaud" },
  { code: "VS", name: "Valais" },
  { code: "ZG", name: "Zoug" },
  { code: "ZH", name: "Zurich" },
];

/** Revenus imposables (CHF) servant de points d'ancrage. */
const ANCHORS = [50_000, 80_000, 120_000, 200_000];

/** Taux marginaux approximatifs (%) aux points d'ancrage, personne seule, chef-lieu. */
const MARGINAL: Record<string, [number, number, number, number]> = {
  AG: [19, 25, 31, 37],
  AI: [14, 18, 22, 26],
  AR: [18, 23, 28, 32],
  BE: [22, 29, 34, 40],
  BL: [21, 28, 34, 40],
  BS: [21, 28, 34, 40],
  FR: [22, 28, 33, 37],
  GE: [21, 29, 36, 43],
  GL: [17, 22, 26, 30],
  GR: [17, 23, 28, 33],
  JU: [24, 30, 35, 39],
  LU: [20, 25, 29, 33],
  NE: [24, 31, 36, 40],
  NW: [15, 19, 22, 26],
  OW: [15, 19, 22, 26],
  SG: [19, 25, 31, 36],
  SH: [18, 24, 29, 34],
  SO: [21, 27, 32, 37],
  SZ: [13, 17, 21, 26],
  TG: [18, 23, 28, 33],
  TI: [17, 24, 31, 38],
  UR: [16, 20, 24, 27],
  VD: [23, 30, 36, 42],
  VS: [21, 28, 33, 38],
  ZG: [10, 15, 20, 26],
  ZH: [18, 24, 30, 37],
};

function interpolate(points: [number, number, number, number], income: number): number {
  if (income <= ANCHORS[0]) return points[0] * Math.max(0.4, income / ANCHORS[0]);
  if (income >= ANCHORS[3]) return points[3];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [x0, x1] = [ANCHORS[i], ANCHORS[i + 1]];
    if (income >= x0 && income <= x1) {
      const t = (income - x0) / (x1 - x0);
      return points[i] + (points[i + 1] - points[i]) * t;
    }
  }
  return points[3];
}

/** Taux marginal estimé (0-1). Le splitting des couples mariés abaisse le taux d'environ 4 points. */
export function marginalRate(canton: string, taxableIncome: Cents, marital: MaritalStatus = "single"): number {
  const points = MARGINAL[canton] ?? MARGINAL.ZH;
  const incomeFr = taxableIncome / 100;
  let rate = interpolate(points, incomeFr);
  if (marital === "married") rate = Math.max(0, rate - 4);
  return Math.round(rate * 10) / 1000;
}

/** Économie d'impôt estimée pour une déduction donnée (versement 3a, rachat LPP…). */
export function estimateTaxSaving(deduction: Cents, rate: number): Cents {
  return Math.round(deduction * rate);
}

export function cantonName(code: string): string {
  return CANTONS.find((c) => c.code === code)?.name ?? code;
}
