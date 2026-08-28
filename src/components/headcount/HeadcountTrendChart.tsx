import { useState } from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { MonthStats } from "@/lib/headcountTypes";

interface Props {
  months: MonthStats[];
  poLabel?: string;
}

type ViewMode = "hours" | "avg" | "combined";

const fmt = (n: number) => n.toLocaleString("ru-RU");

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "hours", label: "Человекочасы" },
  { id: "avg", label: "Средняя численность" },
  { id: "combined", label: "Совмещённый" },
];

export default function HeadcountTrendChart({ months, poLabel = "ПО" }: Props) {
  const [mode, setMode] = useState<ViewMode>("hours");

  const data = months.map(m => ({
    label: m.label.slice(0, 3),
    poHours: m.poHours,
    sbdHours: m.sbdHours,
    poAvg: m.poAvg ?? 0,
    sbdAvg: m.sbdAvg ?? 0,
  }));

  const showHours = mode === "hours" || mode === "combined";
  const showAvg = mode === "avg" || mode === "combined";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold">Динамика по месяцам</h2>
        <div className="inline-flex items-center gap-1 bg-secondary/40 border border-border rounded-lg p-1 self-start">
          {VIEW_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                mode === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3547" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b9ab0" }} />
            <YAxis
              yAxisId="hours"
              tick={{ fontSize: 11, fill: "#8b9ab0" }}
              allowDecimals={false}
              tickFormatter={fmt}
              hide={!showHours}
            />
            <YAxis
              yAxisId="avg"
              orientation="right"
              tick={{ fontSize: 11, fill: "#8b9ab0" }}
              allowDecimals={false}
              tickFormatter={fmt}
              hide={!showAvg}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(22, 26, 35, 0.97)",
                border: "1px solid #2e3547",
                borderRadius: 8,
                fontSize: 12,
                color: "#d0d8e8",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "#d0d8e8", fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => [
                name.includes("числ.") ? `${fmt(value)} чел.` : `${fmt(value)} ч`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: "#8b9ab0" }}>{value}</span>}
            />
            {showHours && (
              <Bar yAxisId="hours" dataKey="poHours" name={`${poLabel}, ЧЧ`} stackId="hours" fill="#6366f1" radius={[0, 0, 0, 0]} />
            )}
            {showHours && (
              <Bar yAxisId="hours" dataKey="sbdHours" name="СБД, ЧЧ" stackId="hours" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            )}
            {showAvg && (
              <Bar yAxisId="avg" dataKey="poAvg" name={`${poLabel}, числ.`} stackId="avg" fill="#10b981" radius={[0, 0, 0, 0]} />
            )}
            {showAvg && (
              <Bar yAxisId="avg" dataKey="sbdAvg" name="СБД, числ." stackId="avg" fill="#ec4899" radius={[3, 3, 0, 0]} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
