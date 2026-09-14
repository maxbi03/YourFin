import { db, newId, nowISO, SCHEMA_VERSION } from "./index";
import { ensureSeeded } from "./seed";
import { monthKeyOf, nextOccurrence, todayISO } from "@/lib/domain/dates";
import { rulePatternFor } from "@/lib/domain/categorize";
import type {
  Account,
  BackupFile,
  Budget,
  Category,
  Cents,
  Goal,
  ISODate,
  MonthKey,
  Recurring,
  Rule,
  Settings,
  Transaction,
} from "@/lib/domain/types";

/* ------------------------------------------------------------------ Réglages */

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update("app", { ...patch, updatedAt: nowISO() });
}

/* ------------------------------------------------------------------ Comptes */

export type AccountInput = Pick<Account, "name" | "type" | "initialBalance" | "color">;

export async function createAccount(input: AccountInput): Promise<string> {
  const id = newId();
  const count = await db.accounts.count();
  await db.accounts.add({
    id,
    currency: "CHF",
    archived: false,
    sortOrder: count,
    createdAt: nowISO(),
    ...input,
  });
  return id;
}

export async function updateAccount(id: string, patch: Partial<AccountInput & { archived: boolean }>): Promise<void> {
  await db.accounts.update(id, patch);
}

/** Supprime un compte s'il n'a aucune transaction, sinon l'archive. Retourne l'action effectuée. */
export async function removeAccount(id: string): Promise<"deleted" | "archived"> {
  const used = await db.transactions.where("accountId").equals(id).count();
  const usedAsTarget = await db.transactions.filter((t) => t.toAccountId === id).count();
  if (used + usedAsTarget === 0) {
    await db.accounts.delete(id);
    return "deleted";
  }
  await db.accounts.update(id, { archived: true });
  return "archived";
}

/** Solde d'un compte = solde initial + entrées − sorties (transferts compris). */
export function computeBalance(account: Account, transactions: Transaction[]): Cents {
  let balance = account.initialBalance;
  for (const t of transactions) {
    if (t.type === "income" && t.accountId === account.id) balance += t.amount;
    else if (t.type === "expense" && t.accountId === account.id) balance -= t.amount;
    else if (t.type === "transfer") {
      if (t.accountId === account.id) balance -= t.amount;
      if (t.toAccountId === account.id) balance += t.amount;
    }
  }
  return balance;
}

/* ------------------------------------------------------------------ Catégories */

export type CategoryInput = Pick<Category, "name" | "kind" | "group" | "icon" | "color">;

export async function createCategory(input: CategoryInput): Promise<string> {
  const id = newId();
  const count = await db.categories.count();
  await db.categories.add({
    id,
    colorDark: input.color,
    sortOrder: count,
    isSystem: false,
    archived: false,
    ...input,
  });
  return id;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput & { archived: boolean }>): Promise<void> {
  const p: Partial<Category> = { ...patch };
  if (patch.color) p.colorDark = patch.color;
  await db.categories.update(id, p);
}

/** Supprime une catégorie personnalisée : ses transactions passent en "Autres". */
export async function removeCategory(id: string): Promise<void> {
  const cat = await db.categories.get(id);
  if (!cat || cat.isSystem) return;
  const fallback = cat.kind === "income" ? "other_income" : "other";
  await db.transaction("rw", db.categories, db.transactions, db.budgets, db.rules, db.recurring, async () => {
    await db.transactions.where("categoryId").equals(id).modify({ categoryId: fallback });
    await db.recurring.filter((r) => r.categoryId === id).modify({ categoryId: fallback });
    await db.budgets.where("categoryId").equals(id).delete();
    await db.rules.filter((r) => r.categoryId === id).delete();
    await db.categories.delete(id);
  });
}

/* ------------------------------------------------------------------ Transactions */

export interface TransactionInput {
  type: Transaction["type"];
  amount: Cents;
  date: ISODate;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  payee: string;
  note?: string;
  source?: Transaction["source"];
  recurringId?: string;
  goalId?: string;
  importHash?: string;
}

function toTransaction(input: TransactionInput, id = newId()): Transaction {
  const ts = nowISO();
  return {
    id,
    type: input.type,
    amount: Math.abs(Math.round(input.amount)),
    date: input.date,
    month: monthKeyOf(input.date),
    accountId: input.accountId,
    toAccountId: input.type === "transfer" ? input.toAccountId : undefined,
    categoryId: input.type === "transfer" ? undefined : input.categoryId,
    payee: input.payee.trim(),
    note: input.note?.trim() || undefined,
    source: input.source ?? "manual",
    recurringId: input.recurringId,
    goalId: input.goalId,
    importHash: input.importHash,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function addTransaction(input: TransactionInput, opts: { learn?: boolean } = {}): Promise<string> {
  const tx = toTransaction(input);
  await db.transactions.add(tx);
  if (opts.learn && tx.categoryId && tx.payee) await learnRule(tx.payee, tx.categoryId);
  return tx.id;
}

export async function updateTransaction(id: string, input: TransactionInput, opts: { learn?: boolean } = {}): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing) return;
  const next = toTransaction(input, id);
  await db.transactions.put({
    ...next,
    source: existing.source,
    createdAt: existing.createdAt,
    importHash: existing.importHash,
    recurringId: existing.recurringId,
  });
  if (opts.learn && next.categoryId && next.payee && next.categoryId !== existing.categoryId) {
    await learnRule(next.payee, next.categoryId);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

/** Import en masse (CSV) : ignore les doublons via `importHash`. */
export async function bulkAddTransactions(inputs: TransactionInput[]): Promise<{ added: number; skipped: number }> {
  const hashes = inputs.map((i) => i.importHash).filter((h): h is string => !!h);
  const existing = new Set<string>();
  if (hashes.length) {
    const found = await db.transactions.where("importHash").anyOf(hashes).toArray();
    for (const t of found) if (t.importHash) existing.add(t.importHash);
  }
  const fresh: Transaction[] = [];
  for (const input of inputs) {
    if (input.importHash && existing.has(input.importHash)) continue;
    if (input.importHash) existing.add(input.importHash); // doublon à l'intérieur du même fichier
    fresh.push(toTransaction(input));
  }
  await db.transactions.bulkAdd(fresh);
  return { added: fresh.length, skipped: inputs.length - fresh.length };
}

/* ------------------------------------------------------------------ Règles apprises */

export async function learnRule(payee: string, categoryId: string): Promise<void> {
  const pattern = rulePatternFor(payee);
  if (!pattern || pattern.length < 3) return;
  const existing = await db.rules.where("pattern").equals(pattern).first();
  if (existing) {
    if (existing.categoryId !== categoryId) await db.rules.update(existing.id, { categoryId });
    return;
  }
  await db.rules.add({ id: newId(), pattern, categoryId, createdAt: nowISO() });
}

export async function deleteRule(id: string): Promise<void> {
  await db.rules.delete(id);
}

/* ------------------------------------------------------------------ Budgets */

export async function setBudget(categoryId: string, month: MonthKey, amount: Cents): Promise<void> {
  const existing = await db.budgets.where("[categoryId+month]").equals([categoryId, month]).first();
  if (amount <= 0) {
    if (existing) await db.budgets.delete(existing.id);
    return;
  }
  if (existing) await db.budgets.update(existing.id, { amount });
  else await db.budgets.add({ id: newId(), categoryId, month, amount });
}

export async function removeBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

/** Copie les budgets d'un mois vers un autre (sans écraser ceux déjà définis). */
export async function copyBudgets(from: MonthKey, to: MonthKey): Promise<number> {
  const source = await db.budgets.where("month").equals(from).toArray();
  const target = await db.budgets.where("month").equals(to).toArray();
  const defined = new Set(target.map((b) => b.categoryId));
  const toAdd: Budget[] = source
    .filter((b) => !defined.has(b.categoryId))
    .map((b) => ({ id: newId(), categoryId: b.categoryId, month: to, amount: b.amount }));
  if (toAdd.length) await db.budgets.bulkAdd(toAdd);
  return toAdd.length;
}

export async function setBudgets(month: MonthKey, entries: Array<{ categoryId: string; amount: Cents }>): Promise<void> {
  await db.transaction("rw", db.budgets, async () => {
    for (const e of entries) await setBudget(e.categoryId, month, e.amount);
  });
}

/* ------------------------------------------------------------------ Récurrences */

export type RecurringInput = Omit<Recurring, "id" | "createdAt">;

export async function createRecurring(input: RecurringInput): Promise<string> {
  const id = newId();
  await db.recurring.add({ id, createdAt: nowISO(), ...input });
  return id;
}

export async function updateRecurring(id: string, patch: Partial<RecurringInput>): Promise<void> {
  await db.recurring.update(id, patch);
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.delete(id);
}

/**
 * Génère les transactions des récurrences arrivées à échéance (appelé au démarrage).
 * Chaque échéance ≤ aujourd'hui crée une transaction et avance `nextDate`.
 */
export async function processDueRecurring(today: ISODate = todayISO()): Promise<number> {
  const due = await db.recurring.where("nextDate").belowOrEqual(today).toArray();
  let created = 0;
  for (const r of due) {
    if (!r.active) continue;
    let next = r.nextDate;
    const anchorDay = Number(r.nextDate.slice(8, 10));
    let guard = 0;
    while (next <= today && guard < 60) {
      await db.transactions.add(
        toTransaction({
          type: r.type,
          amount: r.amount,
          date: next,
          accountId: r.accountId,
          categoryId: r.categoryId,
          payee: r.payee,
          source: "recurring",
          recurringId: r.id,
        }),
      );
      created++;
      next = nextOccurrence(next, r.frequency, anchorDay);
      guard++;
    }
    await db.recurring.update(r.id, { nextDate: next });
  }
  return created;
}

/* ------------------------------------------------------------------ Objectifs */

export type GoalInput = Pick<Goal, "name" | "icon" | "color" | "targetAmount" | "deadline">;

export async function createGoal(input: GoalInput, initialSaved: Cents = 0): Promise<string> {
  const id = newId();
  await db.goals.add({ id, savedAmount: initialSaved, createdAt: nowISO(), ...input });
  return id;
}

export async function updateGoal(id: string, patch: Partial<GoalInput & { savedAmount: Cents }>): Promise<void> {
  await db.goals.update(id, patch);
}

export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id);
}

export async function contributeToGoal(id: string, amount: Cents): Promise<void> {
  const goal = await db.goals.get(id);
  if (!goal) return;
  await db.goals.update(id, { savedAmount: Math.max(0, goal.savedAmount + amount) });
}

/* ------------------------------------------------------------------ Sauvegarde / restauration */

export async function exportBackup(): Promise<BackupFile> {
  const [accounts, categories, transactions, budgets, recurring, goals, rules, settings] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.recurring.toArray(),
    db.goals.toArray(),
    db.rules.toArray(),
    db.settings.get("app"),
  ]);
  return {
    app: "YourFin",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowISO(),
    accounts,
    categories,
    transactions,
    budgets,
    recurring,
    goals,
    rules,
    settings: settings ?? null,
  };
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.app === "YourFin" && Array.isArray(v.transactions) && Array.isArray(v.accounts);
}

/** Restaure une sauvegarde. `replace` efface tout avant ; `merge` ajoute/écrase par identifiant. */
export async function importBackup(file: BackupFile, mode: "replace" | "merge"): Promise<void> {
  const tables = [db.accounts, db.categories, db.transactions, db.budgets, db.recurring, db.goals, db.rules, db.settings];
  await db.transaction("rw", tables, async () => {
    if (mode === "replace") for (const t of tables) await t.clear();
    await db.accounts.bulkPut(file.accounts ?? []);
    await db.categories.bulkPut(file.categories ?? []);
    await db.transactions.bulkPut(file.transactions ?? []);
    await db.budgets.bulkPut(file.budgets ?? []);
    await db.recurring.bulkPut(file.recurring ?? []);
    await db.goals.bulkPut(file.goals ?? []);
    await db.rules.bulkPut(file.rules ?? []);
    if (file.settings) await db.settings.put({ ...file.settings, id: "app", onboardingDone: true });
  });
  await ensureSeeded();
}

/** Efface toutes les données locales (irréversible) et remet les valeurs par défaut. */
export async function resetAll(): Promise<void> {
  await db.delete();
  await db.open();
  await ensureSeeded();
}

export type { Account, Budget, Category, Goal, Recurring, Rule, Settings, Transaction };
