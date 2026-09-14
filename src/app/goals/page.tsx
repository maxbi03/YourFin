"use client";

import { Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, CategoryBubble, ConfirmSheet, EmptyState, Field, Input, PageHeader, ProgressBar, Sheet, cx } from "@/components/ui/primitives";
import { COLOR_CHOICES, ICON_CHOICES } from "@/lib/domain/categories";
import { diffDays, formatDate, todayISO } from "@/lib/domain/dates";
import { centsToInput, formatCHF, parseAmountInput } from "@/lib/domain/money";
import type { Goal } from "@/lib/domain/types";
import { contributeToGoal, createGoal, deleteGoal, updateGoal } from "@/lib/db/repo";
import { useGoals } from "@/lib/hooks/useDb";
import { useT } from "@/lib/i18n";
import { IconByName } from "@/components/ui/icons";

const GOAL_ICONS = ["Target", "Plane", "Home", "Car", "Gift", "GraduationCap", "PiggyBank", "Shield", "Star", "Heart", "Bike", "Gamepad2", "Music", "Palette", "Leaf"];

export default function GoalsPage() {
  const t = useT();
  const goals = useGoals() ?? [];
  const [editing, setEditing] = useState<Goal | null | "new">(null);
  const [contrib, setContrib] = useState<{ goal: Goal; amount: string; sign: 1 | -1 } | null>(null);

  const sorted = [...goals].sort((a, b) => a.savedAmount / a.targetAmount - b.savedAmount / b.targetAmount);

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.goals.title} backHref="/more" action={<Button size="sm" onClick={() => setEditing("new")}><Plus size={16} /> {t.goals.add}</Button>} />

      {sorted.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title={t.goals.empty} action={<Button size="sm" onClick={() => setEditing("new")}>{t.goals.add}</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((g) => {
            const ratio = g.targetAmount ? g.savedAmount / g.targetAmount : 0;
            const done = g.savedAmount >= g.targetAmount;
            const monthsLeft = g.deadline ? Math.max(1, Math.ceil(diffDays(todayISO(), g.deadline) / 30.4)) : null;
            const perMonth = monthsLeft ? Math.max(0, Math.ceil((g.targetAmount - g.savedAmount) / monthsLeft)) : null;
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-start gap-3">
                  <CategoryBubble icon={g.icon} color={g.color} size={44} />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setEditing(g)} className="block truncate text-left text-[16px] font-semibold hover:underline">{g.name}</button>
                    <p className="text-[12px] text-ink-2">
                      {g.deadline ? `${t.goals.deadline} ${formatDate(g.deadline, { year: true })}` : "Sans échéance"}
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold text-ink-2">{Math.min(100, Math.round(ratio * 100))} %</span>
                </div>
                <p className="mt-3 text-[22px] font-bold tracking-tight">
                  {formatCHF(g.savedAmount, { decimals: 0 })} <span className="text-[13px] font-medium text-ink-3">/ {formatCHF(g.targetAmount, { decimals: 0 })}</span>
                </p>
                <ProgressBar ratio={ratio} tone={done ? "positive" : "accent"} className="mt-2" />
                <p className={cx("mt-2 text-[12px]", done ? "font-semibold text-positive" : "text-ink-2")}>
                  {done ? t.goals.reached : perMonth !== null ? `${formatCHF(perMonth, { decimals: 0 })} ${t.goals.monthlyNeeded}` : `${formatCHF(g.targetAmount - g.savedAmount, { decimals: 0 })} restants`}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="soft" full onClick={() => setContrib({ goal: g, amount: "", sign: 1 })}>{t.goals.contribute}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setContrib({ goal: g, amount: "", sign: -1 })}>{t.goals.withdraw}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <GoalSheet goal={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />

      <Sheet open={!!contrib} onClose={() => setContrib(null)} title={contrib?.sign === 1 ? t.goals.contribute : t.goals.withdraw}>
        {contrib && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-2">{contrib.goal.name} · {formatCHF(contrib.goal.savedAmount)} épargnés</p>
            <Field label={`${t.common.amount} (CHF)`}>
              <Input autoFocus inputMode="decimal" value={contrib.amount} onChange={(e) => setContrib({ ...contrib, amount: e.target.value })} placeholder="100" />
            </Field>
            <Button
              full
              onClick={async () => {
                const c = parseAmountInput(contrib.amount);
                if (!c || c <= 0) return;
                await contributeToGoal(contrib.goal.id, c * contrib.sign);
                setContrib(null);
              }}
            >
              {t.common.confirm}
            </Button>
            <p className="text-[12px] text-ink-3">Astuce : un objectif suit l&apos;argent que tu mets de côté ; le solde de tes comptes n&apos;est pas modifié.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function GoalSheet({ goal, open, onClose }: { goal: Goal | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState("Target");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [confirm, setConfirm] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setName(goal?.name ?? "");
    setTarget(goal ? centsToInput(goal.targetAmount) : "");
    setSaved(goal ? centsToInput(goal.savedAmount) : "");
    setDeadline(goal?.deadline ?? "");
    setIcon(goal?.icon ?? "Target");
    setColor(goal?.color ?? COLOR_CHOICES[0]);
  }
  if (!open && wasOpen) setWasOpen(false);

  async function save() {
    const targetAmount = parseAmountInput(target);
    if (!name.trim() || !targetAmount || targetAmount <= 0) return;
    const savedAmount = parseAmountInput(saved) ?? 0;
    const input = { name: name.trim(), icon, color, targetAmount, deadline: deadline || undefined };
    if (goal) await updateGoal(goal.id, { ...input, savedAmount });
    else await createGoal(input, savedAmount);
    onClose();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={goal ? t.common.edit : t.goals.add}
        footer={
          <div className="flex gap-2">
            {goal && (
              <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 size={18} /></Button>
            )}
            <Button full onClick={save}>{t.common.save}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={t.common.name}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacances au Japon" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t.goals.target} (CHF)`}>
              <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="3000" />
            </Field>
            <Field label={`${t.goals.saved} (CHF)`}>
              <Input inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <Field label={`${t.goals.deadline} (${t.common.optional})`}>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Icône</span>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.concat(ICON_CHOICES.filter((i) => !GOAL_ICONS.includes(i)).slice(0, 6)).map((i) => (
                <button key={i} type="button" onClick={() => setIcon(i)} className={cx("flex size-10 items-center justify-center rounded-full border transition", icon === i ? "border-ink bg-surface-2" : "border-line hover:bg-surface-2")}>
                  <IconByName name={i} />
                </button>
              ))}
            </div>
          </div>
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
      <ConfirmSheet open={confirm} onClose={() => setConfirm(false)} onConfirm={async () => { if (goal) await deleteGoal(goal.id); onClose(); }} title="Supprimer cet objectif ?" confirmLabel={t.common.delete} danger />
    </>
  );
}
