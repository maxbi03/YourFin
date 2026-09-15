"use client";

import { getSupabaseClient } from "./client";
import { exportBackup, importBackup } from "@/lib/db/repo";
import {
  accountToRow,
  budgetToRow,
  categoryToRow,
  goalToRow,
  profileRowToSettings,
  recurringToRow,
  ruleToRow,
  settingsToProfileRow,
  transactionToRow,
  accountFromRow,
  budgetFromRow,
  categoryFromRow,
  goalFromRow,
  recurringFromRow,
  ruleFromRow,
  transactionFromRow,
} from "./mappers";
import type { BackupFile } from "@/lib/domain/types";

/**
 * Synchronisation en "instantané" (pas de fusion changement par changement) : on envoie ou on
 * récupère l'intégralité des données, comme pour l'export/import JSON déjà existant — même
 * principe, la destination change. Volontairement simple pour une v1 : prévisible, sans risque
 * de conflit silencieux entre deux appareils modifiés en même temps.
 */

const CHUNK = 500;
function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function upsertAll(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Synchronisation non configurée.");
  for (const batch of chunks(rows)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`${table} : ${error.message}`);
  }
}

/** Envoie les données locales actuelles vers le compte. N'efface rien côté cloud. */
export async function pushSnapshotToCloud(userId: string): Promise<void> {
  const backup = await exportBackup();
  const customCategories = backup.categories.filter((c) => !c.isSystem);

  // Ordre contraint par les clés étrangères : comptes et catégories avant tout ce qui les référence.
  await upsertAll("accounts", backup.accounts.map((a) => accountToRow(a, userId)));
  await upsertAll("categories", customCategories.map((c) => categoryToRow(c, userId)));
  await upsertAll("goals", backup.goals.map((g) => goalToRow(g, userId)));
  await upsertAll("budgets", backup.budgets.map((b) => budgetToRow(b, userId)));
  await upsertAll("recurring", backup.recurring.map((r) => recurringToRow(r, userId)));
  await upsertAll("transactions", backup.transactions.map((t) => transactionToRow(t, userId)));
  await upsertAll("rules", backup.rules.map((r) => ruleToRow(r, userId)));

  if (backup.settings) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Synchronisation non configurée.");
    const { error } = await supabase.from("profiles").update(settingsToProfileRow(backup.settings)).eq("id", userId);
    if (error) throw new Error(`profil : ${error.message}`);
  }
}

async function selectAll<Row, T>(table: string, map: (r: Row) => T): Promise<T[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Synchronisation non configurée.");
  // RLS filtre déjà par utilisateur (et laisse passer les catégories système, user_id nul).
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(`${table} : ${error.message}`);
  return (data ?? []).map((row) => map(row as Row));
}

/**
 * Récupère les données du compte et **remplace** les données locales de cet appareil.
 * À utiliser pour arriver sur un nouvel appareil, ou après avoir perdu les données locales.
 */
export async function pullSnapshotFromCloud(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Synchronisation non configurée.");

  const [accounts, categories, goals, budgets, recurring, transactions, rules] = await Promise.all([
    selectAll("accounts", accountFromRow),
    selectAll("categories", categoryFromRow),
    selectAll("goals", goalFromRow),
    selectAll("budgets", budgetFromRow),
    selectAll("recurring", recurringFromRow),
    selectAll("transactions", transactionFromRow),
    selectAll("rules", ruleFromRow),
  ]);

  const { data: profileRow, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (profileError) throw new Error(`profil : ${profileError.message}`);

  const backup: BackupFile = {
    app: "YourFin",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    budgets,
    recurring,
    goals,
    rules,
    settings: { id: "app", currency: "CHF", locale: "fr-CH", ...profileRowToSettings(profileRow) },
  };

  await importBackup(backup, "replace");
}
