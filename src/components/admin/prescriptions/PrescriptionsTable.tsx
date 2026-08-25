import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prescription, StatusBadge, effectiveStatus, overallStatus, fmtImportDate } from "./types";

// --- Таблица предписаний + подтверждение удаления ---
export function PrescriptionsTable({ prescriptions, loading, onEdit, onDelete }: {
  prescriptions: Prescription[];
  loading: boolean;
  onEdit: (p: Prescription) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [pDeleteConfirm, setPDeleteConfirm] = useState<string | null>(null);
  const [pDeleting, setPDeleting] = useState(false);

  const handleDeletePrescription = async (id: string) => {
    setPDeleting(true);
    await onDelete(id);
    setPDeleteConfirm(null);
    setPDeleting(false);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Загрузка предписаний...</p>
          </div>
        ) : prescriptions.length === 0 ? (
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
                {prescriptions.map(p => {
                  const status = overallStatus(p.remarks);
                  const overdueCount = p.remarks.filter(r => effectiveStatus(r) === "Просрочено").length;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</p>
                        <p className="text-[11px] text-muted-foreground">{p.date}</p>
                        {p.importLog && p.importLog.length > 0 && (
                          <span
                            title={p.importLog.map(e => `${fmtImportDate(e.date)} — ${e.adminName || e.adminLogin}`).join("\n")}
                            className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 mt-1"
                          >
                            <Icon name="FileInput" size={10} />
                            Обновлено импортом {fmtImportDate(p.importLog[p.importLog.length - 1].date)}
                          </span>
                        )}
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
                          <button onClick={() => onEdit(p)} className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary" title="Редактировать">
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
    </>
  );
}
