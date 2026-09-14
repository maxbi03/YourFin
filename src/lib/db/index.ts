import Dexie, { type EntityTable } from "dexie";
import type { Account, Budget, Category, Goal, Recurring, Rule, Settings, Transaction } from "@/lib/domain/types";

/**
 * Base locale (IndexedDB via Dexie). C'est LA couche de persistance de YourFin :
 * tout passe par `repo.ts`, si bien qu'un futur backend (Supabase) se branche ici sans toucher aux écrans.
 */
export class YourFinDB extends Dexie {
  accounts!: EntityTable<Account, "id">;
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  budgets!: EntityTable<Budget, "id">;
  recurring!: EntityTable<Recurring, "id">;
  goals!: EntityTable<Goal, "id">;
  rules!: EntityTable<Rule, "id">;
  settings!: EntityTable<Settings, "id">;

  constructor() {
    super("yourfin");
    this.version(1).stores({
      accounts: "id, type, archived, sortOrder",
      categories: "id, kind, sortOrder",
      transactions: "id, date, month, accountId, categoryId, type, recurringId, importHash, [month+date]",
      budgets: "id, month, categoryId, [categoryId+month]",
      recurring: "id, active, nextDate",
      goals: "id",
      rules: "id, pattern",
      settings: "id",
    });
  }
}

export const SCHEMA_VERSION = 1;

export const db = new YourFinDB();

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
