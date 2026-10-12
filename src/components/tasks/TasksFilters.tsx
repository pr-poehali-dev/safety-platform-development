import Icon from "@/components/ui/icon";
import { STATUS_FILTERS } from "./tasksShared";

interface TasksFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (v: string) => void;
  uniqueAssignees: { login: string; name: string }[];
  showAssigneeFilter: boolean;
}

export default function TasksFilters({
  search, onSearchChange, statusFilter, onStatusFilterChange,
  assigneeFilter, onAssigneeFilterChange, uniqueAssignees, showAssigneeFilter,
}: TasksFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full text-sm bg-muted/40 border border-border rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Поиск по задаче..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="text-sm bg-muted/40 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        value={statusFilter}
        onChange={e => onStatusFilterChange(e.target.value)}
      >
        {STATUS_FILTERS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {showAssigneeFilter && uniqueAssignees.length > 0 && (
        <select
          className="text-sm bg-muted/40 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          value={assigneeFilter}
          onChange={e => onAssigneeFilterChange(e.target.value)}
        >
          <option value="">Все исполнители</option>
          {uniqueAssignees.map(a => (
            <option key={a.login} value={a.login}>{a.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
