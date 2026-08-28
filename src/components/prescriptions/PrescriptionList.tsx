import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import { Template } from "@/lib/template";
import {
  Prescription, Status, overallStatus,
} from "@/lib/prescriptionTypes";
import { PrescriptionListHeader } from "@/components/prescriptions/list/PrescriptionListHeader";
import { PrescriptionListFilters } from "@/components/prescriptions/list/PrescriptionListFilters";
import { PrescriptionListTable } from "@/components/prescriptions/list/PrescriptionListTable";
import { useState, useEffect } from "react";

const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";

function parsePresDate(str: string): Date | null {
  if (!str) return null;
  if (str.includes("-")) return new Date(str);
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

interface PrescriptionListProps {
  user: AppUser;
  onLogout: () => void;
  prescriptions: Prescription[];
  loading: boolean;
  search: string;
  filterStatus: string[];
  filterMine: boolean;
  filterSuspended: boolean;
  filterObject: string[];
  filterContractor: string[];
  filterInspector: string[];
  dateFrom: string;
  dateTo: string;
  canEdit: boolean;
  isContractor: boolean;
  activeTemplate: Template;
  onSearchChange: (v: string) => void;
  onFilterChange: (v: string[]) => void;
  onFilterMineChange: (v: boolean) => void;
  onFilterSuspendedChange: (v: boolean) => void;
  onFilterObjectChange: (v: string[]) => void;
  onFilterContractorChange: (v: string[]) => void;
  onFilterInspectorChange: (v: string[]) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSelect: (p: Prescription) => void;
  onAddClick: () => void;
  onInspectionsClick?: () => void;
  onDashboardClick?: () => void;
  onIncidentsClick?: () => void;
  onTasksClick?: () => void;
  onStatusChange?: (p: Prescription, status: Status) => void;
  activeTab?: string;
}

export function PrescriptionList({
  user, onLogout, prescriptions, loading, search, filterStatus, filterMine, filterSuspended,
  filterObject, filterContractor, filterInspector, dateFrom, dateTo,
  canEdit, isContractor, activeTemplate,
  onSearchChange, onFilterChange, onFilterMineChange, onFilterSuspendedChange,
  onFilterObjectChange, onFilterContractorChange, onFilterInspectorChange, onDateFromChange, onDateToChange,
  onSelect, onAddClick, onInspectionsClick,
  onDashboardClick, onIncidentsClick, onTasksClick, onStatusChange, activeTab = "prescriptions",
}: PrescriptionListProps) {

  const [colFilters, setColFilters] = useState({
    deadline: "Все",
  });
  const [objects, setObjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (user.role !== "project_team") return;
    fetch(OBJECTS_API)
      .then(r => r.json())
      .then(data => setObjects(Array.isArray(data) ? data.map((o: { id: number; name: string }) => ({ id: o.id, name: o.name })) : []))
      .catch(() => {});
  }, [user.role]);

  const setColFilter = (key: keyof typeof colFilters) => (v: string) =>
    setColFilters(prev => ({ ...prev, [key]: v }));

  const uniqueDeadlines = [...new Set(prescriptions.flatMap(p => p.remarks.map(r => r.deadline)).filter(Boolean))].sort();

  const isProjectTeam = user.role === "project_team";
  const myObjectNames = new Set(objects.filter(o => (user.objectIds ?? []).includes(o.id)).map(o => o.name));

  const filtered = prescriptions.filter(p => {
    if (isContractor && user.contractor && p.contractor !== user.contractor) return false;
    if (isProjectTeam && !myObjectNames.has(p.object)) return false;
    if (filterMine && p.createdBy !== user.login) return false;
    if (filterSuspended && !(p.remarks || []).some(r => r.work_suspended)) return false;
    const status = overallStatus(p.remarks);
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(status);
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.number.toLowerCase().includes(q) ||
      p.object.toLowerCase().includes(q) ||
      p.contractor.toLowerCase().includes(q) ||
      p.remarks.some(r => r.description.toLowerCase().includes(q));
    const nearestDeadline = p.remarks.map(r => r.deadline).sort()[0];
    const matchColDeadline = colFilters.deadline === "Все" || nearestDeadline === colFilters.deadline;
    const matchObject = filterObject.length === 0 || filterObject.includes(p.object);
    const matchContractor = filterContractor.length === 0 || filterContractor.includes(p.contractor);
    const matchInspector = filterInspector.length === 0 || filterInspector.includes(p.inspector);
    const pDate = parsePresDate(p.date);
    const matchDateFrom = !dateFrom || (pDate && pDate >= new Date(dateFrom));
    const matchDateTo = !dateTo || (pDate && pDate <= new Date(dateTo + "T23:59:59"));
    return matchStatus && matchSearch && matchColDeadline && matchObject && matchContractor && matchInspector && matchDateFrom && matchDateTo;
  });

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      <PrescriptionListHeader
        user={user}
        onLogout={onLogout}
        onInspectionsClick={onInspectionsClick}
        onDashboardClick={onDashboardClick}
        onIncidentsClick={onIncidentsClick}
        onTasksClick={onTasksClick}
        activeTab={activeTab}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Предписания</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isContractor
                ? <>Организация: <span className="text-foreground">{user.contractor}</span> · Показаны только ваши предписания</>
                : isProjectTeam
                ? <>Показаны предписания по вашим объектам ({myObjectNames.size})</>
                : <>Всего: {prescriptions.length} · Активных: {prescriptions.filter(p => overallStatus(p.remarks) === "В работе").length} · Просрочено: {prescriptions.filter(p => overallStatus(p.remarks) === "Просрочено").length}</>
              }
            </p>
          </div>
          {canEdit && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium self-start sm:self-auto"
            >
              <Icon name="Plus" size={15} />
              Добавить предписание
            </button>
          )}
        </div>

        <PrescriptionListFilters
          prescriptions={prescriptions}
          search={search}
          filterStatus={filterStatus}
          filterMine={filterMine}
          filterSuspended={filterSuspended}
          filterObject={filterObject}
          filterContractor={filterContractor}
          filterInspector={filterInspector}
          dateFrom={dateFrom}
          dateTo={dateTo}
          isContractor={isContractor}
          isProjectTeam={isProjectTeam}
          onSearchChange={onSearchChange}
          onFilterChange={onFilterChange}
          onFilterMineChange={onFilterMineChange}
          onFilterSuspendedChange={onFilterSuspendedChange}
          onFilterObjectChange={onFilterObjectChange}
          onFilterContractorChange={onFilterContractorChange}
          onFilterInspectorChange={onFilterInspectorChange}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          filteredCount={filtered.length}
        />

        <PrescriptionListTable
          user={user}
          loading={loading}
          filtered={filtered}
          search={search}
          uniqueDeadlines={uniqueDeadlines}
          colFilterDeadline={colFilters.deadline}
          onColFilterDeadlineChange={setColFilter("deadline")}
          activeTemplate={activeTemplate}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
        />
      </main>
    </div>
  );
}
