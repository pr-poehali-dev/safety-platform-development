import { useState } from "react";
import Icon from "@/components/ui/icon";
import { RoutineCategory } from "@/lib/routineTypes";

interface RoutineEntryModalProps {
  categories: RoutineCategory[];
  defaultDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSave: (payload: { category_id: number | null; category_name: string; entry_date: string; hours: number; comment: string }) => Promise<void>;
}

export default function RoutineEntryModal({ categories, defaultDate, onClose, onSave }: RoutineEntryModalProps) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(defaultDate);
  const [hours, setHours] = useState(1);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = categories.find(c => String(c.id) === categoryId);

  const clampHours = (v: number) => Math.min(24, Math.max(0.5, Math.round(v * 2) / 2));

  const handleSave = async () => {
    if (!categoryId) { setError("Выберите вид деятельности"); return; }
    if (!entryDate) { setError("Укажите дату"); return; }
    setError("");
    setSaving(true);
    try {
      await onSave({
        category_id: selectedCategory?.id ?? null,
        category_name: selectedCategory?.name ?? "",
        entry_date: entryDate,
        hours,
        comment: comment.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Регистрация рутинной работы</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Вид деятельности <span className="text-red-400">*</span></label>
            <select
              className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">— Выберите вид деятельности —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Список пуст. Обратитесь к администратору для настройки справочника «Рутина: вид деятельности».</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Дата ведения</label>
            <input
              type="date"
              className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Затраченное время (часы)</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHours(h => clampHours(h - 0.5))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <Icon name="Minus" size={14} />
              </button>
              <input
                type="number"
                step={0.5}
                min={0.5}
                max={24}
                value={hours}
                onChange={e => setHours(clampHours(Number(e.target.value) || 0.5))}
                className="w-full text-sm text-center bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setHours(h => clampHours(h + 0.5))}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <Icon name="Plus" size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Краткий комментарий</label>
            <textarea
              className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Что было сделано..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Отмена
          </button>
          <button disabled={saving} onClick={handleSave} className="flex-1 text-sm py-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity font-medium">
            {saving ? "Сохранение..." : "Сохранить отчёт"}
          </button>
        </div>
      </div>
    </div>
  );
}
