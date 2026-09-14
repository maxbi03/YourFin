import type { Cents } from "./types";

export interface FormatOptions {
  /** "auto" : signe négatif seulement ; "always" : + pour les positifs ; "never" : jamais de signe. */
  sign?: "auto" | "always" | "never";
  /** Afficher "CHF " devant le montant. */
  currency?: boolean;
  /** Nombre de décimales (0 pour arrondir au franc). */
  decimals?: 0 | 2;
  /** Format compact : 12.4k, 1.2M. */
  compact?: boolean;
}

const APOSTROPHE = "'";

/** Séparateur de milliers suisse : 1'234.50 */
export function groupThousands(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, APOSTROPHE);
}

/** Formate des centimes en francs suisses : "CHF 1'234.50". */
export function formatCHF(cents: Cents, opts: FormatOptions = {}): string {
  const { sign = "auto", currency = true, decimals = 2, compact = false } = opts;
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  const abs = Math.abs(safe);
  let body: string;
  if (compact && abs >= 1_000_000_00) {
    body = `${(abs / 1_000_000_00).toFixed(2).replace(/\.?0+$/, "")}M`;
  } else if (compact && abs >= 10_000_00) {
    body = `${(abs / 1_000_00).toFixed(1).replace(/\.0$/, "")}k`;
  } else if (decimals === 0) {
    body = groupThousands(Math.round(abs / 100).toString());
  } else {
    const francs = Math.floor(abs / 100);
    const rp = abs % 100;
    body = `${groupThousands(francs.toString())}.${rp.toString().padStart(2, "0")}`;
  }
  const prefix = safe < 0 ? "-" : sign === "always" && safe > 0 ? "+" : "";
  return `${prefix}${currency ? "CHF " : ""}${body}`;
}

/** Convertit une saisie utilisateur ("12.50", "12,50", "1'234.5", "CHF 20") en centimes. Retourne null si invalide. */
export function parseAmountInput(raw: string): Cents | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/CHF|Fr\.?|\s|['’]/gi, "");
  if (!s) return null;
  // Si la virgule est le séparateur décimal (pas de point après elle), on la convertit.
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  s = s.replace(/,/g, "");
  if (!/^-?\d*(\.\d{0,2})?$/.test(s) || s === "-" || s === "." || s === "-.") return null;
  const value = Number.parseFloat(s);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Centimes -> chaîne éditable ("1234.50") pour pré-remplir un champ. */
export function centsToInput(cents: Cents): string {
  return (cents / 100).toFixed(2);
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
