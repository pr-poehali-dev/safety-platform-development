import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import { Template } from "@/lib/template";
import { Prescription, Status } from "@/lib/prescriptionTypes";
import { PrescriptionListHeader } from "@/components/prescriptions/list/PrescriptionListHeader";
import { PrescriptionListFilters } from "@/components/prescriptions/list/PrescriptionListFilters";
import { PrescriptionListTable } from "@/components/prescriptions/list/PrescriptionListTable";
import { VisibilitySettings } from "@/lib/visibilityTypes";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const PAGE_SIZE = 50;

interface PrescriptionListProps {
  user: AppUser;
  onLogout: () => void;
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
  onHeadcountClick?: () => void;
  onFinesClick?: () => void;
  onSuspensionsClick?: () => void;
  onStatusChange?: (p: Prescription, status: Status) => void;
  activeTab?: string;
  visibility?: VisibilitySettings;
}

export function PrescriptionList({
  user, onLogout, search, filterStatus, filterMine, filterSuspended,
  filterObject, filterContractor, filterInspector, dateFrom, dateTo,
  canEdit, isContractor, activeTemplate,
  onSearchChange, onFilterChange, onFilterMineChange, onFilterSuspendedChange,
  onFilterObjectChange, onFilterContractorChange, onFilterInspectorChange, onDateFromChange, onDateToChange,
  onSelect, onAddClick, onInspectionsClick,
  onDashboardClick, onIncidentsClick, onTasksClick, onHeadcountClick, onFinesClick, onSuspensionsClick, onStatusChange, activeTab = "prescriptions",
  visibility,
}: PrescriptionListProps) {

  const [colFilters, setColFilters] = useState({
    deadline: "Все",
  });
  const [objects, setObjects] = useState<{ id: number; name: string }[]>([]);
  const [items, setItems] = useState<Prescription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ objects: string[]; contractors: string[]; inspectors: string[]; deadlines: string[] }>({
    objects: [], contractors: [], inspectors: [], deadlines: [],
  });

  useEffect(() => {
    if (user.role !== "project_team") return;
    fetch(OBJECTS_API)
      .then(r => r.json())
      .then(data => setObjects(Array.isArray(data) ? data.map((o: { id: number; name: string }) => ({ id: o.id, name: o.name })) : []))
      .catch(() => {});
  }, [user.role]);

  useEffect(() => {
    fetch(`${API}?type=meta`)
      .then(r => r.json())
      .then(data => setMeta({
        objects: Array.isArray(data.objects) ? data.objects : [],
        contractors: Array.isArray(data.contractors) ? data.contractors : [],
        inspectors: Array.isArray(data.inspectors) ? data.inspectors : [],
        deadlines: Array.isArray(data.deadlines) ? data.deadlines : [],
      }))
      .catch(() => {});
  }, []);

  const setColFilter = (key: keyof typeof colFilters) => (v: string) =>
    setColFilters(prev => ({ ...prev, [key]: v }));

  const isProjectTeam = user.role === "project_team";
  const objectIdsKey = (user.objectIds ?? []).join(",");
  const myObjectNames = useMemo(
    () => new Set(objects.filter(o => (user.objectIds ?? []).includes(o.id)).map(o => o.name)),
    [objects, objectIdsKey],
  );

  // Сбрасываем на первую страницу при любом изменении фильтров/поиска
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterMine, filterSuspended, filterObject, filterContractor, filterInspector, dateFrom, dateTo, colFilters.deadline]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    if (search.trim()) params.set("search", search.trim());
    if (filterStatus.length) params.set("status", filterStatus.join("|"));
    if (filterSuspended) params.set("suspended", "1");
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (colFilters.deadline !== "Все") params.set("deadline", colFilters.deadline);

    if (isContractor && user.contractor) {
      params.set("contractor", user.contractor);
    } else if (filterContractor.length) {
      params.set("contractor", filterContractor.join("|"));
    }

    if (isProjectTeam) {
      const effective = filterObject.length
        ? filterObject.filter(o => myObjectNames.has(o))
        : Array.from(myObjectNames);
      params.set("object", effective.length ? effective.join("|") : "__none__");
    } else if (filterObject.length) {
      params.set("object", filterObject.join("|"));
    }

    if (filterInspector.length) params.set("inspector", filterInspector.join("|"));
    if (filterMine && !isContractor && !isProjectTeam) params.set("created_by", user.login);

    fetch(`${API}?${params}`)
      .then(r => r.json())
      .then(data => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, filterStatus, filterSuspended, dateFrom, dateTo, colFilters.deadline, isContractor, user.contractor, filterContractor, isProjectTeam, filterObject, myObjectNames, filterInspector, filterMine, user.login]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, search ? 350 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [load]);

  const handleStatusChange = (p: Prescription, status: Status) => {
    onStatusChange?.(p, status);
    // Обновляем строку локально, чтобы не ждать перезагрузки списка
    setItems(prev => prev.map(x => x.id === p.id ? { ...x, remarks: x.remarks.map(r => ({ ...r, status })) } : x));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      <PrescriptionListHeader
        user={user}
        onLogout={onLogout}
        onInspectionsClick={onInspectionsClick}
        onDashboardClick={onDashboardClick}
        onIncidentsClick={onIncidentsClick}
        onTasksClick={onTasksClick}
        onHeadcountClick={onHeadcountClick}
        onFinesClick={onFinesClick}
        onSuspensionsClick={onSuspensionsClick}
        activeTab={activeTab}
        visibility={visibility}
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
                : <>Всего: {total}</>
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
          objects={meta.objects}
          contractors={meta.contractors}
          inspectors={meta.inspectors}
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
          filteredCount={total}
        />

        <PrescriptionListTable
          user={user}
          loading={loading}
          filtered={items}
          search={search}
          uniqueDeadlines={meta.deadlines}
          colFilterDeadline={colFilters.deadline}
          onColFilterDeadlineChange={setColFilter("deadline")}
          activeTemplate={activeTemplate}
          onSelect={onSelect}
          onStatusChange={handleStatusChange}
        />

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && setPage(p => p - 1)}
                  className={page === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .map((n, idx, arr) => (
                  <span key={n} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1.5 text-muted-foreground text-xs">…</span>}
                    <PaginationItem>
                      <PaginationLink isActive={n === page} onClick={() => setPage(n)} className="cursor-pointer">
                        {n}
                      </PaginationLink>
                    </PaginationItem>
                  </span>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => page < totalPages && setPage(p => p + 1)}
                  className={page === totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </main>
    </div>
  );
}