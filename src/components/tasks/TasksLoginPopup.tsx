import { TaskAssignment } from "@/lib/taskTypes";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface TasksLoginPopupProps {
  user: AppUser;
  taskAssignments: TaskAssignment[];
  onClose: () => void;
  onTaskClick: (taskId: number) => void;
}

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const IN_PROGRESS_STATUSES = ["active", "revision", "pending_report", "extension_pending"];

function TaskRow({ a, onClick, highlightColor }: { a: TaskAssignment; onClick: () => void; highlightColor: string }) {
  return (
    <div onClick={onClick} className="flex items-start gap-2.5 cursor-pointer hover:bg-muted/40 rounded-lg px-2.5 py-2 transition-colors -mx-2.5">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${highlightColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug truncate">{a.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Срок: {fmtDate(a.due_date)}</p>
      </div>
      <Icon name="ChevronRight" size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
    </div>
  );
}

export default function TasksLoginPopup({ user, taskAssignments, onClose, onTaskClick }: TasksLoginPopupProps) {
  const myTasks = taskAssignments.filter(a => a.assignee_login === user.login);

  const overdueTasks = myTasks
    .filter(a => a.status === "overdue")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const inProgress = myTasks.filter(a => IN_PROGRESS_STATUSES.includes(a.status));

  const dueSoonTasks = inProgress
    .filter(a => daysUntil(a.due_date) <= 4)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const dueSoonIds = new Set(dueSoonTasks.map(a => a.id));
  const activeTasks = inProgress
    .filter(a => !dueSoonIds.has(a.id))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const totalCount = overdueTasks.length + dueSoonTasks.length + activeTasks.length;
  if (totalCount === 0) return null;

  const sections = [
    { key: "overdue", title: "Просроченные", icon: "AlertCircle", color: "text-red-400", dot: "bg-red-500", tasks: overdueTasks },
    { key: "dueSoon", title: "Срок менее 4 дней", icon: "Clock", color: "text-yellow-400", dot: "bg-yellow-500", tasks: dueSoonTasks },
    { key: "active", title: "В работе", icon: "ListChecks", color: "text-blue-400", dot: "bg-blue-500", tasks: activeTasks },
  ].filter(s => s.tasks.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold">Ваши задачи</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Всего активных задач: {totalCount}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sections.map(s => (
            <div key={s.key}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2 ${s.color}`}>
                <Icon name={s.icon as never} size={13} />
                {s.title} ({s.tasks.length})
              </div>
              <div className="space-y-0.5">
                {s.tasks.map(a => (
                  <TaskRow key={a.id} a={a} onClick={() => onTaskClick(a.id)} highlightColor={s.dot} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
