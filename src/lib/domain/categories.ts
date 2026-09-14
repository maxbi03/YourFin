import type { Category } from "./types";

/**
 * Catégories système. Les identifiants sont stables (ils servent aux règles de catégorisation).
 * Les couleurs sont fixes par entité (jamais réassignées selon le rang) ; version claire / sombre.
 */
type Seed = Omit<Category, "sortOrder" | "isSystem" | "archived">;

const EXPENSES: Seed[] = [
  { id: "housing", name: "Logement", kind: "expense", group: "needs", icon: "Home", color: "#4a3aa7", colorDark: "#9085e9" },
  { id: "groceries", name: "Courses", kind: "expense", group: "needs", icon: "ShoppingCart", color: "#1baf7a", colorDark: "#199e70" },
  { id: "restaurants", name: "Restaurants & bars", kind: "expense", group: "wants", icon: "UtensilsCrossed", color: "#eb6834", colorDark: "#d95926" },
  { id: "transport", name: "Transport", kind: "expense", group: "needs", icon: "TrainFront", color: "#2a78d6", colorDark: "#3987e5" },
  { id: "health", name: "Santé & assurances", kind: "expense", group: "needs", icon: "HeartPulse", color: "#e87ba4", colorDark: "#d55181" },
  { id: "subscriptions", name: "Abonnements & télécom", kind: "expense", group: "wants", icon: "Smartphone", color: "#eda100", colorDark: "#c98500" },
  { id: "shopping", name: "Shopping", kind: "expense", group: "wants", icon: "ShoppingBag", color: "#8e3b8e", colorDark: "#c06ac0" },
  { id: "leisure", name: "Loisirs & sorties", kind: "expense", group: "wants", icon: "Ticket", color: "#008300", colorDark: "#3ea33e" },
  { id: "travel", name: "Voyages", kind: "expense", group: "wants", icon: "Plane", color: "#0e8f9e", colorDark: "#22a5b5" },
  { id: "education", name: "Formation", kind: "expense", group: "needs", icon: "GraduationCap", color: "#a0522d", colorDark: "#c4744f" },
  { id: "gifts", name: "Cadeaux & dons", kind: "expense", group: "wants", icon: "Gift", color: "#e34948", colorDark: "#e66767" },
  { id: "kids", name: "Enfants & famille", kind: "expense", group: "needs", icon: "Baby", color: "#c2410c", colorDark: "#f0834a" },
  { id: "taxes", name: "Impôts", kind: "expense", group: "needs", icon: "Landmark", color: "#5a6478", colorDark: "#8b96ad" },
  { id: "fees", name: "Frais bancaires", kind: "expense", group: "needs", icon: "Receipt", color: "#7c7c90", colorDark: "#9c9cb0" },
  { id: "cash", name: "Retraits cash", kind: "expense", group: "wants", icon: "Banknote", color: "#6b8e23", colorDark: "#7fae2a" },
  { id: "savings", name: "Épargne & investissement", kind: "expense", group: "savings", icon: "PiggyBank", color: "#5b4cff", colorDark: "#7c6cff" },
  { id: "other", name: "Autres", kind: "expense", group: "wants", icon: "MoreHorizontal", color: "#9c9cb0", colorDark: "#6f6f85" },
];

const INCOMES: Seed[] = [
  { id: "salary", name: "Salaire", kind: "income", group: "income", icon: "Briefcase", color: "#008300", colorDark: "#3ea33e" },
  { id: "bonus", name: "Primes & bonus", kind: "income", group: "income", icon: "Sparkles", color: "#1baf7a", colorDark: "#199e70" },
  { id: "refund", name: "Remboursements", kind: "income", group: "income", icon: "Undo2", color: "#2a78d6", colorDark: "#3987e5" },
  { id: "side_income", name: "Revenus annexes", kind: "income", group: "income", icon: "Coins", color: "#eda100", colorDark: "#c98500" },
  { id: "other_income", name: "Autres revenus", kind: "income", group: "income", icon: "CircleDollarSign", color: "#5a6478", colorDark: "#8b96ad" },
];

export const SYSTEM_CATEGORIES: Category[] = [...EXPENSES, ...INCOMES].map((c, i) => ({
  ...c,
  sortOrder: i,
  isSystem: true,
  archived: false,
}));

export const UNCATEGORIZED_COLOR = { color: "#9c9cb0", colorDark: "#6f6f85" };

/** Couleurs proposées pour les catégories personnalisées et les comptes. */
export const COLOR_CHOICES = [
  "#5b4cff", "#2a78d6", "#0e8f9e", "#1baf7a", "#008300", "#6b8e23",
  "#eda100", "#eb6834", "#e34948", "#e87ba4", "#8e3b8e", "#4a3aa7",
  "#a0522d", "#5a6478", "#7c7c90",
];

/** Icônes proposées pour les catégories personnalisées. */
export const ICON_CHOICES = [
  "Home", "ShoppingCart", "UtensilsCrossed", "TrainFront", "Car", "HeartPulse", "Smartphone", "ShoppingBag",
  "Ticket", "Plane", "GraduationCap", "Gift", "Baby", "Landmark", "Receipt", "Banknote", "PiggyBank",
  "Briefcase", "Sparkles", "Undo2", "Coins", "CircleDollarSign", "Dumbbell", "PawPrint", "Shirt", "Wrench",
  "Music", "Gamepad2", "Coffee", "Bike", "Fuel", "Wifi", "Tv", "Book", "Palette", "Star", "Heart", "Leaf",
  "MoreHorizontal",
];

export function categoryColor(cat: Category | undefined, dark: boolean): string {
  if (!cat) return dark ? UNCATEGORIZED_COLOR.colorDark : UNCATEGORIZED_COLOR.color;
  return dark ? cat.colorDark || cat.color : cat.color;
}
