import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { AppUser } from "@/lib/auth";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Inspection, InspectionComment, COMMENTS_API } from "./types";

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

const formatDate = (iso: string) => {
  try { return format(parseISO(iso), "d MMMM yyyy", { locale: ru }); } catch { return iso; }
};

export default function InspectionDetail({ inspection, onClose, user }: { inspection: Inspection; onClose: () => void; user: AppUser }) {
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "chat">("details");
  const [comments, setComments] = useState<InspectionComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const photos = inspection.photos ?? [];

  const isContractor = user.role === "contractor";
  const myRole = isContractor ? "Подрядчик" : user.role === "manager" ? "Руководитель" : user.role === "project_team" ? "Проектная команда" : "Специалист ОТ";
  const isMine = (c: InspectionComment) => c.author_role === myRole && c.author_login === user.login;

  const loadComments = useCallback(() => {
    setLoadingComments(true);
    fetch(`${COMMENTS_API}?inspection_id=${inspection.id}`)
      .then(r => r.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
      .finally(() => setLoadingComments(false));
  }, [inspection.id]);

  useEffect(() => {
    if (activeTab === "chat") loadComments();
  }, [activeTab, loadComments]);

  const sendComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setSending(true);
    await fetch(COMMENTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspection_id: inspection.id,
        author_login: user.login,
        author_name: user.name,
        author_role: myRole,
        message: text,
      }),
    });
    setNewComment("");
    setSending(false);
    loadComments();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl animate-fade-in flex flex-col max-h-[88vh]">

        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <span className="text-base font-semibold">Запись проверки</span>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(inspection.inspection_date)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 flex-shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Табы */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "details" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="ClipboardList" size={14} />
            Детали
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="MessageSquare" size={14} />
            Комментарии
            {comments.length > 0 && <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">{comments.length}</span>}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {activeTab === "details" && (
            <div className="px-6 py-5 space-y-4">
              {inspection.works_suspended && (
                <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium px-3 py-2 rounded-lg">
                  <Icon name="OctagonX" size={14} />
                  Работы приостановлены
                </div>
              )}

              <div className="space-y-3">
                <InfoRow icon="Building2" label="Объект" value={inspection.object_name} />
                <InfoRow icon="HardHat" label="Подрядчик" value={inspection.contractor} />
                <InfoRow icon="TriangleAlert" label="Вид нарушения" value={inspection.violation_type} />
                <InfoRow icon="ListChecks" label="ОД/ОУ" value={`${inspection.remarks_count} шт.`} />
                <InfoRow icon="UserCheck" label="Проверяющий" value={inspection.inspector_name} />
              </div>

              {inspection.note && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">Примечание</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{inspection.note}</p>
                </div>
              )}

              {photos.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Фото ({photos.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightbox({ photos, index: i })}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors flex-shrink-0"
                      >
                        <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "chat" && (
            <div className="px-6 py-4 flex flex-col gap-4">
              {loadingComments ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  <span className="text-sm">Загрузка...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Icon name="MessageSquare" size={32} className="text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className={`flex gap-3 ${isMine(c) ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {c.author_name?.[0] ?? "?"}
                      </div>
                      <div className={`max-w-[80%] flex flex-col ${isMine(c) ? "items-end" : "items-start"}`}>
                        <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${isMine(c) ? "bg-primary/15 text-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                          {c.message}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {c.author_name} · {c.created_at ? format(parseISO(c.created_at), "d MMM, HH:mm", { locale: ru }) : ""}
                        </span>
                      </div>
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
                <button
                  onClick={sendComment}
                  disabled={!newComment.trim() || sending}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {sending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <PhotoLightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
