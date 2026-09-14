"use client";

import { ChevronRight, Download, Repeat, Settings, Shield, Sparkles, Target, TrendingUp, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/layout/AppShell";
import { Card, PageHeader } from "@/components/ui/primitives";
import { isPro } from "@/lib/features";
import { useSettings } from "@/lib/hooks/useDb";
import { useT } from "@/lib/i18n";

export default function MorePage() {
  const t = useT();
  const settings = useSettings();
  const pro = isPro(settings);
  const [standalone] = useState(() => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches);

  const free = [
    { href: "/goals", label: t.nav.goals, icon: Target, desc: "Vacances, fonds d'urgence, projets" },
    { href: "/settings/accounts", label: t.settings.accounts, icon: WalletCards, desc: "Courant, épargne, cash, 3a…" },
    { href: "/settings/recurring", label: t.settings.recurring, icon: Repeat, desc: "Loyer, salaire, abonnements" },
    { href: "/settings", label: t.nav.settings, icon: Settings, desc: "Profil, thème, sauvegarde" },
  ];
  const proItems = [
    { href: "/invest", label: t.nav.invest, icon: TrendingUp, desc: t.pro.investDesc },
    { href: "/pillar3a", label: t.nav.pillar3a, icon: Shield, desc: t.pro.pillar3aDesc },
  ];

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader title={t.nav.more} />

      <Card className="divide-y divide-line">
        {free.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-ink"><item.icon size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium">{item.label}</div>
              <div className="truncate text-[12px] text-ink-2">{item.desc}</div>
            </div>
            <ChevronRight size={18} className="text-ink-3" />
          </Link>
        ))}
      </Card>

      <section>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Sparkles size={15} className="text-accent" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-2">{t.pro.title}</h2>
          {pro && <span className="rounded-full bg-positive-soft px-2 py-0.5 text-[10px] font-bold uppercase text-positive">{t.pro.active}</span>}
        </div>
        <Card className="divide-y divide-line">
          {proItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent"><item.icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium">{item.label}</div>
                <div className="truncate text-[12px] text-ink-2">{item.desc}</div>
              </div>
              <ChevronRight size={18} className="text-ink-3" />
            </Link>
          ))}
        </Card>
      </section>

      {!standalone && (
        <Card className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent"><Download size={18} /></span>
          <div className="text-[13px] text-ink-2">
            <span className="font-semibold text-ink">{t.settings.install}</span> — {t.home.installHint} Sur iPhone : Partager → « Sur l&apos;écran d&apos;accueil ». Sur Android/Chrome : menu → « Installer l&apos;application ».
          </div>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-ink-3">
        <Logo size={18} /> YourFin · {t.app.tagline}
      </div>
    </div>
  );
}
