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
}

const formatDate = (iso: string) => {
  try { return format(parseISO(iso), "dd.MM.yyyy", { locale: ru }); } catch { return iso; }
};

export default function InspectionsTable({
  rows, loading, deleteConfirm, onDeleteRequest, onDeleteConfirm, onDeleteCancel, onAddFirst,
}: Props) {
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
        <button onClick={onAddFirst} className="text-sm text-primary hover:underline">Добавить первую запись</button>
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
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Дата</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">ПО</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Вид нарушения</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Объект</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground">Замеч.</th>
              <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground leading-tight">Работы<br/>прост.</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Проверяющий</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Примечание</th>
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
                <td className="px-4 py-3 align-top">
                  {deleteConfirm === row.id ? (
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}