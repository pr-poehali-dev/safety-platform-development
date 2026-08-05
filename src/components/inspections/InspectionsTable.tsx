import { useState } from "react";
import Icon from "@/components/ui/icon";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Inspection } from "./types";

interface Props {
  rows: Inspection[];
  loading: boolean;
  deleteConfirm: number | null;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
  onAddFirst: () => void;
  canManage?: boolean;
}

const formatDate = (iso: string) => {
  try { return format(parseISO(iso), "dd.MM.yyyy", { locale: ru }); } catch { return iso; }
};

function PhotoLightbox({ photos, startIndex, onClose }: { photos: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
        <Icon name="X" size={26} />
      </button>
      {photos.length > 1 && (
        <button
          onClick={() => setIndex(i => (i - 1 + photos.length) % photos.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
        >
          <Icon name="ChevronLeft" size={32} />
        </button>
      )}
      <img src={photos[index]} alt={`Фото ${index + 1}`} className="relative max-w-[90vw] max-h-[85vh] rounded-lg object-contain" />
      {photos.length > 1 && (
        <button
          onClick={() => setIndex(i => (i + 1) % photos.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
        >
          <Icon name="ChevronRight" size={32} />
        </button>
      )}
      {photos.length > 1 && (
        <span className="absolute bottom-6 text-white/70 text-xs">{index + 1} / {photos.length}</span>
      )}
    </div>
  );
}

export default function InspectionsTable({
  rows, loading, deleteConfirm, onDeleteRequest, onDeleteConfirm, onDeleteCancel, onAddFirst, canManage = true,
}: Props) {
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Icon name="Loader2" size={18} className="animate-spin" />
        <span className="text-sm">Загрузка...</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Icon name="TableProperties" size={32} className="opacity-30" />
        <p className="text-sm">Записей пока нет</p>
        {canManage && (
          <button onClick={onAddFirst} className="text-sm text-primary hover:underline">Добавить первую запись</button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <colgroup>
            <col style={{ width: 90 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Дата</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">ПО</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Вид нарушения</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Объект</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground">ОД/ОУ
(шт)</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground leading-tight">Работы приостановлены</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Проверяющий</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Примечание</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground">Фото</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="px-4 py-3 text-sm whitespace-nowrap align-top">{formatDate(row.inspection_date)}</td>
                <td className="px-3 py-3 text-sm align-top"><span className="line-clamp-3" title={row.contractor}>{row.contractor}</span></td>
                <td className="px-3 py-3 text-sm align-top"><span className="line-clamp-3" title={row.violation_type}>{row.violation_type}</span></td>
                <td className="px-3 py-3 text-sm align-top"><span className="line-clamp-3" title={row.object_name}>{row.object_name}</span></td>
                <td className="px-2 py-3 text-center align-top">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {row.remarks_count}
                  </span>
                </td>
                <td className="px-2 py-3 text-center align-top">
                  {row.works_suspended
                    ? <span className="text-xs font-semibold text-red-400">да</span>
                    : <span className="text-xs text-muted-foreground">нет</span>
                  }
                </td>
                <td className="px-3 py-3 text-sm align-top"><span className="line-clamp-3" title={row.inspector_name}>{row.inspector_name}</span></td>
                <td className="px-3 py-3 text-sm align-top">
                  {row.note ? (
                    <span className="line-clamp-3 text-muted-foreground" title={row.note}>{row.note}</span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
                <td className="px-2 py-3 align-top">
                  {(row.photos ?? []).length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {(row.photos ?? []).slice(0, 3).map((url, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => setLightbox({ photos: row.photos ?? [], index: pi })}
                          className="w-9 h-9 rounded overflow-hidden border border-border hover:border-primary/50 transition-colors flex-shrink-0"
                        >
                          <img src={url} alt={`Фото ${pi + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {(row.photos ?? []).length > 3 && (
                        <button
                          type="button"
                          onClick={() => setLightbox({ photos: row.photos ?? [], index: 3 })}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          +{(row.photos ?? []).length - 3}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30 text-center block">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {canManage && (
                    deleteConfirm === row.id ? (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <button onClick={() => onDeleteConfirm(row.id)} className="text-[10px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Удалить</button>
                        <button onClick={onDeleteCancel} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Нет</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onDeleteRequest(row.id)}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Удалить"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lightbox && (
        <PhotoLightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}