"use client";

import { CalendarClock, Landmark, Lightbulb, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Legend, ProjectionLines } from "@/components/charts/charts";
import { Disclaimer, ProGate } from "@/components/pro/Paywall";
import { Button, Card, Field, Input, PageHeader, ProgressBar, SectionTitle, Select, Sheet, Toggle, cx } from "@/components/ui/primitives";
import { addTransaction, createAccount, updateSettings } from "@/lib/db/repo";
import { diffDays, todayISO } from "@/lib/domain/dates";
import { centsToInput, formatCHF, parseAmountInput } from "@/lib/domain/money";
import { max3aContribution, PILLAR_3A, PILLAR_3A_TIPS, project3a, yearsToRetirement } from "@/lib/domain/pillar3a";
import { CANTONS, estimateTaxSaving, marginalRate } from "@/lib/domain/tax";
import type { Account, MaritalStatus, Transaction } from "@/lib/domain/types";
import { useAccounts, useSettings, useTransactionsBetween } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

export default function Pillar3aPage() {
  const t = useT();
  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.p3a.title} subtitle={`Année fiscale ${PILLAR_3A.year}`} backHref="/more" />
      <ProGate preview={<Preview />}>
        <Assistant />
      </ProGate>
    </div>
  );
}

function Preview() {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-ink-2">Économie d&apos;impôt estimée</p>
      <p className="text-[32px] font-bold tracking-tight">CHF 2&apos;180</p>
      <div className="mt-4 h-3 rounded-full bg-surface-2" />
      <div className="mt-4 h-32 rounded-2xl bg-surface-2" />
    </Card>
  );
}

/** Versements 3a de l'année : transferts vers un compte 3a + dépenses "épargne" mentionnant 3a. */
function contributionsThisYear(transactions: Transaction[], accounts: Account[]): Transaction[] {
  const ids = new Set(accounts.filter((a) => a.type === "pillar3a").map((a) => a.id));
  return transactions.filter(
    (tx) => (tx.type === "transfer" && tx.toAccountId && ids.has(tx.toAccountId)) || (tx.type === "expense" && tx.categoryId === "savings" && /3a/i.test(`${tx.payee} ${tx.note ?? ""}`)),
  );
}

function Assistant() {
  const t = useT();
  const dark = useIsDark();
  const settings = useSettings();
  const accountsQuery = useAccounts();
  const year = new Date().getFullYear();
  const transactionsQuery = useTransactionsBetween(`${year}-01`, `${year}-12`);
  const accounts = useMemo(() => accountsQuery ?? [], [accountsQuery]);
  const transactions = useMemo(() => transactionsQuery ?? [], [transactionsQuery]);
  const [payOpen, setPayOpen] = useState(false);
  const [bankRate, setBankRate] = useState(0.6);
  const [secRate, setSecRate] = useState(4);

  const contributions = useMemo(() => contributionsThisYear(transactions, accounts), [transactions, accounts]);
  const paid = contributions.reduce((s, tx) => s + tx.amount, 0);
  const max = max3aContribution(settings?.hasPensionFund ?? true, settings?.taxableIncome);
  const remaining = Math.max(0, max - paid);
  const rate = marginalRate(settings?.canton ?? "VD", settings?.taxableIncome ?? 8_000_000, settings?.maritalStatus ?? "single");
  const saving = estimateTaxSaving(Math.min(paid, max), rate);
  const savingMax = estimateTaxSaving(max, rate);
  const daysLeft = diffDays(todayISO(), `${year}-12-31`);
  const years = yearsToRetirement(settings?.birthYear);
  const projection = project3a(max, years, bankRate / 100, secRate / 100);
  const finalPoint = projection[projection.length - 1];
  const colors = { bank: dark ? "#3987e5" : "#2a78d6", securities: dark ? "#9085e9" : "#4a3aa7" };

  if (!settings) return null;

  return (
    <div className="space-y-5">
      <Disclaimer>{t.p3a.disclaimer}</Disclaimer>

      {/* Versements */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] text-ink-2">{t.p3a.paid} {year}</p>
            <p className="text-[32px] font-bold tracking-tight">{formatCHF(paid, { decimals: 0 })}</p>
            <p className="text-[13px] text-ink-2">{t.p3a.ceiling} {formatCHF(max, { decimals: 0 })}</p>
          </div>
          <Button size="sm" onClick={() => setPayOpen(true)}><Plus size={16} /> Versement</Button>
        </div>
        <ProgressBar ratio={max ? paid / max : 0} tone={paid >= max ? "positive" : "accent"} className="mt-4" />
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-ink-2">{t.p3a.remaining}</div>
            <div className="tabular mt-0.5 text-[15px] font-semibold">{formatCHF(remaining, { decimals: 0 })}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="flex items-center gap-1 text-ink-2"><CalendarClock size={12} /> {t.p3a.deadline}</div>
            <div className={cx("tabular mt-0.5 text-[15px] font-semibold", daysLeft <= 30 && remaining > 0 && "text-warning")}>{Math.max(0, daysLeft)} {t.common.days}</div>
          </div>
        </div>
      </Card>

      {/* Économie d'impôt */}
      <Card className="p-5">
        <div className="flex items-center gap-2 text-[13px] text-ink-2"><Landmark size={14} /> {t.p3a.taxSaving}</div>
        <p className="mt-1 text-[28px] font-bold tracking-tight text-positive">{formatCHF(saving, { decimals: 0 })}</p>
        <p className="text-[13px] text-ink-2">
          {formatCHF(savingMax, { decimals: 0 })} {t.p3a.taxSavingMax} · {t.p3a.marginalRate} {Math.round(rate * 100)} %
        </p>
        <details className="group mt-4">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-accent">Modifier mon profil fiscal</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label={t.settings.canton}>
              <Select value={settings.canton} onChange={(e) => updateSettings({ canton: e.target.value })}>
                {CANTONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t.settings.maritalStatus}>
              <Select value={settings.maritalStatus} onChange={(e) => updateSettings({ maritalStatus: e.target.value as MaritalStatus })}>
                <option value="single">{t.settings.single}</option>
                <option value="married">{t.settings.married}</option>
              </Select>
            </Field>
            <Field label={`${t.settings.taxableIncome} (CHF)`}>
              <Input inputMode="numeric" defaultValue={settings.taxableIncome ? Math.round(settings.taxableIncome / 100) : ""} onBlur={(e) => updateSettings({ taxableIncome: (parseAmountInput(e.target.value) ?? 0) || undefined })} placeholder="80000" />
            </Field>
            <Field label={t.settings.birthYear}>
              <Input inputMode="numeric" defaultValue={settings.birthYear ?? ""} onBlur={(e) => updateSettings({ birthYear: Number(e.target.value) || undefined })} placeholder="1995" />
            </Field>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-[13px]">{t.settings.hasPensionFund}</span>
            <Toggle checked={settings.hasPensionFund} onChange={(v) => updateSettings({ hasPensionFund: v })} />
          </div>
        </details>
      </Card>

      {/* Banque vs titres */}
      <section>
        <SectionTitle hint={`Versement annuel de ${formatCHF(max, { decimals: 0 })} pendant ${years} ans (${t.p3a.untilRetirement})`}>{t.p3a.compare}</SectionTitle>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <label className="block">
              <span className="text-ink-2">{t.p3a.bankRate} <span className="font-semibold text-ink">{bankRate.toFixed(1)} %</span></span>
              <input type="range" min={0} max={3} step={0.1} value={bankRate} onChange={(e) => setBankRate(Number(e.target.value))} className="mt-1 w-full accent-[var(--accent)]" />
            </label>
            <label className="block">
              <span className="text-ink-2">{t.p3a.fundRate} <span className="font-semibold text-ink">{secRate.toFixed(1)} %</span></span>
              <input type="range" min={0} max={8} step={0.1} value={secRate} onChange={(e) => setSecRate(Number(e.target.value))} className="mt-1 w-full accent-[var(--accent)]" />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-2"><span className="h-0.5 w-3 rounded" style={{ background: colors.bank }} /> 3a banque</div>
              <div className="tabular mt-0.5 text-[16px] font-bold">{formatCHF(finalPoint.bank, { decimals: 0 })}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-2"><span className="h-0.5 w-3 rounded" style={{ background: colors.securities }} /> 3a titres</div>
              <div className="tabular mt-0.5 text-[16px] font-bold">{formatCHF(finalPoint.securities, { decimals: 0 })}</div>
              <div className="text-[11px] font-semibold text-positive">+{formatCHF(finalPoint.securities - finalPoint.bank, { decimals: 0 })}</div>
            </div>
          </div>
          <div className="mt-4">
            <ProjectionLines
              data={projection.map((p) => ({ year: p.year, bank: p.bank, securities: p.securities }))}
              xKey="year"
              xFormatter={(v) => `${v} ans`}
              series={[
                { key: "bank", name: "3a banque", color: colors.bank },
                { key: "securities", name: "3a titres", color: colors.securities, emphasis: true },
              ]}
              height={200}
            />
            <div className="mt-2"><Legend items={[{ label: "3a banque", color: colors.bank, kind: "line" }, { label: "3a titres", color: colors.securities, kind: "line" }]} /></div>
          </div>
        </Card>
      </section>

      {/* Conseils */}
      <section>
        <SectionTitle>{t.p3a.tips}</SectionTitle>
        <div className="space-y-2">
          {PILLAR_3A_TIPS.map((tip) => (
            <Card key={tip.title} className="flex gap-3 p-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Lightbulb size={15} /></span>
              <div>
                <p className="text-[14px] font-semibold">{tip.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-2">{tip.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <PaymentSheet open={payOpen} onClose={() => setPayOpen(false)} accounts={accounts} remaining={remaining} />
    </div>
  );
}

function PaymentSheet({ open, onClose, accounts, remaining }: { open: boolean; onClose: () => void; accounts: Account[]; remaining: number }) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sources = accounts.filter((a) => a.type !== "pillar3a");
  const targets = accounts.filter((a) => a.type === "pillar3a");

  async function save() {
    const cents = parseAmountInput(amount);
    if (!cents || cents <= 0) return;
    const fromId = from || sources[0]?.id;
    if (!fromId) return;
    let toId = to || targets[0]?.id;
    if (!toId) toId = await createAccount({ name: "Pilier 3a", type: "pillar3a", initialBalance: 0, color: "#4a3aa7" });
    await addTransaction({ type: "transfer", amount: cents, date, accountId: fromId, toAccountId: toId, payee: "Versement pilier 3a" });
    setAmount("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.p3a.addPayment} footer={<Button full onClick={save}>{t.common.save}</Button>}>
      <div className="space-y-4">
        <Field label={`${t.common.amount} (CHF)`} hint={remaining > 0 ? `Il te reste ${formatCHF(remaining, { decimals: 0 })} à verser cette année.` : undefined}>
          <div className="flex gap-2">
            <Input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
            {remaining > 0 && <Button variant="soft" onClick={() => setAmount(centsToInput(remaining))}>Max</Button>}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.tx.fromAccount}>
            <Select value={from || sources[0]?.id || ""} onChange={(e) => setFrom(e.target.value)}>
              {sources.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t.tx.toAccount}>
            <Select value={to || targets[0]?.id || ""} onChange={(e) => setTo(e.target.value)}>
              {targets.length === 0 && <option value="">Pilier 3a (sera créé)</option>}
              {targets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t.common.date}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}
