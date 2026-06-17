import { useState } from "react";
import Icon from "@/components/ui/icon";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

type Status = "Черновик" | "Выдано" | "Устранено" | "Просрочено";
interface Remark { id: string; place: string; description: string; normRef: string; deadline: string; status: Status; }
interface Prescription { id: string; number: string; date: string; object: string; contractor: string; inspector: string; representative: string; responsible: string; replyEmail: string; reportDeadline: string; remarks: Remark[]; comments: unknown[]; }

const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "Выдано":     "text-primary bg-primary/10 border-primary/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

function isOverdue(r: Remark) {
  if (r.status === "Устранено" || !r.deadline) return false;
  const [d, m, y] = r.deadline.split(".").map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  return today > new Date(y, m - 1, d);
}
function effectiveStatus(r: Remark): Status {
  if (r.status === "Устранено") return "Устранено";
  if (isOverdue(r)) return "Просрочено";
  return r.status;
}
function overallStatus(remarks: Remark[]): Status {
  if (!remarks.length) return "Черновик";
  const ss = remarks.map(effectiveStatus);
  if (ss.some(s => s === "Просрочено")) return "Просрочено";
  if (ss.every(s => s === "Устранено")) return "Устранено";
  if (ss.some(s => s === "Выдано")) return "Выдано";
  return "Черновик";
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[status]}`}>{status}</span>;
}

// --- Модалка редактирования предписания ---
function PrescriptionEditModal({ prescription: initial, onClose, onSave }: {
  prescription: Prescription;
  onClose: () => void;
  onSave: (p: Prescription) => Promise<void>;
}) {
  const [p, setP] = useState<Prescription>({ ...initial, remarks: initial.remarks.map(r => ({ ...r })) });
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof Omit<Prescription, "remarks" | "comments">, val: string) =>
    setP(prev => ({ ...prev, [key]: val }));

  const setRemark = (i: number, key: keyof Remark, val: string) =>
    setP(prev => ({ ...prev, remarks: prev.remarks.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));

  const handleSave = async () => { setSaving(true); await onSave(p); setSaving(false); };

  const inp = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const lbl = "text-xs font-medium text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Редактирование предписания {p.number}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Основные сведения</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Объект</label><input value={p.object} onChange={e => setField("object", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>Подрядчик</label><input value={p.contractor} onChange={e => setField("contractor", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Проверку провёл</label><input value={p.inspector} onChange={e => setField("inspector", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>В присутствии</label><input value={p.representative} onChange={e => setField("representative", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Email для ответа</label><input value={p.replyEmail} onChange={e => setField("replyEmail", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>Срок отчёта</label><input value={p.reportDeadline} onChange={e => setField("reportDeadline", e.target.value)} className={inp} placeholder="дд.мм.гггг" /></div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Замечания ({p.remarks.length})</p>
            {p.remarks.map((r, i) => (
              <div key={r.id} className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10">
                <p className="text-xs font-semibold text-primary">Замечание #{i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className={lbl}>Место нарушения</label><input value={r.place} onChange={e => setRemark(i, "place", e.target.value)} className={inp} /></div>
                  <div className="space-y-1.5"><label className={lbl}>Срок устранения</label><input value={r.deadline} onChange={e => setRemark(i, "deadline", e.target.value)} className={inp} placeholder="дд.мм.гггг" /></div>
                </div>
                <div className="space-y-1.5"><label className={lbl}>Описание нарушения</label><textarea value={r.description} onChange={e => setRemark(i, "description", e.target.value)} className={inp + " resize-none"} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className={lbl}>НПА/ЛНА</label><input value={r.normRef} onChange={e => setRemark(i, "normRef", e.target.value)} className={inp} /></div>
                  <div className="space-y-1.5">
                    <label className={lbl}>Статус</label>
                    <select value={r.status} onChange={e => setRemark(i, "status", e.target.value)} className={inp}>
                      {(["Черновик","Выдано","Устранено","Просрочено"] as Status[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Вкладка предписаний ---
export function PrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [pDeleteConfirm, setPDeleteConfirm] = useState<string | null>(null);
  const [pDeleting, setPDeleting] = useState(false);
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Загружаем при первом монтировании (вкладка активна)
  useState(() => {
    setPLoading(true);
    fetch(PRESCRIPTIONS_API).then(r => r.json()).then(data => { setPrescriptions(data); setLoaded(true); }).finally(() => setPLoading(false));
  });

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!pSearch.trim()) return true;
    const q = pSearch.toLowerCase();
    return p.number.toLowerCase().includes(q) || p.object.toLowerCase().includes(q) || p.contractor.toLowerCase().includes(q);
  });

  const handleDeletePrescription = async (id: string) => {
    setPDeleting(true);
    await fetch(PRESCRIPTIONS_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    setPDeleteConfirm(null);
    setPDeleting(false);
  };

  const handleSavePrescription = async (p: Prescription) => {
    await fetch(PRESCRIPTIONS_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    setPrescriptions(prev => prev.map(x => x.id === p.id ? p : x));
    setEditPrescription(null);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Управление предписаниями</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pLoading ? "Загрузка..." : `Всего: ${prescriptions.length}`}
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={pSearch}
            onChange={e => setPSearch(e.target.value)}
            placeholder="Поиск по номеру, объекту..."
            className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {pLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Загрузка предписаний...</p>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon name="ClipboardList" size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Предписания не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Номер / Дата</th>
                  <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Объект</th>
                  <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Подрядчик</th>
                  <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Замечания</th>
                  <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrescriptions.map(p => {
                  const status = overallStatus(p.remarks);
                  const overdueCount = p.remarks.filter(r => effectiveStatus(r) === "Просрочено").length;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</p>
                        <p className="text-[11px] text-muted-foreground">{p.date}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-foreground">{p.object}</p>
                        {p.inspector && <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{p.inspector}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{p.contractor}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-foreground">{p.remarks.length}</span>
                          {overdueCount > 0 && <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded font-medium">{overdueCount} просрочено</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditPrescription(p)} className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary" title="Редактировать">
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button onClick={() => setPDeleteConfirm(p.id)} className="text-xs text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10" title="Удалить">
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Удаление предписания */}
      {pDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Trash2" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Удалить предписание?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {prescriptions.find(p => p.id === pDeleteConfirm)?.number} — все замечания и комментарии будут удалены безвозвратно.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPDeleteConfirm(null)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={() => handleDeletePrescription(pDeleteConfirm)} disabled={pDeleting} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                {pDeleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Редактирование предписания */}
      {editPrescription && (
        <PrescriptionEditModal
          prescription={editPrescription}
          onClose={() => setEditPrescription(null)}
          onSave={handleSavePrescription}
        />
      )}
    </>
  );
}
