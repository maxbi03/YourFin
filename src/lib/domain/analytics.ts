import { normalizeLabel } from "./categorize";
import { addMonths, daysLeftInMonth, monthKeyOf } from "./dates";
import { clamp, sum } from "./money";
import type { Budget, Category, Cents, MonthKey, Transaction } from "./types";

/* ------------------------------------------------------------------ Totaux */

export interface MonthTotals {
  /** Dépenses "consommation" (hors groupe épargne). */
  expenses: Cents;
  /** Montants versés vers l'épargne/investissement (catégories du groupe savings). */
  savings: Cents;
  incomes: Cents;
}

export function isSavingsCategory(cat: Category | undefined): boolean {
  return cat?.group === "savings";
}

export function monthTotals(transactions: Transaction[], categories: Map<string, Category>): MonthTotals {
  let expenses = 0;
  let savings = 0;
  let incomes = 0;
  for (const t of transactions) {
    if (t.type === "income") incomes += t.amount;
    else if (t.type === "expense") {
      if (isSavingsCategory(t.categoryId ? categories.get(t.categoryId) : undefined)) savings += t.amount;
      else expenses += t.amount;
    }
  }
  return { expenses, savings, incomes };
}

export interface CategorySpend {
  categoryId: string | undefined;
  amount: Cents;
  count: number;
}

/** Dépenses par catégorie (hors épargne), triées par montant décroissant. */
export function spendingByCategory(transactions: Transaction[], categories: Map<string, Category>): CategorySpend[] {
  const acc = new Map<string | undefined, CategorySpend>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const cat = t.categoryId ? categories.get(t.categoryId) : undefined;
    if (isSavingsCategory(cat)) continue;
    const key = cat?.id;
    const entry = acc.get(key) ?? { categoryId: key, amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    acc.set(key, entry);
  }
  return [...acc.values()].sort((a, b) => b.amount - a.amount);
}

/** Groupe les N premières catégories et replie le reste dans "Autres" (pour un donut lisible). */
export function topWithOther(items: CategorySpend[], top = 5): Array<CategorySpend & { isOther?: boolean }> {
  if (items.length <= top + 1) return items;
  const head = items.slice(0, top);
  const rest = items.slice(top);
  return [...head, { categoryId: "__other__", amount: sum(rest.map((r) => r.amount)), count: sum(rest.map((r) => r.count)), isOther: true }];
}

/* ------------------------------------------------------------------ Budget */

export interface BudgetLine {
  budget: Budget;
  category: Category | undefined;
  spent: Cents;
  remaining: Cents;
  ratio: number;
}

export interface BudgetSummary {
  lines: BudgetLine[];
  budgeted: Cents;
  spent: Cents;
  remaining: Cents;
  ratio: number;
  /** Dépenses dans des catégories sans budget. */
  unbudgeted: CategorySpend[];
  /** Montant journalier disponible jusqu'à la fin du mois. */
  perDay: Cents;
  daysLeft: number;
}

export function budgetSummary(
  month: MonthKey,
  budgets: Budget[],
  transactions: Transaction[],
  categories: Map<string, Category>,
  today?: string,
): BudgetSummary {
  const spend = spendingByCategory(transactions, categories);
  const spentBy = new Map(spend.map((s) => [s.categoryId, s.amount]));
  const lines: BudgetLine[] = budgets
    .map((b) => {
      const spent = spentBy.get(b.categoryId) ?? 0;
      return { budget: b, category: categories.get(b.categoryId), spent, remaining: b.amount - spent, ratio: b.amount ? spent / b.amount : 0 };
    })
    .sort((a, b) => b.ratio - a.ratio);
  const budgeted = sum(budgets.map((b) => b.amount));
  const spent = sum(lines.map((l) => l.spent));
  const remaining = budgeted - spent;
  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const unbudgeted = spend.filter((s) => !budgetedIds.has(s.categoryId ?? ""));
  const daysLeft = daysLeftInMonth(month, today);
  return {
    lines,
    budgeted,
    spent,
    remaining,
    ratio: budgeted ? spent / budgeted : 0,
    unbudgeted,
    perDay: daysLeft > 0 ? Math.max(0, Math.floor(remaining / daysLeft)) : 0,
    daysLeft,
  };
}

/** Arrondit un budget à un montant "propre" (10 CHF près, 50 au-delà de 500). */
export function roundBudget(cents: Cents): Cents {
  const francs = cents / 100;
  const step = francs >= 500 ? 50 : 10;
  return Math.max(step, Math.ceil(francs / step) * step) * 100;
}

/** Budget suggéré = moyenne des dépenses par catégorie sur les mois fournis (+5 % de marge). */
export function suggestFromHistory(transactions: Transaction[], categories: Map<string, Category>, months: number): Array<{ categoryId: string; amount: Cents }> {
  const spend = spendingByCategory(transactions, categories);
  return spend
    .filter((s) => s.categoryId && s.amount > 0)
    .map((s) => ({ categoryId: s.categoryId as string, amount: roundBudget((s.amount / months) * 1.05) }))
    .filter((s) => s.amount >= 1000);
}

/** Poids par défaut pour ventiler la règle 50/30/20 quand il n'y a pas d'historique. */
const DEFAULT_WEIGHTS: Record<string, number> = {
  housing: 0.5, groceries: 0.22, transport: 0.1, health: 0.14, education: 0.02, kids: 0.02,
  restaurants: 0.3, shopping: 0.25, leisure: 0.25, subscriptions: 0.2,
  savings: 1,
};

/** Règle 50/30/20 : 50 % besoins, 30 % envies, 20 % épargne du revenu net, ventilés par catégorie. */
export function suggest503020(monthlyNetIncome: Cents, categories: Category[]): Array<{ categoryId: string; amount: Cents }> {
  const groups: Record<"needs" | "wants" | "savings", number> = { needs: 0.5, wants: 0.3, savings: 0.2 };
  const out: Array<{ categoryId: string; amount: Cents }> = [];
  for (const group of ["needs", "wants", "savings"] as const) {
    const cats = categories.filter((c) => c.kind === "expense" && c.group === group && !c.archived && DEFAULT_WEIGHTS[c.id]);
    const totalWeight = sum(cats.map((c) => DEFAULT_WEIGHTS[c.id]));
    for (const c of cats) {
      const share = DEFAULT_WEIGHTS[c.id] / totalWeight;
      out.push({ categoryId: c.id, amount: roundBudget(monthlyNetIncome * groups[group] * share) });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ Abonnements */

export interface SubscriptionGuess {
  payee: string;
  amount: Cents;
  categoryId?: string;
  months: number;
  lastDate: string;
}

/** Catégories où un paiement régulier est un "abonnement" que l'on peut résilier (pas le loyer ni l'assurance maladie). */
const SUBSCRIPTION_CATEGORIES = new Set(["subscriptions", "leisure", "education", "other"]);
const SUBSCRIPTION_KEYWORDS = /abo|abonnement|netflix|spotify|disney|swisscom|sunrise|salt|fitness|gym|apple|google|amazon|microsoft|adobe|canal|dazn|youtube|icloud|playstation|xbox|nintendo|chatgpt|openai|notion|dropbox/i;

/**
 * Détecte les abonnements : même libellé, montant stable (±15 %), et cadence régulière
 * (mensuelle : ~1 paiement par mois à date fixe ; hebdomadaire ; trimestrielle ; annuelle) sur ≥ 2 mois distincts.
 * Les commerces fréquentés irrégulièrement (courses, restaurants) sont écartés par la cadence, pas seulement par la catégorie.
 */
export function detectSubscriptions(transactions: Transaction[]): SubscriptionGuess[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.payee) continue;
    const key = normalizeLabel(t.payee).replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim();
    if (key.length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const out: SubscriptionGuess[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const amounts = list.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const stable = list.filter((t) => Math.abs(t.amount - median) <= Math.max(median * 0.15, 100)).sort((a, b) => (a.date < b.date ? -1 : 1));
    const months = new Set(stable.map((t) => t.month));
    if (months.size < 2) continue;
    // Cadence : les écarts entre paiements successifs doivent correspondre à une période connue.
    const gaps: number[] = [];
    for (let i = 1; i < stable.length; i++) {
      const a = new Date(stable[i - 1].date).getTime();
      const b = new Date(stable[i].date).getTime();
      gaps.push(Math.round((b - a) / 86_400_000));
    }
    const periodic = gaps.filter((g) => (g >= 6 && g <= 8) || (g >= 26 && g <= 35) || (g >= 85 && g <= 96) || (g >= 355 && g <= 375));
    if (gaps.length === 0 || periodic.length < Math.ceil(gaps.length * 0.7)) continue;
    const last = stable[stable.length - 1];
    const category = last.categoryId;
    const looksLikeSubscription = (category === undefined || SUBSCRIPTION_CATEGORIES.has(category)) || SUBSCRIPTION_KEYWORDS.test(last.payee);
    if (!looksLikeSubscription) continue;
    // Montant mensuel équivalent selon la cadence dominante.
    const typicalGap = periodic.sort((a, b) => a - b)[Math.floor(periodic.length / 2)];
    const monthly = typicalGap <= 8 ? median * 4.33 : typicalGap <= 35 ? median : typicalGap <= 96 ? median / 3 : median / 12;
    out.push({ payee: last.payee, amount: Math.round(monthly), categoryId: category, months: months.size, lastDate: last.date });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

/* ------------------------------------------------------------------ Score & conseils */

export interface ScoreInput {
  /** Totaux du mois courant. */
  current: MonthTotals;
  /** Totaux des 3 derniers mois (pour lisser). */
  history: MonthTotals[];
  budget: BudgetSummary | null;
  subscriptionsMonthly: Cents;
  /** Épargne disponible (soldes des comptes épargne + cash hors 3a). */
  liquidSavings: Cents;
}

export interface ScoreBreakdown {
  total: number;
  savingsRate: number;
  savingsRateScore: number;
  budgetScore: number;
  subscriptionsScore: number;
  emergencyMonths: number;
  emergencyScore: number;
}

export function savingsRateOf(t: MonthTotals): number {
  if (!t.incomes) return 0;
  return (t.incomes - t.expenses) / t.incomes;
}

export function financialScore(input: ScoreInput): ScoreBreakdown {
  const all = [input.current, ...input.history].filter((m) => m.incomes > 0);
  const rate = all.length ? sum(all.map(savingsRateOf)) / all.length : 0;
  // 20 % d'épargne = score plein.
  const savingsRateScore = clamp(rate / 0.2, 0, 1) * 35;
  const budgetScore = input.budget && input.budget.budgeted > 0 ? clamp(1 - Math.max(0, input.budget.ratio - 1) * 2, 0, 1) * 25 : 12;
  const avgExpenses = all.length ? sum(all.map((m) => m.expenses)) / all.length : input.current.expenses;
  const subRatio = avgExpenses ? input.subscriptionsMonthly / avgExpenses : 0;
  // > 20 % des dépenses en abonnements = signal d'alerte.
  const subscriptionsScore = clamp(1 - Math.max(0, subRatio - 0.08) / 0.12, 0, 1) * 15;
  const emergencyMonths = avgExpenses ? input.liquidSavings / avgExpenses : 0;
  const emergencyScore = clamp(emergencyMonths / 3, 0, 1) * 25;
  return {
    total: Math.round(savingsRateScore + budgetScore + subscriptionsScore + emergencyScore),
    savingsRate: rate,
    savingsRateScore: Math.round(savingsRateScore),
    budgetScore: Math.round(budgetScore),
    subscriptionsScore: Math.round(subscriptionsScore),
    emergencyMonths,
    emergencyScore: Math.round(emergencyScore),
  };
}

export interface Tip {
  id: string;
  title: string;
  body: string;
  tone: "accent" | "positive" | "warning" | "negative";
}

export function buildTips(args: {
  score: ScoreBreakdown;
  current: MonthTotals;
  previous: MonthTotals | null;
  topCategories: Array<{ category: Category | undefined; amount: Cents; previousAmount: Cents }>;
  subscriptions: SubscriptionGuess[];
  budget: BudgetSummary | null;
  fmt: (c: Cents) => string;
}): Tip[] {
  const { score, current, previous, topCategories, subscriptions, budget, fmt } = args;
  const tips: Tip[] = [];

  if (current.incomes > 0 && score.savingsRate < 0.1) {
    tips.push({
      id: "rate",
      title: "Vise 10 % d'épargne pour commencer",
      body: `Ce mois tu gardes ${Math.round(savingsRateOf(current) * 100)} % de tes revenus. Mettre l'épargne de côté le jour de paie (virement automatique) est la méthode la plus fiable.`,
      tone: "warning",
    });
  } else if (current.incomes > 0 && score.savingsRate >= 0.2) {
    tips.push({ id: "rate-ok", title: "Excellent taux d'épargne", body: "Tu épargnes plus de 20 % de tes revenus. Pense à faire travailler cet argent (3a, ETF) plutôt que de le laisser dormir.", tone: "positive" });
  }

  const jump = topCategories.find((c) => c.previousAmount > 0 && c.amount > c.previousAmount * 1.3 && c.amount - c.previousAmount > 5000);
  if (jump && jump.category) {
    tips.push({
      id: "jump",
      title: `${jump.category.name} : +${Math.round(((jump.amount - jump.previousAmount) / jump.previousAmount) * 100)} % vs mois dernier`,
      body: `${fmt(jump.amount)} contre ${fmt(jump.previousAmount)} le mois dernier. Une dépense ponctuelle, ou une habitude qui s'installe ?`,
      tone: "warning",
    });
  }

  const subTotal = sum(subscriptions.map((s) => s.amount));
  if (subscriptions.length >= 3) {
    tips.push({
      id: "subs",
      title: `${subscriptions.length} abonnements ≈ ${fmt(subTotal * 12)} par an`,
      body: "Passe-les en revue : en résilier un seul que tu n'utilises plus, c'est une économie immédiate et sans effort.",
      tone: "accent",
    });
  }

  if (budget && budget.budgeted > 0 && budget.ratio > 1) {
    tips.push({ id: "over", title: `Budget dépassé de ${fmt(budget.spent - budget.budgeted)}`, body: "Regarde les catégories en rouge : c'est là que se joue la fin du mois.", tone: "negative" });
  } else if (budget && budget.budgeted > 0 && budget.daysLeft > 0) {
    tips.push({ id: "perday", title: `${fmt(budget.perDay)} par jour jusqu'à la fin du mois`, body: `Il te reste ${fmt(budget.remaining)} sur ${budget.daysLeft} jours. Garde ce chiffre en tête avant chaque achat.`, tone: "accent" });
  } else if (!budget || budget.budgeted === 0) {
    tips.push({ id: "nobudget", title: "Crée ton budget", body: "Un budget par catégorie te dit chaque jour combien tu peux encore dépenser. YourFin peut le suggérer d'après ton historique.", tone: "accent" });
  }

  if (score.emergencyMonths < 3) {
    tips.push({
      id: "emergency",
      title: "Constitue une réserve de 3 mois",
      body: `Ta réserve couvre ${score.emergencyMonths.toFixed(1)} mois de dépenses. Objectif : 3 à 6 mois sur un compte épargne séparé, avant d'investir.`,
      tone: "warning",
    });
  }

  if (previous && current.expenses > 0 && current.expenses < previous.expenses * 0.9) {
    tips.push({ id: "less", title: "Dépenses en baisse", body: `-${Math.round((1 - current.expenses / previous.expenses) * 100)} % par rapport au mois dernier. Continue comme ça !`, tone: "positive" });
  }

  return tips.slice(0, 5);
}

/* ------------------------------------------------------------------ Séries temporelles */

export interface MonthPoint {
  month: MonthKey;
  expenses: Cents;
  incomes: Cents;
  savings: Cents;
}

export function monthlySeries(transactions: Transaction[], categories: Map<string, Category>, months: MonthKey[]): MonthPoint[] {
  const byMonth = new Map<MonthKey, Transaction[]>();
  for (const t of transactions) byMonth.set(t.month, [...(byMonth.get(t.month) ?? []), t]);
  return months.map((m) => ({ month: m, ...monthTotals(byMonth.get(m) ?? [], categories) }));
}

export function previousMonth(month: MonthKey): MonthKey {
  return addMonths(month, -1);
}

export function monthOf(t: Transaction): MonthKey {
  return t.month || monthKeyOf(t.date);
}
