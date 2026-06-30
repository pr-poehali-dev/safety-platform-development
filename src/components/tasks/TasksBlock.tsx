import { useState } from "react";
import { TaskAssignment, TaskComment, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/taskTypes";
import { AppUser } from "@/lib/auth";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";
import Icon from "@/components/ui/icon";

interface TasksBlockProps {
  user: AppUser;
  availableUsers: { login: string; name: string; role: string }[];
  assignments: TaskAssignment[];
  loading: boolean;
  onCreateTask: (description: string, assignees: { login: string; name: string; role: string; due_date: string }[]) => Promise<void>;
  onUpdateTask: (task_id: number, description: string, assignees: { login: string; name: string; assignment_id?: number; due_date: string }[]) => Promise<void>;
  onDeleteTask: (task_id: number) => Promise<void>;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  onSendComment: (assignment_id: number, message: string) => Promise<void>;
  onFetchComments: (assignment_id: number) => Promise<TaskComment[]>;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "В работе" },
  { value: "overdue", label: "Просроченные" },
  { value: "extension_pending", label: "На согласовании" },
  { value: "pending_report", label: "Отчёт на проверке" },
  { value: "revision", label: "Доработка" },
  { value: "done", label: "Выполненные" },
];

function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("ru-RU");
}

export default function TasksBlock({ user, availableUsers, assignments, loading, onCreateTask, onUpdateTask, onDeleteTask, onAction, onSendComment, onFetchComments }: TasksBlockProps) {

  const [selected, setSelected] = useState<TaskAssignment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskAssignment | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showBulkDate, setShowBulkDate] = useState(false);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<TaskAssignment | null>(null);

  const isManager = user.role === "manager";
  const isAdmin = user.role === "admin";
  const isSpecialist = user.role === "specialist";
  const canCreate = isManager || isSpecialist || isAdmin;

  const filtered = assignments.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
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
    await onAction({ action: "bulk_close", assignment_ids: Array.from(checkedIds) });
    setCheckedIds(new Set());
    setBulkSaving(false);
  };

  const handleBulkExtend = async () => {
    if (!bulkDate) return;
    setBulkSaving(true);
    await onAction({ action: "bulk_extend", assignment_ids: Array.from(checkedIds), new_date: bulkDate });
    setCheckedIds(new Set());
    setShowBulkDate(false);
    setBulkDate("");
    setBulkSaving(false);
  };

  const handleDelete = async (a: TaskAssignment) => {
    await onDeleteTask(a.task_id);
    setConfirmDelete(null);
    if (selected?.task_id === a.task_id) setSelected(null);
  };

  const pendingCount = assignments.filter(a => ["extension_pending", "pending_report"].includes(a.status)).length;
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

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
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

        {(isManager || isAdmin) && uniqueAssignees.length > 0 && (
          <select
            className="text-sm bg-muted/40 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
          >
            <option value="">Все исполнители</option>
            {uniqueAssignees.map(a => (
              <option key={a.login} value={a.login}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Массовые действия (только руководитель/admin) */}
      {(isManager || isAdmin) && checkedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm text-muted-foreground">Выбрано: {checkedIds.size}</span>
          <button
            disabled={bulkSaving}
            onClick={handleBulkClose}
            className="text-sm px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
          >
            Закрыть выбранные
          </button>
          <button
            onClick={() => setShowBulkDate(v => !v)}
            className="text-sm px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
          >
            Продлить срок
          </button>
          {showBulkDate && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="text-sm bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none"
                value={bulkDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setBulkDate(e.target.value)}
              />
              <button
                disabled={bulkSaving || !bulkDate}
                onClick={handleBulkExtend}
                className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                Применить
              </button>
            </div>
          )}
          <button
            onClick={() => setCheckedIds(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Снять выделение
          </button>
        </div>
      )}

      {/* Таблица для руководителя/admin */}
      {(isManager || isAdmin) && (
        <div className="border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="ListChecks" size={32} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Задач нет</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={checkedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Задача</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Ответственный</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Срок</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const isOverdue = a.status === "overdue";
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${isOverdue ? "bg-red-500/5" : ""}`}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checkedIds.has(a.id)}
                          onChange={() => toggleCheck(a.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="line-clamp-2 leading-snug">{a.description}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{a.assignee_name}</td>
                      <td className={`px-4 py-3 whitespace-nowrap font-medium ${isOverdue ? "text-red-400" : ""}`}>{fmt(a.due_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TASK_STATUS_COLORS[a.status] ?? ""}`}>
                          {TASK_STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Список для специалиста / подрядчика */}
      {(isSpecialist || user.role === "contractor") && (
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="ListChecks" size={32} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Задач нет</p>
            </div>
          ) : (
            filtered.map(a => {
              const isOverdue = a.status === "overdue";
              return (
                <div
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`border border-border rounded-xl px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${isOverdue ? "border-red-400/30 bg-red-500/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm line-clamp-2 flex-1">{a.description}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${TASK_STATUS_COLORS[a.status] ?? ""}`}>
                      {TASK_STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon name="Calendar" size={11} />
                      Срок: <span className={`font-medium ${isOverdue ? "text-red-400" : "text-foreground"}`}>{fmt(a.due_date)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="UserCheck" size={11} /> {a.created_by_name}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Icon name="Trash2" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Удалить задачу?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Это действие нельзя отменить</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{confirmDelete.description}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 text-sm py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                Отмена
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 text-sm py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}