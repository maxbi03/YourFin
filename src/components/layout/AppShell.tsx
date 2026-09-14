"use client";

import { BarChart3, Home, LayoutGrid, Plus, ReceiptText, Settings, Shield, Target, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ensureSeeded } from "@/lib/db/seed";
import { processDueRecurring } from "@/lib/db/repo";
import { useSettings } from "@/lib/hooks/useDb";
import { useApplyTheme } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";
import { isPro } from "@/lib/features";
import type { Transaction, TxType } from "@/lib/domain/types";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { cx } from "@/components/ui/primitives";

interface UIContextValue {
  openTransaction: (opts?: { transaction?: Transaction | null; type?: TxType }) => void;
}

const UIContext = createContext<UIContextValue>({ openTransaction: () => undefined });

export function useUI() {
  return useContext(UIContext);
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="yf-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B4CFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#yf-logo-g)" />
      <path d="M156 150 L256 272 L356 150" fill="none" stroke="#fff" strokeWidth="58" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M256 272 L256 384" fill="none" stroke="#fff" strokeWidth="58" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; transaction: Transaction | null; type: TxType }>({ open: false, transaction: null, type: "expense" });

  useApplyTheme(settings?.theme);

  // Démarrage : seed idempotent puis génération des récurrences échues.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSeeded();
        await processDueRecurring();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirections onboarding.
  const onboarding = pathname === "/onboarding";
  useEffect(() => {
    if (!ready || !settings) return;
    if (!settings.onboardingDone && !onboarding) router.replace("/onboarding");
    if (settings.onboardingDone && onboarding) router.replace("/");
  }, [ready, settings, onboarding, router]);

  const openTransaction = useCallback((opts?: { transaction?: Transaction | null; type?: TxType }) => {
    setSheet({ open: true, transaction: opts?.transaction ?? null, type: opts?.type ?? "expense" });
  }, []);
  const closeSheet = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);
  const ctx = useMemo(() => ({ openTransaction }), [openTransaction]);

  if (!ready || !settings) return <Splash />;
  if (!settings.onboardingDone || onboarding) {
    return <main className="mx-auto w-full max-w-md px-5 py-8 pt-safe">{settings.onboardingDone ? null : children}</main>;
  }

  const pro = isPro(settings);
  const tabs = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/transactions", label: t.nav.transactions, icon: ReceiptText },
    { href: "/budget", label: t.nav.budget, icon: Wallet },
    { href: "/insights", label: t.nav.insights, icon: BarChart3 },
    { href: "/more", label: t.nav.more, icon: LayoutGrid },
  ];
  const sidebar = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/transactions", label: t.nav.transactions, icon: ReceiptText },
    { href: "/budget", label: t.nav.budget, icon: Wallet },
    { href: "/goals", label: t.nav.goals, icon: Target },
    { href: "/insights", label: t.nav.insights, icon: BarChart3 },
    { href: "/invest", label: t.nav.invest, icon: TrendingUp, pro: true },
    { href: "/pillar3a", label: t.nav.pillar3a, icon: Shield, pro: true },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <UIContext.Provider value={ctx}>
      <div className="flex min-h-dvh w-full">
        {/* Barre latérale (desktop) */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-line md:bg-surface md:px-4 md:py-6 lg:w-72 sticky top-0 h-dvh">
          <Link href="/" className="mb-8 flex items-center gap-3 px-2">
            <Logo size={34} />
            <div>
              <div className="text-[17px] font-bold tracking-tight leading-none">YourFin</div>
              <div className="mt-1 text-[11px] text-ink-3">{t.app.tagline}</div>
            </div>
          </Link>
          <nav className="flex flex-col gap-1">
            {sidebar.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-medium transition",
                  isActive(item.href) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.pro && (
                  <span className={cx("rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase", pro ? "bg-positive-soft text-positive" : "bg-accent text-white")}>
                    Pro
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => openTransaction()}
            className="mt-auto flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-white shadow-float transition hover:bg-accent-strong active:scale-[0.98]"
          >
            <Plus size={18} /> {t.tx.add}
          </button>
        </aside>

        {/* Contenu */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:px-8 md:pb-12 md:pt-8 pt-safe">{children}</div>
        </main>

        {/* Bouton + (mobile) */}
        <button
          type="button"
          onClick={() => openTransaction()}
          aria-label={t.tx.add}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition hover:bg-accent-strong active:scale-95 md:hidden"
        >
          <Plus size={26} />
        </button>

        {/* Barre d'onglets (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-md pb-safe md:hidden">
          <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <li key={tab.href} className="flex-1">
                  <Link href={tab.href} className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition", active ? "text-accent" : "text-ink-3")}>
                    <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-accent-soft")}>
                      <tab.icon size={20} strokeWidth={active ? 2.4 : 2} />
                    </span>
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {sheet.open && <TransactionSheet onClose={closeSheet} transaction={sheet.transaction} defaultType={sheet.type} />}
    </UIContext.Provider>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <Logo size={72} />
      <div className="text-center">
        <div className="text-2xl font-bold tracking-tight">YourFin</div>
        <div className="mt-1 text-[13px] text-ink-3">Your money, Your control.</div>
      </div>
    </div>
  );
}
