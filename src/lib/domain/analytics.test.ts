import { describe, expect, it } from "vitest";
import { budgetSummary, detectSubscriptions, financialScore, suggest503020, topWithOther } from "./analytics";
import { SYSTEM_CATEGORIES } from "./categories";
import { normalizeLabel, rulePatternFor, suggestCategory } from "./categorize";
import type { Budget, Transaction } from "./types";

const cats = new Map(SYSTEM_CATEGORIES.map((c) => [c.id, c]));

function tx(partial: Partial<Transaction> & Pick<Transaction, "amount" | "date" | "payee">): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    type: "expense",
    accountId: "a",
    month: partial.date.slice(0, 7),
    source: "manual",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("catégorisation", () => {
  it("normalise les libellés", () => {
    expect(normalizeLabel("  MIGROS  Lausanne-Flon ")).toBe("migros lausanne flon");
    expect(normalizeLabel("Café du Grütli")).toBe("cafe du grutli");
  });

  it("reconnaît les commerces suisses", () => {
    expect(suggestCategory("Migros Lausanne")).toBe("groceries");
    expect(suggestCategory("SBB CFF FFS Mobile")).toBe("transport");
    expect(suggestCategory("Netflix.com")).toBe("subscriptions");
    expect(suggestCategory("Assura SA prime")).toBe("health");
    expect(suggestCategory("Salaire septembre")).toBe("salary");
    expect(suggestCategory("Bancomat Raiffeisen")).toBe("cash");
    expect(suggestCategory("Truc inconnu")).toBeUndefined();
  });

  it("donne la priorité aux règles apprises", () => {
    const rules = [{ id: "r", pattern: "migros", categoryId: "restaurants", createdAt: "" }];
    expect(suggestCategory("Migros Restaurant", rules)).toBe("restaurants");
  });

  it("construit un motif de règle sans numéros", () => {
    expect(rulePatternFor("Migros MMM Crissier 12.09.2026 carte 4567")).toBe("migros mmm crissier");
  });
});

describe("abonnements", () => {
  it("détecte un paiement mensuel régulier et ignore les courses", () => {
    const list = [
      tx({ payee: "Netflix", amount: 1890, date: "2026-06-12", categoryId: "subscriptions" }),
      tx({ payee: "Netflix", amount: 1890, date: "2026-07-12", categoryId: "subscriptions" }),
      tx({ payee: "Netflix", amount: 1890, date: "2026-08-12", categoryId: "subscriptions" }),
      tx({ payee: "Migros", amount: 4500, date: "2026-06-03", categoryId: "groceries" }),
      tx({ payee: "Migros", amount: 4600, date: "2026-06-19", categoryId: "groceries" }),
      tx({ payee: "Migros", amount: 4400, date: "2026-07-02", categoryId: "groceries" }),
      tx({ payee: "Loyer", amount: 165000, date: "2026-06-01", categoryId: "housing" }),
      tx({ payee: "Loyer", amount: 165000, date: "2026-07-01", categoryId: "housing" }),
    ];
    const subs = detectSubscriptions(list);
    expect(subs.map((s) => s.payee)).toEqual(["Netflix"]);
    expect(subs[0].amount).toBe(1890);
    expect(subs[0].months).toBe(3);
  });

  it("mensualise un abonnement annuel", () => {
    const list = [
      tx({ payee: "Amazon Prime", amount: 6900, date: "2025-03-10", categoryId: "subscriptions" }),
      tx({ payee: "Amazon Prime", amount: 6900, date: "2026-03-10", categoryId: "subscriptions" }),
    ];
    expect(detectSubscriptions(list)[0].amount).toBe(575);
  });
});

describe("budget", () => {
  it("résume dépenses, reste et montant journalier", () => {
    const budgets: Budget[] = [{ id: "b1", categoryId: "groceries", month: "2026-09", amount: 50000 }];
    const list = [
      tx({ payee: "Migros", amount: 20000, date: "2026-09-02", categoryId: "groceries" }),
      tx({ payee: "Coop", amount: 10000, date: "2026-09-05", categoryId: "groceries" }),
      tx({ payee: "Pathé", amount: 2000, date: "2026-09-05", categoryId: "leisure" }),
    ];
    const s = budgetSummary("2026-09", budgets, list, cats, "2026-09-21");
    expect(s.spent).toBe(30000);
    expect(s.remaining).toBe(20000);
    expect(s.daysLeft).toBe(10);
    expect(s.perDay).toBe(2000);
    expect(s.unbudgeted.map((u) => u.categoryId)).toEqual(["leisure"]);
  });

  it("ventile la règle 50/30/20", () => {
    const rows = suggest503020(600000, SYSTEM_CATEGORIES);
    const total = rows.reduce((a, r) => a + r.amount, 0);
    // Arrondis "propres" : le total reste proche de 100 % du revenu.
    expect(total).toBeGreaterThan(590000);
    expect(total).toBeLessThan(640000);
    expect(rows.find((r) => r.categoryId === "savings")?.amount).toBe(120000);
  });

  it("replie la queue du donut dans Autres", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ categoryId: `c${i}`, amount: 1000 - i * 100, count: 1 }));
    const top = topWithOther(items, 5);
    expect(top).toHaveLength(6);
    expect(top[5]).toMatchObject({ categoryId: "__other__", amount: 500 + 400 + 300 });
  });
});

describe("score", () => {
  it("récompense l'épargne, le budget tenu et la réserve", () => {
    const good = financialScore({
      current: { incomes: 600000, expenses: 420000, savings: 0 },
      history: [{ incomes: 600000, expenses: 450000, savings: 0 }],
      budget: null,
      subscriptionsMonthly: 5000,
      liquidSavings: 2000000,
    });
    expect(good.total).toBeGreaterThanOrEqual(80);
    const bad = financialScore({
      current: { incomes: 600000, expenses: 620000, savings: 0 },
      history: [],
      budget: null,
      subscriptionsMonthly: 150000,
      liquidSavings: 0,
    });
    expect(bad.total).toBeLessThan(25);
  });
});
