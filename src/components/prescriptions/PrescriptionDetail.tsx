import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import { Template } from "@/lib/template";
import { printPrescription } from "@/lib/printPrescription";
import {
  Prescription, Comment, Attachment, Status,
  ALL_STATUSES, STATUS_STYLE, isOverdue, effectiveStatus, overallStatus,
} from "@/lib/prescriptionTypes";

const UPLOAD_URL = "https://functions.poehali.dev/b1d2899a-a609-43c1-81e8-34e4c4922136";
const MAX_PHOTOS = 3;
const MAX_PHOTO_SIZE = 1.5 * 1024 * 1024;

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className={`text-sm ${highlight ? "text-red-400 font-medium" : "text-foreground"}`}>{value}</span>
      </div>
    </div>
  );
}

export function PrescriptionDetail({
  prescription, onClose, onUpdate, user, canEdit, template,
}: {
  prescription: Prescription;
  onClose: () => void;
  onUpdate: (p: Prescription) => Promise<void>;
  user: AppUser;
  canEdit: boolean;
  template: Template;
}) {
  const [p, setP] = useState(prescription);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"remarks" | "chat">("remarks");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingRemarkId, setUploadingRemarkId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleRemarkPhotos = async (remarkId: string, files: FileList | null) => {
    if (!files || !files.length) return;
    const remark = p.remarks.find(r => r.id === remarkId);
    if (!remark) return;
    const existing = remark.photos ?? [];
    const remaining = MAX_PHOTOS - existing.length;
    if (remaining <= 0) return;
    const oversized = Array.from(files).filter(f => f.size > MAX_PHOTO_SIZE);
    if (oversized.length > 0) {
      alert(`Файл "${oversized[0].name}" превышает допустимый размер 1,5 МБ.`);
      const input = photoInputRefs.current[remarkId];
      if (input) input.value = "";
      return;
    }
    setUploadingRemarkId(remarkId);
    const toUpload = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const file of toUpload) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    const remarks = p.remarks.map(r =>
      r.id === remarkId ? { ...r, photos: [...existing, ...urls] } : r
    );
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
    setUploadingRemarkId(null);
    const input = photoInputRefs.current[remarkId];
    if (input) input.value = "";
  };

  const removeRemarkPhoto = (remarkId: string, photoIdx: number) => {
    const remarks = p.remarks.map(r =>
      r.id === remarkId ? { ...r, photos: (r.photos ?? []).filter((_, i) => i !== photoIdx) } : r
    );
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const isContractor = user.role === "contractor";
  const myRole = isContractor ? "Подрядчик" : "Специалист ОТ";

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) return;
      const reader = new FileReader();
      reader.onload = e => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: isImage ? "image" : "pdf",
          dataUrl: e.target?.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const sendComment = () => {
    if (!newComment.trim() && attachments.length === 0) return;
    const c: Comment = {
      id: Date.now(),
      author: user.name,
      role: myRole,
      text: newComment.trim(),
      time: new Date().toLocaleString("ru-RU"),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const updated = { ...p, comments: [...p.comments, c] };
    setP(updated);
    onUpdate(updated);
    setNewComment("");
    setAttachments([]);
  };

  const setRemarkStatus = (remarkId: string, status: Status) => {
    const remarks = p.remarks.map(r => r.id === remarkId ? { ...r, status } : r);
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const status = overallStatus(p.remarks);
  const isMine = (c: Comment) => c.role === myRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Выдано {p.date} · {p.object}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => printPrescription(p, template)}
              className="flex items-center gap-1.5 text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 rounded-lg px-3 py-1.5 transition-colors"
              title="Сформировать PDF для печати"
            >
              <Icon name="Printer" size={13} />
              Распечатать
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={18} />
            </button>
          </div>
        </div>

        {/* Информация */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon="Building2" label="Объект" value={p.object} />
          <InfoRow icon="Users" label="Подрядчик" value={p.contractor} />
          {p.responsible && <InfoRow icon="User" label="Ответственный" value={p.responsible} />}
          {p.reportDeadline && <InfoRow icon="FileCheck" label="Срок предоставления отчёта" value={p.reportDeadline} />}
        </div>

        {/* Табы */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setActiveTab("remarks")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "remarks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="AlertCircle" size={14} />
            Замечания
            <span className="text-[11px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">{p.remarks.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="MessageSquare" size={14} />
            Переписка
            {p.comments.length > 0 && <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">{p.comments.length}</span>}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* Замечания */}
          {activeTab === "remarks" && (
            <div className="px-6 py-4 space-y-4">
              {p.remarks.map((r, i) => (
                <div key={r.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Замечание #{i + 1}</span>
                    <StatusBadge status={effectiveStatus(r)} />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg p-3">{r.description}</p>

                  {/* Фото нарушения */}
                  <div>
                    {((r.photos ?? []).length > 0 || canEdit) && (
                      <div className="flex flex-wrap gap-2 items-center">
                        {(r.photos ?? []).map((url, pi) => (
                          <div key={pi} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                            <img src={url} alt={`Фото ${pi + 1}`} className="w-full h-full object-cover" />
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => removeRemarkPhoto(r.id, pi)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <Icon name="X" size={14} className="text-white" />
                              </button>
                            )}
                          </div>
                        ))}
                        {canEdit && (r.photos ?? []).length < MAX_PHOTOS && (
                          <>
                            <button
                              type="button"
                              onClick={() => photoInputRefs.current[r.id]?.click()}
                              disabled={uploadingRemarkId === r.id}
                              className="w-16 h-16 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary flex-shrink-0"
                            >
                              {uploadingRemarkId === r.id
                                ? <Icon name="Loader2" size={16} className="animate-spin" />
                                : <Icon name="Camera" size={16} />}
                              <span className="text-[10px] leading-tight text-center">
                                {uploadingRemarkId === r.id ? "Загрузка" : `${(r.photos ?? []).length}/${MAX_PHOTOS}`}
                              </span>
                            </button>
                            <input
                              ref={el => { photoInputRefs.current[r.id] = el; }}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={e => handleRemarkPhotos(r.id, e.target.files)}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {r.normRef && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon name="BookOpen" size={12} />
                      {r.normRef}
                    </div>
                  )}
                  <div className="bg-secondary/30 rounded-lg p-3 inline-flex flex-col">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Срок устранения</p>
                    <p className={`text-sm font-medium ${isOverdue(r) ? "text-red-400" : "text-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {r.deadline}{isOverdue(r) && <span className="text-[10px] ml-2 font-normal">— просрочено</span>}
                    </p>
                  </div>
                  {canEdit && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-2">Изменить статус замечания:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_STATUSES.map(s => (
                          <button
                            key={s}
                            onClick={() => setRemarkStatus(r.id, s)}
                            className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${effectiveStatus(r) === s ? STATUS_STYLE[s] : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Чат */}
          {activeTab === "chat" && (
            <div className="px-6 py-4 flex flex-col gap-4">
              {p.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Icon name="MessageSquare" size={32} className="text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {p.comments.map(c => (
                    <div key={c.id} className={`flex gap-3 ${isMine(c) ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {c.author[0]}
                      </div>
                      <div className={`max-w-[80%] flex flex-col ${isMine(c) ? "items-end" : "items-start"}`}>
                        {c.text && (
                          <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${isMine(c) ? "bg-primary/15 text-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                            {c.text}
                          </div>
                        )}
                        {c.attachments && c.attachments.length > 0 && (
                          <div className={`flex flex-wrap gap-2 mt-1.5 ${isMine(c) ? "justify-end" : ""}`}>
                            {c.attachments.map((a, ai) => (
                              <a key={ai} href={a.dataUrl} download={a.name} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:border-primary/40 transition-colors"
                              >
                                <Icon name={a.type === "image" ? "Image" : "FileText"} size={12} className="text-primary" />
                                <span className="max-w-[120px] truncate">{a.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">{c.author} · {c.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 text-xs text-primary">
                      <Icon name={a.type === "image" ? "Image" : "FileText"} size={12} />
                      <span className="max-w-[100px] truncate">{a.name}</span>
                      <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-400 transition-colors ml-0.5">
                        <Icon name="X" size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendComment()}
                  placeholder="Написать сообщение..."
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 px-3 py-2 rounded-lg transition-colors"
                  title="Прикрепить файл (фото или PDF)"
                >
                  <Icon name="Paperclip" size={14} />
                </button>
                <button
                  onClick={sendComment}
                  disabled={!newComment.trim() && attachments.length === 0}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Icon name="Send" size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}