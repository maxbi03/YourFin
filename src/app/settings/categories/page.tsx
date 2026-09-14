"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, CategoryBubble, ConfirmSheet, Field, Input, PageHeader, Segmented, Select, Sheet, cx } from "@/components/ui/primitives";
import { IconByName } from "@/components/ui/icons";
import { createCategory, removeCategory, updateCategory } from "@/lib/db/repo";
import { categoryColor, COLOR_CHOICES, ICON_CHOICES } from "@/lib/domain/categories";
import type { Category, CategoryGroup, CategoryKind } from "@/lib/domain/types";
import { useCategories } from "@/lib/hooks/useDb";
import { useIsDark } from "@/lib/hooks/useTheme";
import { useT } from "@/lib/i18n";

const GROUP_LABEL: Record<CategoryGroup, string> = { needs: "Besoins", wants: "Envies", savings: "Épargne", income: "Revenus" };

export default function CategoriesPage() {
  const t = useT();
  const dark = useIsDark();
  const categories = useCategories() ?? [];
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editing, setEditing] = useState<Category | null | "new">(null);
  const list = categories.filter((c) => c.kind === kind);

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader title={t.settings.categories} backHref="/settings" action={<Button size="sm" onClick={() => setEditing("new")}><Plus size={16} /> {t.common.add}</Button>} />
      <Segmented value={kind} onChange={setKind} options={[{ value: "expense", label: t.common.expenses }, { value: "income", label: t.common.incomes }]} />
      <Card className="divide-y divide-line">
        {list.map((c) => (
          <button key={c.id} type="button" onClick={() => setEditing(c)} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2", c.archived && "opacity-50")}>
            <CategoryBubble icon={c.icon} color={categoryColor(c, dark)} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{c.name}</div>
              <div className="text-[12px] text-ink-2">{GROUP_LABEL[c.group]}{c.isSystem ? "" : " · personnalisée"}{c.archived ? " · masquée" : ""}</div>
            </div>
          </button>
        ))}
      </Card>
      <p className="px-1 text-[12px] text-ink-3">Le groupe (besoins / envies / épargne) sert aux suggestions de budget 50/30/20.</p>
      <CategorySheet category={editing === "new" ? null : editing} kind={kind} open={editing !== null} onClose={() => setEditing(null)} />
    </div>
  );
}

function CategorySheet({ category, kind, open, onClose }: { category: Category | null; kind: CategoryKind; open: boolean; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<CategoryGroup>("wants");
  const [icon, setIcon] = useState("Star");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [confirm, setConfirm] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setName(category?.name ?? "");
    setGroup(category?.group ?? (kind === "income" ? "income" : "wants"));
    setIcon(category?.icon ?? "Star");
    setColor(category?.color ?? COLOR_CHOICES[0]);
  }
  if (!open && wasOpen) setWasOpen(false);

  async function save() {
    if (!name.trim()) return;
    const input = { name: name.trim(), kind: category?.kind ?? kind, group, icon, color };
    if (category) await updateCategory(category.id, input);
    else await createCategory(input);
    onClose();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={category ? t.common.edit : "Nouvelle catégorie"}
        footer={
          <div className="flex gap-2">
            {category && !category.isSystem && (
              <Button variant="danger" onClick={() => setConfirm(true)} aria-label={t.common.delete}><Trash2 size={18} /></Button>
            )}
            {category?.isSystem && (
              <Button variant="secondary" onClick={async () => { await updateCategory(category.id, { archived: !category.archived }); onClose(); }}>
                {category.archived ? "Afficher" : "Masquer"}
              </Button>
            )}
            <Button full onClick={save}>{t.common.save}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={t.common.name}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {(category?.kind ?? kind) === "expense" && (
            <Field label="Groupe (50/30/20)">
              <Select value={group} onChange={(e) => setGroup(e.target.value as CategoryGroup)}>
                <option value="needs">Besoins</option>
                <option value="wants">Envies</option>
                <option value="savings">Épargne</option>
              </Select>
            </Field>
          )}
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Icône</span>
            <div className="flex flex-wrap gap-2">
              {ICON_CHOICES.map((i) => (
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
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => { if (category) await removeCategory(category.id); onClose(); }}
        title="Supprimer cette catégorie ?"
        message="Ses transactions passeront dans « Autres »."
        confirmLabel={t.common.delete}
        danger
      />
    </>
  );
}
