import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import { Prescription, overallStatus } from "@/lib/prescriptionTypes";
import { Inspection } from "@/components/inspections/types";
import Icon from "@/components/ui/icon";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import TopContractors from "@/components/dashboard/TopContractors";
import PivotTable from "@/components/dashboard/PivotTable";
import RemarksChart from "@/components/dashboard/RemarksChart";
import IncidentPyramid from "@/components/dashboard/IncidentPyramid";
import { type PivotRow } from "@/components/dashboard/PivotTable";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const INSPECTIONS_API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";
const INCIDENTS_API = "https://functions.poehali.dev/4aedfdd0-d096-43ad-b4e7-b7b2aec3f753";
const CATEGORIES_API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";

interface SpbCategory {
  id: number;
  name: string;
  is_spb: boolean;
}

interface Incident {
  id: number;
  incident_date: string;
  contractor: string | null;
  microtrauma: number;
  light_injury: number;
  severe_injury: number;
  fatal: number;
  no_consequences: number;
}

interface DashboardProps {
  user: AppUser;
  onNavigateToPrescriptions?: (status?: string) => void;
  onNavigateToInspections?: (suspended?: boolean) => void;
  onNavigateToIncidents?: () => void;
}

function StatCard({ label, value, icon, color, onClick }: {
  label: string; value: number | string; icon: string; color: string; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4 ${onClick ? "cursor-pointer hover:border-primary/50 hover:bg-card/80 transition-colors" : ""}`}
      onClick={onClick}
    >
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

function parseDate(str: string): Date | null {
  if (!str) return null;
  if (str.includes("-")) return new Date(str);
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

export default function Dashboard({ user, onNavigateToPrescriptions, onNavigateToInspections, onNavigateToIncidents }: DashboardProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [spbCategories, setSpbCategories] = useState<SpbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contractorOpen, setContractorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(PRESCRIPTIONS_API).then(r => r.json()).catch(() => []),
      fetch(INSPECTIONS_API).then(r => r.json()).catch(() => []),
      fetch(INCIDENTS_API).then(r => r.json()).catch(() => []),
      fetch(CATEGORIES_API).then(r => r.json()).catch(() => []),
    ]).then(([pres, insp, inc, cats]) => {
      setPrescriptions(Array.isArray(pres) ? pres : []);
      setInspections(Array.isArray(insp) ? insp : []);
      setIncidents(Array.isArray(inc) ? inc : []);
      setSpbCategories(Array.isArray(cats) ? cats.filter((c: SpbCategory) => c.is_spb) : []);
      setLoading(false);
    });
  }, []);

  const isContractor = user.role === "contractor";
  const isSpecialist = user.role === "specialist";

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

  const allContractorOptions = useMemo(() => {
    const set = new Set<string>();
    prescriptions.forEach(p => p.contractor && set.add(p.contractor));
    inspections.forEach(i => i.contractor && set.add(i.contractor));
    return [...set].sort();
  }, [prescriptions, inspections]);

  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach(i => i.violation_type && set.add(i.violation_type));
    prescriptions.forEach(p => (p.remarks || []).forEach(r => r.category && set.add(r.category)));
    return [...set].sort();
  }, [prescriptions, inspections]);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      if (isContractor && p.contractor !== user.contractor) return false;
      if (isSpecialist && p.createdBy !== user.login) return false;
      if (from || to) {
        const d = parseDate(p.date);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (selectedContractors.length > 0 && !selectedContractors.includes(p.contractor || "Не указан")) return false;
      if (selectedCategories.length > 0) {
        const hasCategory = (p.remarks || []).some(r => selectedCategories.includes(r.category));
        if (!hasCategory) return false;
      }
      return true;
    });
  }, [prescriptions, user, dateFrom, dateTo, selectedContractors, selectedCategories]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(i => {
      if (isContractor && i.contractor !== user.contractor) return false;
      if (isSpecialist && i.created_by !== user.login) return false;
      if (from || to) {
        const d = parseDate(i.inspection_date);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (selectedContractors.length > 0 && !selectedContractors.includes(i.contractor || "Не указан")) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(i.violation_type || "")) return false;
      return true;
    });
  }, [inspections, user, dateFrom, dateTo, selectedContractors, selectedCategories]);

  const presTotal = filteredPrescriptions.length;
  const presIssued = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Выдано").length;
  const presFixed = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Устранено").length;
  const presOverdue = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Просрочено").length;

  const inspTotal = filteredInspections.length;
  const inspSuspended = filteredInspections.filter(i => i.works_suspended).length;
  const inspRemarks = filteredInspections.reduce((s, i) => s + (i.remarks_count || 0), 0);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (isContractor && i.contractor !== user.contractor) return false;
      if (from || to) {
        const d = parseDate(i.incident_date);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (selectedContractors.length > 0 && !selectedContractors.includes(i.contractor || "Не указан")) return false;
      return true;
    });
  }, [incidents, user, dateFrom, dateTo, selectedContractors]);

  const pyramidData = useMemo(() => {
    const presViolations = filteredPrescriptions.reduce((s, p) => s + (p.remarks || []).length, 0);
    const totalViolations = inspRemarks + presViolations;
    return {
      fatal: filteredIncidents.reduce((s, i) => s + (i.fatal || 0), 0),
      severe_injury: filteredIncidents.reduce((s, i) => s + (i.severe_injury || 0), 0),
      light_injury: filteredIncidents.reduce((s, i) => s + (i.light_injury || 0), 0),
      microtrauma: filteredIncidents.reduce((s, i) => s + (i.microtrauma || 0), 0),
      no_consequences: filteredIncidents.reduce((s, i) => s + (i.no_consequences || 0), 0),
      totalViolations,
      suspendedWorks: inspSuspended,
    };
  }, [filteredIncidents, filteredPrescriptions, inspRemarks, inspSuspended]);

  const spbStats = useMemo(() => {
    return spbCategories.map(cat => {
      const fromInspections = filteredInspections
        .filter(i => i.violation_type === cat.name)
        .reduce((s, i) => s + (i.remarks_count || 0), 0);
      const fromPrescriptions = filteredPrescriptions
        .reduce((s, p) => s + (p.remarks || []).filter(r => r.category === cat.name).length, 0);
      return { name: cat.name, count: fromInspections + fromPrescriptions };
    }).filter(s => s.count > 0 || spbCategories.length <= 10);
  }, [spbCategories, filteredInspections, filteredPrescriptions]);

  const spbTotal = spbStats.reduce((s, c) => s + c.count, 0);

  const { contractors, pivotRows, grandTotal } = useMemo(() => {
    const contractorSet = new Set<string>();
    const map = new Map<string, Record<string, number>>();

    filteredInspections.forEach(i => {
      const cat = i.violation_type || "Без категории";
      const co = i.contractor || "Не указан";
      contractorSet.add(co);
      if (!map.has(cat)) map.set(cat, {});
      const row = map.get(cat)!;
      row[co] = (row[co] || 0) + (i.remarks_count || 0);
    });

    filteredPrescriptions.forEach(p => {
      const co = p.contractor || "Не указан";
      (p.remarks || []).forEach(r => {
        const cat = r.category;
        if (!cat) return;
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

  const hasFilter = !!(dateFrom || dateTo || selectedContractors.length > 0 || selectedCategories.length > 0);

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <DashboardFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFromChange={setDateFrom}
        onToChange={setDateTo}
        selectedContractors={selectedContractors}
        setSelectedContractors={setSelectedContractors}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        allContractorOptions={allContractorOptions}
        allCategoryOptions={allCategoryOptions}
        contractorOpen={contractorOpen}
        setContractorOpen={setContractorOpen}
        categoryOpen={categoryOpen}
        setCategoryOpen={setCategoryOpen}
        isContractor={isContractor}
        filteredPresCount={filteredPrescriptions.length}
        filteredInspCount={filteredInspections.length}
        hasFilter={hasFilter}
        toggleItem={toggleItem}
      />

      {/* Статистика + Пирамида */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Левая колонка: Предписания + Проверки */}
        <div className="flex flex-col gap-4">

          {/* Предписания 2x2 */}
          <div>
            <h2 className="text-base font-semibold mb-3 py-[15px]">Предписания</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Всего предписаний" value={presTotal} icon="ClipboardList" color="bg-indigo-500" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Все") : undefined} />
              <StatCard label="Выдано" value={presIssued} icon="Send" color="bg-primary" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Выдано") : undefined} />
              <StatCard label="Устранено" value={presFixed} icon="CheckCircle" color="bg-green-500" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Устранено") : undefined} />
              <StatCard label="Просрочено" value={presOverdue} icon="AlertCircle" color="bg-red-500" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Просрочено") : undefined} />
            </div>
          </div>

          {/* Проверки 1 колонка */}
          <div>
            <h2 className="text-base font-semibold mb-3 py-[15px]">Проверки</h2>
            <div className="flex flex-col gap-3">
              <StatCard label="Всего проверок" value={inspTotal} icon="TableProperties" color="bg-violet-500" onClick={onNavigateToInspections ? () => onNavigateToInspections(false) : undefined} />
              <StatCard label="Всего замечаний" value={inspRemarks} icon="AlertTriangle" color="bg-amber-500" onClick={onNavigateToInspections ? () => onNavigateToInspections(false) : undefined} />
              <StatCard label="Приостановлено работ" value={inspSuspended} icon="OctagonX" color="bg-red-600" onClick={onNavigateToInspections ? () => onNavigateToInspections(true) : undefined} />
            </div>
          </div>
        </div>

        {/* Правая колонка: СПБ + Пирамида */}
        <div className="flex flex-col gap-4">

          {/* Счётчик СПБ */}
          {spbCategories.length > 0 && (
            <div className="bg-card border border-primary/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 font-bold text-xs tracking-wide">СПБ</span>
                  <span className="text-sm font-semibold text-foreground">Стратегические приоритеты безопасности</span>
                </div>
                <span className="font-bold text-primary text-3xl">{spbTotal}</span>
              </div>
              <div className="space-y-1.5">
                {spbStats.map(stat => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs text-muted-foreground truncate">{stat.name}</span>
                        <span className="text-xs font-semibold text-foreground flex-shrink-0">{stat.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-blue-500"
                          style={{ width: spbTotal > 0 ? `${(stat.count / spbTotal) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {spbStats.every(s => s.count === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-1">Нарушений по СПБ не зафиксировано</p>
                )}
              </div>
            </div>
          )}

          {/* Пирамида */}
          <IncidentPyramid data={pyramidData} year={new Date().getFullYear()} />
        </div>
      </div>

      <TopContractors topContractors={topContractors} />

      <PivotTable pivotRows={pivotRows} contractors={contractors} grandTotal={grandTotal} />

      <RemarksChart chartData={chartData} contractors={contractors} />

      {pivotRows.length === 0 && (
        <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="BarChart3" size={36} className="opacity-30" />
          <p className="text-sm">Нет данных для отображения</p>
        </div>
      )}
    </div>
  );
}