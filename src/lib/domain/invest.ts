import type { Cents } from "./types";

/**
 * Simulateur d'investissement — hypothèses SIMPLIFIÉES et pédagogiques.
 * Rendements nominaux moyens long terme, frais annuels typiques, volatilité annualisée.
 * Ce n'est pas un conseil en placement.
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  /** Rendement annuel moyen attendu (brut, avant frais). */
  annualReturn: number;
  /** Frais annuels (TER + dépôt). */
  fees: number;
  /** Volatilité annualisée (écart-type des rendements). */
  volatility: number;
  risk: "low" | "medium" | "high";
}

export const SCENARIOS: Scenario[] = [
  {
    id: "savings",
    name: "Compte épargne",
    description: "Capital garanti, rendement proche de zéro : l'inflation grignote le pouvoir d'achat.",
    annualReturn: 0.005,
    fees: 0,
    volatility: 0,
    risk: "low",
  },
  {
    id: "bonds",
    name: "Obligations",
    description: "Faible risque, rendement modeste. Utile pour stabiliser un portefeuille.",
    annualReturn: 0.018,
    fees: 0.002,
    volatility: 0.04,
    risk: "low",
  },
  {
    id: "balanced",
    name: "Portefeuille 60 / 40",
    description: "60 % actions, 40 % obligations : le compromis classique entre croissance et stabilité.",
    annualReturn: 0.045,
    fees: 0.003,
    volatility: 0.09,
    risk: "medium",
  },
  {
    id: "stocks",
    name: "ETF actions monde",
    description: "Croissance à long terme, mais fortes fluctuations : à envisager sur 10 ans et plus.",
    annualReturn: 0.065,
    fees: 0.002,
    volatility: 0.16,
    risk: "high",
  },
];

export interface ProjectionPoint {
  year: number;
  contributed: Cents;
  /** Valeur attendue. */
  expected: Cents;
  /** Fourchette plausible (≈ 25e et 75e percentiles, approximation log-normale). */
  low: Cents;
  high: Cents;
}

function compound(initial: Cents, monthly: Cents, years: number, annualNet: number): Cents[] {
  const r = Math.pow(1 + annualNet, 1 / 12) - 1;
  const out: Cents[] = [initial];
  let value = initial;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) value = value * (1 + r) + monthly;
    out.push(value);
  }
  return out;
}

export function project(scenario: Scenario, initial: Cents, monthly: Cents, years: number): ProjectionPoint[] {
  const net = scenario.annualReturn - scenario.fees;
  const expected = compound(initial, monthly, years, net);
  const points: ProjectionPoint[] = [];
  for (let y = 0; y <= years; y++) {
    // Sur T années, le rendement annualisé se disperse d'environ σ/√T ; 0.674σ ≈ les quartiles.
    const spread = y > 0 ? (0.674 * scenario.volatility) / Math.sqrt(y) : 0;
    const low = y > 0 ? compound(initial, monthly, y, net - spread)[y] : initial;
    const high = y > 0 ? compound(initial, monthly, y, net + spread)[y] : initial;
    points.push({ year: y, contributed: initial + monthly * 12 * y, expected: Math.round(expected[y]), low: Math.round(low), high: Math.round(high) });
  }
  return points;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  horizon: string;
  allocation: Array<{ label: string; share: number }>;
}

export const PROFILES: Profile[] = [
  {
    id: "cautious",
    name: "Prudent",
    description: "Priorité à la stabilité. Pour un horizon court ou une faible tolérance aux baisses.",
    horizon: "3 à 5 ans",
    allocation: [
      { label: "Obligations", share: 0.55 },
      { label: "Actions", share: 0.25 },
      { label: "Liquidités", share: 0.2 },
    ],
  },
  {
    id: "balanced",
    name: "Équilibré",
    description: "Croissance raisonnable avec des fluctuations modérées.",
    horizon: "5 à 10 ans",
    allocation: [
      { label: "Actions", share: 0.55 },
      { label: "Obligations", share: 0.35 },
      { label: "Liquidités", share: 0.1 },
    ],
  },
  {
    id: "dynamic",
    name: "Dynamique",
    description: "Maximise la croissance à long terme, accepte des baisses temporaires importantes.",
    horizon: "10 ans et plus",
    allocation: [
      { label: "Actions", share: 0.85 },
      { label: "Obligations", share: 0.1 },
      { label: "Liquidités", share: 0.05 },
    ],
  },
];
