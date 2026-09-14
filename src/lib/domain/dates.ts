import type { Frequency, ISODate, MonthKey } from "./types";

const pad = (n: number) => n.toString().padStart(2, "0");

/** Date locale -> YYYY-MM-DD (sans passer par UTC, pour éviter les décalages de fuseau). */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function monthKeyOf(iso: ISODate): MonthKey {
  return iso.slice(0, 7);
}

export function currentMonthKey(): MonthKey {
  return monthKeyOf(todayISO());
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthStart(month: MonthKey): ISODate {
  return `${month}-01`;
}

export function monthEnd(month: MonthKey): ISODate {
  return `${month}-${pad(daysInMonth(month))}`;
}

/** Jours restants dans le mois (aujourd'hui inclus) ; 0 si le mois est passé, tous si à venir. */
export function daysLeftInMonth(month: MonthKey, today = todayISO()): number {
  const cur = monthKeyOf(today);
  if (month < cur) return 0;
  if (month > cur) return daysInMonth(month);
  return daysInMonth(month) - fromISODate(today).getDate() + 1;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(from: ISODate, to: ISODate): number {
  const a = fromISODate(from).getTime();
  const b = fromISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Prochaine échéance d'une récurrence (le jour du mois est conservé, borné à la fin du mois). */
export function nextOccurrence(iso: ISODate, frequency: Frequency, anchorDay?: number): ISODate {
  const d = fromISODate(iso);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
    return toISODate(d);
  }
  const months = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const day = anchorDay ?? d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const max = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, max));
  return toISODate(target);
}

/** Nombre d'occurrences par an (pour annualiser). */
export function occurrencesPerYear(frequency: Frequency): number {
  return { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 }[frequency];
}

/** Montant mensuel équivalent d'une récurrence. */
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  return Math.round((amount * occurrencesPerYear(frequency)) / 12);
}

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const MONTHS_FR_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "2026-09" -> "Septembre 2026" */
export function monthLabel(month: MonthKey, withYear = true): string {
  const [y, m] = month.split("-").map(Number);
  return withYear ? `${cap(MONTHS_FR[m - 1])} ${y}` : cap(MONTHS_FR[m - 1]);
}

/** "2026-09" -> "sept." */
export function monthShort(month: MonthKey): string {
  const m = Number(month.slice(5, 7));
  return MONTHS_FR_SHORT[m - 1];
}

/** "2026-09-14" -> "14 sept. 2026" (année omise si courante). */
export function formatDate(iso: ISODate, opts: { year?: boolean } = {}): string {
  const d = fromISODate(iso);
  const showYear = opts.year ?? d.getFullYear() !== new Date().getFullYear();
  return `${d.getDate()} ${MONTHS_FR_SHORT[d.getMonth()]}${showYear ? ` ${d.getFullYear()}` : ""}`;
}

/** Libellé de regroupement : "Aujourd'hui", "Hier", "Lundi 12 sept." */
export function dayGroupLabel(iso: ISODate, today = todayISO()): string {
  if (iso === today) return "Aujourd'hui";
  if (iso === addDays(today, -1)) return "Hier";
  const d = fromISODate(iso);
  return `${cap(DAYS_FR[d.getDay()])} ${formatDate(iso)}`;
}

/** Liste des N derniers mois (le plus ancien en premier), mois courant inclus. */
export function lastMonths(n: number, from: MonthKey = currentMonthKey()): MonthKey[] {
  return Array.from({ length: n }, (_, i) => addMonths(from, i - (n - 1)));
}
