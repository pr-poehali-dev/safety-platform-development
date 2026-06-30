import { useState, useEffect, useRef } from "react";
import { TaskAssignment, TaskComment, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/taskTypes";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface TaskCardProps {
  assignment: TaskAssignment;
  user: AppUser;
  onClose: () => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  onSendComment: (assignment_id: number, message: string) => Promise<void>;
  fetchComments: (assignment_id: number) => Promise<TaskComment[]>;
  onEdit?: () => void;
  onDelete?: () => void;
  allUsers?: { login: string; name: string; role: string }[];
}

function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("ru-RU");
}

function fmtDt(dt: string | null | undefined) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TaskCard({ assignment, user, onClose, onAction, onSendComment, fetchComments, onEdit, onDelete, allUsers = [] }: TaskCardProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const [showExtension, setShowExtension] = useState(false);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionComment, setExtensionComment] = useState("");

  const [showRejectComment, setShowRejectComment] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const [showExtRejectComment, setShowExtRejectComment] = useState(false);
  const [extRejectComment, setExtRejectComment] = useState("");

  const [showBulkDate, setShowBulkDate] = useState(false);
  const [bulkDate, setBulkDate] = useState("");

  const [showReassign, setShowReassign] = useState(false);
  const [reassignLogin, setReassignLogin] = useState("");

  const [saving, setSaving] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const isManager = user.role === "manager";
  const isAdmin = user.role === "admin";
  const isAssignee = assignment.assignee_login === user.login;
  const isCreator = assignment.created_by === user.login;
  const canManage = isManager || isAdmin || isCreator;

  useEffect(() => {
    fetchComments(assignment.id).then(setComments).catch(() => setComments([]));
  }, [assignment.id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [comments]);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    await onSendComment(assignment.id, commentText.trim());
    setCommentText("");
    const updated = await fetchComments(assignment.id);
    setComments(updated);
    setSendingComment(false);
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) return;
    setSubmittingReport(true);
    await onAction({ action: "submit_report", assignment_id: assignment.id, report_text: reportText });
    setSubmittingReport(false);
    setShowReport(false);
    setReportText("");
  };

  const handleRequestExtension = async () => {
    if (!extensionDate) return;
    setSaving(true);
    await onAction({ action: "request_extension", assignment_id: assignment.id, new_date: extensionDate, comment: extensionComment });
    setSaving(false);
    setShowExtension(false);
    setExtensionDate("");
    setExtensionComment("");
  };

  const handleAcceptReport = async () => {
    setSaving(true);
    await onAction({ action: "accept_report", assignment_id: assignment.id });
    setSaving(false);
  };

  const handleRejectReport = async () => {
    if (!rejectComment.trim()) return;
    setSaving(true);
    await onAction({ action: "reject_report", assignment_id: assignment.id, comment: rejectComment });
    setSaving(false);
    setShowRejectComment(false);
    setRejectComment("");
  };

  const handleAcceptExtension = async () => {
    setSaving(true);
    await onAction({ action: "accept_extension", assignment_id: assignment.id });
    setSaving(false);
  };

  const handleRejectExtension = async () => {
    if (!extRejectComment.trim()) return;
    setSaving(true);
    await onAction({ action: "reject_extension", assignment_id: assignment.id, comment: extRejectComment });
    setSaving(false);
    setShowExtRejectComment(false);
    setExtRejectComment("");
  };

  const handleReassign = async () => {
    if (!reassignLogin) return;
    const u = allUsers.find(u => u.login === reassignLogin);
    if (!u) return;
    setSaving(true);
    await onAction({ action: "reassign", assignment_id: assignment.id, new_login: u.login, new_name: u.name, new_role: u.role });
    setSaving(false);
    setShowReassign(false);
  };

  const statusLabel = TASK_STATUS_LABELS[assignment.status] ?? assignment.status;
  const statusColor = TASK_STATUS_COLORS[assignment.status] ?? "";
  const isOverdue = assignment.status === "overdue";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Шапка */}
        <div className={`flex items-start justify-between px-5 py-4 border-b border-border ${isOverdue ? "bg-red-500/5" : ""}`}>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
            </div>
            <p className="text-sm font-medium leading-snug">{assignment.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Icon name="User" size={12} />{assignment.assignee_name}</span>
              <span className="flex items-center gap-1"><Icon name="Calendar" size={12} />Срок: <b className={isOverdue ? "text-red-400" : ""}>{fmt(assignment.due_date)}</b></span>
              <span className="flex items-center gap-1"><Icon name="UserCheck" size={12} />Постановщик: {assignment.created_by_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Icon name="Pencil" size={15} />
              </button>
            )}
            {canManage && onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                <Icon name="Trash2" size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* История событий */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">История</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span className="text-muted-foreground">Задача создана {fmtDt(assignment.task_created_at)}</span>
              </div>
              {assignment.extension_requested_date && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Запрос продления до {fmt(assignment.extension_requested_date)}
                    {assignment.extension_comment && <span className="text-foreground"> — «{assignment.extension_comment}»</span>}
                  </span>
                </div>
              )}
              {assignment.extension_resolution === "accepted" && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Продление согласовано</span>
                </div>
              )}
              {assignment.extension_resolution === "rejected" && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Продление отклонено{assignment.extension_reject_comment ? ` — «${assignment.extension_reject_comment}»` : ""}</span>
                </div>
              )}
              {assignment.report_submitted_at && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Отчёт подан {fmtDt(assignment.report_submitted_at)}</span>
                </div>
              )}
              {assignment.rejection_comment && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Отправлено на доработку — «{assignment.rejection_comment}»</span>
                </div>
              )}
              {assignment.status === "done" && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Задача выполнена</span>
                </div>
              )}
            </div>
          </div>

          {/* Отчёт */}
          {assignment.report_text && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Отчёт исполнителя</p>
              <p className="text-sm bg-muted/40 rounded-lg px-3 py-2">{assignment.report_text}</p>
            </div>
          )}

          {/* Действия руководителя / постановщика */}
          {canManage && assignment.status === "pending_report" && (
            <div className="px-5 py-4 border-b border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Решение по отчёту</p>
              <div className="flex gap-2">
                <button disabled={saving} onClick={handleAcceptReport} className="flex-1 text-sm py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">
                  Принять
                </button>
                <button onClick={() => setShowRejectComment(v => !v)} className="flex-1 text-sm py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors">
                  Отклонить
                </button>
              </div>
              {showRejectComment && (
                <div className="space-y-2">
                  <textarea
                    className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2} placeholder="Причина отклонения..."
                    value={rejectComment} onChange={e => setRejectComment(e.target.value)}
                  />
                  <button disabled={saving || !rejectComment.trim()} onClick={handleRejectReport} className="w-full text-sm py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                    Отправить на доработку
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Запрос продления — решение */}
          {canManage && assignment.status === "extension_pending" && (
            <div className="px-5 py-4 border-b border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Запрос продления до {fmt(assignment.extension_requested_date)}</p>
              {assignment.extension_comment && <p className="text-xs text-muted-foreground">Причина: {assignment.extension_comment}</p>}
              <div className="flex gap-2">
                <button disabled={saving} onClick={handleAcceptExtension} className="flex-1 text-sm py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">
                  Согласовать
                </button>
                <button onClick={() => setShowExtRejectComment(v => !v)} className="flex-1 text-sm py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                  Отклонить
                </button>
              </div>
              {showExtRejectComment && (
                <div className="space-y-2">
                  <textarea
                    className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2} placeholder="Причина отклонения..."
                    value={extRejectComment} onChange={e => setExtRejectComment(e.target.value)}
                  />
                  <button disabled={saving || !extRejectComment.trim()} onClick={handleRejectExtension} className="w-full text-sm py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                    Отклонить продление
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Действия для исполнителя */}
          {isAssignee && !canManage && (
            <div className="px-5 py-4 border-b border-border space-y-2">
              {["active", "overdue", "revision"].includes(assignment.status) && (
                <button onClick={() => setShowReport(v => !v)} className="w-full text-sm py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <Icon name="FileText" size={14} /> Отчитаться
                </button>
              )}
              {showReport && (
                <div className="space-y-2">
                  <textarea
                    className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={3} placeholder="Опишите выполненную работу..."
                    value={reportText} onChange={e => setReportText(e.target.value)}
                  />
                  <button disabled={submittingReport || !reportText.trim()} onClick={handleSubmitReport} className="w-full text-sm py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {submittingReport ? "Отправка..." : "Отправить отчёт"}
                  </button>
                </div>
              )}
              {["active", "overdue"].includes(assignment.status) && (
                <button onClick={() => setShowExtension(v => !v)} className="w-full text-sm py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors flex items-center justify-center gap-2">
                  <Icon name="CalendarClock" size={14} /> Запросить продление
                </button>
              )}
              {showExtension && (
                <div className="space-y-2">
                  <input
                    type="date" className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    value={extensionDate} onChange={e => setExtensionDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                  <textarea
                    className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2} placeholder="Причина продления..."
                    value={extensionComment} onChange={e => setExtensionComment(e.target.value)}
                  />
                  <button disabled={saving || !extensionDate} onClick={handleRequestExtension} className="w-full text-sm py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {saving ? "Отправка..." : "Запросить продление"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Смена исполнителя (только admin) */}
          {isAdmin && allUsers.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <button onClick={() => setShowReassign(v => !v)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <Icon name="UserCog" size={12} /> Передать другому исполнителю
              </button>
              {showReassign && (
                <div className="mt-2 flex gap-2">
                  <select
                    className="flex-1 text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none"
                    value={reassignLogin} onChange={e => setReassignLogin(e.target.value)}
                  >
                    <option value="">Выбрать...</option>
                    {allUsers.filter(u => u.login !== assignment.assignee_login).map(u => (
                      <option key={u.login} value={u.login}>{u.name}</option>
                    ))}
                  </select>
                  <button disabled={saving || !reassignLogin} onClick={handleReassign} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                    Передать
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Чат */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Переписка</p>
            <div ref={chatRef} className="space-y-3 max-h-52 overflow-y-auto mb-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Сообщений пока нет</p>
              )}
              {comments.map(c => {
                const isMine = c.author_login === user.login;
                return (
                  <div key={c.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {!isMine && <p className="text-xs font-medium mb-0.5 opacity-70">{c.author_name}</p>}
                      <p>{c.message}</p>
                      <p className={`text-xs mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{fmtDt(c.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Написать сообщение..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              />
              <button disabled={sendingComment || !commentText.trim()} onClick={handleSendComment} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                <Icon name="Send" size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
