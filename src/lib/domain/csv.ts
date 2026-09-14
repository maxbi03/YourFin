import { normalizeLabel } from "./categorize";
import type { Cents, ISODate } from "./types";

/**
 * Import CSV générique pour relevés bancaires suisses (UBS, PostFinance, Raiffeisen, ZKB, Yuh, Neon, Revolut…).
 * Stratégie : détection du séparateur, saut du préambule, reconnaissance des colonnes par en-tête
 * (FR/DE/IT/EN), puis validation par l'utilisateur dans l'écran d'import.
 */

export interface ColumnMapping {
  date: number | null;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  description: number | null;
  description2: number | null;
}

export interface CsvAnalysis {
  delimiter: string;
  headerIndex: number;
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
}

export interface ImportRow {
  date: ISODate;
  /** Signé : négatif = dépense, positif = revenu. */
  amount: Cents;
  payee: string;
  hash: string;
  raw: string[];
}

export function detectDelimiter(sample: string): string {
  const candidates = [";", ",", "\t", "|"];
  const lines = sample.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
  let best = ";";
  let bestScore = -1;
  for (const d of candidates) {
    const counts = lines.map((l) => splitLine(l, d).length);
    const avg = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    const consistency = counts.filter((c) => c === Math.round(avg)).length / Math.max(1, counts.length);
    const score = avg > 1 ? avg * consistency : 0;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Découpe une ligne CSV en respectant les guillemets. */
export function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseCSV(text: string, delimiter?: string): { delimiter: string; rows: string[][] } {
  const clean = text.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(clean);
  // Gère les champs multilignes entre guillemets.
  const rows: string[][] = [];
  let buffer = "";
  let quotes = 0;
  for (const line of clean.split(/\r?\n/)) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    quotes += (line.match(/"/g) ?? []).length;
    if (quotes % 2 === 0) {
      if (buffer.trim()) rows.push(splitLine(buffer, d));
      buffer = "";
      quotes = 0;
    }
  }
  if (buffer.trim()) rows.push(splitLine(buffer, d));
  return { delimiter: d, rows };
}

const DATE_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:[ T].*)?$|^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/;

export function parseDateCell(raw: string): ISODate | null {
  const s = raw.trim();
  const m = DATE_RE.exec(s);
  if (!m) return null;
  let y: number, mo: number, d: number;
  if (m[4]) {
    y = Number(m[4]);
    mo = Number(m[5]);
    d = Number(m[6]);
  } else {
    d = Number(m[1]);
    mo = Number(m[2]);
    y = Number(m[3]);
    if (y < 100) y += 2000;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "1'234.50", "-12,30", "CHF 45.00", "12.30-" -> centimes signés. */
export function parseAmountCell(raw: string): Cents | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/[A-Za-z]{3}/g, "").replace(/[\s'’ ]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (s.startsWith("+")) s = s.slice(1);
  // Détermine le séparateur décimal : le dernier "." ou "," présent.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const value = Math.round(Number.parseFloat(s) * 100);
  return negative ? -value : value;
}

const HEADER_PATTERNS: Array<[keyof ColumnMapping, RegExp]> = [
  ["date", /^(date|datum|data|buchungsdatum|booking date|trade date|started date|completed date|date de transaction|date comptable|date d.ex|transaktionsdatum|booked at|date valeur|valuta|value date)/i],
  ["debit", /(d[ée]bit|soll|dare|belastung|ausgang|withdrawal|d[ée]bit en chf)/i],
  ["credit", /(cr[ée]dit|haben|avere|gutschrift|eingang|deposit|cr[ée]dit en chf)/i],
  ["amount", /^(montant|amount|betrag|importo|credit\/debit amount|amount details|montant \(chf\))/i],
  ["description", /(description|text|libell[ée]|buchungstext|beschreibung|notification|communication|payee|b[ée]n[ée]ficiaire|merchant|subject|d[ée]tails|description1|texte)/i],
];

const BALANCE_RE = /(solde|balance|saldo)/i;

function detectMapping(headers: string[], rows: string[][]): ColumnMapping {
  const mapping: ColumnMapping = { date: null, amount: null, debit: null, credit: null, description: null, description2: null };
  headers.forEach((h, i) => {
    const header = h.trim();
    if (!header || BALANCE_RE.test(header)) return;
    for (const [key, re] of HEADER_PATTERNS) {
      if (!re.test(header)) continue;
      if (key === "description" && mapping.description !== null) {
        if (mapping.description2 === null) mapping.description2 = i;
        break;
      }
      if (mapping[key] === null) mapping[key] = i;
      break;
    }
  });
  // Repli par analyse du contenu : première colonne où la majorité des cellules est une date / un montant.
  const sample = rows.slice(0, 15);
  if (mapping.date === null) mapping.date = findColumn(sample, (c) => parseDateCell(c) !== null);
  if (mapping.amount === null && mapping.debit === null && mapping.credit === null) {
    mapping.amount = findColumn(sample, (c) => parseAmountCell(c) !== null && /\d/.test(c) && parseDateCell(c) === null, mapping.date);
  }
  if (mapping.description === null) {
    mapping.description = findColumn(sample, (c) => c.length > 3 && parseDateCell(c) === null && parseAmountCell(c) === null, mapping.date);
  }
  return mapping;
}

function findColumn(rows: string[][], test: (cell: string) => boolean, exclude: number | null = null): number | null {
  const width = Math.max(0, ...rows.map((r) => r.length));
  for (let i = 0; i < width; i++) {
    if (i === exclude) continue;
    const cells = rows.map((r) => r[i] ?? "").filter((c) => c !== "");
    if (cells.length && cells.filter(test).length >= Math.ceil(cells.length * 0.7)) return i;
  }
  return null;
}

/** Analyse un fichier CSV : trouve la ligne d'en-tête (après un éventuel préambule) et propose une correspondance de colonnes. */
export function analyzeCSV(text: string): CsvAnalysis {
  const { delimiter, rows } = parseCSV(text);
  // L'en-tête est la première ligne ayant ≥ 3 colonnes dont une reconnue, suivie d'une ligne contenant une date.
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length - 1, 30); i++) {
    const row = rows[i];
    if (row.length < 3) continue;
    const recognized = row.some((c) => HEADER_PATTERNS.some(([, re]) => re.test(c)));
    const nextHasDate = rows[i + 1]?.some((c) => parseDateCell(c) !== null);
    if (recognized && nextHasDate) {
      headerIndex = i;
      break;
    }
  }
  let headers: string[];
  let dataRows: string[][];
  if (headerIndex >= 0) {
    headers = rows[headerIndex];
    dataRows = rows.slice(headerIndex + 1);
  } else {
    // Pas d'en-tête : on démarre à la première ligne contenant une date.
    const first = rows.findIndex((r) => r.some((c) => parseDateCell(c) !== null));
    headers = (rows[Math.max(0, first)] ?? []).map((_, i) => `Colonne ${i + 1}`);
    dataRows = rows.slice(Math.max(0, first));
  }
  const width = Math.max(headers.length, ...dataRows.map((r) => r.length));
  while (headers.length < width) headers.push(`Colonne ${headers.length + 1}`);
  dataRows = dataRows.filter((r) => r.some((c) => c !== ""));
  return { delimiter, headerIndex, headers, rows: dataRows, mapping: detectMapping(headers, dataRows) };
}

/** Empreinte stable d'une ligne (date + montant + libellé normalisé) pour éviter les doublons. */
export function importHash(date: ISODate, amount: Cents, payee: string): string {
  const input = `${date}|${amount}|${normalizeLabel(payee)}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x9e3779b1) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/** Construit les lignes importables à partir de la correspondance validée. Les lignes invalides sont ignorées. */
export function buildImportRows(rows: string[][], mapping: ColumnMapping): { rows: ImportRow[]; invalid: number } {
  const out: ImportRow[] = [];
  let invalid = 0;
  for (const raw of rows) {
    const date = mapping.date !== null ? parseDateCell(raw[mapping.date] ?? "") : null;
    let amount: Cents | null = null;
    if (mapping.amount !== null) amount = parseAmountCell(raw[mapping.amount] ?? "");
    if (amount === null && (mapping.debit !== null || mapping.credit !== null)) {
      const debit = mapping.debit !== null ? parseAmountCell(raw[mapping.debit] ?? "") : null;
      const credit = mapping.credit !== null ? parseAmountCell(raw[mapping.credit] ?? "") : null;
      if (debit !== null && debit !== 0) amount = -Math.abs(debit);
      else if (credit !== null && credit !== 0) amount = Math.abs(credit);
    }
    const parts = [mapping.description, mapping.description2]
      .filter((i): i is number => i !== null)
      .map((i) => (raw[i] ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const payee = parts.join(" · ").slice(0, 120);
    if (!date || amount === null || amount === 0) {
      invalid++;
      continue;
    }
    out.push({ date, amount, payee: payee || "Import", hash: importHash(date, amount, payee), raw });
  }
  return { rows: out, invalid };
}

export const SUPPORTED_BANKS = ["UBS", "PostFinance", "Raiffeisen", "ZKB", "BCV", "Yuh", "Neon", "Revolut", "Zak", "Migros Bank"];
