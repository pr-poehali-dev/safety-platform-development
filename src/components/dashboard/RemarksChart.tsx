import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
  "#a855f7", "#e11d48", "#0ea5e9",
];

interface RemarksChartProps {
  chartData: Record<string, unknown>[];
  contractors: string[];
}

export default function RemarksChart({ chartData, contractors }: RemarksChartProps) {
  if (chartData.length === 0 || contractors.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Количество замечаний (диаграмма)</h2>
      <div className="bg-card border border-border rounded-xl p-4">
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
      </div>
    </div>
  );
}
