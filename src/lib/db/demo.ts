import { db, newId, nowISO } from "./index";
import { addMonths, currentMonthKey, daysInMonth, nextOccurrence, todayISO } from "@/lib/domain/dates";
import type { Account, Budget, Goal, Recurring, Transaction } from "@/lib/domain/types";

/**
 * Jeu de données de démonstration : ~5 mois de vie financière suisse plausible.
 * Générateur déterministe (même résultat à chaque chargement).
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Tpl {
  payee: string;
  categoryId: string;
  min: number;
  max: number;
  perMonth: [number, number];
}

const VARIABLE: Tpl[] = [
  { payee: "Migros", categoryId: "groceries", min: 18, max: 95, perMonth: [5, 8] },
  { payee: "Coop", categoryId: "groceries", min: 12, max: 70, perMonth: [3, 5] },
  { payee: "Denner", categoryId: "groceries", min: 9, max: 35, perMonth: [1, 2] },
  { payee: "Aldi Suisse", categoryId: "groceries", min: 20, max: 60, perMonth: [0, 2] },
  { payee: "Restaurant Le Pointu", categoryId: "restaurants", min: 28, max: 65, perMonth: [1, 2] },
  { payee: "McDonald's", categoryId: "restaurants", min: 12, max: 24, perMonth: [1, 3] },
  { payee: "Café du Grütli", categoryId: "restaurants", min: 5, max: 14, perMonth: [2, 5] },
  { payee: "Smood delivery", categoryId: "restaurants", min: 25, max: 48, perMonth: [0, 2] },
  { payee: "Holy Cow!", categoryId: "restaurants", min: 16, max: 28, perMonth: [0, 2] },
  { payee: "TL Lausanne", categoryId: "transport", min: 3.7, max: 7.4, perMonth: [2, 6] },
  { payee: "Migrol station", categoryId: "transport", min: 45, max: 80, perMonth: [0, 2] },
  { payee: "Galaxus", categoryId: "shopping", min: 30, max: 240, perMonth: [0, 2] },
  { payee: "Zalando", categoryId: "shopping", min: 40, max: 130, perMonth: [0, 1] },
  { payee: "H&M", categoryId: "shopping", min: 20, max: 80, perMonth: [0, 1] },
  { payee: "Pathé Flon", categoryId: "leisure", min: 17, max: 22, perMonth: [0, 2] },
  { payee: "Ticketcorner", categoryId: "leisure", min: 45, max: 120, perMonth: [0, 1] },
  { payee: "Pharmacie Amavita", categoryId: "health", min: 12, max: 45, perMonth: [0, 2] },
  { payee: "Bancomat UBS", categoryId: "cash", min: 100, max: 100, perMonth: [1, 1] },
  { payee: "Payot Libraire", categoryId: "education", min: 18, max: 45, perMonth: [0, 1] },
];

const FIXED: Array<{ payee: string; categoryId: string; amount: number; day: number; type: "expense" | "income" }> = [
  { payee: "Salaire — Helvetia Tech SA", categoryId: "salary", amount: 6350, day: 25, type: "income" },
  { payee: "Loyer — Régie du Léman", categoryId: "housing", amount: 1650, day: 1, type: "expense" },
  { payee: "Assura assurance maladie", categoryId: "health", amount: 385.4, day: 5, type: "expense" },
  { payee: "Swisscom", categoryId: "subscriptions", amount: 79.9, day: 10, type: "expense" },
  { payee: "Netflix", categoryId: "subscriptions", amount: 18.9, day: 12, type: "expense" },
  { payee: "Spotify", categoryId: "subscriptions", amount: 12.95, day: 15, type: "expense" },
  { payee: "Activ Fitness", categoryId: "leisure", amount: 69, day: 3, type: "expense" },
  { payee: "CFF abonnement demi-tarif+", categoryId: "transport", amount: 120, day: 3, type: "expense" },
  { payee: "Romande Energie", categoryId: "housing", amount: 62.5, day: 18, type: "expense" },
];

export async function loadDemoData(): Promise<void> {
  const rnd = mulberry32(20260914);
  const today = todayISO();
  const month = currentMonthKey();
  const months = [4, 3, 2, 1, 0].map((i) => addMonths(month, -i));
  const ts = nowISO();

  const accounts: Account[] = [
    { id: newId(), name: "Compte courant", type: "checking", currency: "CHF", initialBalance: 2_400_00, color: "#5b4cff", archived: false, sortOrder: 0, createdAt: ts },
    { id: newId(), name: "Épargne", type: "savings", currency: "CHF", initialBalance: 8_500_00, color: "#1baf7a", archived: false, sortOrder: 1, createdAt: ts },
    { id: newId(), name: "Cash", type: "cash", currency: "CHF", initialBalance: 60_00, color: "#eda100", archived: false, sortOrder: 2, createdAt: ts },
    { id: newId(), name: "Pilier 3a", type: "pillar3a", currency: "CHF", initialBalance: 12_000_00, color: "#4a3aa7", archived: false, sortOrder: 3, createdAt: ts },
  ];
  const [checking, savings, , pillar] = accounts;

  const transactions: Transaction[] = [];
  const push = (t: Omit<Transaction, "id" | "month" | "createdAt" | "updatedAt" | "source">) => {
    if (t.date > today) return;
    transactions.push({ ...t, id: newId(), month: t.date.slice(0, 7), source: "seed", createdAt: ts, updatedAt: ts });
  };
  const day = (m: string, d: number) => `${m}-${String(Math.min(d, daysInMonth(m))).padStart(2, "0")}`;
  const cents = (v: number) => Math.round(v * 100);

  for (const m of months) {
    for (const f of FIXED) {
      push({ type: f.type, amount: cents(f.amount), date: day(m, f.day), accountId: checking.id, categoryId: f.categoryId, payee: f.payee });
    }
    for (const tpl of VARIABLE) {
      const n = tpl.perMonth[0] + Math.floor(rnd() * (tpl.perMonth[1] - tpl.perMonth[0] + 1));
      for (let i = 0; i < n; i++) {
        const d = 1 + Math.floor(rnd() * daysInMonth(m));
        const amount = tpl.min + rnd() * (tpl.max - tpl.min);
        push({ type: "expense", amount: cents(Math.round(amount * 20) / 20), date: day(m, d), accountId: checking.id, categoryId: tpl.categoryId, payee: tpl.payee });
      }
    }
    // Épargne automatique le lendemain du salaire, et 3a certains mois.
    push({ type: "transfer", amount: 500_00, date: day(m, 26), accountId: checking.id, toAccountId: savings.id, payee: "Virement épargne" });
    if (rnd() > 0.35) push({ type: "transfer", amount: 600_00, date: day(m, 27), accountId: checking.id, toAccountId: pillar.id, payee: "Versement pilier 3a" });
    if (rnd() > 0.6) push({ type: "income", amount: cents(60 + rnd() * 180), date: day(m, 8 + Math.floor(rnd() * 10)), accountId: checking.id, categoryId: "refund", payee: "Remboursement CSS" });
  }

  const budgets: Budget[] = [
    ["housing", 1_720_00],
    ["groceries", 520_00],
    ["restaurants", 260_00],
    ["transport", 180_00],
    ["health", 450_00],
    ["subscriptions", 120_00],
    ["shopping", 220_00],
    ["leisure", 150_00],
  ].map(([categoryId, amount]) => ({ id: newId(), categoryId: categoryId as string, month, amount: amount as number }));

  const goals: Goal[] = [
    { id: newId(), name: "Vacances au Japon", icon: "Plane", color: "#eb6834", targetAmount: 4_000_00, savedAmount: 1_350_00, deadline: `${Number(month.slice(0, 4)) + 1}-06-30`, createdAt: ts },
    { id: newId(), name: "Fonds d'urgence", icon: "Shield", color: "#1baf7a", targetAmount: 15_000_00, savedAmount: 8_500_00, createdAt: ts },
  ];

  const recurring: Recurring[] = FIXED.map((f) => {
    let next = day(month, f.day);
    while (next <= today) next = nextOccurrence(next, "monthly", f.day);
    return { id: newId(), type: f.type, amount: cents(f.amount), categoryId: f.categoryId, accountId: checking.id, payee: f.payee, frequency: "monthly", nextDate: next, active: true, createdAt: ts };
  });

  await db.transaction("rw", [db.accounts, db.transactions, db.budgets, db.goals, db.recurring, db.rules, db.settings], async () => {
    await Promise.all([db.accounts.clear(), db.transactions.clear(), db.budgets.clear(), db.goals.clear(), db.recurring.clear(), db.rules.clear()]);
    await db.accounts.bulkAdd(accounts);
    await db.transactions.bulkAdd(transactions);
    await db.budgets.bulkAdd(budgets);
    await db.goals.bulkAdd(goals);
    await db.recurring.bulkAdd(recurring);
    await db.settings.update("app", {
      monthlyNetIncome: 6_350_00,
      taxableIncome: 70_000_00,
      hasPensionFund: true,
      birthYear: 1994,
      onboardingDone: true,
      updatedAt: nowISO(),
    });
  });
}
