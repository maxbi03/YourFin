"use client";

import { Check, Shield, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { updateSettings } from "@/lib/db/repo";
import { isPro, PRO_PRICE_MONTHLY_CHF, PRO_PRICE_YEARLY_CHF } from "@/lib/features";
import { useSettings } from "@/lib/hooks/useDb";
import { useT } from "@/lib/i18n";

/** Encapsule une fonctionnalité Pro : affiche l'écran d'abonnement tant que Pro n'est pas actif. */
export function ProGate({ children, preview }: { children: ReactNode; preview?: ReactNode }) {
  const settings = useSettings();
  if (!settings) return null;
  if (isPro(settings)) return <>{children}</>;
  return <Paywall preview={preview} />;
}

export function Paywall({ preview }: { preview?: ReactNode }) {
  const t = useT();
  const features = [
    { icon: TrendingUp, title: t.pro.invest, desc: t.pro.investDesc },
    { icon: Shield, title: t.pro.pillar3a, desc: t.pro.pillar3aDesc },
  ];
  return (
    <div className="space-y-4 anim-fade-in">
      {preview && (
        <div className="relative overflow-hidden rounded-card">
          <div className="pointer-events-none select-none blur-[3px] opacity-70" aria-hidden>{preview}</div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-canvas" />
        </div>
      )}
      <Card className="relative isolate overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 -z-10 size-40 rounded-full bg-accent-soft blur-2xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white"><Sparkles size={12} /> {t.pro.title}</span>
        <h2 className="mt-3 text-[22px] font-bold tracking-tight">{t.pro.subtitle}</h2>
        <ul className="mt-5 space-y-3">
          {features.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><f.icon size={17} /></span>
              <div>
                <p className="text-[14px] font-semibold">{f.title}</p>
                <p className="text-[13px] text-ink-2">{f.desc}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive"><Check size={17} /></span>
            <div>
              <p className="text-[14px] font-semibold">{t.pro.budgetFree}</p>
              <p className="text-[13px] text-ink-2">Aucune fonction gratuite ne passera jamais derrière un paywall.</p>
            </div>
          </li>
        </ul>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-[26px] font-bold tracking-tight">CHF {PRO_PRICE_MONTHLY_CHF.toFixed(2)}</span>
          <span className="text-[13px] text-ink-2">/ mois · ou CHF {PRO_PRICE_YEARLY_CHF} / an</span>
        </div>
        <Button size="lg" full className="mt-4" onClick={() => updateSettings({ pro: true, proSince: new Date().toISOString() })}>
          {t.pro.activateDemo}
        </Button>
        <p className="mt-3 text-center text-[12px] text-ink-3">{t.pro.demoHint}</p>
      </Card>
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-[12px] leading-relaxed text-ink-2">{children}</p>;
}
