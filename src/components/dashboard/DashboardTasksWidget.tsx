import { TaskAssignment, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/taskTypes";
import Icon from "@/components/ui/icon";

interface DashboardTasksWidgetProps {
  taskAssignments: TaskAssignment[];
  onNavigateToTasks?: (filter?: string, taskId?: number) => void;
}

const BADGES = [
  {
    filter: "overdue",
    label: "Просрочено",
    icon: "AlertCircle",
    activeColor: "bg-red-500/10 border-red-500/30",
    iconColor: "bg-red-500",
    textColor: "text-red-400",
    statuses: ["overdue"],
  },
  {
    filter: "pending",
    label: "На согласовании",
    icon: "Clock",
    activeColor: "bg-yellow-500/10 border-yellow-500/30",
    iconColor: "bg-yellow-500",
    textColor: "text-yellow-400",
    statuses: ["extension_pending", "pending_report"],
  },
  {
    filter: "active",
    label: "В работе",
    icon: "ListChecks",
    activeColor: "bg-blue-500/10 border-blue-500/30",
    iconColor: "bg-blue-500",
    textColor: "text-blue-400",
    statuses: ["active", "revision"],
  },
  {
    filter: "done",
    label: "Выполнено",
    icon: "CheckCircle2",
    activeColor: "bg-green-500/10 border-green-500/30",
    iconColor: "bg-green-500",
    textColor: "text-green-400",
    statuses: ["done"],
  },
];

export default function DashboardTasksWidget({ taskAssignments, onNavigateToTasks }: DashboardTasksWidgetProps) {
  if (taskAssignments.length === 0) return null;

  const overdue = taskAssignments.filter(a => a.status === "overdue").length;
  const pending = taskAssignments.filter(a => ["extension_pending", "pending_report"].includes(a.status)).length;

  const badges = BADGES.map(b => ({
    ...b,
    count: taskAssignments.filter(a => b.statuses.includes(a.status)).length,
  }));

  const needsAttention = overdue > 0 || pending > 0 || taskAssignments.some(a => a.status === "revision");

  return (
    <div>
      <div className="flex items-center justify-between py-0 my-0">
        <h2 className="text-base font-semibold">Задачи</h2>
        {onNavigateToTasks && (
          <button onClick={() => onNavigateToTasks()} className="text-xs text-primary hover:opacity-80 transition-opacity flex items-center gap-1">
            Все задачи <Icon name="ChevronRight" size={12} />
          </button>
        )}
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {badges.map(b => (
            <div
              key={b.filter}
              onClick={() => onNavigateToTasks?.(b.filter)}
              className={`rounded-lg p-3 flex items-center gap-3 border cursor-pointer transition-all select-none ${
                b.count > 0
                  ? `${b.activeColor} hover:opacity-80`
                  : "bg-muted/30 border-transparent hover:bg-muted/50"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${b.count > 0 ? b.iconColor : "bg-muted"}`}>
                <Icon name={b.icon as never} size={15} className="text-white" />
              </div>
              <div>
                <p className={`text-lg font-bold leading-tight ${b.count > 0 ? b.textColor : ""}`}>{b.count}</p>
                <p className="text-xs text-muted-foreground">{b.label}</p>
              </div>
            </div>
          ))}
        </div>

        {needsAttention && (
          <div className="border-t border-border pt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Требуют действий</p>
            {taskAssignments
              .filter(a => ["overdue", "extension_pending", "pending_report", "revision"].includes(a.status))
              .slice(0, 3)
              .map(a => (
                <div key={a.id} onClick={() => onNavigateToTasks?.(undefined, a.id)} className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 rounded-lg px-2 py-1.5 transition-colors -mx-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${TASK_STATUS_COLORS[a.status]}`}>
                    {TASK_STATUS_LABELS[a.status]}
                  </span>
                  <p className="text-xs text-muted-foreground truncate flex-1">{a.description}</p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{a.assignee_name.split(" ")[0]}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
