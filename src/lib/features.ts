/**
 * Gating des fonctionnalités payantes.
 * Le budget, le suivi des dépenses, les objectifs et l'analyse sont gratuits pour toujours.
 * "Pro" (simulateur d'investissement, assistant 3a/impôts) est simulé en v1 : un simple drapeau dans les réglages.
 * Quand les comptes utilisateurs arriveront, `isPro` lira l'état de l'abonnement (Stripe) à la place.
 */
import type { Settings } from "@/lib/domain/types";

export const PRO_PRICE_MONTHLY_CHF = 3.9;
export const PRO_PRICE_YEARLY_CHF = 29;

export type ProFeature = "invest" | "pillar3a";

export function isPro(settings: Settings | undefined): boolean {
  return !!settings?.pro;
}

export const APP_VERSION = "0.1.0";
