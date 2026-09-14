"use client";

import { Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, CategoryBubble, EmptyState, Field, Input, MonthNav, PageHeader, ProgressBar, Ring, Segmented, Select, Sheet, cx } from "@/components/ui/primitives";
import { budgetSummary, suggest503020, suggestFromHistory, type BudgetLine } from "@/lib/domain/analytics";
import { categoryColor } from "@/lib/domain/categories";
import { addMonths, currentMonthKey } from "@/lib/domain/dates";
import { centsToInput, formatCHF, parseAmountInput } from "@/lib/domain/money";
import type { Category } from "@/lib/domain/types";
import { copyBudgets, removeBudget, setBudget, setBudgets } from "@/lib/db/repo";
import { db } from "@/lib/db";
import { useBudgets, useCategories, useCategoryMap, useSettings, useTransactionsBetween, useTransactionsByMonth } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

export default function BudgetPage() {
  const t = useT();
  const dark = useIsDark();
  const settings = useSettings();
  const [month, setMonth] = useState(currentMonthKey());
  const categories = useCategories() ?? [];
  const catMap = useCategoryMap();
  const budgets = useBudgets(month);
  const transactionsQuery = useTransactionsByMonth(month);
  const historyQuery = useTransactionsBetween(addMonths(month, -3), addMonths(month, -1));
  const transactions = useMemo(() => transactionsQuery ?? [], [transactionsQuery]);
  const history = useMemo(() => historyQuery ?? [], [historyQuery]);
  const [editing, setEditing] = useState<{ categoryId?: string; amount: string } | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);

  const summary = useMemo(() => budgetSummary(month, budgets ?? [], transactions, catMap), [month, budgets, transactions, catMap]);

  useEffect(() => {
    db.budgets.where("month").equals(addMonths(month, -1)).count().then(setPrevCount);
  }, [month, budgets]);

  const tone = summary.ratio >= 1 ? "negative" : summary.ratio >= 0.85 ? "warning" : "accent";
  const budgetedIds = new Set((budgets ?? []).map((b) => b.categoryId));
  const availableCategories = categories.filter((c) => c.kind === "expense" && !c.archived && !budgetedIds.has(c.id));

  async function saveEdit() {
    if (!editing?.categoryId) return;
    const cents = parseAmountInput(editing.amount);
    if (cents === null || cents < 0) return;
    await setBudget(editing.categoryId, month, cents);
    setEditing(null);
  }

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.budget.title} />
      <Card className="p-3">
        <MonthNav month={month} onChange={setMonth} />
      </Card>

      {summary.budgeted > 0 ? (
        <Card className="flex items-center gap-5 p-5">
          <Ring ratio={summary.ratio} tone={tone} size={116} stroke={11}>
            <span className="text-[11px] text-ink-3">{summary.ratio >= 1 ? t.budget.over : t.budget.left}</span>
            <span className={cx("text-[18px] font-bold tracking-tight", summary.remaining < 0 && "text-negative")}>{formatCHF(Math.abs(summary.remaining), { decimals: 0, currency: false })}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink-2">{t.common.spent}</p>
            <p className="text-[24px] font-bold tracking-tight leading-tight">{formatCHF(summary.spent, { decimals: 0 })}</p>
            <p className="text-[13px] text-ink-2">{t.common.of} {formatCHF(summary.budgeted, { decimals: 0 })}</p>
            {summary.daysLeft > 0 && summary.remaining > 0 && (
              <p className="mt-2 text-[12px] text-ink-2"><span className="font-semibold text-ink">{formatCHF(summary.perDay, { decimals: 0 })}</span> {t.budget.perDayLeft}</p>
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<Sparkles size={22} />}
          title={t.budget.noBudgets}
          hint="Laisse YourFin proposer un budget d'après ton historique ou la règle 50/30/20, puis ajuste."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => setSuggestOpen(true)}><Sparkles size={16} /> {t.budget.suggest}</Button>
              {prevCount > 0 && (
                <Button size="sm" variant="secondary" onClick={() => copyBudgets(addMonths(month, -1), month)}><Copy size={16} /> {t.budget.copyPrevious}</Button>
              )}
            </div>
          }
        />
      )}

      {summary.lines.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="shrink-0 text-[15px] font-semibold">Par catégorie</h2>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setSuggestOpen(true)} className="whitespace-nowrap px-3"><Sparkles size={15} /> Suggérer</Button>
              <Button size="sm" variant="soft" onClick={() => setEditing({ categoryId: availableCategories[0]?.id, amount: "" })} disabled={!availableCategories.length} className="whitespace-nowrap px-3"><Plus size={15} /> {t.common.add}</Button>
            </div>
          </div>
          <Card className="divide-y divide-line">
            {summary.lines.map((line) => (
              <BudgetRow key={line.budget.id} line={line} dark={dark} onEdit={() => setEditing({ categoryId: line.budget.categoryId, amount: centsToInput(line.budget.amount) })} />
            ))}
          </Card>
        </section>
      )}

      {summary.unbudgeted.length > 0 && summary.budgeted > 0 && (
        <section>
          <h2 className="mb-2 text-[15px] font-semibold">{t.budget.unbudgeted}</h2>
          <Card className="divide-y divide-line">
            {summary.unbudgeted.map((s) => {
              const cat = s.categoryId ? catMap.get(s.categoryId) : undefined;
              return (
                <div key={s.categoryId ?? "none"} className="flex items-center gap-3 px-4 py-3">
                  <CategoryBubble icon={cat?.icon ?? "MoreHorizontal"} color={categoryColor(cat, dark)} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{cat?.name ?? t.common.uncategorized}</div>
                    <div className="text-[12px] text-ink-2">{formatCHF(s.amount, { decimals: 0 })} · {s.count} transaction{s.count > 1 ? "s" : ""}</div>
                  </div>
                  {cat && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ categoryId: cat.id, amount: "" })}>{t.budget.setLimit}</Button>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      <p className="text-center text-[12px] text-ink-3">
        <Link href="/goals" className="font-semibold text-accent">{t.nav.goals}</Link> · le budget reste gratuit, pour toujours.
      </p>

      {/* Édition d'une ligne de budget */}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing && budgetedIds.has(editing.categoryId ?? "") ? "Modifier le budget" : t.budget.addCategory}>
        {editing && (
          <div className="space-y-4">
            <Field label={t.common.category}>
              <Select value={editing.categoryId ?? ""} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })} disabled={budgetedIds.has(editing.categoryId ?? "")}>
                {[...(editing.categoryId && budgetedIds.has(editing.categoryId) ? [catMap.get(editing.categoryId)] : []), ...availableCategories]
                  .filter((c): c is Category => !!c)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </Select>
            </Field>
            <Field label={`${t.budget.monthly} (CHF)`}>
              <Input inputMode="decimal" autoFocus value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} placeholder="400" onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
            </Field>
            <div className="flex gap-2">
              {editing.categoryId && budgetedIds.has(editing.categoryId) && (
                <Button variant="danger" onClick={async () => { const b = (budgets ?? []).find((x) => x.categoryId === editing.categoryId); if (b) await removeBudget(b.id); setEditing(null); }}>
                  <Trash2 size={16} />
                </Button>
              )}
              <Button full onClick={saveEdit}>{t.common.save}</Button>
            </div>
          </div>
        )}
      </Sheet>

      <SuggestSheet
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        month={month}
        categories={categories}
        catMap={catMap}
        historyAvailable={history.length > 0}
        suggestHistory={() => suggestFromHistory(history, catMap, 3)}
        suggest503020={() => (settings?.monthlyNetIncome ? suggest503020(settings.monthlyNetIncome, categories) : [])}
        hasIncome={!!settings?.monthlyNetIncome}
        dark={dark}
      />
    </div>
  );
}

function BudgetRow({ line, dark, onEdit }: { line: BudgetLine; dark: boolean; onEdit: () => void }) {
  const cat = line.category;
  const over = line.remaining < 0;
  return (
    <button type="button" onClick={onEdit} className="block w-full px-4 py-3 text-left transition hover:bg-surface-2">
      <div className="flex items-center gap-3">
        <CategoryBubble icon={cat?.icon ?? "MoreHorizontal"} color={categoryColor(cat, dark)} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-medium">{cat?.name ?? "?"}</span>
            <span className={cx("tabular shrink-0 text-[13px] font-semibold", over ? "text-negative" : "text-ink")}>
              {over ? `-${formatCHF(-line.remaining, { decimals: 0, currency: false })}` : formatCHF(line.remaining, { decimals: 0, currency: false })}
              <span className="ml-1 text-[11px] font-medium text-ink-3">{over ? "dépassé" : "reste"}</span>
            </span>
          </div>
          <ProgressBar ratio={line.ratio} className="mt-1.5 h-1.5" />
          <div className="mt-1 text-[11px] text-ink-3">{formatCHF(line.spent, { decimals: 0 })} sur {formatCHF(line.budget.amount, { decimals: 0 })}</div>
        </div>
      </div>
    </button>
  );
}

function SuggestSheet({
  open,
  onClose,
  month,
  catMap,
  historyAvailable,
  suggestHistory,
  suggest503020: suggestRule,
  hasIncome,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  categories: Category[];
  catMap: Map<string, Category>;
  historyAvailable: boolean;
  suggestHistory: () => Array<{ categoryId: string; amount: number }>;
  suggest503020: () => Array<{ categoryId: string; amount: number }>;
  hasIncome: boolean;
  dark: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"history" | "rule">(historyAvailable ? "history" : "rule");
  return (
    <Sheet open={open} onClose={onClose} title={t.budget.suggest}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "history", label: t.budget.suggestAvg },
          { value: "rule", label: t.budget.suggest503020 },
        ]}
      />
      {mode === "history" && !historyAvailable && <p className="mt-4 text-[13px] text-ink-2">Pas encore d&apos;historique sur les 3 derniers mois. Importe un relevé CSV ou utilise la règle 50/30/20.</p>}
      {mode === "rule" && !hasIncome && (
        <p className="mt-4 text-[13px] text-ink-2">{t.budget.incomeNeeded} <Link href="/settings" className="font-semibold text-accent">Réglages</Link></p>
      )}
      {/* Remonté à chaque changement de mode : l'état des lignes est initialisé au montage. */}
      <SuggestRows key={mode} month={month} catMap={catMap} dark={dark} initial={mode === "history" ? suggestHistory() : suggestRule()} onDone={onClose} />
    </Sheet>
  );
}

function SuggestRows({
  month,
  catMap,
  dark,
  initial,
  onDone,
}: {
  month: string;
  catMap: Map<string, Category>;
  dark: boolean;
  initial: Array<{ categoryId: string; amount: number }>;
  onDone: () => void;
}) {
  const t = useT();
  const [rows, setRows] = useState(() => initial.map((s) => ({ categoryId: s.categoryId, amount: centsToInput(s.amount) })));
  const total = rows.reduce((s, r) => s + (parseAmountInput(r.amount) ?? 0), 0);

  async function apply() {
    await setBudgets(
      month,
      rows.map((r) => ({ categoryId: r.categoryId, amount: parseAmountInput(r.amount) ?? 0 })).filter((r) => r.amount > 0),
    );
    onDone();
  }

  return (
    <>
      <ul className="mt-4 space-y-2">
        {rows.map((r, i) => {
          const cat = catMap.get(r.categoryId);
          return (
            <li key={r.categoryId} className="flex items-center gap-3">
              <CategoryBubble icon={cat?.icon ?? "MoreHorizontal"} color={categoryColor(cat, dark)} size={32} />
              <span className="flex-1 truncate text-[14px]">{cat?.name}</span>
              <Input className="h-10 w-28 text-right" inputMode="decimal" value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1 text-[13px] text-ink-2">Total <span className="tabular font-semibold text-ink">{formatCHF(total, { decimals: 0 })}</span> {t.common.perMonth}</div>
        <Button onClick={apply} disabled={rows.length === 0}>Appliquer</Button>
      </div>
    </>
  );
}
