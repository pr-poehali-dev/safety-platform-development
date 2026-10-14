import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Comment } from "@/lib/prescriptionTypes";

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

interface HistoryEntry {
  remarkId: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  remarkNumber: number | null;
}

const FIELD_LABELS: Record<string, string> = {
  place: "Место нарушения",
  category: "Вид нарушения",
  description: "Описание",
  status: "Статус",
  normRef: "Нарушенный пункт НПА",
  deadline: "Срок устранения",
  photos: "Фото",
  added: "Пункт добавлен",
  removed: "Пункт удалён",
  comment: "Комментарий",
  created: "Предписание создано",
  idle_autosave: "Автосохранение из-за простоя",
  autosave: "Автосохранение",
  g_number: "Номер предписания",
  g_date: "Дата выдачи",
  g_object: "Объект",
  g_contractor: "Подрядчик",
  g_contractNumber: "Номер договора",
  g_inspector: "Кем выдано",
  g_inspectorNominative: "Кем выдано (именительный падеж)",
  g_representative: "Представитель подрядчика",
  g_responsible: "Ответственный",
  g_replyEmail: "Почта для ответа",
  g_reportDeadline: "Срок предоставления отчёта",
};

const FIELD_ICONS: Record<string, string> = {
  status: "RefreshCw",
  photos: "Image",
  added: "PlusCircle",
  removed: "Trash2",
  comment: "MessageSquare",
  created: "FilePlus",
  idle_autosave: "Clock",
  autosave: "Save",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Body({ e }: { e: HistoryEntry }) {
  if (e.field === "created") {
    return <p className="text-sm text-foreground">Предписание {e.newValue} создано</p>;
  }
  if (e.field === "autosave") {
    return <p className="text-sm text-foreground">{e.newValue || "Изменения сохранены автоматически"}</p>;
  }
  if (e.field === "idle_autosave") {
    return <p className="text-sm text-foreground">{e.newValue || "Нет действий 30 минут, пункты сохранены как черновик"}</p>;
  }
  if (e.field === "added") {
    return <p className="text-sm text-foreground">{e.newValue || "Без описания"}</p>;
  }
  if (e.field === "removed") {
    return <p className="text-sm text-muted-foreground line-through">{e.oldValue || "Без описания"}</p>;
  }
  if (e.field === "comment") {
    return (
      <div className="text-sm text-foreground space-y-1">
        {e.newValue && <p className="whitespace-pre-wrap">{e.newValue}</p>}
        {Number(e.oldValue) > 0 && <p className="text-xs text-muted-foreground">Вложений: {e.oldValue}</p>}
      </div>
    );
  }
  if (e.field === "photos") {
    const o = Number(e.oldValue) || 0;
    const n = Number(e.newValue) || 0;
    const text = n > o ? `Добавлено фото: ${n - o}` : n < o ? `Удалено фото: ${o - n}` : "Фото изменено (отредактировано)";
    return <p className="text-sm text-foreground">{text} (было {o}, стало {n})</p>;
  }
  return (
    <div className="text-sm space-y-1">
      <p className="text-muted-foreground line-through opacity-70 whitespace-pre-wrap">{e.oldValue || "—"}</p>
      <p className="text-foreground flex items-start gap-1.5 whitespace-pre-wrap">
        <Icon name="ArrowRight" size={13} className="text-primary flex-shrink-0 mt-0.5" />
        {e.newValue || "—"}
      </p>
    </div>
  );
}

export function PrescriptionHistoryTab({ prescriptionId, comments, refreshKey }: { prescriptionId: string; comments: Comment[]; refreshKey: string | null }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}?type=prescription_history&id=${encodeURIComponent(prescriptionId)}`)
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [prescriptionId, refreshKey, comments.length]);

  const filters = [
    { id: "all", label: "Всё" },
    { id: "general", label: "Общие данные" },
    { id: "remarks", label: "Пункты" },
    { id: "status", label: "Статусы" },
    { id: "comment", label: "Комментарии" },
    { id: "photos", label: "Фото" },
  ];

  const visible = useMemo(() => entries.filter(e => {
    if (filter === "all") return true;
    if (filter === "general") return e.field === "created" || e.field === "idle_autosave" || e.field === "autosave" || e.field.startsWith("g_");
    if (filter === "remarks") return !["status", "comment", "photos", "created", "idle_autosave", "autosave"].includes(e.field) && !e.field.startsWith("g_");
    return e.field === filter;
  }), [entries, filter]);

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Icon name="History" size={28} className="opacity-30" />
          <p className="text-sm">Изменений пока не было</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((e, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Icon name={FIELD_ICONS[e.field] ?? "Pencil"} size={13} />
                  {FIELD_LABELS[e.field] ?? e.field}
                  {e.remarkNumber != null && e.field !== "comment" && (
                    <span className="text-muted-foreground font-normal">· пункт {e.remarkNumber}</span>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{fmtDate(e.changedAt)}</span>
              </div>
              <Body e={e} />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Icon name="User" size={11} />
                {e.changedByName || e.changedBy || "Неизвестный пользователь"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
