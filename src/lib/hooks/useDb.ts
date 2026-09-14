"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db } from "@/lib/db";
import { computeBalance } from "@/lib/db/repo";
import type { Account, Category, MonthKey, Transaction } from "@/lib/domain/types";

/**
 * Hooks de lecture réactifs (Dexie live queries) : chaque écriture dans IndexedDB
 * re-rend automatiquement les composants abonnés.
 */

export function useSettings() {
  return useLiveQuery(() => db.settings.get("app"), []);
}

export function useAccounts(includeArchived = false) {
  return useLiveQuery(
    async () => {
      const all = await db.accounts.orderBy("sortOrder").toArray();
      return includeArchived ? all : all.filter((a) => !a.archived);
    },
    [includeArchived],
  );
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy("sortOrder").toArray(), []);
}

/** Map id -> catégorie, pratique pour les listes. */
export function useCategoryMap(): Map<string, Category> {
  const cats = useCategories();
  return useMemo(() => new Map((cats ?? []).map((c) => [c.id, c])), [cats]);
}

export function useTransactionsByMonth(month: MonthKey) {
  return useLiveQuery(() => db.transactions.where("month").equals(month).reverse().sortBy("date"), [month]);
}

/** Transactions sur une plage de mois (bornes incluses), triées par date décroissante. */
export function useTransactionsBetween(fromMonth: MonthKey, toMonth: MonthKey) {
  return useLiveQuery(
    async () => {
      const list = await db.transactions.where("month").between(fromMonth, toMonth, true, true).toArray();
      return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
    },
    [fromMonth, toMonth],
  );
}

export function useAllTransactions() {
  return useLiveQuery(() => db.transactions.toArray(), []);
}

export function useRecentTransactions(limit = 5) {
  return useLiveQuery(() => db.transactions.orderBy("date").reverse().limit(limit).toArray(), [limit]);
}

export function useBudgets(month: MonthKey) {
  return useLiveQuery(() => db.budgets.where("month").equals(month).toArray(), [month]);
}

export function useRecurring() {
  return useLiveQuery(() => db.recurring.toArray(), []);
}

export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), []);
}

export function useRules() {
  return useLiveQuery(() => db.rules.toArray(), []);
}

export interface AccountWithBalance extends Account {
  balance: number;
}

/** Comptes actifs avec leur solde calculé à partir de toutes les transactions. */
export function useAccountBalances(): { accounts: AccountWithBalance[] | undefined; total: number } {
  const accounts = useAccounts();
  const transactions = useAllTransactions();
  return useMemo(() => {
    if (!accounts || !transactions) return { accounts: undefined, total: 0 };
    const withBalance = accounts.map((a) => ({ ...a, balance: computeBalance(a, transactions) }));
    // Le pilier 3a et les investissements sont du patrimoine, pas de l'argent disponible : on les sépare du total "disponible".
    const total = withBalance.filter((a) => a.type !== "pillar3a" && a.type !== "investment").reduce((s, a) => s + a.balance, 0);
    return { accounts: withBalance, total };
  }, [accounts, transactions]);
}

export function txSign(t: Transaction): 1 | -1 | 0 {
  return t.type === "income" ? 1 : t.type === "expense" ? -1 : 0;
}
