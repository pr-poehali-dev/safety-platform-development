import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const EXPORT_API = "https://functions.poehali.dev/9f42e2d1-919f-4261-b985-93a720521cd8";
const IMPORT_API = "https://functions.poehali.dev/0cfc6b7f-a3e8-4102-8f59-2aa3510cf806";

type Status = "Черновик" | "В работе" | "Устранено" | "Просрочено";
interface Remark { id: string; place: string; description: string; normRef: string; deadline: string; status: Status; photos?: string[]; }
interface Prescription { id: string; number: string; date: string; object: string; contractor: string; inspector: string; inspectorNominative?: string; representative: string; responsible: string; replyEmail: string; reportDeadline: string; remarks: Remark[]; comments: unknown[]; }

const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "В работе":   "text-primary bg-primary/10 border-primary/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

const ALL_STATUSES: Status[] = ["Черновик", "В работе", "Устранено", "Просрочено"];

function isOverdue(r: Remark) {
  if (r.status === "Устранено" || !r.deadline || r.deadline === "Незамедлительно") return false;
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
  if (ss.some(s => s === "В работе")) return "В работе";
  return "Черновик";
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[status]}`}>{status}</span>;
}

// Парсит дату предписания "дд.мм.гггг" в Date
function parsePrescriptionDate(str: string): Date | null {
  if (!str) return null;
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
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
                      {(["Черновик","В работе","Устранено","Просрочено"] as Status[]).map(s => <option key={s} value={s}>{s}</option>)}
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
export function PrescriptionsTab({ currentUser }: { currentUser?: AppUser }) {
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

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStatuses, setExportStatuses] = useState<Status[]>(ALL_STATUSES);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  const toggleExportStatus = (s: Status) => {
    setExportStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const exportDateFromObj = exportDateFrom ? new Date(exportDateFrom) : null;
  const exportDateToObj = exportDateTo ? new Date(exportDateTo + "T23:59:59") : null;

  const exportPreviewCount = filteredPrescriptions.filter(p => {
    if (!exportStatuses.includes(overallStatus(p.remarks))) return false;
    if (exportDateFromObj || exportDateToObj) {
      const d = parsePrescriptionDate(p.date);
      if (!d) return false;
      if (exportDateFromObj && d < exportDateFromObj) return false;
      if (exportDateToObj && d > exportDateToObj) return false;
    }
    return true;
  }).length;

  const handleExport = async () => {
    setShowExportDialog(false);

    const prescriptionsToExport = filteredPrescriptions.filter(p => {
      if (!exportStatuses.includes(overallStatus(p.remarks))) return false;
      if (exportDateFromObj || exportDateToObj) {
        const d = parsePrescriptionDate(p.date);
        if (!d) return false;
        if (exportDateFromObj && d < exportDateFromObj) return false;
        if (exportDateToObj && d > exportDateToObj) return false;
      }
      return true;
    });

    const payload = prescriptionsToExport.map(p => ({
      number: p.number,
      date: p.date,
      object: p.object,
      contractor: p.contractor,
      inspector: p.inspector,
      representative: p.representative,
      responsible: p.responsible,
      status: overallStatus(p.remarks),
      remarks: p.remarks.map(r => ({
        place: r.place,
        description: r.description,
        normRef: r.normRef,
        deadline: r.deadline,
        status: effectiveStatus(r),
        photos: r.photos ?? [],
      })),
    }));

    const totalPhotos = payload.reduce((sum, p) => sum + p.remarks.reduce((s, r) => s + r.photos.length, 0), 0);
    // Примерная оценка времени формирования файла — зависит от количества фото, которые нужно скачать и уменьшить на сервере
    const estimatedMs = Math.max(1200, totalPhotos * 35);

    setExporting(true);
    setExportProgress(0);

    // Плавно приближаем прогресс к 92%, не показывая 100% пока не придёт реальный ответ сервера
    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / estimatedMs, 1);
      const eased = 1 - Math.pow(1 - ratio, 2);
      setExportProgress(Math.min(92, Math.round(eased * 92)));
    }, 120);

    try {
      const res = await fetch(EXPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptions: payload }),
      });
      const data = await res.json();
      window.clearInterval(progressTimer);
      setExportProgress(100);
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = `Предписания_${new Date().toLocaleDateString("ru-RU").replace(/\./g, "-")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } finally {
      window.clearInterval(progressTimer);
      setTimeout(() => { setExporting(false); setExportProgress(0); }, 400);
    }
  };

  // --- Импорт предписаний из Excel ---
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importAnalyzing, setImportAnalyzing] = useState(false);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState<{
    fileKey: string;
    prescriptionsCount: number;
    remarksCount: number;
    photosCount: number;
    preview: { number: string; date: string; object: string; contractor: string; remarksCount: number }[];
  } | null>(null);
  const [importConfirming, setImportConfirming] = useState(false);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImportFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setImportError("");
    setImportAnalyzing(true);
    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      const res = await fetch(IMPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", fileDataUrl }),
      });
      const data = await res.json();
      if (data.error) {
        setImportError(data.error);
      } else {
        setImportPreview(data);
      }
    } catch {
      setImportError("Не удалось прочитать файл. Убедитесь, что это корректный файл Excel.");
    } finally {
      setImportAnalyzing(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportConfirming(true);
    try {
      await fetch(IMPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", fileKey: importPreview.fileKey, createdBy: currentUser?.login ?? "" }),
      });
      setImportPreview(null);
      setPLoading(true);
      fetch(PRESCRIPTIONS_API).then(r => r.json()).then(data => setPrescriptions(data)).finally(() => setPLoading(false));
    } finally {
      setImportConfirming(false);
    }
  };

  const handleCancelImport = async () => {
    if (importPreview) {
      fetch(IMPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", fileKey: importPreview.fileKey }),
      }).catch(() => {});
    }
    setImportPreview(null);
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={pSearch}
              onChange={e => setPSearch(e.target.value)}
              placeholder="Поиск по номеру, объекту..."
              className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={importAnalyzing}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {importAnalyzing ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Upload" size={14} />}
            {importAnalyzing ? "Анализ файла..." : "Импорт из Excel"}
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={e => handleImportFile(e.target.files)}
          />
          <button
            onClick={() => setShowExportDialog(true)}
            disabled={filteredPrescriptions.length === 0 || exporting}
            className="relative flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:cursor-not-allowed transition-colors whitespace-nowrap overflow-hidden"
          >
            {exporting && (
              <span
                className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-150 ease-linear"
                style={{ width: `${exportProgress}%` }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {exporting ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Download" size={14} />}
              {exporting ? `Формирование... ${exportProgress}%` : "Экспорт в Excel"}
            </span>
          </button>
        </div>
      </div>

      {importError && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          <Icon name="AlertCircle" size={14} className="flex-shrink-0" />
          {importError}
          <button onClick={() => setImportError("")} className="ml-auto text-red-400/70 hover:text-red-400"><Icon name="X" size={13} /></button>
        </div>
      )}

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

      {/* Выбор статусов для экспорта */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExportDialog(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Экспорт в Excel</h2>
              <button onClick={() => setShowExportDialog(false)} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={18} /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Выберите, какие статусы предписаний включить в файл</p>
            <div className="space-y-2 mb-5">
              {ALL_STATUSES.map(s => {
                const count = filteredPrescriptions.filter(p => overallStatus(p.remarks) === s).length;
                const checked = exportStatuses.includes(s);
                return (
                  <label key={s} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-secondary/40"}`}>
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={checked} onChange={() => toggleExportStatus(s)} className="accent-primary w-4 h-4" />
                      <StatusBadge status={s} />
                    </div>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mb-2">Период составления предписаний</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">С</label>
                <input
                  type="date"
                  value={exportDateFrom}
                  onChange={e => setExportDateFrom(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">По</label>
                <input
                  type="date"
                  value={exportDateTo}
                  onChange={e => setExportDateTo(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
            {(exportDateFrom || exportDateTo) && (
              <button onClick={() => { setExportDateFrom(""); setExportDateTo(""); }} className="text-[11px] text-primary hover:opacity-80 transition-opacity mb-3">
                Сбросить период
              </button>
            )}

            <p className="text-xs text-muted-foreground mb-5">
              В файл попадёт предписаний: <span className="text-foreground font-medium">{exportPreviewCount}</span>
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowExportDialog(false)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button
                onClick={handleExport}
                disabled={exportStatuses.length === 0 || exportPreviewCount === 0}
                className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="Download" size={14} />
                Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение импорта */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelImport} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="FileSpreadsheet" size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Импортировано {importPreview.prescriptionsCount} предписаний, в которых содержится {importPreview.remarksCount} замечаний
                </p>
                {importPreview.photosCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Фотографий: {importPreview.photosCount}</p>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 mb-5 -mx-1 px-1">
              {importPreview.preview.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs bg-secondary/30 rounded-lg px-2.5 py-1.5">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number || "—"}</span>
                    <span className="text-muted-foreground ml-2 truncate">{p.object}</span>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">{p.remarksCount} зам.</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-foreground mb-4">Хотите импортировать в систему?</p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelImport}
                disabled={importConfirming}
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Нет
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importConfirming}
                className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {importConfirming ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                {importConfirming ? "Импорт..." : "Да"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}