"use client";

import { ArrowRight, Check, Lock, Sparkles, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/AppShell";
import { Button, Field, Input, Select, cx } from "@/components/ui/primitives";
import { ACCOUNT_TYPE_LABEL } from "@/components/ui/icons";
import { createAccount, updateSettings } from "@/lib/db/repo";
import { parseAmountInput } from "@/lib/domain/money";
import type { AccountType } from "@/lib/domain/types";
import { useT } from "@/lib/i18n";

const ACCOUNT_TYPES: AccountType[] = ["checking", "savings", "cash", "card"];

export default function OnboardingPage() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [accountName, setAccountName] = useState("Compte courant");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [income, setIncome] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await createAccount({
        name: accountName.trim() || "Compte courant",
        type: accountType,
        initialBalance: parseAmountInput(balance) ?? 0,
        color: "#5b4cff",
      });
      const monthlyNetIncome = parseAmountInput(income);
      await updateSettings({
        firstName: firstName.trim(),
        monthlyNetIncome: monthlyNetIncome && monthlyNetIncome > 0 ? monthlyNetIncome : undefined,
        taxableIncome: monthlyNetIncome && monthlyNetIncome > 0 ? monthlyNetIncome * 12 : undefined,
        onboardingDone: true,
      });
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    <div key="welcome" className="flex flex-col items-center text-center anim-pop">
      <Logo size={88} />
      <h1 className="mt-6 text-[28px] font-bold tracking-tight">{t.onboarding.welcome}</h1>
      <p className="mt-2 text-[15px] text-ink-2">{t.app.tagline}</p>
      <p className="mt-6 max-w-sm text-[14px] text-ink-2">{t.onboarding.intro}</p>
      <ul className="mt-6 w-full space-y-2 text-left">
        {[
          { icon: WalletCards, text: "Budget, dépenses et objectifs — gratuits pour toujours" },
          { icon: Lock, text: "Zéro compte, zéro serveur : tes données restent ici" },
          { icon: Sparkles, text: "Analyse, investissement et 3a pour aller plus loin" },
        ].map((item) => (
          <li key={item.text} className="flex items-center gap-3 rounded-2xl bg-surface p-3 border border-line">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent"><item.icon size={17} /></span>
            <span className="text-[14px]">{item.text}</span>
          </li>
        ))}
      </ul>
      <Button size="lg" full className="mt-8" onClick={() => setStep(1)}>
        {t.onboarding.start} <ArrowRight size={18} />
      </Button>
    </div>,

    <div key="name" className="anim-pop">
      <h2 className="text-[24px] font-bold tracking-tight">{t.onboarding.nameQuestion}</h2>
      <p className="mt-1 text-[14px] text-ink-2">Juste pour te dire bonjour — rien n&apos;est envoyé nulle part.</p>
      <Input className="mt-6" autoFocus placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setStep(2)} />
      <Button size="lg" full className="mt-6" onClick={() => setStep(2)}>{t.common.next}</Button>
    </div>,

    <div key="account" className="anim-pop">
      <h2 className="text-[24px] font-bold tracking-tight">{t.onboarding.accountQuestion}</h2>
      <p className="mt-1 text-[14px] text-ink-2">{t.onboarding.accountHint}</p>
      <div className="mt-6 space-y-4">
        <Field label={t.common.name}>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>{ACCOUNT_TYPE_LABEL[type]}</option>
            ))}
          </Select>
        </Field>
        <Field label={t.onboarding.balance} hint="Le solde affiché aujourd'hui sur ton e-banking.">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-ink-3">CHF</span>
            <Input className="pl-14" inputMode="decimal" placeholder="0.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
        </Field>
      </div>
      <Button size="lg" full className="mt-6" onClick={() => setStep(3)}>{t.common.next}</Button>
    </div>,

    <div key="income" className="anim-pop">
      <h2 className="text-[24px] font-bold tracking-tight">{t.onboarding.incomeQuestion}</h2>
      <p className="mt-1 text-[14px] text-ink-2">{t.onboarding.incomeHint}</p>
      <div className="relative mt-6">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-ink-3">CHF</span>
        <Input className="pl-14" inputMode="decimal" placeholder="5'500" value={income} onChange={(e) => setIncome(e.target.value)} autoFocus />
      </div>
      <Button size="lg" full className="mt-6" onClick={finish} disabled={busy}>
        <Check size={18} /> {t.onboarding.finish}
      </Button>
      <button type="button" className="mt-3 w-full text-[13px] font-medium text-ink-3" onClick={finish} disabled={busy}>Passer cette étape</button>
    </div>,
  ];

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center">
      {step > 0 && (
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <span key={s} className={cx("h-1.5 flex-1 rounded-full transition", s <= step ? "bg-accent" : "bg-line")} />
          ))}
        </div>
      )}
      {steps[step]}
      {step > 0 && (
        <button type="button" onClick={() => setStep(step - 1)} className="mt-4 text-[13px] font-medium text-ink-3">{t.common.back}</button>
      )}
    </div>
  );
}
