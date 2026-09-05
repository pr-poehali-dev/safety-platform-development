import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
} from "recharts";
import Icon from "@/components/ui/icon";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
  "#a855f7", "#e11d48", "#0ea5e9",
];

type ChartType = "bar" | "pie";

interface PieTooltipPayload {
  name: string;
  breakdown?: { category: string; count: number }[];
}

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PieTooltipPayload }[] }) => {
  if (!active || !payload || !payload.length) return null;
  const { name, breakdown } = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(22, 26, 35, 0.97)",
        border: "1px solid #2e3547",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#d0d8e8",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 600, whiteSpace: "normal", wordBreak: "break-word", marginBottom: breakdown?.length ? 6 : 0 }}>{name}</div>
      {!!breakdown?.length && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {breakdown.map((b) => (
            <div key={b.category} style={{ color: "#8b9ab0", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{b.category}</span>
              <span>{b.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface RemarksChartProps {
  chartData: Record<string, unknown>[];
  contractors: string[];
}

export default function RemarksChart({ chartData, contractors }: RemarksChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");

  const singleContractor = contractors.length === 1 ? contractors[0] : null;

  const pieData = useMemo(() => {
    if (singleContractor) {
      return chartData
        .map((row) => ({
          name: String(row.category ?? ""),
          value: Number(row[singleContractor]) || 0,
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    return contractors
      .map((c) => {
        const breakdown = chartData
          .map((row) => ({ category: String(row.category ?? ""), count: Number(row[c]) || 0 }))
          .filter((b) => b.count > 0)
          .sort((a, b) => b.count - a.count);
        return {
          name: c,
          value: breakdown.reduce((sum, b) => sum + b.count, 0),
          breakdown,
        };
      })
      .filter((d) => d.value > 0);
  }, [chartData, contractors, singleContractor]);

  if (chartData.length === 0 || contractors.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold">Распределение замечаний (диаграмма)</h2>
          {chartType === "pie" && singleContractor && (
            <p className="text-xs text-muted-foreground mt-0.5">По видам нарушений: {singleContractor}</p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          <button
            onClick={() => setChartType("bar")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              chartType === "bar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name="BarChart3" size={14} />
            <span className="hidden sm:inline">График</span>
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              chartType === "pie" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name="PieChart" size={14} />
            <span className="hidden sm:inline">Круговая</span>
          </button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        {chartType === "bar" ? (
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 100 }}>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "#8b9ab0" }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={100}
              />
              <YAxis tick={{ fontSize: 10, fill: "#8b9ab0" }} allowDecimals={false} />
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
                itemStyle={{ color: "#8b9ab0" }}
                formatter={(value, name) => (Number(value) > 0 ? [value, name] : [null, null])}
                filterNull
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11, paddingTop: 16, position: "relative" }}
                formatter={(value) => <span style={{ color: "#8b9ab0" }}>{value}</span>}
              />
              {contractors.map((c, i) => (
                <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === contractors.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}>
                  {chartData.map((_, ci) => (
                    <Cell key={ci} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={140}
                label={({ percent, value }) => `${((percent ?? 0) * 100).toFixed(0)}% (${value})`}
                labelLine={{ stroke: "#8b9ab0" }}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
                formatter={(value) => <span style={{ color: "#8b9ab0" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}