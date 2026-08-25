import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import { Prescription, overallStatus } from "@/lib/prescriptionTypes";
import { Inspection } from "@/components/inspections/types";
import Icon from "@/components/ui/icon";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import TopContractors from "@/components/dashboard/TopContractors";
import PivotTable from "@/components/dashboard/PivotTable";
import RemarksChart from "@/components/dashboard/RemarksChart";
import DashboardStatCards from "@/components/dashboard/DashboardStatCards";
import DashboardTasksWidget from "@/components/dashboard/DashboardTasksWidget";
import DashboardSpbPanel from "@/components/dashboard/DashboardSpbPanel";
import { type PivotRow } from "@/components/dashboard/PivotTable";
import { TaskAssignment } from "@/lib/taskTypes";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const INSPECTIONS_API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";
const INCIDENTS_API = "https://functions.poehali.dev/4aedfdd0-d096-43ad-b4e7-b7b2aec3f753";
const CATEGORIES_API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const PYRAMID_STATS_API = "https://functions.poehali.dev/7cb54511-8788-48e9-b719-37233cb062e5";
const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";

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
  taskAssignments: TaskAssignment[];
  onNavigateToPrescriptions?: (status?: string, mine?: boolean) => void;
  onNavigateToInspections?: (suspended?: boolean, mine?: boolean) => void;
  onNavigateToIncidents?: () => void;
  onNavigateToTasks?: (filter?: string, taskId?: number) => void;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  if (str.includes("-")) return new Date(str);
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

export default function Dashboard({ user, taskAssignments, onNavigateToPrescriptions, onNavigateToInspections, onNavigateToIncidents, onNavigateToTasks }: DashboardProps) {
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
  const [manualDangerActions, setManualDangerActions] = useState(0);
  const [manualSuspendedWorks, setManualSuspendedWorks] = useState(0);
  const [pyramidSaving, setPyramidSaving] = useState(false);

  const [myObjectNames, setMyObjectNames] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(PRESCRIPTIONS_API).then(r => r.json()).catch(() => []),
      fetch(INSPECTIONS_API).then(r => r.json()).catch(() => []),
      fetch(INCIDENTS_API).then(r => r.json()).catch(() => []),
      fetch(CATEGORIES_API).then(r => r.json()).catch(() => []),
      fetch(PYRAMID_STATS_API).then(r => r.json()).catch(() => null),
      fetch(OBJECTS_API).then(r => r.json()).catch(() => []),
    ]).then(([pres, insp, inc, cats, pyramidStats, objs]) => {
      setPrescriptions(Array.isArray(pres) ? pres : []);
      setInspections(Array.isArray(insp) ? insp : []);
      setIncidents(Array.isArray(inc) ? inc : []);
      setSpbCategories(Array.isArray(cats) ? cats.filter((c: SpbCategory) => c.is_spb) : []);
      if (pyramidStats && typeof pyramidStats === "object") {
        setManualDangerActions(Number(pyramidStats.danger_actions) || 0);
        setManualSuspendedWorks(Number(pyramidStats.suspended_works) || 0);
      }
      if (Array.isArray(objs) && user.role === "project_team") {
        const ids = new Set(user.objectIds ?? []);
        setMyObjectNames(objs.filter((o: { id: number; name: string }) => ids.has(o.id)).map((o: { id: number; name: string }) => o.name));
      }
      setLoading(false);
    });
  }, []);

  const isContractor = user.role === "contractor";
  const isAdmin = user.role === "admin";
  const isSpecialist = user.role === "specialist";
  const isProjectTeam = user.role === "project_team";
  const [filterMine, setFilterMine] = useState(isSpecialist);

  const savePyramidStats = async () => {
    setPyramidSaving(true);
    try {
      await fetch(PYRAMID_STATS_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          danger_actions: manualDangerActions,
          suspended_works: manualSuspendedWorks,
          updated_by: user.login,
        }),
      });
    } finally {
      setPyramidSaving(false);
    }
  };

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
      if (isProjectTeam && !myObjectNames.includes(p.object)) return false;
      if (isSpecialist && filterMine && p.createdBy !== user.login) return false;
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
  }, [prescriptions, user, dateFrom, dateTo, selectedContractors, selectedCategories, isSpecialist, filterMine, isProjectTeam, myObjectNames]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(i => {
      if (isContractor && i.contractor !== user.contractor) return false;
      if (isProjectTeam && !myObjectNames.includes(i.object_name)) return false;
      if (isSpecialist && filterMine && i.created_by !== user.id) return false;
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
  }, [inspections, user, dateFrom, dateTo, selectedContractors, selectedCategories, isSpecialist, filterMine, isProjectTeam, myObjectNames]);

  const presTotal = filteredPrescriptions.length;
  const presIssued = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "В работе").length;
  const presFixed = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Устранено").length;
  const presOverdue = filteredPrescriptions.filter(p => overallStatus(p.remarks) === "Просрочено").length;
  const presRemarksTotal = filteredPrescriptions.reduce((s, p) => s + (p.remarks || []).length, 0);

  const inspTotal = filteredInspections.length;
  const inspSuspended = filteredInspections.filter(i => i.works_suspended).length;
  const inspRemarks = filteredInspections.reduce((s, i) => s + (i.remarks_count || 0), 0);

  const presSuspendedRemarks = useMemo(() => {
    return filteredPrescriptions.reduce((acc, p) => acc + (p.remarks || []).filter(r => r.work_suspended).length, 0);
  }, [filteredPrescriptions]);

  const presSuspendedActs = useMemo(() => {
    return filteredPrescriptions.reduce((acc, p) => acc + (p.remarks || []).filter(r => r.work_suspended && r.suspension_act_drawn).length, 0);
  }, [filteredPrescriptions]);

  const totalSuspended = inspSuspended + presSuspendedRemarks;
  const totalSuspendedActs = presSuspendedActs;

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
      suspendedWorks: totalSuspended,
      suspendedWorksWithAct: totalSuspendedActs,
    };
  }, [filteredIncidents, filteredPrescriptions, inspRemarks, totalSuspended, totalSuspendedActs]);

  const spbStats = useMemo(() => {
    return spbCategories.map(cat => {
      const fromInspections = filteredInspections
        .filter(i => i.violation_type === cat.name)
        .reduce((s, i) => s + (i.remarks_count || 0), 0);
      const fromPrescriptions = filteredPrescriptions
        .reduce((s, p) => s + (p.remarks || []).filter(r => r.category === cat.name).length, 0);
      return { name: cat.name, count: fromInspections + fromPrescriptions };
    })
      .filter(s => s.count > 0 || spbCategories.length <= 10)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [spbCategories, filteredInspections, filteredPrescriptions]);

  const spbTotal = spbStats.reduce((s, c) => s + c.count, 0);

  const { contractors, pivotRows, grandTotal } = useMemo(() => {
    const OTHER_LABEL = "Прочие";
    const TOP_CONTRACTORS_COUNT = 5;

    const contractorTotals = new Map<string, number>();
    const rawMap = new Map<string, Record<string, number>>();

    const addEntry = (cat: string, co: string, amount: number) => {
      if (!rawMap.has(cat)) rawMap.set(cat, {});
      const row = rawMap.get(cat)!;
      row[co] = (row[co] || 0) + amount;
      contractorTotals.set(co, (contractorTotals.get(co) || 0) + amount);
    };

    filteredInspections.forEach(i => {
      const cat = i.violation_type || "Без категории";
      const co = i.contractor || "Не указан";
      addEntry(cat, co, i.remarks_count || 0);
    });

    filteredPrescriptions.forEach(p => {
      const co = p.contractor || "Не указан";
      (p.remarks || []).forEach(r => {
        const cat = r.category;
        if (!cat) return;
        addEntry(cat, co, 1);
      });
    });

    // Топ-5 организаций по количеству замечаний — отдельные столбцы, остальные объединяются в "Прочие"
    const sortedContractors = [...contractorTotals.entries()].sort((a, b) => b[1] - a[1]);
    const topContractors = sortedContractors.slice(0, TOP_CONTRACTORS_COUNT).map(([name]) => name);
    const otherContractors = new Set(sortedContractors.slice(TOP_CONTRACTORS_COUNT).map(([name]) => name));
    const contractors = otherContractors.size > 0 ? [...topContractors, OTHER_LABEL] : topContractors;

    const pivotRows: PivotRow[] = [...rawMap.entries()]
      .map(([category, byContractorRaw]) => {
        const byContractor: Record<string, number> = {};
        Object.entries(byContractorRaw).forEach(([co, val]) => {
          const key = otherContractors.has(co) ? OTHER_LABEL : co;
          byContractor[key] = (byContractor[key] || 0) + val;
        });
        return {
          category,
          byContractor,
          total: Object.values(byContractor).reduce((s, v) => s + v, 0),
        };
      })
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
        isSpecialist={isSpecialist}
        filterMine={filterMine}
        onFilterMineChange={setFilterMine}
        filteredPresCount={filteredPrescriptions.length}
        filteredInspCount={filteredInspections.length}
        hasFilter={hasFilter}
        toggleItem={toggleItem}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="flex flex-col gap-4">
          <DashboardStatCards
            presTotal={presTotal}
            presIssued={presIssued}
            presFixed={presFixed}
            presOverdue={presOverdue}
            presRemarksTotal={presRemarksTotal}
            presSuspended={presSuspendedRemarks}
            inspTotal={inspTotal}
            inspRemarks={inspRemarks}
            inspSuspended={inspSuspended}
            onNavigateToPrescriptions={onNavigateToPrescriptions}
            onNavigateToInspections={onNavigateToInspections}
          />

          <DashboardTasksWidget
            taskAssignments={taskAssignments}
            onNavigateToTasks={onNavigateToTasks}
          />
        </div>

        <DashboardSpbPanel
          spbCategories={spbCategories}
          spbStats={spbStats}
          spbTotal={spbTotal}
          pyramidData={pyramidData}
          pyramidEditable={isAdmin}
          manualDangerActions={manualDangerActions}
          manualSuspendedWorks={manualSuspendedWorks}
          onManualDangerActionsChange={setManualDangerActions}
          onManualSuspendedWorksChange={setManualSuspendedWorks}
          onPyramidSave={savePyramidStats}
          pyramidSaving={pyramidSaving}
        />
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