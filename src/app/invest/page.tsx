"use client";

import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Legend, ProjectionLines } from "@/components/charts/charts";
import { Disclaimer, ProGate } from "@/components/pro/Paywall";
import { Card, Field, Input, PageHeader, SectionTitle, cx } from "@/components/ui/primitives";
import { monthTotals } from "@/lib/domain/analytics";
import { addMonths, currentMonthKey } from "@/lib/domain/dates";
import { PROFILES, SCENARIOS, project } from "@/lib/domain/invest";
import { centsToInput, formatCHF, parseAmountInput } from "@/lib/domain/money";
import { useCategoryMap, useTransactionsBetween } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

/* Couleurs des scénarios : ordre fixe validé (bleu, orange, aqua, violet) — la couleur suit le scénario, pas son rang. */
const SCENARIO_COLORS: Record<string, { light: string; dark: string }> = {
  savings: { light: "#2a78d6", dark: "#3987e5" },
  bonds: { light: "#eb6834", dark: "#d95926" },
  balanced: { light: "#1baf7a", dark: "#199e70" },
  stocks: { light: "#4a3aa7", dark: "#9085e9" },
};
const ALLOCATION_COLORS: Record<string, { light: string; dark: string }> = {
  Actions: { light: "#4a3aa7", dark: "#9085e9" },
  Obligations: { light: "#2a78d6", dark: "#3987e5" },
  Liquidités: { light: "#1baf7a", dark: "#199e70" },
};

export default function InvestPage() {
  const t = useT();
  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.invest.title} subtitle="Simulateur pédagogique" backHref="/more" />
      <ProGate preview={<PreviewCard />}>
        <Simulator />
      </ProGate>
    </div>
  );
}

function PreviewCard() {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-ink-2">Capital final estimé</p>
      <p className="text-[32px] font-bold tracking-tight">CHF 148&apos;300</p>
      <div className="mt-4 h-40 rounded-2xl bg-surface-2" />
    </Card>
  );
}

function Simulator() {
  const t = useT();
  const dark = useIsDark();
  const month = currentMonthKey();
  const categories = useCategoryMap();
  const history = useTransactionsBetween(addMonths(month, -3), addMonths(month, -1));

  const suggested = useMemo(() => {
    if (!history?.length) return 30000;
    const months = [1, 2, 3].map((i) => addMonths(month, -i));
    const rates = months.map((m) => monthTotals(history.filter((tx) => tx.month === m), categories)).filter((x) => x.incomes > 0);
    if (!rates.length) return 30000;
    const avg = rates.reduce((s, x) => s + (x.incomes - x.expenses), 0) / rates.length;
    return Math.max(5000, Math.round(avg / 5000) * 5000);
  }, [history, categories, month]);

  const [monthly, setMonthly] = useState<string | null>(null);
  const [initial, setInitial] = useState("0");
  const [years, setYears] = useState(15);
  const [scenarioId, setScenarioId] = useState("balanced");

  const monthlyCents = parseAmountInput(monthly ?? centsToInput(suggested)) ?? 0;
  const initialCents = parseAmountInput(initial) ?? 0;

  const projections = useMemo(() => SCENARIOS.map((s) => ({ scenario: s, points: project(s, initialCents, monthlyCents, years) })), [initialCents, monthlyCents, years]);
  const selected = projections.find((p) => p.scenario.id === scenarioId) ?? projections[0];
  const last = selected.points[selected.points.length - 1];

  const chartData = selected.points.map((pt, i) => {
    const row: Record<string, number | [number, number]> = { year: pt.year, band: [pt.low, pt.high] };
    for (const p of projections) row[p.scenario.id] = p.points[i].expected;
    return row;
  });
  const color = (id: string) => (dark ? SCENARIO_COLORS[id].dark : SCENARIO_COLORS[id].light);

  return (
    <div className="space-y-5">
      <Disclaimer>{t.invest.disclaimer}</Disclaimer>

      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t.invest.monthly} (CHF)`} hint={monthly === null ? t.invest.suggestedFromBudget : undefined}>
            <Input inputMode="decimal" value={monthly ?? centsToInput(suggested).replace(/\.00$/, "")} onChange={(e) => setMonthly(e.target.value)} />
          </Field>
          <Field label={`${t.invest.initial} (CHF)`}>
            <Input inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} />
          </Field>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="font-medium text-ink-2">{t.invest.horizon}</span>
            <span className="font-semibold">{years} {t.common.years}</span>
          </div>
          <input type="range" min={1} max={40} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-label={t.invest.horizon} />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenarioId(s.id)}
              className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold transition", scenarioId === s.id ? "border-ink bg-ink text-canvas" : "border-line text-ink-2")}
            >
              <span className="size-2.5 rounded-full" style={{ background: color(s.id) }} />
              {s.name}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-2">{selected.scenario.description} Rendement moyen {Math.round(selected.scenario.annualReturn * 1000) / 10} % · frais {Math.round(selected.scenario.fees * 1000) / 10} % · volatilité {Math.round(selected.scenario.volatility * 100)} %.</p>
      </Card>

      <Card className="p-4">
        <p className="text-[13px] text-ink-2">{t.invest.finalValue} · {years} {t.common.years}</p>
        <p className="text-[32px] font-bold tracking-tight">{formatCHF(last.expected, { decimals: 0 })}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-ink-2">{t.invest.contributed}</div>
            <div className="tabular mt-0.5 text-[14px] font-semibold">{formatCHF(last.contributed, { decimals: 0 })}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-ink-2">{t.invest.gains}</div>
            <div className={cx("tabular mt-0.5 text-[14px] font-semibold", last.expected - last.contributed >= 0 ? "text-positive" : "text-negative")}>{formatCHF(last.expected - last.contributed, { decimals: 0, sign: "always" })}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-ink-2">{t.invest.range}</div>
            <div className="tabular mt-0.5 text-[12px] font-semibold leading-tight">{formatCHF(last.low, { decimals: 0, compact: true, currency: false })} – {formatCHF(last.high, { decimals: 0, compact: true, currency: false })} CHF</div>
          </div>
        </div>
        <div className="mt-4">
          <ProjectionLines
            data={chartData}
            xKey="year"
            xFormatter={(v) => `${v} ans`}
            series={projections.map((p) => ({ key: p.scenario.id, name: p.scenario.name, color: color(p.scenario.id), emphasis: p.scenario.id === scenarioId ? true : false }))}
            band={{ key: "band", color: color(scenarioId) }}
          />
          <div className="mt-2">
            <Legend items={projections.map((p) => ({ label: p.scenario.name, color: color(p.scenario.id), kind: "line", muted: p.scenario.id !== scenarioId }))} />
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-3"><Info size={12} className="mt-0.5 shrink-0" /> La zone colorée représente la fourchette plausible (≈ 50 % des trajectoires) du scénario sélectionné. Montants nominaux, avant impôts et inflation.</p>
      </Card>

      <section>
        <SectionTitle hint="Trois répartitions types, à adapter à ta situation">{t.invest.profiles}</SectionTitle>
        <div className="space-y-3">
          {PROFILES.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-semibold">{p.name}</h3>
                <span className="text-[12px] text-ink-2">{p.horizon}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-2">{p.description}</p>
              <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
                {p.allocation.map((a) => (
                  <div key={a.label} style={{ width: `${a.share * 100}%`, background: dark ? ALLOCATION_COLORS[a.label].dark : ALLOCATION_COLORS[a.label].light }} title={`${a.label} ${Math.round(a.share * 100)} %`} />
                ))}
              </div>
              <div className="mt-2">
                <Legend items={p.allocation.map((a) => ({ label: `${a.label} ${Math.round(a.share * 100)} %`, color: dark ? ALLOCATION_COLORS[a.label].dark : ALLOCATION_COLORS[a.label].light }))} />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
