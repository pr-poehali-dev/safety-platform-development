import { useState, useEffect } from "react";
import { TaskAssignment, TaskComment } from "@/lib/taskTypes";
import { AppUser } from "@/lib/auth";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";
import RoutineWeekPanel from "./RoutineWeekPanel";
import TasksFilters from "./TasksFilters";
import TasksBulkBar from "./TasksBulkBar";
import TasksManagerTable, { TasksCardList } from "./TasksManagerTable";
import TaskDeleteConfirm from "./TaskDeleteConfirm";
import { STATUS_FILTERS, FILTER_STATUSES } from "./tasksShared";
import Icon from "@/components/ui/icon";

interface TasksBlockProps {
  user: AppUser;
  availableUsers: { login: string; name: string; role: string }[];
  assignments: TaskAssignment[];
  loading: boolean;
  initialFilter?: string;
  initialTaskId?: number;
  onCreateTask: (description: string, assignees: { login: string; name: string; role: string; due_date: string }[]) => Promise<void>;
  onUpdateTask: (task_id: number, description: string, assignees: { login: string; name: string; assignment_id?: number; due_date: string }[]) => Promise<void>;
  onDeleteTask: (task_id: number) => Promise<void>;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  onSendComment: (assignment_id: number, message: string) => Promise<void>;
  onFetchComments: (assignment_id: number) => Promise<TaskComment[]>;
}

export default function TasksBlock({ user, availableUsers, assignments, loading, initialFilter, initialTaskId, onCreateTask, onUpdateTask, onDeleteTask, onAction, onSendComment, onFetchComments }: TasksBlockProps) {

  const [selected, setSelected] = useState<TaskAssignment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskAssignment | null>(null);

  const [statusFilter, setStatusFilter] = useState(initialFilter ?? "all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (initialTaskId && assignments.length > 0) {
      const found = assignments.find(a => a.id === initialTaskId);
      if (found) setSelected(found);
    }
  }, [initialTaskId, assignments]);

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showBulkDate, setShowBulkDate] = useState(false);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<TaskAssignment | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const isManager = user.role === "manager";
  const isAdmin = user.role === "admin";
  const isSpecialist = user.role === "specialist";
  const canCreate = isManager || isSpecialist || isAdmin;

  const filtered = assignments.filter(a => {
    if (statusFilter !== "all") {
      const allowed = FILTER_STATUSES[statusFilter] ?? [statusFilter];
      if (!allowed.includes(a.status)) return false;
    }
    if (assigneeFilter && a.assignee_login !== assigneeFilter) return false;
    if (search && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const uniqueAssignees = Array.from(
    new Map(assignments.map(a => [a.assignee_login, a.assignee_name])).entries()
  ).map(([login, name]) => ({ login, name }));

  const toggleCheck = (id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map(a => a.id)));
    }
  };

  const handleBulkClose = async () => {
    setBulkSaving(true);
    setBulkError("");
    try {
      await onAction({ action: "bulk_close", assignment_ids: Array.from(checkedIds) });
      setCheckedIds(new Set());
    } catch {
      setBulkError("Не удалось закрыть выбранные задачи. Попробуйте ещё раз.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkExtend = async () => {
    if (!bulkDate) return;
    setBulkSaving(true);
    setBulkError("");
    try {
      await onAction({ action: "bulk_extend", assignment_ids: Array.from(checkedIds), new_date: bulkDate });
      setCheckedIds(new Set());
      setShowBulkDate(false);
      setBulkDate("");
    } catch {
      setBulkError("Не удалось продлить выбранные задачи. Попробуйте ещё раз.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDelete = async (a: TaskAssignment) => {
    setDeleteError("");
    try {
      await onDeleteTask(a.task_id);
      setConfirmDelete(null);
      if (selected?.task_id === a.task_id) setSelected(null);
    } catch {
      setDeleteError("Не удалось удалить задачу. Попробуйте ещё раз.");
    }
  };

  const pendingCount = assignments.filter(a => (FILTER_STATUSES.pending ?? []).includes(a.status)).length;
  const overdueCount = assignments.filter(a => a.status === "overdue").length;

  return (
    <div className="space-y-4">
      {/* Шапка блока */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Icon name="ListChecks" size={16} className="text-primary" />
            Задачи
          </h2>
          {overdueCount > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/20 text-red-400">
              {overdueCount} просрочено
            </span>
          )}

        </div>
        {canCreate && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Icon name="Plus" size={14} /> Добавить задачу
          </button>
        )}
      </div>

      {/* Фильтры (руководитель/admin/подрядчик — над общим списком) */}
      {!isSpecialist && (
        <TasksFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          uniqueAssignees={uniqueAssignees}
          showAssigneeFilter={isManager || isAdmin}
        />
      )}

      {/* Массовые действия (только руководитель/admin) */}
      {(isManager || isAdmin) && checkedIds.size > 0 && (
        <TasksBulkBar
          checkedCount={checkedIds.size}
          bulkError={bulkError}
          bulkSaving={bulkSaving}
          showBulkDate={showBulkDate}
          bulkDate={bulkDate}
          onBulkDateChange={setBulkDate}
          onToggleBulkDate={() => setShowBulkDate(v => !v)}
          onBulkClose={handleBulkClose}
          onBulkExtend={handleBulkExtend}
          onClearSelection={() => setCheckedIds(new Set())}
        />
      )}

      {/* Таблица для руководителя/admin */}
      {(isManager || isAdmin) && (
        <TasksManagerTable
          loading={loading}
          filtered={filtered}
          checkedIds={checkedIds}
          onToggleAll={toggleAll}
          onToggleCheck={toggleCheck}
          onSelect={setSelected}
        />
      )}

      {/* Специалист ОТ: двухколоночный макет — задачи от руководителя + рутина */}
      {isSpecialist && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Левая колонка: задачи от руководителя */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Задачи от руководителя</h3>

            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full text-sm bg-muted/40 border border-border rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Поиск по задаче..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="text-sm bg-muted/40 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <TasksCardList loading={loading} filtered={filtered} onSelect={setSelected} />
          </div>

          {/* Правая колонка: рутина */}
          <div className="lg:border-l lg:border-border lg:pl-6">
            <RoutineWeekPanel user={user} />
          </div>
        </div>
      )}

      {/* Список для подрядчика и проектной команды */}
      {(user.role === "contractor" || user.role === "project_team") && (
        <TasksCardList loading={loading} filtered={filtered} onSelect={setSelected} />
      )}

      {/* Детальная карточка */}
      {selected && (
        <TaskCard
          assignment={selected}
          user={user}
          onClose={() => setSelected(null)}
          onAction={async (payload) => {
            await onAction(payload);
            setSelected(null);
          }}
          onSendComment={onSendComment}
          fetchComments={onFetchComments}
          allUsers={availableUsers}
          onEdit={canCreate ? () => { setEditing(selected); setShowForm(true); setSelected(null); } : undefined}
          onDelete={canCreate ? () => { setConfirmDelete(selected); setSelected(null); } : undefined}
        />
      )}

      {/* Форма создания/редактирования */}
      {showForm && (
        <TaskForm
          user={user}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={onCreateTask}
          onUpdate={onUpdateTask}
          editing={editing}
          availableUsers={availableUsers}
        />
      )}

      {/* Подтверждение удаления */}
      {confirmDelete && (
        <TaskDeleteConfirm
          task={confirmDelete}
          deleteError={deleteError}
          onCancel={() => { setConfirmDelete(null); setDeleteError(""); }}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  );
}
