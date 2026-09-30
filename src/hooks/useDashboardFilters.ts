import { useState, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import { Prescription, overallStatus } from "@/lib/prescriptionTypes";
import { Inspection } from "@/components/inspections/types";
import { type PivotRow } from "@/components/dashboard/PivotTable";
import { SpbCategory, Incident } from "@/hooks/useDashboardData";

function parseDate(str: string): Date | null {
  if (!str) return null;
  if (str.includes("-")) return new Date(str);
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

// --- Фильтрация данных дашборда и вычисление всех производных статистик ---
export function useDashboardFilters(
  user: AppUser,
  prescriptions: Prescription[],
  inspections: Inspection[],
  incidents: Incident[],
  spbCategories: SpbCategory[],
  myObjectNames: string[],
) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contractorOpen, setContractorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const isContractor = user.role === "contractor";
  const isAdmin = user.role === "admin";
  const isSpecialist = user.role === "specialist";
  const isProjectTeam = user.role === "project_team";
  const [filterMine, setFilterMine] = useState(isSpecialist);

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

  const { daysWithoutIncidents, lastIncidentDate } = useMemo(() => {
    const dates = incidents
      .filter(i => (i.fatal || 0) > 0 || (i.severe_injury || 0) > 0 || (i.light_injury || 0) > 0)
      .map(i => i.incident_date)
      .filter(Boolean)
      .sort();
    const last = dates.length > 0 ? dates[dates.length - 1] : null;
    if (!last) return { daysWithoutIncidents: null, lastIncidentDate: null };
    const lastDate = new Date(last + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return { daysWithoutIncidents: Math.max(0, diffDays), lastIncidentDate: last };
  }, [incidents]);

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

  return {
    dateFrom, setDateFrom, dateTo, setDateTo,
    selectedContractors, setSelectedContractors,
    selectedCategories, setSelectedCategories,
    contractorOpen, setContractorOpen, categoryOpen, setCategoryOpen,
    isContractor, isAdmin, isSpecialist, isProjectTeam, filterMine, setFilterMine,
    allContractorOptions, allCategoryOptions,
    filteredPrescriptions, filteredInspections,
    presTotal, presIssued, presFixed, presOverdue, presRemarksTotal,
    inspTotal, inspSuspended, inspRemarks,
    presSuspendedRemarks,
    pyramidData, daysWithoutIncidents, lastIncidentDate,
    spbStats, spbTotal,
    contractors, pivotRows, grandTotal, chartData, topContractors,
    hasFilter, toggleItem,
  };
}
