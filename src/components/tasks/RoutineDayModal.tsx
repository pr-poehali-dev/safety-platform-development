import Icon from "@/components/ui/icon";
import { RoutineEntry, WeekDayInfo } from "@/lib/routineTypes";

interface RoutineDayModalProps {
  day: WeekDayInfo;
  entries: RoutineEntry[];
  onClose: () => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
}

export default function RoutineDayModal({ day, entries, onClose, onAdd, onDelete }: RoutineDayModalProps) {
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">{day.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{day.display}{totalHours > 0 ? ` · ${totalHours} ч` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {entries.length === 0 ? (
            <div className="py-8 text-center">
              <Icon name="ClipboardList" size={28} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Записей за этот день нет</p>
            </div>
          ) : (
            entries.map(e => (
              <div key={e.id} className="border border-border rounded-lg px-3 py-2.5 group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium flex-1">{e.category_name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">{e.hours} ч</span>
                    <button
                      onClick={() => onDelete(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                      title="Удалить запись"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </div>
                </div>
                {e.comment && <p className="text-xs text-muted-foreground mt-1 leading-snug">{e.comment}</p>}
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
          >
            <Icon name="Plus" size={14} /> Добавить запись
          </button>
        </div>
      </div>
    </div>
  );
}
