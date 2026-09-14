import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import DateRangePicker from "@/components/ui/date-range-picker";
import FilterDropdown from "@/components/inspections/FilterDropdown";
import { VisibilitySettings, defaultVisibilitySettings } from "@/lib/visibilityTypes";
import { Suspension, SuspensionStatus, SUSPENSION_STATUS_STYLE, ALL_SUSPENSION_STATUSES } from "@/lib/suspensionTypes";
import { SuspensionForm } from "@/components/suspensions/SuspensionForm";
import { printSuspension } from "@/lib/printSuspension";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";

const SUSPENSIONS_API = "https://functions.poehali.dev/bcc14bec-45e7-4857-867d-95233fa38b64";
const TEMPLATES_API = "https://functions.poehali.dev/41ec60df-3f38-4561-ba9d-ca17ebd71553";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount" | "fines" | "suspensions";

interface SuspensionsProps {
  user: AppUser;
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
  visibility?: VisibilitySettings;
  initialOpenNumber?: string;
}

export default function Suspensions({ user, onLogout, onTabChange, activeTab = "suspensions", visibility, initialOpenNumber }: SuspensionsProps) {
  const tabs = visibility?.tabs ?? defaultVisibilitySettings().tabs;
  const [rows, setRows] = useState<Suspension[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterObject, setFilterObject] = useState<string[]>([]);
  const [filterContractor, setFilterContractor] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<Template>({ ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true });

  const [highlightNumber, setHighlightNumber] = useState<string | undefined>(initialOpenNumber);

  const canEdit = user.role === "admin" || user.role === "specialist" || user.role === "manager";

  const load = () => {
    setLoading(true);
    fetch(SUSPENSIONS_API)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Открытие по конкретному номеру акта (переход из карточки предписания)
  useEffect(() => {
    if (!initialOpenNumber) return;
    setSearch(initialOpenNumber);
    setFilterStatus([]);
    setFilterObject([]);
    setFilterContractor([]);
    setDateFrom("");
    setDateTo("");
    setHighlightNumber(initialOpenNumber);
  }, [initialOpenNumber]);

  useEffect(() => {
    if (!highlightNumber) return;
    const el = document.getElementById(`suspension-row-${highlightNumber}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightNumber(undefined), 2500);
    return () => clearTimeout(t);
  }, [highlightNumber, rows]);

  useEffect(() => {
    fetch(`${TEMPLATES_API}?type=suspension`)
      .then(r => r.json())
      .then((data: Template[]) => {
        const parsed = typeof data === "string" ? JSON.parse(data as unknown as string) : data;
        const def = parsed.find((t: Template) => t.isDefault) ?? parsed[0];
        if (def) setActiveTemplate(def);
      })
      .catch(() => {});
  }, []);

  const addSuspension = async (s: Suspension) => {
    const res = await fetch(SUSPENSIONS_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    const data = await res.json();
    const saved = { ...s, number: data.number ?? s.number };
    setRows(prev => [saved, ...prev]);
  };

  const changeStatus = async (row: Suspension, status: SuspensionStatus) => {
    const updated = { ...row, status };
    setRows(prev => prev.map(r => r.id === row.id ? updated : r));
    await fetch(SUSPENSIONS_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus.length > 0 && !filterStatus.includes(r.status)) return false;
      if (filterObject.length > 0 && !filterObject.includes(r.object)) return false;
      if (filterContractor.length > 0 && !filterContractor.includes(r.contractor)) return false;
      if (dateFrom && r.issuedAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.issuedAt.slice(0, 10) > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.number} ${r.object} ${r.place} ${r.contractor} ${r.issuedBy} ${r.reason}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, filterObject, filterContractor, dateFrom, dateTo, search]);

  const rowObjects = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.object && set.add(r.object));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const rowContractors = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.contractor && set.add(r.contractor));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    ...(tabs.prescriptions ? [{ id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList" }] : []),
    ...(tabs.inspections ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    ...(tabs.incidents ? [{ id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert" }] : []),
    ...(tabs.tasks ? [{ id: "tasks" as Tab, label: "Задачи", icon: "ListChecks" }] : []),
    ...(tabs.headcount ? [{ id: "headcount" as Tab, label: "ЧеловекоЧасы", icon: "Users" }] : []),
    ...(tabs.fines ? [{ id: "fines" as Tab, label: "Штрафы", icon: "Banknote" }] : []),
    { id: "suspensions", label: "Приостановки", icon: "OctagonPause" },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <button
          onClick={() => onTabChange?.("dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Logo size={28} />
          <span className="text-sm font-semibold tracking-tight">SafeWork</span>
        </button>
        <UserMenu user={user} onLogout={onLogout} />
      </header>

      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2 overflow-x-auto">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange?.(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={t.icon as never} size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">Приостановки</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Всего: {rows.length} · Приостановлено: {rows.filter(r => r.status === "Приостановлено").length}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Icon name="Plus" size={15} />
              Выдать акт о приостановке
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по номеру, объекту, подрядчику..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onReset={() => { setDateFrom(""); setDateTo(""); }}
          />
          <FilterDropdown label="Объект" options={rowObjects} value={filterObject} onChange={setFilterObject} />
          <FilterDropdown label="Подрядчик" options={rowContractors} value={filterContractor} onChange={setFilterContractor} />
          <FilterDropdown label="Статус" options={ALL_SUSPENSION_STATUSES} value={filterStatus} onChange={setFilterStatus} />
          {(filterStatus.length > 0 || filterObject.length > 0 || filterContractor.length > 0 || dateFrom || dateTo || search) && (
            <button
              onClick={() => { setFilterStatus([]); setFilterObject([]); setFilterContractor([]); setDateFrom(""); setDateTo(""); setSearch(""); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Icon name="X" size={11} /> Сбросить всё
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Загрузка приостановок...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="OctagonPause" size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Приостановки не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap">Дата выдачи</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Объект</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Место нарушения</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Подрядная организация</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Приостановил</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Причина приостановки</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
                    <th className="px-5 py-3 w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map(r => (
                    <tr
                      key={r.id}
                      id={`suspension-row-${r.number}`}
                      className={`hover:bg-secondary/30 transition-colors group ${highlightNumber === r.number ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : ""}`}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-primary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.number}</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(r.issuedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground max-w-[220px]">{r.object}</td>
                      <td className="px-5 py-4 text-foreground max-w-[180px]">{r.place}</td>
                      <td className="px-5 py-4 text-foreground">{r.contractor}</td>
                      <td className="px-5 py-4 text-muted-foreground max-w-[200px]">{r.issuedBy}</td>
                      <td className="px-5 py-4 text-muted-foreground max-w-[260px]">
                        <p className="line-clamp-2">{r.reason}</p>
                      </td>
                      <td className="px-5 py-4">
                        {canEdit ? (
                          <select
                            value={r.status}
                            onChange={e => changeStatus(r, e.target.value as SuspensionStatus)}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded border bg-transparent cursor-pointer ${SUSPENSION_STATUS_STYLE[r.status]}`}
                          >
                            {ALL_SUSPENSION_STATUSES.map(s => <option key={s} value={s} className="bg-card text-foreground">{s}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${SUSPENSION_STATUS_STYLE[r.status]}`}>
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => printSuspension(r, activeTemplate)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100"
                          title="Распечатать акт"
                        >
                          <Icon name="Printer" size={13} />
                          Печать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <SuspensionForm
          onClose={() => setShowForm(false)}
          onSave={addSuspension}
          user={user}
        />
      )}
    </div>
  );
}