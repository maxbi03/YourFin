"use client";

import { ChevronRight, Download, FlaskConical, Repeat, Shapes, Sparkles, Trash2, Upload, WalletCards } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, ConfirmSheet, Field, Input, PageHeader, SectionTitle, Segmented, Select, Sheet, Toggle } from "@/components/ui/primitives";
import { exportBackup, importBackup, isBackupFile, resetAll, updateSettings } from "@/lib/db/repo";
import { loadDemoData } from "@/lib/db/demo";
import { parseAmountInput } from "@/lib/domain/money";
import { CANTONS } from "@/lib/domain/tax";
import type { MaritalStatus, ThemePref } from "@/lib/domain/types";
import { APP_VERSION, isPro } from "@/lib/features";
import { useSettings } from "@/lib/hooks/useDb";
import { useT } from "@/lib/i18n";

export default function SettingsPage() {
  const t = useT();
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [importFile, setImportFile] = useState<{ name: string; data: unknown } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!settings) return null;

  async function download() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yourfin-sauvegarde-${backup.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!isBackupFile(data)) {
        setMessage("Ce fichier n'est pas une sauvegarde YourFin.");
        return;
      }
      setImportFile({ name: file.name, data });
    } catch {
      setMessage("Fichier illisible.");
    }
  }

  const links = [
    { href: "/settings/accounts", label: t.settings.accounts, icon: WalletCards },
    { href: "/settings/categories", label: t.settings.categories, icon: Shapes },
    { href: "/settings/recurring", label: t.settings.recurring, icon: Repeat },
  ];

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader title={t.settings.title} backHref="/more" />

      <section>
        <SectionTitle>{t.settings.profile}</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label={t.settings.firstName}>
            <Input defaultValue={settings.firstName} onBlur={(e) => updateSettings({ firstName: e.target.value.trim() })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t.settings.monthlyNetIncome} (CHF)`}>
              <Input inputMode="decimal" defaultValue={settings.monthlyNetIncome ? Math.round(settings.monthlyNetIncome / 100) : ""} onBlur={(e) => updateSettings({ monthlyNetIncome: (parseAmountInput(e.target.value) ?? 0) || undefined })} placeholder="5500" />
            </Field>
            <Field label={`${t.settings.taxableIncome} (CHF)`}>
              <Input inputMode="decimal" defaultValue={settings.taxableIncome ? Math.round(settings.taxableIncome / 100) : ""} onBlur={(e) => updateSettings({ taxableIncome: (parseAmountInput(e.target.value) ?? 0) || undefined })} placeholder="66000" />
            </Field>
            <Field label={t.settings.canton}>
              <Select value={settings.canton} onChange={(e) => updateSettings({ canton: e.target.value })}>
                {CANTONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t.settings.birthYear}>
              <Input inputMode="numeric" defaultValue={settings.birthYear ?? ""} onBlur={(e) => updateSettings({ birthYear: Number(e.target.value) || undefined })} placeholder="1995" />
            </Field>
            <Field label={t.settings.maritalStatus}>
              <Select value={settings.maritalStatus} onChange={(e) => updateSettings({ maritalStatus: e.target.value as MaritalStatus })}>
                <option value="single">{t.settings.single}</option>
                <option value="married">{t.settings.married}</option>
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-[13px]">{t.settings.hasPensionFund}</span>
            <Toggle checked={settings.hasPensionFund} onChange={(v) => updateSettings({ hasPensionFund: v })} />
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>{t.settings.appearance}</SectionTitle>
        <Card className="p-4">
          <Segmented<ThemePref>
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: "system", label: t.settings.themeSystem },
              { value: "light", label: t.settings.themeLight },
              { value: "dark", label: t.settings.themeDark },
            ]}
          />
        </Card>
      </section>

      <Card className="divide-y divide-line">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-surface-2"><l.icon size={17} /></span>
            <span className="flex-1 text-[15px] font-medium">{l.label}</span>
            <ChevronRight size={18} className="text-ink-3" />
          </Link>
        ))}
      </Card>

      <section>
        <SectionTitle hint={t.settings.localHint}>{t.settings.data}</SectionTitle>
        <Card className="divide-y divide-line">
          <button type="button" onClick={download} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent"><Download size={17} /></span>
            <span className="flex-1 text-[15px] font-medium">{t.settings.export}</span>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-surface-2"><Upload size={17} /></span>
            <span className="flex-1 text-[15px] font-medium">{t.settings.import}</span>
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          <button id="demo" type="button" onClick={() => setConfirmDemo(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-warning-soft text-warning"><FlaskConical size={17} /></span>
            <span className="flex-1 text-[15px] font-medium">Charger des données de démo</span>
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-negative-soft text-negative"><Trash2 size={17} /></span>
            <span className="flex-1 text-[15px] font-medium text-negative">{t.settings.reset}</span>
          </button>
        </Card>
        {message && <p className="mt-2 text-[13px] text-negative">{message}</p>}
      </section>

      <section>
        <SectionTitle>{t.pro.title}</SectionTitle>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles size={18} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">{isPro(settings) ? t.pro.active : "YourFin Pro inactif"}</p>
            <p className="text-[12px] text-ink-2">{t.pro.demoHint}</p>
          </div>
          <Button size="sm" variant={isPro(settings) ? "secondary" : "primary"} onClick={() => updateSettings({ pro: !isPro(settings), proSince: isPro(settings) ? undefined : new Date().toISOString() })}>
            {isPro(settings) ? t.pro.deactivate : "Activer"}
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>{t.settings.about}</SectionTitle>
        <Card className="p-4 text-[13px] text-ink-2">
          <p><span className="font-semibold text-ink">YourFin</span> {APP_VERSION} · {t.app.tagline}</p>
          <p className="mt-2">Application locale et gratuite. Les modules Investir et 3a/impôts fournissent des exemples pédagogiques et des estimations : ils ne constituent ni un conseil financier, ni un conseil fiscal.</p>
        </Card>
      </section>

      <ConfirmSheet
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        onConfirm={() => loadDemoData().then(() => window.location.replace("/"))}
        title="Charger des données de démo ?"
        message="Remplace tes comptes, transactions, budgets et objectifs par un exemple réaliste de 5 mois. Exporte une sauvegarde avant si tu as déjà saisi des données."
        confirmLabel="Charger la démo"
      />
      <ConfirmSheet open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={() => resetAll().then(() => window.location.replace("/"))} title={t.settings.reset} message={t.settings.resetConfirm} confirmLabel="Tout effacer" danger />

      <Sheet open={!!importFile} onClose={() => setImportFile(null)} title={t.settings.import}>
        {importFile && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-2">
              <span className="font-semibold text-ink">{importFile.name}</span> · {(importFile.data as { transactions: unknown[] }).transactions.length} transactions
            </p>
            <Button full onClick={async () => { if (isBackupFile(importFile.data)) await importBackup(importFile.data, "replace"); setImportFile(null); window.location.replace("/"); }}>
              Remplacer mes données par cette sauvegarde
            </Button>
            <Button full variant="secondary" onClick={async () => { if (isBackupFile(importFile.data)) await importBackup(importFile.data, "merge"); setImportFile(null); }}>
              Fusionner avec mes données
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
