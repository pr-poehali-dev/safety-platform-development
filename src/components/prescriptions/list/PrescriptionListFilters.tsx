import Icon from "@/components/ui/icon";
import { Prescription } from "@/lib/prescriptionTypes";
import FilterDropdown from "@/components/inspections/FilterDropdown";
import DateRangePicker from "@/components/ui/date-range-picker";
import { StatusMultiSelect } from "@/components/prescriptions/list/PrescriptionListFilterHelpers";

interface PrescriptionListFiltersProps {
  prescriptions: Prescription[];
  search: string;
  filterStatus: string[];
  filterMine: boolean;
  filterSuspended: boolean;
  filterObject: string[];
  filterContractor: string[];
  filterInspector: string[];
  dateFrom: string;
  dateTo: string;
  isContractor: boolean;
  isProjectTeam: boolean;
  onSearchChange: (v: string) => void;
  onFilterChange: (v: string[]) => void;
  onFilterMineChange: (v: boolean) => void;
  onFilterSuspendedChange: (v: boolean) => void;
  onFilterObjectChange: (v: string[]) => void;
  onFilterContractorChange: (v: string[]) => void;
  onFilterInspectorChange: (v: string[]) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  filteredCount: number;
}

export function PrescriptionListFilters({
  prescriptions, search, filterStatus, filterMine, filterSuspended,
  filterObject, filterContractor, filterInspector, dateFrom, dateTo,
  isContractor, isProjectTeam,
  onSearchChange, onFilterChange, onFilterMineChange, onFilterSuspendedChange,
  onFilterObjectChange, onFilterContractorChange, onFilterInspectorChange, onDateFromChange, onDateToChange,
  filteredCount,
}: PrescriptionListFiltersProps) {
  const uniqueObjects = [...new Set(prescriptions.map(p => p.object))].sort();
  const uniqueContractors = [...new Set(prescriptions.map(p => p.contractor).filter(Boolean))].sort();
  const uniqueInspectors = [...new Set(prescriptions.map(p => p.inspector).filter(Boolean))].sort();

  return (
    <>
      {/* Поиск */}
      <div className="relative max-w-sm">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск по номеру, объекту, подрядчику..."
          className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
        <Icon name="Filter" size={14} className="text-muted-foreground flex-shrink-0" />
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={onDateFromChange}
          onToChange={onDateToChange}
          onReset={() => { onDateFromChange(""); onDateToChange(""); }}
        />
        <div className="w-px h-4 bg-border" />
        <StatusMultiSelect value={filterStatus} onChange={onFilterChange} />
        <FilterDropdown label="Объект" options={uniqueObjects} value={filterObject} onChange={onFilterObjectChange} />
        <FilterDropdown label="Подрядчик" options={uniqueContractors} value={filterContractor} onChange={onFilterContractorChange} />
        <FilterDropdown label="Выдал" options={uniqueInspectors} value={filterInspector} onChange={onFilterInspectorChange} />
        <button
          onClick={() => onFilterSuspendedChange(!filterSuspended)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${filterSuspended ? "border-red-500 bg-red-500/10 text-red-400" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="OctagonX" size={12} />
          Приостановлено
        </button>
        {!isContractor && !isProjectTeam && (
          <button
            onClick={() => onFilterMineChange(!filterMine)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${filterMine ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="User" size={12} />
            Мои
          </button>
        )}
        {(dateFrom || dateTo || filterStatus.length > 0 || filterObject.length > 0 || filterContractor.length > 0 || filterInspector.length > 0 || filterSuspended || filterMine) && (
          <button
            onClick={() => {
              onDateFromChange(""); onDateToChange(""); onFilterChange([]);
              onFilterObjectChange([]); onFilterContractorChange([]); onFilterInspectorChange([]);
              onFilterSuspendedChange(false); onFilterMineChange(false);
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Icon name="X" size={11} />
            Сбросить
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filteredCount} записей</span>
      </div>
    </>
  );
}