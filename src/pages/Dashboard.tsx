import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import { Prescription, overallStatus } from "@/lib/prescriptionTypes";
import { Inspection } from "@/components/inspections/types";
import Icon from "@/components/ui/icon";
import DateRangePicker from "@/components/ui/date-range-picker";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const INSPECTIONS_API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";

interface DashboardProps {
  user: AppUser;
}

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
  "#a855f7", "#e11d48", "#0ea5e9",
];

function StatCard({ label, value, icon, color }: {
  label: string; value: number | string; icon: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon name={icon as never} size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

type PivotRow = {
  category: string;
  byContractor: Record<string, number>;
  total: number;
};

function parseDate(str: string): Date | null {
  if (!str) return null;
  if (str.includes("-")) return new Date(str);
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

export default function Dashboard({ user }: DashboardProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAllContractors, setShowAllContractors] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(PRESCRIPTIONS_API).then(r => r.json()).catch(() => []),
      fetch(INSPECTIONS_API).then(r => r.json()).catch(() => []),
    ]).then(([pres, insp]) => {
      setPrescriptions(Array.isArray(pres) ? pres : []);
      setInspections(Array.isArray(insp) ? insp : []);
      setLoading(false);
    });
  }, []);

  const isContractor = user.role === "contractor";

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      if (isContractor && p.contractor !== user.contractor) return false;
      if (from || to) {
        const d = parseDate(p.date);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [prescriptions, user, dateFrom, dateTo]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(i => {
      if (isContractor && i.contractor !== user.contractor) return false;
      if (from || to) {
        const d = parseDate(i.inspection_date);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [inspections, user, dateFrom, dateTo]);

  const presTotal = filteredPrescriptions.length;
  const presIssued = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Выдано").length;
  const presFixed = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Устранено").length;
  const presOverdue = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Просрочено").length;

  const inspTotal = filteredInspections.length;
  const inspSuspended = filteredInspections.filter(i => i.works_suspended).length;
  const inspRemarks = filteredInspections.reduce((s, i) => s + (i.remarks_count || 0), 0);

  const { contractors, pivotRows, grandTotal } = useMemo(() => {
    const contractorSet = new Set<string>();
    const map = new Map<string, Record<string, number>>();

    // Замечания из проверок
    filteredInspections.forEach(i => {
      const cat = i.violation_type || "Без категории";
      const co = i.contractor || "Не указан";
      contractorSet.add(co);
      if (!map.has(cat)) map.set(cat, {});
      const row = map.get(cat)!;
      row[co] = (row[co] || 0) + (i.remarks_count || 0);
    });

    // Замечания из предписаний (каждое remark — 1 единица, по category)
    filteredPrescriptions.forEach(p => {
      const co = p.contractor || "Не указан";
      (p.remarks || []).forEach(r => {
        const cat = r.category;
        if (!cat) return; // игнорируем без вида нарушения
        contractorSet.add(co);
        if (!map.has(cat)) map.set(cat, {});
        const row = map.get(cat)!;
        row[co] = (row[co] || 0) + 1;
      });
    });

    const contractors = [...contractorSet].sort();
    const pivotRows: PivotRow[] = [...map.entries()]
      .map(([category, byContractor]) => ({
        category,
        byContractor,
        total: Object.values(byContractor).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.total - a.total);

    const grandTotal: Record<string, number> = {};
    contractors.forEach(c => {
      grandTotal[c] = pivotRows.reduce((s, r) => s + (r.byContractor[c] || 0), 0);
    });

    return { contractors, pivotRows, grandTotal };
  }, [filteredInspections, filteredPrescriptions]);

  const chartData = useMemo(() => {
    return pivotRows.map(row => {
      const obj: Record<string, unknown> = { category: row.category };
      contractors.forEach(c => { obj[c] = row.byContractor[c] || 0; });
      return obj;
    });
  }, [pivotRows, contractors]);

  const topContractors = useMemo(() => {
    const map = new Map<string, { remarks: number; inspections: number; suspended: number }>();
    filteredInspections.forEach(i => {
      const co = i.contractor || "Не указан";
      const cur = map.get(co) ?? { remarks: 0, inspections: 0, suspended: 0 };
      cur.remarks += i.remarks_count || 0;
      cur.inspections += 1;
      cur.suspended += i.works_suspended ? 1 : 0;
      map.set(co, cur);
    });
    filteredPrescriptions.forEach(p => {
      const co = p.contractor || "Не указан";
      const count = (p.remarks || []).length;
      if (count === 0) return;
      const cur = map.get(co) ?? { remarks: 0, inspections: 0, suspended: 0 };
      cur.remarks += count;
      map.set(co, cur);
    });
    return [...map.entries()]
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.remarks - a.remarks);
  }, [filteredInspections, filteredPrescriptions]);

  const hasFilter = dateFrom || dateTo;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Фильтр по периоду */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
        <span className="text-xs text-muted-foreground">Период:</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          onReset={() => { setDateFrom(""); setDateTo(""); }}
        />
        {hasFilter && (
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredPrescriptions.length} пред. · {filteredInspections.length} пров.
          </span>
        )}
      </div>

      {/* Карточки предписаний */}
      <div>
        <h2 className="text-base font-semibold mb-3">Предписания</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Всего предписаний" value={presTotal} icon="ClipboardList" color="bg-indigo-500" />
          <StatCard label="Выдано" value={presIssued} icon="Send" color="bg-primary" />
          <StatCard label="Устранено" value={presFixed} icon="CheckCircle" color="bg-green-500" />
          <StatCard label="Просрочено" value={presOverdue} icon="AlertCircle" color="bg-red-500" />
        </div>
      </div>

      {/* Карточки проверок */}
      <div>
        <h2 className="text-base font-semibold mb-3">Проверки</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Всего проверок" value={inspTotal} icon="TableProperties" color="bg-violet-500" />
          <StatCard label="Всего замечаний" value={inspRemarks} icon="AlertTriangle" color="bg-amber-500" />
          <StatCard label="Приостановлено работ" value={inspSuspended} icon="OctagonX" color="bg-red-600" />
        </div>
      </div>

      {/* Топ подрядчиков */}
      {topContractors.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Топ подрядчиков по нарушениям</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {(() => {
              const max = topContractors[0]?.remarks || 1;
              const visible = showAllContractors ? topContractors : topContractors.slice(0, 3);
              return (
                <>
                  {visible.map((co, idx) => (
                    <div key={co.name} className="flex items-center gap-4 px-5 py-3 border-b border-border">
                      <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate">{co.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="TableProperties" size={11} />
                              {co.inspections} пров.
                            </span>
                            {co.suspended > 0 && (
                              <span className="flex items-center gap-1 text-red-400">
                                <Icon name="OctagonX" size={11} />
                                {co.suspended} пр.
                              </span>
                            )}
                            <span className="font-semibold text-foreground">{co.remarks} зам.</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.round((co.remarks / max) * 100)}%`,
                              background: idx === 0 ? "hsl(var(--destructive))" : idx === 1 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {topContractors.length > 3 && (
                    <button
                      onClick={() => setShowAllContractors(v => !v)}
                      className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Icon name={showAllContractors ? "ChevronUp" : "ChevronDown"} size={13} />
                      {showAllContractors ? "Скрыть" : `Показать все (${topContractors.length})`}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Сводная таблица */}
      {pivotRows.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Замечания по категориям и подрядчикам</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ minWidth: 180 }} />
                  {contractors.map(c => <col key={c} style={{ width: 50, maxWidth: 50 }} />)}
                  <col style={{ width: 50, maxWidth: 50 }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Вид нарушения</th>
                    {contractors.map(c => (
                      <th key={c} className="text-center py-2.5 font-semibold text-muted-foreground" style={{ width: 50, maxWidth: 50 }}>
                        <div
                          className="overflow-hidden mx-auto"
                          style={{ width: 50, maxHeight: "2.8em", lineHeight: "1.4em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", cursor: "default" }}
                          title={c}
                        >
                          {c}
                        </div>
                      </th>
                    ))}
                    <th className="text-center py-2.5 font-semibold text-foreground" style={{ width: 50 }}>Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((row, idx) => (
                    <tr key={row.category} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="px-4 py-2 text-foreground">{row.category}</td>
                      {contractors.map(c => (
                        <td key={c} className="py-2 text-center text-muted-foreground" style={{ width: 50, maxWidth: 50 }}>
                          {row.byContractor[c] ? (
                            <span className="text-foreground font-medium">{row.byContractor[c]}</span>
                          ) : ""}
                        </td>
                      ))}
                      <td className="py-2 text-center font-bold text-foreground" style={{ width: 50 }}>{row.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/30 border-t-2 border-border">
                    <td className="px-4 py-2.5 font-bold text-foreground">Общий итог</td>
                    {contractors.map(c => (
                      <td key={c} className="py-2.5 text-center font-bold text-foreground" style={{ width: 50, maxWidth: 50 }}>
                        {grandTotal[c] || ""}
                      </td>
                    ))}
                    <td className="py-2.5 text-center font-bold text-foreground" style={{ width: 50 }}>
                      {pivotRows.reduce((s, r) => s + r.total, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* График */}
      {chartData.length > 0 && contractors.length > 0 && (
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
      )}

      {pivotRows.length === 0 && (
        <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="BarChart3" size={36} className="opacity-30" />
          <p className="text-sm">Нет данных для отображения</p>
        </div>
      )}
    </div>
  );
}