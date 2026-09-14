"use client";

import { Archive, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, ConfirmSheet, Field, Input, PageHeader, Select, Sheet, cx } from "@/components/ui/primitives";
import { ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL, IconByName } from "@/components/ui/icons";
import { createAccount, removeAccount, updateAccount } from "@/lib/db/repo";
import { COLOR_CHOICES } from "@/lib/domain/categories";
import { centsToInput, formatCHF, parseAmountInput } from "@/lib/domain/money";
import type { Account, AccountType } from "@/lib/domain/types";
import { useAccountBalances, useAccounts } from "@/lib/hooks/useDb";
import { useT } from "@/lib/i18n";

const TYPES: AccountType[] = ["checking", "savings", "cash", "card", "investment", "pillar3a"];

export default function AccountsPage() {
  const t = useT();
  const { accounts, total } = useAccountBalances();
  const archived = (useAccounts(true) ?? []).filter((a) => a.archived);
  const [editing, setEditing] = useState<Account | null | "new">(null);

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.settings.accounts} backHref="/settings" action={<Button size="sm" onClick={() => setEditing("new")}><Plus size={16} /> {t.common.add}</Button>} />
      <Card className="p-4">
        <p className="text-[13px] text-ink-2">{t.home.totalBalance}</p>
        <p className="text-[28px] font-bold tracking-tight">{formatCHF(total)}</p>
        <p className="text-[12px] text-ink-3">Hors 3a et investissements, comptés comme patrimoine.</p>
      </Card>
      <Card className="divide-y divide-line">
        {(accounts ?? []).map((a) => (
          <button key={a.id} type="button" onClick={() => setEditing(a)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
            <span className="flex size-10 items-center justify-center rounded-full text-white" style={{ background: a.color }}>
              <IconByName name={ACCOUNT_TYPE_ICON[a.type]} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{a.name}</div>
              <div className="text-[12px] text-ink-2">{ACCOUNT_TYPE_LABEL[a.type]}</div>
            </div>
            <span className="tabular text-[15px] font-semibold">{formatCHF(a.balance)}</span>
          </button>
        ))}
        {accounts && accounts.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-ink-2">Aucun compte. Ajoute ton compte courant pour commencer.</p>}
      </Card>
      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer px-1 text-[13px] font-semibold text-ink-2">Comptes archivés ({archived.length})</summary>
          <Card className="mt-2 divide-y divide-line">
            {archived.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-[14px] text-ink-2">{a.name}</span>
                <Button size="sm" variant="ghost" onClick={() => updateAccount(a.id, { archived: false })}>Restaurer</Button>
              </div>
            ))}
          </Card>
        </details>
      )}
      <AccountSheet account={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </div>
  );
}

function AccountSheet({ account, open, onClose }: { account: Account | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [confirm, setConfirm] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setName(account?.name ?? "");
    setType(account?.type ?? "checking");
    setBalance(account ? centsToInput(account.initialBalance) : "");
    setColor(account?.color ?? COLOR_CHOICES[0]);
  }
  if (!open && wasOpen) setWasOpen(false);

  async function save() {
    if (!name.trim()) return;
    const initialBalance = parseAmountInput(balance) ?? 0;
    if (account) await updateAccount(account.id, { name: name.trim(), type, initialBalance, color });
    else await createAccount({ name: name.trim(), type, initialBalance, color });
    onClose();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={account ? t.common.edit : "Nouveau compte"}
        footer={
          <div className="flex gap-2">
            {account && (
              <Button variant="danger" onClick={() => setConfirm(true)} aria-label={t.common.delete}>
                {account ? <Archive size={18} /> : <Trash2 size={18} />}
              </Button>
            )}
            <Button full onClick={save}>{t.common.save}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={t.common.name}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Compte courant" />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>{ACCOUNT_TYPE_LABEL[ty]}</option>
              ))}
            </Select>
          </Field>
          <Field label={account ? "Solde de départ (CHF)" : "Solde actuel (CHF)"} hint={account ? "Le solde affiché = solde de départ + transactions enregistrées." : undefined}>
            <Input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
          </Field>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Couleur</span>
            <div className="flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cx("size-8 rounded-full border-2 transition", color === c ? "border-ink scale-110" : "border-transparent")} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => { if (account) await removeAccount(account.id); onClose(); }}
        title="Supprimer ce compte ?"
        message="S'il contient des transactions, il sera archivé (ses transactions restent visibles)."
        confirmLabel={t.common.delete}
        danger
      />
    </>
  );
}
