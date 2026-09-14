"use client";

import { Plus, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, CategoryBubble, ConfirmSheet, EmptyState, Field, Input, PageHeader, Segmented, Select, Sheet, Toggle, cx } from "@/components/ui/primitives";
import { createRecurring, deleteRecurring, updateRecurring } from "@/lib/db/repo";
import { categoryColor } from "@/lib/domain/categories";
import { formatDate, monthlyEquivalent, todayISO } from "@/lib/domain/dates";
import { centsToInput, formatCHF, parseAmountInput } from "@/lib/domain/money";
import type { Frequency, Recurring } from "@/lib/domain/types";
import { useAccounts, useCategories, useCategoryMap, useRecurring } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

const FREQ_LABEL: Record<Frequency, string> = { weekly: "Hebdomadaire", monthly: "Mensuel", quarterly: "Trimestriel", yearly: "Annuel" };

export default function RecurringPage() {
  const t = useT();
  const dark = useIsDark();
  const recurring = useRecurring() ?? [];
  const catMap = useCategoryMap();
  const [editing, setEditing] = useState<Recurring | null | "new">(null);

  const monthlyOut = recurring.filter((r) => r.active && r.type === "expense").reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);
  const monthlyIn = recurring.filter((r) => r.active && r.type === "income").reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);
  const sorted = [...recurring].sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.settings.recurring} backHref="/settings" action={<Button size="sm" onClick={() => setEditing("new")}><Plus size={16} /> {t.common.add}</Button>} />
      {recurring.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-[12px] text-ink-2">Charges fixes</p>
            <p className="text-[20px] font-bold tracking-tight">{formatCHF(monthlyOut, { decimals: 0 })} <span className="text-[12px] font-medium text-ink-3">{t.common.perMonth}</span></p>
          </Card>
          <Card className="p-4">
            <p className="text-[12px] text-ink-2">Revenus fixes</p>
            <p className="text-[20px] font-bold tracking-tight text-positive">{formatCHF(monthlyIn, { decimals: 0 })} <span className="text-[12px] font-medium text-ink-3">{t.common.perMonth}</span></p>
          </Card>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState icon={<Repeat size={20} />} title="Aucune récurrence" hint="Loyer, salaire, abonnements : YourFin crée la transaction automatiquement à chaque échéance." action={<Button size="sm" onClick={() => setEditing("new")}>{t.common.add}</Button>} />
      ) : (
        <Card className="divide-y divide-line">
          {sorted.map((r) => {
            const cat = r.categoryId ? catMap.get(r.categoryId) : undefined;
            return (
              <button key={r.id} type="button" onClick={() => setEditing(r)} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2", !r.active && "opacity-50")}>
                <CategoryBubble icon={cat?.icon ?? "Repeat"} color={categoryColor(cat, dark)} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{r.payee}</div>
                  <div className="text-[12px] text-ink-2">{FREQ_LABEL[r.frequency]} · prochaine le {formatDate(r.nextDate)}{!r.active ? " · en pause" : ""}</div>
                </div>
                <span className={cx("tabular text-[15px] font-semibold", r.type === "income" && "text-positive")}>{formatCHF(r.type === "income" ? r.amount : -r.amount, { sign: "always" })}</span>
              </button>
            );
          })}
        </Card>
      )}
      <RecurringSheet item={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </div>
  );
}

function RecurringSheet({ item, open, onClose }: { item: Recurring | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const accounts = useAccounts() ?? [];
  const categories = useCategories() ?? [];
  const [type, setType] = useState<"expense" | "income">("expense");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextDate, setNextDate] = useState(todayISO());
  const [active, setActive] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setType(item?.type ?? "expense");
    setPayee(item?.payee ?? "");
    setAmount(item ? centsToInput(item.amount) : "");
    setCategoryId(item?.categoryId ?? "");
    setAccountId(item?.accountId ?? accounts[0]?.id ?? "");
    setFrequency(item?.frequency ?? "monthly");
    setNextDate(item?.nextDate ?? todayISO());
    setActive(item?.active ?? true);
  }
  if (!open && wasOpen) setWasOpen(false);

  const cats = categories.filter((c) => c.kind === type && !c.archived);

  async function save() {
    const cents = parseAmountInput(amount);
    if (!payee.trim() || !cents || cents <= 0 || !accountId) return;
    const input = { type, payee: payee.trim(), amount: cents, categoryId: categoryId || undefined, accountId, frequency, nextDate, active };
    if (item) await updateRecurring(item.id, input);
    else await createRecurring(input);
    onClose();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={item ? t.common.edit : "Nouvelle récurrence"}
        footer={
          <div className="flex gap-2">
            {item && <Button variant="danger" onClick={() => setConfirm(true)} aria-label={t.common.delete}><Trash2 size={18} /></Button>}
            <Button full onClick={save}>{t.common.save}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Segmented value={type} onChange={(v) => { setType(v); setCategoryId(""); }} options={[{ value: "expense", label: t.common.expense }, { value: "income", label: t.common.income }]} />
          <Field label={t.tx.payee}>
            <Input autoFocus value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Loyer" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t.common.amount} (CHF)`}>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" />
            </Field>
            <Field label="Fréquence">
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABEL[f]}</option>
                ))}
              </Select>
            </Field>
            <Field label={t.common.category}>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t.common.account}>
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Prochaine échéance" hint="Une transaction sera créée automatiquement à cette date, puis à chaque échéance suivante.">
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-[14px]">Active</span>
            <Toggle checked={active} onChange={setActive} />
          </div>
        </div>
      </Sheet>
      <ConfirmSheet open={confirm} onClose={() => setConfirm(false)} onConfirm={async () => { if (item) await deleteRecurring(item.id); onClose(); }} title="Supprimer cette récurrence ?" message="Les transactions déjà créées sont conservées." confirmLabel={t.common.delete} danger />
    </>
  );
}
