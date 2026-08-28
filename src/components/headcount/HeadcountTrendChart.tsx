import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { MonthStats } from "@/lib/headcountTypes";

interface Props {
  months: MonthStats[];
  poLabel?: string;
}

const fmt = (n: number) => n.toLocaleString("ru-RU");

export default function HeadcountTrendChart({ months, poLabel = "ПО" }: Props) {
  const data = months.map(m => ({
    label: m.label.slice(0, 3),
    po: m.poHours,
    sbd: m.sbdHours,
    total: m.totalHours,
  }));

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Динамика по месяцам</h2>
      <div className="bg-card border border-border rounded-xl p-4">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3547" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b9ab0" }} />
            <YAxis tick={{ fontSize: 11, fill: "#8b9ab0" }} allowDecimals={false} tickFormatter={fmt} />
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
              formatter={(value: number, name: string) => [`${fmt(value)} ч`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: "#8b9ab0" }}>{value}</span>}
            />
            <Bar dataKey="po" name={poLabel} stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
            <Bar dataKey="sbd" name="СБД" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="total" name="Итого" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}