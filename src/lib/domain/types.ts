/** Montant en centimes (entier) — jamais de flottants pour l'argent. */
export type Cents = number;
/** Date ISO courte : YYYY-MM-DD (fuseau local). */
export type ISODate = string;
/** Clé de mois : YYYY-MM. */
export type MonthKey = string;

export type AccountType = "checking" | "savings" | "cash" | "card" | "investment" | "pillar3a";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  /** Solde de départ au moment de la création du compte (centimes). */
  initialBalance: Cents;
  color: string;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
}

export type CategoryKind = "expense" | "income";
/** Groupe 50/30/20 : besoins, envies, épargne — ou revenus. */
export type CategoryGroup = "needs" | "wants" | "savings" | "income";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  group: CategoryGroup;
  /** Nom d'icône lucide (voir components/ui/CategoryIcon). */
  icon: string;
  /** Couleur de la catégorie (fixe : la couleur suit l'entité, jamais son rang). */
  color: string;
  colorDark: string;
  sortOrder: number;
  isSystem: boolean;
  archived: boolean;
}

export type TxType = "expense" | "income" | "transfer";
export type TxSource = "manual" | "csv" | "recurring" | "goal" | "seed";

export interface Transaction {
  id: string;
  type: TxType;
  /** Toujours positif ; le sens est donné par `type`. */
  amount: Cents;
  date: ISODate;
  month: MonthKey;
  accountId: string;
  /** Compte de destination pour un transfert. */
  toAccountId?: string;
  categoryId?: string;
  payee: string;
  note?: string;
  recurringId?: string;
  goalId?: string;
  /** Empreinte utilisée pour dédoublonner les imports CSV. */
  importHash?: string;
  source: TxSource;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: MonthKey;
  amount: Cents;
}

export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

export interface Recurring {
  id: string;
  type: "expense" | "income";
  amount: Cents;
  categoryId?: string;
  accountId: string;
  payee: string;
  frequency: Frequency;
  /** Prochaine échéance à générer. */
  nextDate: ISODate;
  active: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: Cents;
  savedAmount: Cents;
  deadline?: ISODate;
  createdAt: string;
}

/** Règle de catégorisation apprise : si le libellé contient `pattern`, appliquer `categoryId`. */
export interface Rule {
  id: string;
  pattern: string;
  categoryId: string;
  createdAt: string;
}

export type ThemePref = "system" | "light" | "dark";
export type MaritalStatus = "single" | "married";

export interface Settings {
  id: "app";
  firstName: string;
  currency: "CHF";
  locale: "fr-CH";
  theme: ThemePref;
  onboardingDone: boolean;
  /** Abonnement Pro (simulé en v1, voir lib/features.ts). */
  pro: boolean;
  proSince?: string;
  /** Profil fiscal (module 3a / impôts). */
  canton: string;
  birthYear?: number;
  /** Revenu net imposable annuel estimé (centimes). */
  taxableIncome?: Cents;
  /** Revenu net mensuel (centimes) — sert aux suggestions de budget. */
  monthlyNetIncome?: Cents;
  hasPensionFund: boolean;
  maritalStatus: MaritalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BackupFile {
  app: "YourFin";
  schemaVersion: number;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  goals: Goal[];
  rules: Rule[];
  settings: Settings | null;
}
