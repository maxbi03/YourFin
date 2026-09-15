/**
 * Traduction entre les formes locales (camelCase, `lib/domain/types.ts`) et les colonnes
 * Postgres (snake_case, `supabase/migrations/`). Chaque paire `toRow`/`fromRow` doit rester en
 * phase avec le schéma SQL — c'est le seul endroit où cette correspondance est écrite.
 *
 * Les types `*Row` reflètent exactement les colonnes de la table correspondante : les valeurs
 * texte contraintes par un `check` SQL (type, kind, frequency…) restent `string` ici et sont
 * validées par la contrainte côté base, pas re-vérifiées côté client.
 */
import type { Account, Budget, Category, Goal, Recurring, Rule, Settings, Transaction } from "@/lib/domain/types";

const orNull = <T>(v: T | undefined): T | null => (v === undefined ? null : v);
const orUndef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

/* ------------------------------------------------------------------ accounts */

interface AccountRow {
  id: string;
  name: string;
  type: string;
  currency: string;
  initial_balance_cents: number;
  color: string;
  archived: boolean;
  sort_order: number;
  created_at: string;
}

export function accountToRow(a: Account, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    type: a.type,
    currency: a.currency,
    initial_balance_cents: a.initialBalance,
    color: a.color,
    archived: a.archived,
    sort_order: a.sortOrder,
    created_at: a.createdAt,
  };
}

export function accountFromRow(r: AccountRow): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Account["type"],
    currency: r.currency,
    initialBalance: r.initial_balance_cents,
    color: r.color,
    archived: r.archived,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

/* ------------------------------------------------------------------ categories */
/** Seules les catégories personnalisées (isSystem: false) sont poussées : les 22 catégories
 * système sont déjà semées côté serveur (user_id null) par la migration. */

interface CategoryRow {
  id: string;
  name: string;
  kind: string;
  group_name: string;
  icon: string;
  color: string;
  color_dark: string;
  sort_order: number;
  is_system: boolean;
  archived: boolean;
}

export function categoryToRow(c: Category, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    kind: c.kind,
    group_name: c.group,
    icon: c.icon,
    color: c.color,
    color_dark: c.colorDark,
    sort_order: c.sortOrder,
    is_system: false,
    archived: c.archived,
  };
}

export function categoryFromRow(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind as Category["kind"],
    group: r.group_name as Category["group"],
    icon: r.icon,
    color: r.color,
    colorDark: r.color_dark,
    sortOrder: r.sort_order,
    isSystem: r.is_system,
    archived: r.archived,
  };
}

/* ------------------------------------------------------------------ transactions */

interface TransactionRow {
  id: string;
  type: string;
  amount_cents: number;
  date: string;
  month: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  payee: string;
  note: string | null;
  recurring_id: string | null;
  goal_id: string | null;
  import_hash: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export function transactionToRow(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    type: t.type,
    amount_cents: t.amount,
    date: t.date,
    month: t.month,
    account_id: t.accountId,
    to_account_id: orNull(t.toAccountId),
    category_id: orNull(t.categoryId),
    payee: t.payee,
    note: orNull(t.note),
    recurring_id: orNull(t.recurringId),
    goal_id: orNull(t.goalId),
    import_hash: orNull(t.importHash),
    source: t.source,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function transactionFromRow(r: TransactionRow): Transaction {
  return {
    id: r.id,
    type: r.type as Transaction["type"],
    amount: r.amount_cents,
    date: r.date,
    month: r.month,
    accountId: r.account_id,
    toAccountId: orUndef(r.to_account_id),
    categoryId: orUndef(r.category_id),
    payee: r.payee,
    note: orUndef(r.note),
    recurringId: orUndef(r.recurring_id),
    goalId: orUndef(r.goal_id),
    importHash: orUndef(r.import_hash),
    source: r.source as Transaction["source"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------------------------------------------ budgets */

interface BudgetRow {
  id: string;
  category_id: string;
  month: string;
  amount_cents: number;
}

export function budgetToRow(b: Budget, userId: string) {
  return { id: b.id, user_id: userId, category_id: b.categoryId, month: b.month, amount_cents: b.amount };
}

export function budgetFromRow(r: BudgetRow): Budget {
  return { id: r.id, categoryId: r.category_id, month: r.month, amount: r.amount_cents };
}

/* ------------------------------------------------------------------ recurring */

interface RecurringRow {
  id: string;
  type: string;
  amount_cents: number;
  category_id: string | null;
  account_id: string;
  payee: string;
  frequency: string;
  next_date: string;
  active: boolean;
  created_at: string;
}

export function recurringToRow(rec: Recurring, userId: string) {
  return {
    id: rec.id,
    user_id: userId,
    type: rec.type,
    amount_cents: rec.amount,
    category_id: orNull(rec.categoryId),
    account_id: rec.accountId,
    payee: rec.payee,
    frequency: rec.frequency,
    next_date: rec.nextDate,
    active: rec.active,
    created_at: rec.createdAt,
  };
}

export function recurringFromRow(r: RecurringRow): Recurring {
  return {
    id: r.id,
    type: r.type as Recurring["type"],
    amount: r.amount_cents,
    categoryId: orUndef(r.category_id),
    accountId: r.account_id,
    payee: r.payee,
    frequency: r.frequency as Recurring["frequency"],
    nextDate: r.next_date,
    active: r.active,
    createdAt: r.created_at,
  };
}

/* ------------------------------------------------------------------ goals */

interface GoalRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_amount_cents: number;
  saved_amount_cents: number;
  deadline: string | null;
  created_at: string;
}

export function goalToRow(g: Goal, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    icon: g.icon,
    color: g.color,
    target_amount_cents: g.targetAmount,
    saved_amount_cents: g.savedAmount,
    deadline: orNull(g.deadline),
    created_at: g.createdAt,
  };
}

export function goalFromRow(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    targetAmount: r.target_amount_cents,
    savedAmount: r.saved_amount_cents,
    deadline: orUndef(r.deadline),
    createdAt: r.created_at,
  };
}

/* ------------------------------------------------------------------ rules */

interface RuleRow {
  id: string;
  pattern: string;
  category_id: string;
  created_at: string;
}

export function ruleToRow(rule: Rule, userId: string) {
  return { id: rule.id, user_id: userId, pattern: rule.pattern, category_id: rule.categoryId, created_at: rule.createdAt };
}

export function ruleFromRow(r: RuleRow): Rule {
  return { id: r.id, pattern: r.pattern, categoryId: r.category_id, createdAt: r.created_at };
}

/* ------------------------------------------------------------------ profile (settings) */
/** Contrairement aux autres tables, il n'y a qu'une ligne par utilisateur, déjà créée par le
 * trigger `handle_new_user` — on la met à jour (jamais de insert), et son id cloud est
 * l'identifiant Supabase de l'utilisateur, pas `"app"` comme en local. */

export interface ProfileRow {
  id: string;
  first_name: string;
  theme: string;
  onboarding_done: boolean;
  pro: boolean;
  pro_since: string | null;
  canton: string;
  birth_year: number | null;
  taxable_income_cents: number | null;
  monthly_net_income_cents: number | null;
  has_pension_fund: boolean;
  marital_status: string;
  created_at: string;
  updated_at: string;
}

export function settingsToProfileRow(s: Settings) {
  return {
    first_name: s.firstName,
    theme: s.theme,
    onboarding_done: s.onboardingDone,
    pro: s.pro,
    pro_since: orNull(s.proSince),
    canton: s.canton,
    birth_year: orNull(s.birthYear),
    taxable_income_cents: orNull(s.taxableIncome),
    monthly_net_income_cents: orNull(s.monthlyNetIncome),
    has_pension_fund: s.hasPensionFund,
    marital_status: s.maritalStatus,
    updated_at: new Date().toISOString(),
  };
}

export function profileRowToSettings(r: ProfileRow): Omit<Settings, "id" | "currency" | "locale"> {
  return {
    firstName: r.first_name,
    theme: r.theme as Settings["theme"],
    onboardingDone: r.onboarding_done,
    pro: r.pro,
    proSince: orUndef(r.pro_since),
    canton: r.canton,
    birthYear: orUndef(r.birth_year),
    taxableIncome: orUndef(r.taxable_income_cents),
    monthlyNetIncome: orUndef(r.monthly_net_income_cents),
    hasPensionFund: r.has_pension_fund,
    maritalStatus: r.marital_status as Settings["maritalStatus"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
