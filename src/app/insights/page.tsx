"use client";

import { ArrowDownRight, ArrowUpRight, Lightbulb, Repeat, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { MonthlyBars } from "@/components/charts/charts";
import { Card, CategoryBubble, EmptyState, PageHeader, ProgressBar, Ring, SectionTitle, cx } from "@/components/ui/primitives";
import { budgetSummary, buildTips, detectSubscriptions, financialScore, monthTotals, monthlySeries, savingsRateOf, spendingByCategory } from "@/lib/domain/analytics";
import { categoryColor } from "@/lib/domain/categories";
import { addMonths, currentMonthKey, lastMonths, monthShort } from "@/lib/domain/dates";
import { formatCHF } from "@/lib/domain/money";
import { useAccountBalances, useBudgets, useCategoryMap, useTransactionsBetween } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

export default function InsightsPage() {
  const t = useT();
  const dark = useIsDark();
  const month = currentMonthKey();
  const months = useMemo(() => lastMonths(6, month), [month]);
  const categories = useCategoryMap();
  const transactions = useTransactionsBetween(months[0], month);
  const budgets = useBudgets(month);
  const { accounts } = useAccountBalances();

  const data = useMemo(() => {
    if (!transactions) return null;
    const byMonth = (m: string) => transactions.filter((tx) => tx.month === m);
    const current = monthTotals(byMonth(month), categories);
    const prevMonth = addMonths(month, -1);
    const previous = monthTotals(byMonth(prevMonth), categories);
    const history = [1, 2, 3].map((i) => monthTotals(byMonth(addMonths(month, -i)), categories));
    const budget = budgetSummary(month, budgets ?? [], byMonth(month), categories);
    const subscriptions = detectSubscriptions(transactions);
    const subscriptionsMonthly = subscriptions.reduce((s, x) => s + x.amount, 0);
    const liquidSavings = (accounts ?? []).filter((a) => a.type === "savings").reduce((s, a) => s + a.balance, 0);
    const score = financialScore({ current, history, budget, subscriptionsMonthly, liquidSavings });
    const spendNow = spendingByCategory(byMonth(month), categories);
    const spendPrev = new Map(spendingByCategory(byMonth(prevMonth), categories).map((s) => [s.categoryId, s.amount]));
    const topCategories = spendNow.slice(0, 5).map((s) => ({
      category: s.categoryId ? categories.get(s.categoryId) : undefined,
      amount: s.amount,
      previousAmount: spendPrev.get(s.categoryId) ?? 0,
    }));
    const tips = buildTips({ score, current, previous: previous.expenses || previous.incomes ? previous : null, topCategories, subscriptions, budget, fmt: (c) => formatCHF(c, { decimals: 0 }) });
    const series = monthlySeries(transactions, categories, months);
    return { current, previous, score, subscriptions, subscriptionsMonthly, topCategories, tips, series, liquidSavings };
  }, [transactions, categories, month, budgets, accounts, months]);

  if (!data) return null;
  const hasData = data.series.some((p) => p.expenses > 0 || p.incomes > 0);
  if (!hasData) {
    return (
      <div className="space-y-4 anim-fade-in">
        <PageHeader title={t.insights.title} />
        <EmptyState icon={<Lightbulb size={22} />} title={t.insights.noData} />
      </div>
    );
  }

  const { score } = data;
  const scoreTone = score.total >= 70 ? "positive" : score.total >= 40 ? "accent" : "warning";
  const rate = savingsRateOf(data.current);
  const maxSpend = Math.max(1, ...data.topCategories.map((c) => c.amount));

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader title={t.insights.title} subtitle="Comprendre, puis améliorer." />

      {/* Score */}
      <Card className="p-5">
        <div className="flex items-center gap-5">
          <Ring ratio={score.total / 100} tone={scoreTone} size={110} stroke={10}>
            <span className="text-[28px] font-bold tracking-tight leading-none">{score.total}</span>
            <span className="text-[10px] text-ink-3">/ 100</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">{t.insights.score}</h2>
            <p className="mt-1 text-[12px] text-ink-2">{t.insights.scoreHint}</p>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
          {[
            { label: t.insights.savingsRate, value: score.savingsRateScore, max: 35 },
            { label: "Respect du budget", value: score.budgetScore, max: 25 },
            { label: "Abonnements maîtrisés", value: score.subscriptionsScore, max: 15 },
            { label: t.insights.emergency, value: score.emergencyScore, max: 25 },
          ].map((item) => (
            <li key={item.label}>
              <div className="flex justify-between text-ink-2"><span>{item.label}</span><span className="tabular font-semibold text-ink">{item.value}/{item.max}</span></div>
              <ProgressBar ratio={item.value / item.max} tone="accent" className="mt-1 h-1.5" />
            </li>
          ))}
        </ul>
      </Card>

      {/* Tuiles */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-[12px] font-medium text-ink-2">{t.insights.savingsRate}</p>
          <p className={cx("mt-1 text-[24px] font-bold tracking-tight", (data.current.incomes ? rate : score.savingsRate) < 0 && "text-negative")}>
            {data.current.incomes ? `${Math.round(rate * 100)} %` : `${Math.round(score.savingsRate * 100)} %`}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-3">{data.current.incomes ? t.insights.savingsRateHint : "Moyenne des 3 derniers mois (pas encore de revenu ce mois)."}</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1 text-[12px] font-medium text-ink-2"><ShieldCheck size={13} /> {t.insights.emergency}</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight">{score.emergencyMonths.toFixed(1)} <span className="text-[13px] font-medium text-ink-3">mois</span></p>
          <p className="mt-0.5 text-[11px] text-ink-3">{t.insights.emergencyHint}</p>
        </Card>
      </div>

      {/* Conseils */}
      {data.tips.length > 0 && (
        <section>
          <SectionTitle>{t.insights.tips}</SectionTitle>
          <div className="space-y-2">
            {data.tips.map((tip) => (
              <Card key={tip.id} className="flex gap-3 p-4">
                <span className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", {
                  accent: "bg-accent-soft text-accent",
                  positive: "bg-positive-soft text-positive",
                  warning: "bg-warning-soft text-warning",
                  negative: "bg-negative-soft text-negative",
                }[tip.tone])}>
                  <Lightbulb size={15} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{tip.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">{tip.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Top catégories vs mois dernier */}
      {data.topCategories.length > 0 && (
        <section>
          <SectionTitle hint={t.common.thisMonth + " " + t.common.vsLastMonth}>{t.insights.topCategories}</SectionTitle>
          <Card className="divide-y divide-line">
            {data.topCategories.map((c) => {
              const delta = c.previousAmount ? (c.amount - c.previousAmount) / c.previousAmount : null;
              return (
                <div key={c.category?.id ?? "none"} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CategoryBubble icon={c.category?.icon ?? "MoreHorizontal"} color={categoryColor(c.category, dark)} size={34} />
                    <span className="flex-1 truncate text-[14px] font-medium">{c.category?.name ?? t.common.uncategorized}</span>
                    {delta !== null && (
                      <span className={cx("flex items-center gap-0.5 text-[12px] font-semibold", delta > 0.05 ? "text-negative" : delta < -0.05 ? "text-positive" : "text-ink-3")}>
                        {delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {Math.abs(Math.round(delta * 100))} %
                      </span>
                    )}
                    <span className="tabular w-24 text-right text-[14px] font-semibold">{formatCHF(c.amount, { decimals: 0 })}</span>
                  </div>
                  <div className="ml-[46px] mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(c.amount / maxSpend) * 100}%`, background: categoryColor(c.category, dark) }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Abonnements */}
      <section>
        <SectionTitle hint={t.insights.subscriptionsHint}>{t.insights.subscriptions}</SectionTitle>
        {data.subscriptions.length === 0 ? (
          <EmptyState icon={<Repeat size={20} />} title="Aucun abonnement détecté pour l'instant" hint="Il faut au moins 2 mois de transactions au même libellé." />
        ) : (
          <Card className="divide-y divide-line">
            {data.subscriptions.slice(0, 8).map((s) => {
              const cat = s.categoryId ? categories.get(s.categoryId) : undefined;
              return (
                <div key={s.payee} className="flex items-center gap-3 px-4 py-3">
                  <CategoryBubble icon={cat?.icon ?? "Repeat"} color={categoryColor(cat, dark)} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{s.payee}</div>
                    <div className="text-[12px] text-ink-2">{s.months} mois · {formatCHF(s.amount * 12, { decimals: 0 })} {t.common.perYear}</div>
                  </div>
                  <span className="tabular text-[14px] font-semibold">{formatCHF(s.amount)}<span className="text-[11px] font-medium text-ink-3"> {t.common.perMonth}</span></span>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-4 py-3 text-[13px]">
              <span className="text-ink-2">Total</span>
              <span className="tabular font-bold">{formatCHF(data.subscriptionsMonthly)} {t.common.perMonth} · {formatCHF(data.subscriptionsMonthly * 12, { decimals: 0 })} {t.common.perYear}</span>
            </div>
          </Card>
        )}
      </section>

      {/* Revenus vs dépenses */}
      <section>
        <SectionTitle hint="Dépenses mensuelles, mois courant en couleur">Tendance</SectionTitle>
        <Card className="p-4 pb-2">
          <MonthlyBars data={data.series.map((p) => ({ key: p.month, label: monthShort(p.month), value: p.expenses, emphasis: p.month === month }))} />
        </Card>
      </section>
    </div>
  );
}
