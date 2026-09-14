"use client";

import { FileUp, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ImportSheet } from "@/components/transactions/ImportSheet";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { Card, Chip, EmptyState, IconButton, MonthNav, PageHeader, cx } from "@/components/ui/primitives";
import { normalizeLabel } from "@/lib/domain/categorize";
import { addMonths, currentMonthKey, dayGroupLabel } from "@/lib/domain/dates";
import { formatCHF } from "@/lib/domain/money";
import type { Transaction, TxType } from "@/lib/domain/types";
import { useAccounts, useCategoryMap, useTransactionsBetween, useTransactionsByMonth } from "@/lib/hooks/useDb";
import { useT } from "@/lib/i18n";

type Filter = "all" | TxType;

export default function TransactionsPage() {
  const t = useT();
  const [month, setMonth] = useState(currentMonthKey());
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const categories = useCategoryMap();
  const accounts = useAccounts();
  const accountMap = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);

  const searching = query.trim().length > 0;
  const monthTx = useTransactionsByMonth(month);
  // En recherche, on élargit à 24 mois pour retrouver une transaction ancienne.
  const searchTx = useTransactionsBetween(addMonths(currentMonthKey(), -24), currentMonthKey());
  const source = searching ? searchTx : monthTx;

  const list = useMemo(() => {
    let items = source ?? [];
    if (filter !== "all") items = items.filter((tx) => tx.type === filter);
    if (searching) {
      const q = normalizeLabel(query);
      items = items.filter((tx) => {
        const cat = tx.categoryId ? categories.get(tx.categoryId)?.name ?? "" : "";
        return normalizeLabel(`${tx.payee} ${tx.note ?? ""} ${cat}`).includes(q) || formatCHF(tx.amount).includes(q);
      });
    }
    return items;
  }, [source, filter, searching, query, categories]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of list) map.set(tx.date, [...(map.get(tx.date) ?? []), tx]);
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [list]);

  const totals = useMemo(() => {
    let out = 0;
    let inc = 0;
    for (const tx of list) {
      if (tx.type === "expense") out += tx.amount;
      if (tx.type === "income") inc += tx.amount;
    }
    return { out, inc };
  }, [list]);

  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: t.tx.filterAll },
    { value: "expense", label: t.common.expenses },
    { value: "income", label: t.common.incomes },
    { value: "transfer", label: t.common.transfers },
  ];

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader
        title={t.tx.title}
        action={
          <IconButton label={t.tx.import} onClick={() => setImportOpen(true)} className="bg-accent-soft text-accent hover:bg-accent-soft">
            <FileUp size={18} />
          </IconButton>
        }
      />

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.search}
          className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-10 text-[14px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {filters.map((f) => (
          <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</Chip>
        ))}
      </div>

      {!searching && (
        <Card className="p-3">
          <MonthNav month={month} onChange={setMonth} />
          <div className="mt-2 flex justify-center gap-6 text-[12px] text-ink-2">
            <span>{t.common.spent} <span className="tabular font-semibold text-ink">{formatCHF(totals.out, { decimals: 0 })}</span></span>
            <span>{t.common.received} <span className="tabular font-semibold text-positive">{formatCHF(totals.inc, { decimals: 0 })}</span></span>
          </div>
        </Card>
      )}

      {groups.length === 0 ? (
        <EmptyState title={searching ? t.tx.emptySearch : t.tx.empty} hint={searching ? undefined : "Ajoute une transaction avec le bouton + ou importe un CSV."} />
      ) : (
        groups.map(([date, items]) => {
          const dayTotal = items.reduce((s, tx) => s + (tx.type === "expense" ? -tx.amount : tx.type === "income" ? tx.amount : 0), 0);
          return (
            <section key={date}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">{dayGroupLabel(date)}</h2>
                <span className={cx("tabular text-[12px] font-medium", dayTotal > 0 ? "text-positive" : "text-ink-3")}>{formatCHF(dayTotal, { sign: "always" })}</span>
              </div>
              <Card className="divide-y divide-line">
                {items.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} categories={categories} accounts={accountMap} showAccount={(accounts?.length ?? 0) > 1} />
                ))}
              </Card>
            </section>
          );
        })
      )}

      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
