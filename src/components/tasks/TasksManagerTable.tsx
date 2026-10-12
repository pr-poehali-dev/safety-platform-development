import { TaskAssignment, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/taskTypes";
import Icon from "@/components/ui/icon";
import { fmt } from "./tasksShared";

interface TasksManagerTableProps {
  loading: boolean;
  filtered: TaskAssignment[];
  checkedIds: Set<number>;
  onToggleAll: () => void;
  onToggleCheck: (id: number) => void;
  onSelect: (a: TaskAssignment) => void;
}

interface TasksCardListProps {
  loading: boolean;
  filtered: TaskAssignment[];
  onSelect: (a: TaskAssignment) => void;
}

export function TasksCardList({ loading, filtered, onSelect }: TasksCardListProps) {
  return (
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
              onClick={() => onSelect(a)}
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
  );
}

export default function TasksManagerTable({
  loading, filtered, checkedIds, onToggleAll, onToggleCheck, onSelect,
}: TasksManagerTableProps) {
  return (
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
                  onChange={onToggleAll}
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
                  onClick={() => onSelect(a)}
                  className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${isOverdue ? "bg-red-500/5" : ""}`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(a.id)}
                      onChange={() => onToggleCheck(a.id)}
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
  );
}