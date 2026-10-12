import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

export interface TaskHistoryEntry {
  event_type: string;
  old_value: string;
  new_value: string;
  comment: string;
  changed_by: string;
  changed_by_name: string;
  changed_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: "В работе",
  overdue: "Просрочена",
  extension_pending: "На согласовании продления",
  done: "Выполнена",
  revision: "Доработка",
  pending_report: "Отчёт на проверке",
};

const fmtDate = (v: string) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("ru-RU");
};

const fmtDt = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function describe(e: TaskHistoryEntry): { icon: string; color: string; text: string } {
  switch (e.event_type) {
    case "created": return { icon: "PlusCircle", color: "text-primary", text: `Задача создана, срок ${fmtDate(e.new_value)}` };
    case "due_date_changed": return { icon: "CalendarClock", color: "text-yellow-400", text: `Срок изменён: ${fmtDate(e.old_value)} → ${fmtDate(e.new_value)}` };
    case "status_changed": return { icon: "RefreshCw", color: "text-blue-400", text: `Статус: ${STATUS_LABELS[e.old_value] ?? (e.old_value || "—")} → ${STATUS_LABELS[e.new_value] ?? e.new_value}` };
    case "description_changed": return { icon: "Pencil", color: "text-foreground", text: `Текст задачи изменён: «${e.old_value}» → «${e.new_value}»` };
    case "extension_requested": return { icon: "Clock", color: "text-yellow-400", text: `Запрошено продление срока до ${fmtDate(e.new_value)}` };
    case "extension_accepted": return { icon: "CheckCircle", color: "text-green-400", text: `Продление согласовано: ${fmtDate(e.old_value)} → ${fmtDate(e.new_value)}` };
    case "extension_rejected": return { icon: "XCircle", color: "text-red-400", text: "Продление отклонено" };
    case "report_submitted": return { icon: "FileText", color: "text-purple-400", text: "Подан отчёт" };
    case "report_accepted": return { icon: "CheckCircle", color: "text-green-400", text: "Отчёт принят" };
    case "report_rejected": return { icon: "RotateCcw", color: "text-orange-400", text: "Отчёт отправлен на доработку" };
    case "completed_self": return { icon: "CheckCircle", color: "text-green-400", text: "Самозадача выполнена" };
    case "reassigned": return { icon: "UserCog", color: "text-foreground", text: `Задача передана: ${e.new_value}` };
    default: return { icon: "Circle", color: "text-muted-foreground", text: e.event_type };
  }
}

export default function TaskHistoryBlock({ assignmentId, refreshKey, fetchHistory }: {
  assignmentId: number;
  refreshKey: string;
  fetchHistory: (assignment_id: number) => Promise<TaskHistoryEntry[]>;
}) {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHistory(assignmentId)
      .then(d => setEntries(Array.isArray(d) ? d : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [assignmentId, refreshKey]);

  return (
    <div className="px-5 py-4 border-b border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Icon name="History" size={13} />
        История изменений задачи
      </p>
      {loading && <p className="text-xs text-muted-foreground">Загрузка...</p>}
      {!loading && entries.length === 0 && <p className="text-xs text-muted-foreground">Записей пока нет</p>}
      <div className="space-y-3">
        {entries.map((e, i) => {
          const d = describe(e);
          return (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <Icon name={d.icon} size={14} className={`${d.color} mt-0.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground break-words">{d.text}</p>
                {e.comment && <p className="text-muted-foreground mt-0.5 break-words">«{e.comment}»</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {e.changed_by_name || e.changed_by || "Система"} · {fmtDt(e.changed_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
