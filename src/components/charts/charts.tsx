"use client";

import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import type { ReactNode } from "react";
import { formatCHF } from "@/lib/domain/money";

/* Style commun des infobulles : la valeur en premier (forte), le libellé ensuite. */
function TooltipCard({ title, rows }: { title?: ReactNode; rows: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-card text-[12px]">
      {title && <div className="mb-1 font-medium text-ink-2">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          {r.color && <span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} />}
          <span className="tabular font-semibold text-ink">{r.value}</span>
          <span className="text-ink-3">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Donut (part-to-whole, ≤ 6 segments) */

export interface DonutDatum {
  id: string;
  name: string;
  value: number;
  color: string;
}

export function Donut({ data, size = 168, children, activeId, onSelect }: { data: DonutDatum[]; size?: number; children?: ReactNode; activeId?: string | null; onSelect?: (id: string | null) => void }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={size * 0.36}
          outerRadius={size * 0.48}
          paddingAngle={data.length > 1 ? 2.5 : 0}
          cornerRadius={4}
          stroke="none"
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
          onClick={(_, index) => onSelect?.(data[index]?.id ?? null)}
        >
          {data.map((d) => (
            <Cell key={d.id} fill={d.color} opacity={activeId && activeId !== d.id ? 0.3 : 1} style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }} />
          ))}
        </Pie>
        <Tooltip
          cursor={false}
          content={({ payload }) => {
            const p = payload?.[0];
            if (!p) return null;
            const d = p.payload as DonutDatum;
            return <TooltipCard rows={[{ label: `${d.name} · ${total ? Math.round((d.value / total) * 100) : 0} %`, value: formatCHF(d.value), color: d.color }]} />;
          }}
        />
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ Colonnes mensuelles (emphase sur le mois courant) */

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  emphasis?: boolean;
}

export function MonthlyBars({ data, height = 160, onSelect }: { data: BarDatum[]; height?: number; onSelect?: (key: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11 }} dy={6} />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ payload }) => {
            const p = payload?.[0];
            if (!p) return null;
            const d = p.payload as BarDatum;
            return <TooltipCard rows={[{ label: d.label, value: formatCHF(d.value, { decimals: 0 }) }]} />;
          }}
        />
        <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} onClick={(d) => onSelect?.((d as unknown as BarDatum).key)}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.emphasis ? "var(--accent)" : "var(--accent-soft)"} style={{ cursor: onSelect ? "pointer" : "default" }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ Courbes (projections) */

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  emphasis?: boolean;
  dashed?: boolean;
}

export function ProjectionLines({
  data,
  series,
  xKey,
  height = 220,
  xFormatter = (v) => String(v),
  yFormatter = (v) => formatCHF(v, { decimals: 0, compact: true, currency: false }),
  band,
}: {
  data: Array<Record<string, number | [number, number]>>;
  series: LineSeries[];
  xKey: string;
  height?: number;
  xFormatter?: (v: number) => string;
  yFormatter?: (v: number) => string;
  /** Clé d'une fourchette [basse, haute] à dessiner en aplat léger derrière la série mise en avant. */
  band?: { key: string; color: string };
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={xFormatter} dy={6} minTickGap={24} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={yFormatter} width={44} />
        <Tooltip
          cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }}
          content={({ payload, label }) => {
            if (!payload?.length) return null;
            const rows = series
              .map((s) => {
                const p = payload.find((x) => x.dataKey === s.key);
                return p ? { label: s.name, value: formatCHF(Number(p.value), { decimals: 0 }), color: s.color } : null;
              })
              .filter((r): r is { label: string; value: string; color: string } => !!r);
            return <TooltipCard title={xFormatter(Number(label))} rows={rows} />;
          }}
        />
        {band && <Area type="monotone" dataKey={band.key} stroke="none" fill={band.color} fillOpacity={0.12} isAnimationActive={false} activeDot={false} tooltipType="none" />}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={s.emphasis ? 2.5 : 2}
            strokeOpacity={s.emphasis === false ? 0.45 : 1}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            fill="none"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: s.color }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ Légende partagée */

export function Legend({ items }: { items: Array<{ label: string; color: string; kind?: "line" | "rect"; muted?: boolean }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
      {items.map((i) => (
        <span key={i.label} className={i.muted ? "opacity-50" : ""}>
          <span className={i.kind === "line" ? "mr-1.5 inline-block h-0.5 w-3.5 align-middle rounded" : "mr-1.5 inline-block size-2.5 align-middle rounded-sm"} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export { LineChart, Line };
