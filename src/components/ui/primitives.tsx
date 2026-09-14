"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { formatCHF } from "@/lib/domain/money";
import { addMonths, monthLabel } from "@/lib/domain/dates";
import { IconByName } from "./icons";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ Boutons */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong shadow-float",
  secondary: "bg-surface-2 text-ink hover:bg-line",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  danger: "bg-negative-soft text-negative hover:brightness-95",
  soft: "bg-accent-soft text-accent hover:brightness-95",
};
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  full,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; full?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-10 items-center justify-center rounded-full bg-surface-2 text-ink hover:bg-line transition active:scale-95",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Cartes & sections */

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cx(
        "block w-full rounded-card bg-surface border border-line shadow-card text-left",
        onClick && "transition hover:border-ink-3/40 active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function SectionTitle({
  children,
  action,
  hint,
}: {
  children: ReactNode;
  action?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
        {hint && <p className="text-[12px] text-ink-3 mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backHref?: string;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {backHref && (
          <Link href={backHref} className="-ml-2 inline-flex size-9 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Retour">
            <ChevronLeft size={20} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-ink-2 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</div>}
      <p className="text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-[13px] text-ink-2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "positive" | "negative" | "warning" | "neutral" }) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
    warning: "bg-warning-soft text-warning",
    neutral: "bg-surface-2 text-ink-2",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tones[tone])}>{children}</span>;
}

/* ------------------------------------------------------------------ Montants */

export function Amount({
  cents,
  type,
  className,
  decimals = 2,
  signed = true,
}: {
  cents: number;
  type?: "expense" | "income" | "transfer";
  className?: string;
  decimals?: 0 | 2;
  signed?: boolean;
}) {
  const value = type === "expense" ? -Math.abs(cents) : type === "income" ? Math.abs(cents) : cents;
  const color = type === "income" ? "text-positive" : type === "transfer" ? "text-ink-2" : "text-ink";
  const str = type === "transfer" || !signed ? formatCHF(Math.abs(value), { decimals }) : formatCHF(value, { sign: type === "income" ? "always" : "auto", decimals });
  return <span className={cx("tabular font-semibold", color, className)}>{str}</span>;
}

/* ------------------------------------------------------------------ Icône de catégorie */

export function CategoryBubble({ icon, color, size = 40, className }: { icon: string; color: string; size?: number; className?: string }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full text-white", className)}
      style={{ width: size, height: size, background: color }}
    >
      <IconByName name={icon} size={Math.round(size * 0.46)} />
    </span>
  );
}

/* ------------------------------------------------------------------ Progression */

/** Barre de progression : la piste est une teinte plus claire de la même gamme ; la couleur suit la sévérité. */
export function ProgressBar({ ratio, className, tone }: { ratio: number; className?: string; tone?: "accent" | "warning" | "negative" | "positive" }) {
  const r = Math.max(0, Math.min(1, ratio));
  const auto = ratio >= 1 ? "negative" : ratio >= 0.85 ? "warning" : "accent";
  const t = tone ?? auto;
  const fill = { accent: "bg-accent", warning: "bg-warning", negative: "bg-negative", positive: "bg-positive" }[t];
  const track = { accent: "bg-accent-soft", warning: "bg-warning-soft", negative: "bg-negative-soft", positive: "bg-positive-soft" }[t];
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full", track, className)} role="progressbar" aria-valuenow={Math.round(r * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${r * 100}%` }} />
    </div>
  );
}

/** Anneau de progression SVG (budget, score). */
export function Ring({
  ratio,
  size = 120,
  stroke = 10,
  tone = "accent",
  children,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  tone?: "accent" | "warning" | "negative" | "positive";
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const color = { accent: "var(--accent)", warning: "var(--warning)", negative: "var(--negative)", positive: "var(--positive)" }[tone];
  const track = { accent: "var(--accent-soft)", warning: "var(--warning-soft)", negative: "var(--negative-soft)", positive: "var(--positive-soft)" }[tone];
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ Champs de formulaire */

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

const INPUT_CLASS =
  "h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-[15px] text-ink placeholder:text-ink-3 outline-none transition focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(INPUT_CLASS, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(INPUT_CLASS, "appearance-none pr-10 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239c9cb0%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_14px_center]", className)} {...rest}>
      {children}
    </select>
  );
}

/** Grand champ de montant (clavier numérique sur mobile). */
export function AmountInput({
  value,
  onChange,
  autoFocus,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className={cx("flex items-baseline justify-center gap-2 rounded-card border bg-surface-2 px-4 py-5 transition focus-within:border-accent focus-within:bg-surface", invalid ? "border-negative" : "border-line")}>
      <span className="text-lg font-semibold text-ink-3">CHF</span>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[220px] bg-transparent text-center text-[40px] font-bold tracking-tight outline-none placeholder:text-ink-3"
        aria-label="Montant"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div className={cx("flex rounded-full bg-surface-2 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition",
            o.value === value ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition", checked ? "bg-accent" : "bg-line")}
    >
      <span className={cx("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition",
        active ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-ink-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Navigation par mois */

export function MonthNav({ month, onChange, max }: { month: string; onChange: (m: string) => void; max?: string }) {
  const canNext = !max || month < max;
  return (
    <div className="flex items-center justify-between">
      <IconButton label="Mois précédent" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeft size={18} />
      </IconButton>
      <span className="text-[15px] font-semibold">{monthLabel(month)}</span>
      <IconButton label="Mois suivant" onClick={() => onChange(addMonths(month, 1))} disabled={!canNext} className={cx(!canNext && "opacity-30")}>
        <ChevronRight size={18} />
      </IconButton>
    </div>
  );
}

/* ------------------------------------------------------------------ Bottom sheet / modale */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] anim-fade-in" onClick={onClose} />
      <div
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-surface shadow-2xl anim-sheet-up sm:rounded-[28px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line sm:hidden absolute left-1/2 top-2 -translate-x-1/2" />
          {title ? <h2 id={titleId} className="mt-2 text-[17px] font-bold tracking-tight">{title}</h2> : <span />}
          <IconButton label="Fermer" onClick={onClose} className="mt-2 size-9">
            <X size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 pb-safe">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmation simple (remplace window.confirm, plus joli et cohérent). */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {message && <p className="text-[14px] text-ink-2">{message}</p>}
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" full onClick={onClose}>
          Annuler
        </Button>
        <Button variant={danger ? "danger" : "primary"} full onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ Ligne de liste */

export function ListRow({
  left,
  title,
  subtitle,
  right,
  onClick,
  href,
}: {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{title}</div>
        {subtitle && <div className="truncate text-[12px] text-ink-2">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2 active:bg-line/60";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}
