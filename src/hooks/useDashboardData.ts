import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import { Prescription } from "@/lib/prescriptionTypes";
import { Inspection } from "@/components/inspections/types";
import { useHeadcount } from "@/hooks/useHeadcount";
import { useHeadcountSettings } from "@/hooks/useHeadcountSettings";
import { buildYtdStats, buildTotalHours } from "@/lib/headcountTypes";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const INSPECTIONS_API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";
const INCIDENTS_API = "https://functions.poehali.dev/4aedfdd0-d096-43ad-b4e7-b7b2aec3f753";
const CATEGORIES_API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const PYRAMID_STATS_API = "https://functions.poehali.dev/7cb54511-8788-48e9-b719-37233cb062e5";
const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const FINES_API = "https://functions.poehali.dev/05dd11e6-f624-4a7b-a0b7-604951125a9b";

export interface SpbCategory {
  id: number;
  name: string;
  is_spb: boolean;
}

export interface Incident {
  id: number;
  incident_date: string;
  contractor: string | null;
  microtrauma: number;
  light_injury: number;
  severe_injury: number;
  fatal: number;
  no_consequences: number;
}

export interface Fine {
  id: number;
  period_date: string;
  amount_issued: number;
  amount_paid: number | null;
}

// --- Загрузка всех данных дашборда (предписания, проверки, происшествия, СПБ, штрафы, человекочасы) ---
export function useDashboardData(user: AppUser) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [spbCategories, setSpbCategories] = useState<SpbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualDangerActions, setManualDangerActions] = useState(0);
  const [manualSuspendedWorks, setManualSuspendedWorks] = useState(0);
  const [pyramidSaving, setPyramidSaving] = useState(false);
  const [fines, setFines] = useState<Fine[]>([]);
  const [finesLoading, setFinesLoading] = useState(true);

  const [myObjectNames, setMyObjectNames] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();
  const { days: headcountDays, loading: headcountLoading } = useHeadcount(currentYear);
  const { days: allHeadcountDays, loading: allHeadcountLoading } = useHeadcount();
  const { settings: headcountSettings } = useHeadcountSettings();
  const ytdStats = useMemo(() => buildYtdStats(headcountDays, headcountSettings.po_rate, headcountSettings.sbd_rate), [headcountDays, headcountSettings]);
  const totalWorkedHours = useMemo(() => buildTotalHours(allHeadcountDays, headcountSettings.po_rate, headcountSettings.sbd_rate), [allHeadcountDays, headcountSettings]);

  useEffect(() => {
    fetch(FINES_API)
      .then(r => r.json())
      .then(data => setFines(Array.isArray(data) ? data : []))
      .catch(() => setFines([]))
      .finally(() => setFinesLoading(false));
  }, []);

  const finesStats = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return fines.reduce((acc, f) => {
      const issued = f.amount_issued || 0;
      const paid = f.amount_paid || 0;
      acc.totalIssued += issued;
      acc.totalPaid += paid;
      if ((f.period_date || "").slice(0, 7) === monthKey) {
        acc.monthIssued += issued;
        acc.monthPaid += paid;
      }
      return acc;
    }, { totalIssued: 0, totalPaid: 0, monthIssued: 0, monthPaid: 0 });
  }, [fines]);

  const currentMonthLabel = new Date().toLocaleDateString("ru-RU", { month: "long" });

  useEffect(() => {
    Promise.all([
      fetch(`${PRESCRIPTIONS_API}?full=1`).then(r => r.json()).catch(() => []),
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

  return {
    prescriptions, inspections, incidents, spbCategories, loading,
    myObjectNames,
    fines, finesLoading, finesStats, currentMonthLabel,
    manualDangerActions, manualSuspendedWorks, setManualDangerActions, setManualSuspendedWorks,
    pyramidSaving, savePyramidStats,
    ytdStats, headcountLoading, totalWorkedHours, allHeadcountLoading, headcountSettings,
  };
}
