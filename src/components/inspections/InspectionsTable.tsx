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
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Дата</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">ПО</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Вид нарушения</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Объект</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Замечаний</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Работы<br/>приостановлены</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Проверяющий</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Примечание</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(row.inspection_date)}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">{row.contractor}</td>
                <td className="px-4 py-3 text-sm">{row.violation_type}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">{row.object_name}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {row.remarks_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {row.works_suspended
                    ? <span className="text-xs font-semibold text-red-400">да</span>
                    : <span className="text-xs text-muted-foreground">нет</span>
                  }
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">{row.inspector_name}</td>
                <td className="px-4 py-3 text-sm max-w-[200px]">
                  {row.note ? (
                    <span className="text-muted-foreground line-clamp-2" title={row.note}>{row.note}</span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
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