"use client";

import { ArrowDownLeft, ArrowUpRight, ChevronRight, Settings as SettingsIcon, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Donut, MonthlyBars } from "@/components/charts/charts";
import { useUI } from "@/components/layout/AppShell";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { ACCOUNT_TYPE_ICON, IconByName } from "@/components/ui/icons";
import { Button, Card, CategoryBubble, EmptyState, ProgressBar, SectionTitle, cx } from "@/components/ui/primitives";
import { budgetSummary, monthTotals, monthlySeries, spendingByCategory, topWithOther } from "@/lib/domain/analytics";
import { categoryColor } from "@/lib/domain/categories";
import { addDays, addMonths, currentMonthKey, diffDays, formatDate, lastMonths, monthShort, todayISO } from "@/lib/domain/dates";
import { formatCHF } from "@/lib/domain/money";
import { useAccountBalances, useBudgets, useCategoryMap, useRecurring, useSettings, useTransactionsBetween } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

export default function HomePage() {
  const t = useT();
  const dark = useIsDark();
  const { openTransaction } = useUI();
  const settings = useSettings();
  const month = currentMonthKey();
  const months6 = useMemo(() => lastMonths(6, month), [month]);
  const categories = useCategoryMap();
  const { accounts, total } = useAccountBalances();
  const transactions = useTransactionsBetween(months6[0], month);
  const budgets = useBudgets(month);
  const recurring = useRecurring();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const accountMap = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const thisMonth = useMemo(() => (transactions ?? []).filter((tx) => tx.month === month), [transactions, month]);
  const lastMonth = useMemo(() => (transactions ?? []).filter((tx) => tx.month === addMonths(month, -1)), [transactions, month]);
  const totals = useMemo(() => monthTotals(thisMonth, categories), [thisMonth, categories]);
  const prevTotals = useMemo(() => monthTotals(lastMonth, categories), [lastMonth, categories]);
  const budget = useMemo(() => budgetSummary(month, budgets ?? [], thisMonth, categories), [month, budgets, thisMonth, categories]);
  const spend = useMemo(() => topWithOther(spendingByCategory(thisMonth, categories), 5), [thisMonth, categories]);
  const series = useMemo(() => monthlySeries(transactions ?? [], categories, months6), [transactions, categories, months6]);
  const recent = useMemo(() => [...thisMonth].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt))).slice(0, 5), [thisMonth]);

  const today = todayISO();
  const upcoming = useMemo(
    () =>
      (recurring ?? [])
        .filter((r) => r.active && r.nextDate >= today && r.nextDate <= addDays(today, 10))
        .sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1))
        .slice(0, 4),
    [recurring, today],
  );

  const hour = new Date().getHours();
  const greeting = hour >= 18 ? t.home.greetingEvening : t.home.greeting;
  const delta = prevTotals.expenses ? (totals.expenses - prevTotals.expenses) / prevTotals.expenses : null;

  const donutData = spend.map((s) => {
    const cat = s.categoryId ? categories.get(s.categoryId) : undefined;
    const isOther = s.categoryId === "__other__";
    return {
      id: s.categoryId ?? "__none__",
      name: isOther ? "Autres" : cat?.name ?? t.common.uncategorized,
      value: s.amount,
      color: isOther ? (dark ? "#6f6f85" : "#c4c4d2") : categoryColor(cat, dark),
      icon: isOther ? "MoreHorizontal" : cat?.icon ?? "MoreHorizontal",
    };
  });

  return (
    <div className="space-y-6 anim-fade-in">
      {/* En-tête */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-ink-2">{greeting}{settings?.firstName ? `, ${settings.firstName}` : ""} 👋</p>
          <h1 className="text-[22px] font-bold tracking-tight">{t.nav.home}</h1>
        </div>
        <Link href="/settings" aria-label={t.nav.settings} className="flex size-10 items-center justify-center rounded-full bg-surface border border-line shadow-card text-ink-2 hover:text-ink">
          <SettingsIcon size={18} />
        </Link>
      </header>

      {/* Solde total */}
      <Card className="relative isolate overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-56 rounded-full bg-accent-soft blur-2xl" />
        <p className="text-[13px] font-medium text-ink-2">{t.home.totalBalance}</p>
        <p className="mt-1 text-[38px] font-bold leading-none tracking-tight">{formatCHF(total)}</p>
        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          {(accounts ?? []).map((a) => (
            <Link key={a.id} href="/settings/accounts" className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface-2 py-1.5 pl-1.5 pr-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full text-white" style={{ background: a.color }}>
                <IconByName name={ACCOUNT_TYPE_ICON[a.type] ?? "Wallet"} size={13} />
              </span>
              <span className="text-[12px] font-medium text-ink-2">{a.name}</span>
              <span className="tabular text-[12px] font-semibold">{formatCHF(a.balance, { decimals: 0 })}</span>
            </Link>
          ))}
          {accounts && accounts.length === 0 && (
            <Link href="/settings/accounts" className="text-[13px] font-semibold text-accent">+ Ajouter un compte</Link>
          )}
        </div>
      </Card>

      {/* Ce mois */}
      <section>
        <SectionTitle action={<Link href="/budget" className="text-[13px] font-semibold text-accent">{t.nav.budget} <ChevronRight size={14} className="inline" /></Link>}>
          {t.home.monthOverview}
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
              <ArrowUpRight size={14} className="text-negative" /> {t.common.spent}
            </div>
            <p className="mt-1 text-[22px] font-bold tracking-tight">{formatCHF(totals.expenses, { decimals: 0 })}</p>
            {delta !== null && (
              <p className={cx("mt-0.5 text-[12px] font-medium", delta > 0.05 ? "text-negative" : delta < -0.05 ? "text-positive" : "text-ink-3")}>
                {delta > 0 ? "+" : ""}{Math.round(delta * 100)} % {t.common.vsLastMonth}
              </p>
            )}
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
              <ArrowDownLeft size={14} className="text-positive" /> {t.common.received}
            </div>
            <p className="mt-1 text-[22px] font-bold tracking-tight">{formatCHF(totals.incomes, { decimals: 0 })}</p>
            {totals.incomes > 0 && (
              <p className="mt-0.5 text-[12px] text-ink-3">Épargne {Math.round(((totals.incomes - totals.expenses) / totals.incomes) * 100)} %</p>
            )}
          </Card>
        </div>
        <Card className="mt-3 p-4">
          {budget.budgeted > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink-2">{t.home.budgetLeft}</span>
                <span className="text-[12px] text-ink-3">{formatCHF(budget.spent, { decimals: 0 })} / {formatCHF(budget.budgeted, { decimals: 0 })}</span>
              </div>
              <p className={cx("mt-1 text-[24px] font-bold tracking-tight", budget.remaining < 0 && "text-negative")}>{formatCHF(budget.remaining, { decimals: 0 })}</p>
              <ProgressBar ratio={budget.ratio} className="mt-3" />
              {budget.daysLeft > 0 && budget.remaining > 0 && (
                <p className="mt-2 text-[12px] text-ink-2">≈ <span className="font-semibold text-ink">{formatCHF(budget.perDay, { decimals: 0 })}</span> {t.common.perDay} {t.home.safeToSpend.toLowerCase()}</p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Wallet size={18} /></span>
                <p className="text-[13px] text-ink-2">{t.home.noBudget}</p>
              </div>
              <Link href="/budget" className="shrink-0"><Button size="sm" variant="soft" className="whitespace-nowrap">{t.home.setBudget}</Button></Link>
            </div>
          )}
        </Card>
      </section>

      {/* Dépenses par catégorie */}
      <section>
        <SectionTitle>{t.home.spendingByCategory}</SectionTitle>
        <Card className="p-4">
          {donutData.length === 0 ? (
            <EmptyState
              title={t.home.empty}
              action={
                <div className="flex flex-col items-center gap-2">
                  <Button size="sm" onClick={() => openTransaction()}>{t.tx.add}</Button>
                  <Link href="/settings#demo" className="text-[12px] font-semibold text-accent">Ou essayer avec des données de démo</Link>
                </div>
              }
            />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Donut data={donutData} activeId={activeCat} onSelect={(id) => setActiveCat((cur) => (cur === id ? null : id))}>
                <span className="text-[11px] text-ink-3">{t.common.spent}</span>
                <span className="text-[18px] font-bold tracking-tight">{formatCHF(totals.expenses, { decimals: 0, currency: false })}</span>
                <span className="text-[10px] text-ink-3">CHF</span>
              </Donut>
              <ul className="w-full flex-1 divide-y divide-line">
                {donutData.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setActiveCat((cur) => (cur === d.id ? null : d.id))} className={cx("flex w-full items-center gap-3 py-2 text-left transition", activeCat && activeCat !== d.id && "opacity-40")}>
                      <CategoryBubble icon={d.icon} color={d.color} size={30} />
                      <span className="flex-1 truncate text-[14px] font-medium">{d.name}</span>
                      <span className="text-[12px] text-ink-3">{totals.expenses ? Math.round((d.value / totals.expenses) * 100) : 0} %</span>
                      <span className="tabular w-24 text-right text-[14px] font-semibold">{formatCHF(d.value, { decimals: 0 })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* Tendance */}
      {series.some((p) => p.expenses > 0) && (
        <section>
          <SectionTitle hint="Dépenses mensuelles">{t.home.trend}</SectionTitle>
          <Card className="p-4 pb-2">
            <MonthlyBars data={series.map((p) => ({ key: p.month, label: monthShort(p.month), value: p.expenses, emphasis: p.month === month }))} />
          </Card>
        </section>
      )}

      {/* À venir */}
      {upcoming.length > 0 && (
        <section>
          <SectionTitle action={<Link href="/settings/recurring" className="text-[13px] font-semibold text-accent">{t.common.seeAll}</Link>}>{t.home.upcoming}</SectionTitle>
          <Card className="divide-y divide-line">
            {upcoming.map((r) => {
              const cat = r.categoryId ? categories.get(r.categoryId) : undefined;
              const inDays = diffDays(today, r.nextDate);
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <CategoryBubble icon={cat?.icon ?? "Repeat"} color={categoryColor(cat, dark)} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{r.payee}</div>
                    <div className="text-[12px] text-ink-2">{inDays === 0 ? "Aujourd'hui" : inDays === 1 ? "Demain" : `Dans ${inDays} jours`} · {formatDate(r.nextDate)}</div>
                  </div>
                  <span className={cx("tabular text-[14px] font-semibold", r.type === "income" ? "text-positive" : "")}>{formatCHF(r.type === "income" ? r.amount : -r.amount, { sign: "always" })}</span>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Récentes */}
      <section>
        <SectionTitle action={<Link href="/transactions" className="text-[13px] font-semibold text-accent">{t.common.seeAll}</Link>}>{t.home.recent}</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState title={t.home.empty} />
        ) : (
          <Card className="divide-y divide-line">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} categories={categories} accounts={accountMap} />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
