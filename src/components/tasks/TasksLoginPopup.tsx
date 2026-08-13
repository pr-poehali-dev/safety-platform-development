import { useState, useEffect } from "react";
import { TaskAssignment } from "@/lib/taskTypes";
import { AppUser } from "@/lib/auth";
import { Prescription, DEADLINE_IMMEDIATE, overallStatus, effectiveStatus, Status } from "@/lib/prescriptionTypes";
import Icon from "@/components/ui/icon";

const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";

interface TasksLoginPopupProps {
  user: AppUser;
  taskAssignments: TaskAssignment[];
  prescriptions: Prescription[];
  onClose: () => void;
  onTaskClick: (taskId: number) => void;
  onPrescriptionClick: (prescriptionId: string) => void;
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

function parseDeadlineDate(deadline: string): Date | null {
  if (!deadline || deadline === DEADLINE_IMMEDIATE) return null;
  const [d, m, y] = deadline.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function daysUntilDate(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface RemarkInfo { days: number; label: string; }

function nearestRemarkInfo(p: Prescription, statuses: Status[]): RemarkInfo | null {
  const relevant = p.remarks.filter(r => statuses.includes(effectiveStatus(r)));
  let best: RemarkInfo | null = null;
  for (const r of relevant) {
    let days: number;
    let label: string;
    if (r.deadline === DEADLINE_IMMEDIATE) {
      days = 0;
      label = DEADLINE_IMMEDIATE;
    } else {
      const date = parseDeadlineDate(r.deadline);
      if (!date) continue;
      days = daysUntilDate(date);
      label = r.deadline;
    }
    if (!best || days < best.days) best = { days, label };
  }
  return best;
}

function getMyPrescriptions(prescriptions: Prescription[], user: AppUser, myObjectNames: string[]): Prescription[] {
  if (user.role === "contractor") return prescriptions.filter(p => p.contractor === user.contractor);
  if (user.role === "project_team") return prescriptions.filter(p => myObjectNames.includes(p.object));
  if (user.role === "specialist") return prescriptions.filter(p => p.createdBy === user.login);
  return prescriptions;
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

function PrescriptionRow({ p, info, onClick, highlightColor }: { p: Prescription; info: RemarkInfo | null; onClick: () => void; highlightColor: string }) {
  return (
    <div onClick={onClick} className="flex items-start gap-2.5 cursor-pointer hover:bg-muted/40 rounded-lg px-2.5 py-2 transition-colors -mx-2.5">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${highlightColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug truncate">{p.number} — {p.object}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{info ? `Срок устранения: ${info.label}` : p.contractor}</p>
      </div>
      <Icon name="ChevronRight" size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
    </div>
  );
}

export default function TasksLoginPopup({ user, taskAssignments, prescriptions, onClose, onTaskClick, onPrescriptionClick }: TasksLoginPopupProps) {
  const [myObjectNames, setMyObjectNames] = useState<string[]>([]);

  useEffect(() => {
    if (user.role !== "project_team") return;
    fetch(OBJECTS_API)
      .then(r => r.json())
      .then((objs: { id: number; name: string }[]) => {
        const ids = new Set(user.objectIds ?? []);
        setMyObjectNames(Array.isArray(objs) ? objs.filter(o => ids.has(o.id)).map(o => o.name) : []);
      })
      .catch(() => {});
  }, [user.role, user.objectIds]);

  const myTasks = taskAssignments.filter(a => a.assignee_login === user.login);

  const overdueTasks = myTasks
    .filter(a => a.status === "overdue")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const inProgress = myTasks.filter(a => IN_PROGRESS_STATUSES.includes(a.status));

  const dueSoonTasks = inProgress
    .filter(a => daysUntil(a.due_date) <= 4)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const dueSoonTaskIds = new Set(dueSoonTasks.map(a => a.id));
  const activeTasks = inProgress
    .filter(a => !dueSoonTaskIds.has(a.id))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const myPrescriptions = getMyPrescriptions(prescriptions, user, myObjectNames);

  const overduePrescriptions = myPrescriptions
    .filter(p => overallStatus(p.remarks) === "Просрочено")
    .map(p => ({ p, info: nearestRemarkInfo(p, ["Просрочено"]) }))
    .sort((a, b) => (a.info?.days ?? 0) - (b.info?.days ?? 0));

  const inProgressPrescriptions = myPrescriptions.filter(p => overallStatus(p.remarks) === "В работе");

  const dueSoonPrescriptionsRaw = inProgressPrescriptions
    .map(p => ({ p, info: nearestRemarkInfo(p, ["В работе"]) }))
    .filter(x => x.info !== null && x.info.days <= 3);

  const dueSoonPrescriptionIds = new Set(dueSoonPrescriptionsRaw.map(x => x.p.id));
  const dueSoonPrescriptions = dueSoonPrescriptionsRaw.sort((a, b) => (a.info?.days ?? 0) - (b.info?.days ?? 0));

  const activePrescriptions = inProgressPrescriptions
    .filter(p => !dueSoonPrescriptionIds.has(p.id))
    .map(p => ({ p, info: nearestRemarkInfo(p, ["В работе"]) }))
    .sort((a, b) => (a.info?.days ?? 999) - (b.info?.days ?? 999));

  const totalTasks = overdueTasks.length + dueSoonTasks.length + activeTasks.length;
  const totalPrescriptions = overduePrescriptions.length + dueSoonPrescriptions.length + activePrescriptions.length;
  const totalCount = totalTasks + totalPrescriptions;
  if (totalCount === 0) return null;

  const taskSections = [
    { key: "overdue", title: "Просроченные", icon: "AlertCircle", color: "text-red-400", dot: "bg-red-500", tasks: overdueTasks },
    { key: "dueSoon", title: "Срок менее 4 дней", icon: "Clock", color: "text-yellow-400", dot: "bg-yellow-500", tasks: dueSoonTasks },
    { key: "active", title: "В работе", icon: "ListChecks", color: "text-blue-400", dot: "bg-blue-500", tasks: activeTasks },
  ].filter(s => s.tasks.length > 0);

  const prescriptionSections = [
    { key: "overdue", title: "Просроченные", icon: "AlertCircle", color: "text-red-400", dot: "bg-red-500", items: overduePrescriptions },
    { key: "dueSoon", title: "Срок менее 3 дней", icon: "Clock", color: "text-yellow-400", dot: "bg-yellow-500", items: dueSoonPrescriptions },
    { key: "active", title: "В работе", icon: "ClipboardList", color: "text-blue-400", dot: "bg-blue-500", items: activePrescriptions },
  ].filter(s => s.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold">Ваши задачи</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalTasks > 0 && `Задач: ${totalTasks}`}
              {totalTasks > 0 && totalPrescriptions > 0 && " · "}
              {totalPrescriptions > 0 && `Предписаний: ${totalPrescriptions}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {taskSections.length > 0 && (
            <div className="space-y-5">
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Задачи</p>
              {taskSections.map(s => (
                <div key={`task-${s.key}`}>
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
          )}

          {prescriptionSections.length > 0 && (
            <div className="space-y-5">
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Предписания</p>
              {prescriptionSections.map(s => (
                <div key={`presc-${s.key}`}>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2 ${s.color}`}>
                    <Icon name={s.icon as never} size={13} />
                    {s.title} ({s.items.length})
                  </div>
                  <div className="space-y-0.5">
                    {s.items.map(({ p, info }) => (
                      <PrescriptionRow key={p.id} p={p} info={info} onClick={() => onPrescriptionClick(p.id)} highlightColor={s.dot} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
