"use client";

import { ArrowLeftRight, Repeat } from "lucide-react";
import { categoryColor } from "@/lib/domain/categories";
import type { Account, Category, Transaction } from "@/lib/domain/types";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useUI } from "@/components/layout/AppShell";
import { Amount, CategoryBubble, ListRow } from "@/components/ui/primitives";
import { IconByName } from "@/components/ui/icons";

export function TransactionRow({
  tx,
  categories,
  accounts,
  showAccount,
}: {
  tx: Transaction;
  categories: Map<string, Category>;
  accounts?: Map<string, Account>;
  showAccount?: boolean;
}) {
  const dark = useIsDark();
  const { openTransaction } = useUI();
  const cat = tx.categoryId ? categories.get(tx.categoryId) : undefined;
  const account = accounts?.get(tx.accountId);
  const to = tx.toAccountId ? accounts?.get(tx.toAccountId) : undefined;
  const subtitleParts: string[] = [];
  if (tx.type === "transfer") subtitleParts.push(`${account?.name ?? "?"} → ${to?.name ?? "?"}`);
  else {
    subtitleParts.push(cat?.name ?? "Sans catégorie");
    if (showAccount && account) subtitleParts.push(account.name);
  }
  return (
    <ListRow
      onClick={() => openTransaction({ transaction: tx })}
      left={
        tx.type === "transfer" ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
            <ArrowLeftRight size={18} />
          </span>
        ) : cat ? (
          <CategoryBubble icon={cat.icon} color={categoryColor(cat, dark)} />
        ) : (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3">
            <IconByName name="MoreHorizontal" />
          </span>
        )
      }
      title={
        <span className="inline-flex items-center gap-1.5">
          {tx.payee || (tx.type === "transfer" ? "Transfert" : "—")}
          {tx.recurringId && <Repeat size={12} className="text-ink-3" aria-label="Récurrent" />}
        </span>
      }
      subtitle={subtitleParts.join(" · ")}
      right={<Amount cents={tx.amount} type={tx.type} />}
    />
  );
}
