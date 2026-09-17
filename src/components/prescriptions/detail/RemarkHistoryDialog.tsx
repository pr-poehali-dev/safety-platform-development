import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

interface HistoryEntry {
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  place: "Место нарушения",
  category: "Вид нарушения",
  description: "Описание",
  status: "Статус",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RemarkHistoryDialog({ remarkId, onClose }: { remarkId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}?type=remark_history&remark_id=${encodeURIComponent(remarkId)}`)
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [remarkId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="History" size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">История изменений</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Icon name="History" size={28} className="opacity-30" />
              <p className="text-sm">Изменений пока не было</p>
            </div>
          )}
          {!loading && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((e, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{FIELD_LABELS[e.field] ?? e.field}</span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{fmtDate(e.changedAt)}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      <span className="line-through opacity-70">{e.oldValue || "—"}</span>
                    </p>
                    <p className="text-foreground flex items-center gap-1.5">
                      <Icon name="ArrowRight" size={12} className="text-primary flex-shrink-0" />
                      {e.newValue || "—"}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    {e.changedByName || e.changedBy || "Неизвестный пользователь"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
