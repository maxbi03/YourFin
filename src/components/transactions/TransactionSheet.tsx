"use client";

import { Repeat, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addTransaction, createRecurring, deleteTransaction, updateTransaction } from "@/lib/db/repo";
import { suggestCategory } from "@/lib/domain/categorize";
import { nextOccurrence, todayISO } from "@/lib/domain/dates";
import { centsToInput, parseAmountInput } from "@/lib/domain/money";
import type { Frequency, Transaction, TxType } from "@/lib/domain/types";
import { useAccounts, useCategories, useRules } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";
import { categoryColor } from "@/lib/domain/categories";
import { AmountInput, Button, CategoryBubble, ConfirmSheet, Field, Input, Segmented, Select, Sheet, cx } from "@/components/ui/primitives";

const FREQ_OPTIONS: Array<{ value: Frequency | "none"; label: string }> = [
  { value: "none", label: "Non" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
  { value: "quarterly", label: "Chaque trimestre" },
  { value: "yearly", label: "Chaque année" },
];

/**
 * Formulaire d'ajout / édition. À monter uniquement quand la feuille est ouverte :
 * l'état du formulaire est initialisé au montage, donc remis à zéro à chaque ouverture.
 */
export function TransactionSheet({
  onClose,
  transaction,
  defaultType = "expense",
}: {
  onClose: () => void;
  transaction?: Transaction | null;
  defaultType?: TxType;
}) {
  const t = useT();
  const dark = useIsDark();
  const accounts = useAccounts();
  const categories = useCategories();
  const rules = useRules();
  const editing = !!transaction;

  const [type, setType] = useState<TxType>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount) : "");
  const [payee, setPayee] = useState(transaction?.payee ?? "");
  const [categoryId, setCategoryId] = useState<string | undefined>(transaction?.categoryId);
  const [categoryManual, setCategoryManual] = useState(!!transaction);
  const [accountChoice, setAccountChoice] = useState(transaction?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId ?? "");
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [note, setNote] = useState(transaction?.note ?? "");
  const [repeat, setRepeat] = useState<Frequency | "none">("none");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Compte effectif : le choix de l'utilisateur, sinon le premier compte courant.
  const accountId = accountChoice || (accounts?.find((a) => a.type === "checking") ?? accounts?.[0])?.id || "";

  // Suggestion automatique de catégorie d'après le libellé (tant que l'utilisateur n'a pas choisi lui-même).
  useEffect(() => {
    if (categoryManual || type === "transfer") return;
    const handle = setTimeout(() => {
      const suggestion = suggestCategory(payee, rules ?? []);
      const cat = suggestion ? categories?.find((c) => c.id === suggestion) : undefined;
      setCategoryId(cat && cat.kind === (type === "income" ? "income" : "expense") ? cat.id : undefined);
    }, 150);
    return () => clearTimeout(handle);
  }, [payee, rules, categories, categoryManual, type]);

  const visibleCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.archived && c.kind === (type === "income" ? "income" : "expense")),
    [categories, type],
  );

  const cents = parseAmountInput(amount);

  async function save() {
    setError(null);
    if (!cents || cents <= 0) return setError("Indique un montant supérieur à 0.");
    if (!accountId) return setError("Choisis un compte.");
    if (type === "transfer" && (!toAccountId || toAccountId === accountId)) return setError("Choisis un compte de destination différent.");
    setSaving(true);
    try {
      const input = {
        type,
        amount: cents,
        date,
        accountId,
        toAccountId: type === "transfer" ? toAccountId : undefined,
        categoryId: type === "transfer" ? undefined : categoryId,
        payee: payee || (type === "transfer" ? "Transfert" : ""),
        note,
      };
      if (editing && transaction) {
        await updateTransaction(transaction.id, input, { learn: categoryManual });
      } else {
        await addTransaction(input, { learn: categoryManual });
        if (repeat !== "none" && type !== "transfer") {
          await createRecurring({
            type,
            amount: cents,
            categoryId,
            accountId,
            payee: input.payee,
            frequency: repeat,
            nextDate: nextOccurrence(date, repeat),
            active: true,
          });
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!transaction) return;
    await deleteTransaction(transaction.id);
    onClose();
  }

  const typeOptions: Array<{ value: TxType; label: string }> = [
    { value: "expense", label: t.common.expense },
    { value: "income", label: t.common.income },
    { value: "transfer", label: t.common.transfer },
  ];

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={editing ? t.tx.edit : t.tx.add}
        footer={
          <div className="flex gap-2">
            {editing && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label={t.common.delete} className="px-4">
                <Trash2 size={18} />
              </Button>
            )}
            <Button full onClick={save} disabled={saving}>
              {t.common.save}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Segmented value={type} onChange={(v) => { setType(v); setCategoryManual(false); }} options={typeOptions} />

          <AmountInput value={amount} onChange={setAmount} autoFocus={!editing} invalid={!!error && !cents} />

          <Field label={t.tx.payee}>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={t.tx.payeePlaceholder} autoComplete="off" />
          </Field>

          {type !== "transfer" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink-2">{t.common.category}</span>
                {!categoryManual && categoryId && <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{t.tx.suggested}</span>}
              </div>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {visibleCategories.map((c) => {
                  const active = c.id === categoryId;
                  const color = categoryColor(c, dark);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={c.name}
                      aria-pressed={active}
                      onClick={() => { setCategoryId(c.id); setCategoryManual(true); }}
                      className={cx(
                        "flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-2 transition",
                        active ? "border-ink bg-surface-2" : "border-transparent hover:bg-surface-2",
                      )}
                    >
                      <CategoryBubble icon={c.icon} color={color} size={36} />
                      <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-ink-2">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              {categoryManual && payee && <p className="mt-1 text-[12px] text-ink-3">{t.tx.learnHint}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={type === "transfer" ? t.tx.fromAccount : t.common.account}>
              <Select value={accountId} onChange={(e) => setAccountChoice(e.target.value)}>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            {type === "transfer" ? (
              <Field label={t.tx.toAccount}>
                <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                  <option value="">—</option>
                  {(accounts ?? []).filter((a) => a.id !== accountId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label={t.common.date}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max="2100-12-31" />
              </Field>
            )}
          </div>
          {type === "transfer" && (
            <Field label={t.common.date}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}

          <Field label={`${t.common.note} (${t.common.optional})`}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {!editing && type !== "transfer" && (
            <Field label={t.tx.repeat} hint={repeat !== "none" ? t.tx.repeatHint : undefined}>
              <div className="relative">
                <Repeat size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                <Select value={repeat} onChange={(e) => setRepeat(e.target.value as Frequency | "none")} className="pl-11">
                  {FREQ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
            </Field>
          )}

          {error && <p className="rounded-xl bg-negative-soft px-3 py-2 text-[13px] font-medium text-negative">{error}</p>}
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t.tx.deleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />
    </>
  );
}
