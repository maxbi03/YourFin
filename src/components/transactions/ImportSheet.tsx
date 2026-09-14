"use client";

import { FileUp, CheckCircle2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";
import { bulkAddTransactions, type TransactionInput } from "@/lib/db/repo";
import { suggestCategory } from "@/lib/domain/categorize";
import { analyzeCSV, buildImportRows, SUPPORTED_BANKS, type ColumnMapping, type CsvAnalysis } from "@/lib/domain/csv";
import { formatDate } from "@/lib/domain/dates";
import { formatCHF } from "@/lib/domain/money";
import { useAccounts, useCategories, useRules } from "@/lib/hooks/useDb";
import { Button, Field, Select, Sheet, Toggle, cx } from "@/components/ui/primitives";

type Step = "pick" | "map" | "done";

async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  // Beaucoup de banques exportent en Windows-1252 : si l'UTF-8 produit des caractères de remplacement, on bascule.
  if (utf8.includes("�")) return new TextDecoder("windows-1252").decode(buffer);
  return utf8;
}

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useAccounts() ?? [];
  const categories = useCategories() ?? [];
  const rules = useRules() ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<CsvAnalysis | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [accountId, setAccountId] = useState("");
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [invertSign, setInvertSign] = useState(false);
  const [duplicates, setDuplicates] = useState(0);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => (analysis && mapping ? buildImportRows(analysis.rows, mapping) : null), [analysis, mapping]);

  function reset() {
    setStep("pick");
    setAnalysis(null);
    setMapping(null);
    setResult(null);
    setError(null);
    setFileName("");
    setDuplicates(0);
  }

  function close() {
    reset();
    onClose();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const text = await readFileText(file);
      const a = analyzeCSV(text);
      if (!a.rows.length) {
        setError("Aucune ligne exploitable dans ce fichier.");
        return;
      }
      setFileName(file.name);
      setAnalysis(a);
      setMapping(a.mapping);
      if (!accountId && accounts.length) setAccountId((accounts.find((x) => x.type === "checking") ?? accounts[0]).id);
      setStep("map");
    } catch {
      setError("Impossible de lire ce fichier.");
    }
  }

  async function checkDuplicates() {
    if (!parsed) return;
    const found = await db.transactions.where("importHash").anyOf(parsed.rows.map((r) => r.hash)).count();
    setDuplicates(found);
  }

  async function runImport() {
    if (!parsed || !accountId) return;
    setBusy(true);
    try {
      const catById = new Map(categories.map((c) => [c.id, c]));
      const inputs: TransactionInput[] = parsed.rows.map((r) => {
        const signed = invertSign ? -r.amount : r.amount;
        const type = signed < 0 ? "expense" : "income";
        let categoryId: string | undefined;
        if (autoCategorize) {
          const s = suggestCategory(r.payee, rules);
          const cat = s ? catById.get(s) : undefined;
          if (cat && cat.kind === (type === "income" ? "income" : "expense")) categoryId = cat.id;
        }
        return { type, amount: Math.abs(signed), date: r.date, accountId, categoryId, payee: r.payee, source: "csv", importHash: r.hash };
      });
      const res = await bulkAddTransactions(inputs);
      setResult(res);
      setStep("done");
    } catch {
      setError("L'import a échoué. Vérifie la correspondance des colonnes.");
    } finally {
      setBusy(false);
    }
  }

  const colOptions = (analysis?.headers ?? []).map((h, i) => ({ value: i, label: h || `Colonne ${i + 1}` }));
  const setField = (field: keyof ColumnMapping, value: number | null) => setMapping((m) => (m ? { ...m, [field]: value } : m));

  return (
    <Sheet open={open} onClose={close} title="Importer un relevé CSV" wide>
      {step === "pick" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line bg-surface-2 px-6 py-10 text-center transition hover:border-accent"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><FileUp size={22} /></span>
            <span className="text-[15px] font-semibold">Choisir un fichier CSV</span>
            <span className="text-[12px] text-ink-3">ou glisse-le ici</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="rounded-2xl bg-surface-2 p-4 text-[13px] text-ink-2">
            <p className="font-semibold text-ink">Comment faire ?</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              <li>Dans ton e-banking, exporte tes mouvements au format CSV.</li>
              <li>Importe le fichier ici : YourFin reconnaît les colonnes automatiquement.</li>
              <li>Vérifie, choisis le compte, c&apos;est tout. Les doublons sont ignorés.</li>
            </ol>
            <p className="mt-2 text-[12px] text-ink-3">Testé avec : {SUPPORTED_BANKS.join(", ")}.</p>
          </div>
          {error && <p className="rounded-xl bg-negative-soft px-3 py-2 text-[13px] font-medium text-negative">{error}</p>}
        </div>
      )}

      {step === "map" && analysis && mapping && parsed && (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-2">
            <span className="font-semibold text-ink">{fileName}</span> · {analysis.rows.length} lignes · {parsed.rows.length} transactions reconnues
            {parsed.invalid > 0 && <span className="text-warning"> · {parsed.invalid} ignorées</span>}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MappingSelect field="date" label="Date" mapping={mapping} options={colOptions} onChange={setField} />
            <MappingSelect field="description" label="Libellé" mapping={mapping} options={colOptions} onChange={setField} />
            <MappingSelect field="amount" label="Montant (signé)" mapping={mapping} options={colOptions} onChange={setField} />
            <MappingSelect field="description2" label="Libellé (suite)" mapping={mapping} options={colOptions} onChange={setField} />
            <MappingSelect field="debit" label="Débit" mapping={mapping} options={colOptions} onChange={setField} />
            <MappingSelect field="credit" label="Crédit" mapping={mapping} options={colOptions} onChange={setField} />
          </div>
          <Field label="Compte de destination">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-[14px]">Catégoriser automatiquement</span>
            <Toggle checked={autoCategorize} onChange={setAutoCategorize} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <div>
              <div className="text-[14px]">Inverser le signe</div>
              <div className="text-[12px] text-ink-3">Si les dépenses apparaissent en positif ci-dessous.</div>
            </div>
            <Toggle checked={invertSign} onChange={setInvertSign} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-2 text-left text-ink-2">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Libellé</th>
                  <th className="px-3 py-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {parsed.rows.slice(0, 6).map((r) => {
                  const signed = invertSign ? -r.amount : r.amount;
                  return (
                    <tr key={r.hash}>
                      <td className="whitespace-nowrap px-3 py-2">{formatDate(r.date, { year: true })}</td>
                      <td className="max-w-[220px] truncate px-3 py-2">{r.payee}</td>
                      <td className={cx("tabular whitespace-nowrap px-3 py-2 text-right font-semibold", signed > 0 && "text-positive")}>{formatCHF(signed, { sign: "always" })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {duplicates > 0 && <p className="text-[12px] text-ink-2">{duplicates} transaction(s) déjà présentes seront ignorées.</p>}
          {error && <p className="rounded-xl bg-negative-soft px-3 py-2 text-[13px] font-medium text-negative">{error}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset}>Autre fichier</Button>
            <Button full onClick={async () => { await checkDuplicates(); await runImport(); }} disabled={busy || parsed.rows.length === 0 || !accountId}>
              Importer {parsed.rows.length} transactions
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="flex flex-col items-center py-6 text-center anim-pop">
          <span className="flex size-14 items-center justify-center rounded-full bg-positive-soft text-positive"><CheckCircle2 size={28} /></span>
          <p className="mt-4 text-[18px] font-bold">{result.added} transactions importées</p>
          {result.skipped > 0 && <p className="mt-1 text-[13px] text-ink-2">{result.skipped} doublons ignorés</p>}
          <p className="mt-3 max-w-xs text-[13px] text-ink-2">Pense à vérifier les catégories : chaque correction apprend à YourFin pour la prochaine fois.</p>
          <Button className="mt-6" onClick={close}>Terminer</Button>
        </div>
      )}
    </Sheet>
  );
}

function MappingSelect({
  field,
  label,
  mapping,
  options,
  onChange,
}: {
  field: keyof ColumnMapping;
  label: string;
  mapping: ColumnMapping;
  options: Array<{ value: number; label: string }>;
  onChange: (field: keyof ColumnMapping, value: number | null) => void;
}) {
  return (
    <Field label={label}>
      <Select value={mapping[field] ?? ""} onChange={(e) => onChange(field, e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </Field>
  );
}
