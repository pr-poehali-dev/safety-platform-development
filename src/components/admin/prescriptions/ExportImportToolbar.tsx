import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import {
  ALL_STATUSES, Status, StatusBadge, Prescription, ImportPreview,
  overallStatus, effectiveStatus, parsePrescriptionDate,
} from "./types";

const EXPORT_API = "https://functions.poehali.dev/9f42e2d1-919f-4261-b985-93a720521cd8";
const IMPORT_API = "https://functions.poehali.dev/0cfc6b7f-a3e8-4102-8f59-2aa3510cf806";

// --- Заголовок, поиск, импорт/экспорт в Excel ---
export function ExportImportToolbar({
  prescriptions, pLoading, pSearch, setPSearch, filteredPrescriptions, currentUser, reloadPrescriptions,
}: {
  prescriptions: Prescription[];
  pLoading: boolean;
  pSearch: string;
  setPSearch: (v: string) => void;
  filteredPrescriptions: Prescription[];
  currentUser?: AppUser;
  reloadPrescriptions: () => void;
}) {
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
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importConfirming, setImportConfirming] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState<"create" | "update">("update");

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
        setDuplicateMode("update");
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
        body: JSON.stringify({
          action: "confirm",
          fileKey: importPreview.fileKey,
          createdBy: currentUser?.login ?? "",
          createdByName: currentUser?.name ?? "",
          duplicateMode: importPreview.duplicateNumbers.length > 0 ? duplicateMode : "create",
        }),
      });
      setImportPreview(null);
      reloadPrescriptions();
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

            {importPreview.duplicateNumbers.length > 0 && (
              <div className="mb-3 rounded-lg border border-yellow-400/20 bg-yellow-400/10 overflow-hidden">
                <div className="flex items-start gap-2 text-xs text-yellow-400 px-3 pt-2.5">
                  <Icon name="AlertTriangle" size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Номера уже есть в системе: <span className="font-medium">{importPreview.duplicateNumbers.join(", ")}</span>
                  </span>
                </div>
                <div className="px-3 pb-2.5 pt-2 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input type="radio" name="duplicateMode" checked={duplicateMode === "update"} onChange={() => setDuplicateMode("update")} className="accent-primary" />
                    Обновить существующие предписания данными из файла
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input type="radio" name="duplicateMode" checked={duplicateMode === "create"} onChange={() => setDuplicateMode("create")} className="accent-primary" />
                    Создать новые записи (будут дублироваться)
                  </label>
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto space-y-1.5 mb-5 -mx-1 px-1">
              {importPreview.preview.map((p, i) => (
                <div key={i} className={`flex items-center justify-between gap-2 text-xs rounded-lg px-2.5 py-1.5 ${p.isDuplicate ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-secondary/30"}`}>
                  <div className="min-w-0 flex items-center gap-1.5">
                    {p.isDuplicate && <Icon name="AlertTriangle" size={12} className="text-yellow-400 flex-shrink-0" />}
                    <span className="font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number || "—"}</span>
                    <span className="text-muted-foreground truncate">{p.object}</span>
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
