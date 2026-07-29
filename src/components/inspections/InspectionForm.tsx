import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { InspectionFormData, ContractorItem, inp, lbl } from "./types";

const UPLOAD_URL = "https://functions.poehali.dev/b1d2899a-a609-43c1-81e8-34e4c4922136";
const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 1.5 * 1024 * 1024;
const MAX_PHOTO_WIDTH = 600;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = img.width > MAX_PHOTO_WIDTH ? MAX_PHOTO_WIDTH / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
  const set = (key: keyof InspectionFormData, val: string | number | boolean | string[]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = form.photos ?? [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const oversized = Array.from(files).filter(f => f.size > MAX_PHOTO_SIZE);
    if (oversized.length > 0) {
      alert(`Файл "${oversized[0].name}" превышает допустимый размер 1,5 МБ.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    const toUpload = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const file of toUpload) {
      const dataUrl = await resizeImage(file);
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    set("photos", [...photos, ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    set("photos", photos.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const noteRequired = form.violation_type === "Прочее";
  const isValid = form.inspection_date && form.contractor.trim() && form.violation_type && form.object_name.trim() && (!noteRequired || form.note.trim())
    && form.remarks_count >= 1 && form.remarks_count <= 15;
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
              <label className={lbl}>Количество замечаний *</label>
              <input
                type="number" min={1} max={15} value={form.remarks_count}
                onChange={e => set("remarks_count", Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))}
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

          {/* Фото проверки */}
          <div className="space-y-3">
            <label className={lbl}>Фотографии (не обязательно, до {MAX_PHOTOS})</label>
            <div className="flex items-center gap-3 flex-wrap">
              {photos.map((url, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Icon name="X" size={16} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-24 h-24 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary flex-shrink-0"
                >
                  {uploading
                    ? <Icon name="Loader2" size={20} className="animate-spin" />
                    : <Icon name="Camera" size={20} />}
                  <span className="text-xs leading-tight text-center">
                    {uploading ? "Загрузка" : `Фото\n${photos.length}/${MAX_PHOTOS}`}
                  </span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
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