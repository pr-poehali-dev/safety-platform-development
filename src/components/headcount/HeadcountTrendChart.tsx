import { useState } from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList,
} from "recharts";
import { MonthStats } from "@/lib/headcountTypes";

interface Props {
  months: MonthStats[];
  poLabel?: string;
}

type ViewMode = "hours" | "avg" | "combined";

const fmt = (n: number) => n.toLocaleString("ru-RU");
const fmtHoursShort = (v: number) => (v ? (v >= 1000 ? `${Math.round(v / 1000)}к` : String(v)) : "");
const fmtCount = (v: number) => (v ? fmt(Math.round(v)) : "");
type LabelProps = { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: number | string };
const segmentLabel = (format: (v: number) => string, color: string) => (props: LabelProps) => {
  const x = Number(props.x) || 0, y = Number(props.y) || 0, width = Number(props.width) || 0, height = Number(props.height) || 0, value = Number(props.value) || 0;
  if (!value || height < 9) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontSize={height < 12 ? 8 : 9} fontWeight={600} fill={color}>
      {format(value)}
    </text>
  );
};
const LABEL_STYLE = { fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" };

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "hours", label: "Человекочасы" },
  { id: "avg", label: "Средняя численность" },
  { id: "combined", label: "Совмещённый" },
];

export default function HeadcountTrendChart({ months, poLabel = "ПО" }: Props) {
  const [mode, setMode] = useState<ViewMode>("combined");

  const data = months.map(m => ({
    label: m.label.slice(0, 3),
    poHours: m.poHours,
    sbdHours: m.sbdHours,
    poAvg: m.poAvg ?? 0,
    sbdAvg: m.sbdAvg ?? 0,
    totalHours: m.poHours + m.sbdHours,
    totalAvg: Math.round((m.poAvg ?? 0) + (m.sbdAvg ?? 0)),
    zero: 0,
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
          <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
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
              <Bar yAxisId="hours" dataKey="poHours" name={`${poLabel}, ЧЧ`} stackId="hours" fill="#374151" radius={[0, 0, 0, 0]}>
                <LabelList dataKey="poHours" content={segmentLabel(fmtHoursShort, "#ffffff")} />
              </Bar>
            )}
            {showHours && (
              <Bar yAxisId="hours" dataKey="sbdHours" name="СБД, ЧЧ" stackId="hours" fill="#1d4ed8" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="sbdHours" content={segmentLabel(fmtHoursShort, "#ffffff")} />
              </Bar>
            )}
            {showHours && (
              <Bar yAxisId="hours" dataKey="zero" stackId="hours" fill="transparent" legendType="none" isAnimationActive={false}>
                <LabelList dataKey="totalHours" position="top" formatter={fmtHoursShort} style={LABEL_STYLE} />
              </Bar>
            )}
            {showAvg && (
              <Bar yAxisId="avg" dataKey="poAvg" name={`${poLabel}, числ.`} stackId="avg" fill="#6b7280" radius={[0, 0, 0, 0]}>
                <LabelList dataKey="poAvg" content={segmentLabel(fmtCount, "#ffffff")} />
              </Bar>
            )}
            {showAvg && (
              <Bar yAxisId="avg" dataKey="sbdAvg" name="СБД, числ." stackId="avg" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="sbdAvg" content={segmentLabel(fmtCount, "#ffffff")} />
              </Bar>
            )}
            {showAvg && (
              <Bar yAxisId="avg" dataKey="zero" stackId="avg" fill="transparent" legendType="none" isAnimationActive={false}>
                <LabelList dataKey="totalAvg" position="top" formatter={fmtCount} style={LABEL_STYLE} />
              </Bar>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
