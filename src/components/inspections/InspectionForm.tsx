import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { InspectionFormData, ContractorItem, inp, lbl } from "./types";

interface Props {
  initial: InspectionFormData;
  inspectorName: string;
  categories: string[];
  objects: string[];
  contractors: ContractorItem[];
  onSave: (data: InspectionFormData) => void;
  onCancel: () => void;
  saving: boolean;
}

export default function InspectionForm({
  initial, inspectorName, categories, objects, contractors, onSave, onCancel, saving,
}: Props) {
  const [form, setForm] = useState<InspectionFormData>(initial);
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const set = (key: keyof InspectionFormData, val: string | number | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const noteRequired = form.violation_type === "Прочее";
  const isValid = form.inspection_date && form.contractor.trim() && form.violation_type && form.object_name.trim() && (!noteRequired || form.note.trim());
  const selectedContractor = contractors.find(c => c.name === form.contractor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Новая запись в журнал проверок</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div ref={calRef} className="relative">
              <label className={lbl}>Дата проверки *</label>
              <button
                type="button"
                onClick={() => setCalOpen(o => !o)}
                className={inp + " flex items-center gap-2 cursor-pointer text-left"}
              >
                <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
                {form.inspection_date
                  ? format(parseISO(form.inspection_date), "d MMMM yyyy", { locale: ru })
                  : <span className="text-muted-foreground">Выберите дату</span>}
              </button>
              {calOpen && (
                <div className="absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  <DayPicker
                    mode="single"
                    locale={ru}
                    selected={form.inspection_date ? parseISO(form.inspection_date) : undefined}
                    onSelect={day => {
                      if (day) { set("inspection_date", format(day, "yyyy-MM-dd")); setCalOpen(false); }
                    }}
                    defaultMonth={form.inspection_date ? parseISO(form.inspection_date) : new Date()}
                    styles={{
                      root: { margin: 0, padding: "8px 12px", fontSize: "13px" },
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className={lbl}>Проверяющий</label>
              <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground min-h-[38px]">
                <Icon name="UserCheck" size={13} className="text-primary flex-shrink-0" />
                <span className="truncate text-sm">{inspectorName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>ПО (подрядчик) *</label>
              <select value={form.contractor} onChange={e => set("contractor", e.target.value)} className={inp}>
                <option value="">— Выберите подрядчика —</option>
                {contractors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              {selectedContractor && selectedContractor.contracts.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedContractor.contracts.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                      <Icon name="FileText" size={10} />
                      № {c.contract_number}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={lbl}>Проверяемый объект *</label>
              <select value={form.object_name} onChange={e => set("object_name", e.target.value)} className={inp}>
                <option value="">— Выберите объект —</option>
                {objects.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Вид нарушения *</label>
            <select value={form.violation_type} onChange={e => set("violation_type", e.target.value)} className={inp}>
              <option value="">— Выберите вид нарушения —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Количество замечаний</label>
              <input
                type="number" min={0} value={form.remarks_count}
                onChange={e => set("remarks_count", Math.max(0, parseInt(e.target.value) || 0))}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Работы приостановлены</label>
              <select value={form.works_suspended ? "yes" : "no"} onChange={e => set("works_suspended", e.target.value === "yes")} className={inp}>
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>
              Примечание{" "}
              {noteRequired
                ? <span className="text-red-400">*</span>
                : <span className="text-muted-foreground/60">(не обязательно, до 300 символов)</span>}
            </label>
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value.slice(0, 300))}
              placeholder={noteRequired ? "Укажите подробности нарушения..." : "Дополнительная информация..."}
              rows={3}
              className={inp + " resize-none" + (noteRequired && !form.note.trim() ? " border-red-400/60 focus:ring-red-400/50" : "")}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">{form.note.length}/300</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onCancel} className="text-sm px-5 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!isValid || saving}
            className="text-sm px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Сохранение..." : "Добавить запись"}
          </button>
        </div>
      </div>
    </div>
  );
}