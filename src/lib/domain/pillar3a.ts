import type { Cents } from "./types";

/**
 * Pilier 3a — constantes annuelles. À vérifier chaque année (publiées par l'OFAS, en général en octobre).
 * 2025 et 2026 : CHF 7'258 avec caisse de pension ; sans caisse de pension 20 % du revenu net, max CHF 36'288.
 */
export const PILLAR_3A = {
  year: 2026,
  maxWithPensionFund: 7_258_00 as Cents,
  maxWithoutPensionFundCap: 36_288_00 as Cents,
  maxWithoutPensionFundRate: 0.2,
  retirementAge: 65,
};

export function max3aContribution(hasPensionFund: boolean, yearlyNetIncome?: Cents): Cents {
  if (hasPensionFund) return PILLAR_3A.maxWithPensionFund;
  if (!yearlyNetIncome) return PILLAR_3A.maxWithoutPensionFundCap;
  return Math.min(PILLAR_3A.maxWithoutPensionFundCap, Math.round(yearlyNetIncome * PILLAR_3A.maxWithoutPensionFundRate));
}

export function yearsToRetirement(birthYear: number | undefined, now = new Date().getFullYear()): number {
  if (!birthYear) return 30;
  return Math.max(1, birthYear + PILLAR_3A.retirementAge - now);
}

export interface Pillar3aPoint {
  year: number;
  bank: Cents;
  securities: Cents;
  contributed: Cents;
}

/** Projection de versements annuels constants, compte 3a banque vs 3a titres, jusqu'à la retraite. */
export function project3a(yearly: Cents, years: number, bankRate: number, securitiesRate: number): Pillar3aPoint[] {
  const points: Pillar3aPoint[] = [{ year: 0, bank: 0, securities: 0, contributed: 0 }];
  let bank = 0;
  let sec = 0;
  for (let y = 1; y <= years; y++) {
    bank = (bank + yearly) * (1 + bankRate);
    sec = (sec + yearly) * (1 + securitiesRate);
    points.push({ year: y, bank: Math.round(bank), securities: Math.round(sec), contributed: yearly * y });
  }
  return points;
}

export const PILLAR_3A_TIPS: Array<{ title: string; body: string }> = [
  {
    title: "Verse avant le 31 décembre",
    body: "Seuls les versements crédités sur le compte 3a avant la fin de l'année sont déductibles pour cette année fiscale. Les banques fixent souvent une date limite mi-décembre.",
  },
  {
    title: "Ouvre plusieurs comptes 3a",
    body: "Le retrait est imposé séparément à un taux réduit, mais progressif : échelonner les retraits sur plusieurs années (un compte par année) réduit l'impôt au moment de la retraite.",
  },
  {
    title: "3a titres pour le long terme",
    body: "À plus de 10 ans de la retraite, une solution en titres (VIAC, finpension, frankly, Yuh…) avec une part d'actions élevée et des frais bas fait historiquement mieux qu'un compte 3a bancaire.",
  },
  {
    title: "Rachats rétroactifs possibles",
    body: "Depuis 2025, les lacunes de cotisation (dès l'année 2025) peuvent être comblées jusqu'à 10 ans plus tard, à condition d'avoir versé le maximum l'année du rachat.",
  },
  {
    title: "Retrait anticipé",
    body: "Le capital 3a peut être retiré avant la retraite pour acheter un logement principal, se mettre à son compte ou quitter définitivement la Suisse.",
  },
];
