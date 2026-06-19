import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { AppUser } from "@/lib/auth";
import {
  Remark, Prescription, Status, ALL_STATUSES,
  newRemark, detectGenderFromName, declinePosition, toInstrumental,
} from "@/lib/prescriptionTypes";

// --- Базовые UI-элементы ---
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

export function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 ${props.className ?? ""}`}
    />
  );
}

export function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none ${props.className ?? ""}`}
    />
  );
}

export function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 ${props.className ?? ""}`}
    />
  );
}

export function DatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected: Date | undefined = (() => {
    if (!value) return undefined;
    const d = parse(value, "dd.MM.yyyy", new Date());
    return isValid(d) ? d : undefined;
  })();

  const handleSelect = (day: Date | undefined) => {
    if (day) { onChange(format(day, "dd.MM.yyyy")); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-foreground/30 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || (placeholder ?? "Выбрать дату")}
        </span>
        <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl animate-fade-in">
          <Calendar mode="single" selected={selected} onSelect={handleSelect} locale={ru} initialFocus />
        </div>
      )}
    </div>
  );
}

const UPLOAD_URL = "https://functions.poehali.dev/b1d2899a-a609-43c1-81e8-34e4c4922136";
const MAX_PHOTOS = 3;
const MAX_PHOTO_SIZE = 1.5 * 1024 * 1024;

// --- Строка замечания ---
function RemarkRow({
  remark, index, onChange, onRemove, canRemove,
}: {
  remark: Remark; index: number; onChange: (r: Remark) => void; onRemove: () => void; canRemove: boolean;
}) {
  const set = (key: keyof Remark, val: string) => onChange({ ...remark, [key]: val });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const photos = remark.photos ?? [];

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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    onChange({ ...remark, photos: [...photos, ...urls] });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    onChange({ ...remark, photos: photos.filter((_, i) => i !== idx) });
  };

  return (
    <div className="border border-border rounded-xl p-8 space-y-6 bg-secondary/20 relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Замечание #{index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
            <Icon name="Trash2" size={18} />
          </button>
        )}
      </div>
      <Field label="Место нарушения">
        <InputBase value={remark.place} onChange={e => set("place", e.target.value)} placeholder="Например: Эвакуационный выход №2" />
      </Field>
      <Field label="Описание нарушения *">
        <TextareaBase value={remark.description} onChange={e => set("description", e.target.value)} placeholder="Опишите выявленное нарушение" rows={4} />
      </Field>

      {/* Фото нарушения */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {photos.map((url, i) => (
            <div key={i} className="relative group w-28 h-28 rounded-lg overflow-hidden border border-border flex-shrink-0">
              <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Icon name="X" size={18} className="text-white" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-28 h-28 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary flex-shrink-0"
            >
              {uploading
                ? <Icon name="Loader2" size={22} className="animate-spin" />
                : <Icon name="Camera" size={22} />}
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

      <Field label="Ссылка на нормативный документ">
        <TextareaBase value={remark.normRef} onChange={e => set("normRef", e.target.value)} placeholder="Например: ППР РФ п. 24" rows={4} />
      </Field>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Срок устранения *">
          <DatePicker value={remark.deadline} onChange={v => set("deadline", v)} placeholder="Выбрать дату" />
        </Field>
        <Field label="Статус">
          <SelectBase value={remark.status} onChange={e => set("status", e.target.value as Status)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </SelectBase>
        </Field>
      </div>
    </div>
  );
}

// --- Форма добавления ---
interface FormState {
  object: string;
  contractor: string;
  representative: string;
  replyEmail: string;
  reportDeadline: string;
  remarks: Remark[];
}

export function AddForm({ onClose, onSave, user }: { onClose: () => void; onSave: (p: Prescription) => Promise<void>; user: AppUser }) {
  const isMale = user.name ? detectGenderFromName(user.name) : true;
  const inspectorPosition = user.position ? declinePosition(user.position, isMale) : "";
  const inspectorName = user.name ? toInstrumental(user.name) : "";
  const inspectorLabel = [inspectorPosition, inspectorName].filter(Boolean).join(" ");

  const [form, setForm] = useState<FormState>({
    object: "", contractor: "", representative: "", replyEmail: "", reportDeadline: "", remarks: [newRemark()],
  });

  const setField = (key: keyof Omit<FormState, "remarks">, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const updateRemark = (index: number, r: Remark) =>
    setForm(prev => ({ ...prev, remarks: prev.remarks.map((x, i) => i === index ? r : x) }));

  const addRemark = () =>
    setForm(prev => ({ ...prev, remarks: [...prev.remarks, newRemark()] }));

  const removeRemark = (index: number) =>
    setForm(prev => ({ ...prev, remarks: prev.remarks.filter((_, i) => i !== index) }));

  const isValid =
    form.object.trim() &&
    form.contractor.trim() &&
    form.reportDeadline &&
    form.remarks.every(r => r.description.trim() && r.deadline);

  const handleSave = async () => {
    if (!isValid) return;
    const now = new Date();
    await onSave({
      id: Date.now().toString(),
      number: "",
      date: now.toLocaleDateString("ru-RU"),
      object: form.object,
      contractor: form.contractor,
      inspector: inspectorLabel,
      representative: form.representative,
      responsible: "",
      replyEmail: form.replyEmail,
      reportDeadline: form.reportDeadline,
      remarks: form.remarks,
      comments: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-[1344px] shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-12 py-8 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-semibold">Новое предписание</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={22} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-12 py-10 space-y-10">
          <div className="space-y-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Общие сведения</p>
            <div className="grid grid-cols-2 gap-6">
              <Field label="Объект *">
                <InputBase value={form.object} onChange={e => setField("object", e.target.value)} placeholder="Например: Цех №3" />
              </Field>
              <Field label="Подрядчик *">
                <InputBase value={form.contractor} onChange={e => setField("contractor", e.target.value)} placeholder="Название организации или ИП" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Field label="Проверка проведена">
                <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground min-h-[44px]">
                  <Icon name="UserCheck" size={15} className="text-primary flex-shrink-0" />
                  <span className="truncate">{inspectorLabel || <span className="text-muted-foreground italic">Заполните профиль</span>}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Заполняется автоматически из вашей учётной записи</p>
              </Field>
              <Field label="В присутствии представителя подрядчика">
                <InputBase value={form.representative} onChange={e => setField("representative", e.target.value)} placeholder="ФИО представителя подрядчика" />
              </Field>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Замечания <span className="text-primary ml-1">{form.remarks.length}</span>
              </p>
            </div>
            {form.remarks.map((r, i) => (
              <RemarkRow
                key={r.id} remark={r} index={i}
                onChange={updated => updateRemark(i, updated)}
                onRemove={() => removeRemark(i)}
                canRemove={form.remarks.length > 1}
              />
            ))}
            <button
              onClick={addRemark}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-5 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Icon name="Plus" size={16} />
              Добавить замечание
            </button>
          </div>
          <div className="border-t border-border pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Срок предоставления отчёта *">
                <DatePicker value={form.reportDeadline} onChange={v => setField("reportDeadline", v)} placeholder="Выбрать дату" />
              </Field>
              <Field label="Электронная почта для ответа">
                <InputBase type="email" value={form.replyEmail} onChange={e => setField("replyEmail", e.target.value)} placeholder="example@company.ru" />
              </Field>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 px-12 py-6 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="text-base px-8 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="text-base px-10 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Создать предписание
          </button>
        </div>
      </div>
    </div>
  );
}