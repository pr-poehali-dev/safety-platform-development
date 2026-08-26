import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { EditablePhotoLightbox } from "@/components/ui/ImageAnnotator";
import { Remark, Status, ALL_STATUSES } from "@/lib/prescriptionTypes";
import { Field, SelectBase, TextareaBase, DatePicker } from "./FormControls";

const UPLOAD_URL = "https://functions.poehali.dev/b1d2899a-a609-43c1-81e8-34e4c4922136";
const MAX_PHOTOS = 3;
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

// --- Строка замечания ---
export function RemarkRow({
  remark, index, onChange, onRemove, canRemove, categories, places,
}: {
  remark: Remark; index: number; onChange: (r: Remark) => void; onRemove: () => void; canRemove: boolean; categories: string[]; places: string[];
}) {
  const set = (key: keyof Remark, val: string | boolean) => onChange({ ...remark, [key]: val });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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
      const dataUrl = await resizeImage(file);
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

  const saveEditedPhoto = async (idx: number, dataUrl: string) => {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await res.json();
    if (data.url) {
      onChange({ ...remark, photos: photos.map((p, i) => (i === idx ? data.url : p)) });
    }
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
      <div className="flex gap-4">
        <div style={{ flex: "0 0 50%" }}>
          <Field label="Место нарушения *">
            <SelectBase value={remark.place} onChange={e => set("place", e.target.value)} disabled={places.length === 0}>
              <option value="">{places.length === 0 ? "— Сначала выберите объект —" : "— Выберите место нарушения —"}</option>
              {places.map(p => <option key={p} value={p}>{p}</option>)}
            </SelectBase>
          </Field>
        </div>
        <div style={{ flex: "0 0 30%" }}>
          <Field label="Вид нарушения *">
            <SelectBase value={remark.category} onChange={e => set("category", e.target.value)}>
              <option value="">— Выберите вид нарушения —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </SelectBase>
          </Field>
        </div>
        <div style={{ flex: "0 0 20%" }} className="space-y-3">
          <Field label="Работы приостановлены">
            <SelectBase
              value={remark.work_suspended ? "yes" : "no"}
              onChange={e => {
                const suspended = e.target.value === "yes";
                onChange({ ...remark, work_suspended: suspended, suspension_act_drawn: suspended ? remark.suspension_act_drawn : false });
              }}
            >
              <option value="no">Нет</option>
              <option value="yes">Да</option>
            </SelectBase>
          </Field>
          {remark.work_suspended && (
            <Field label="Составлен акт о приостановке работ">
              <SelectBase value={remark.suspension_act_drawn ? "yes" : "no"} onChange={e => set("suspension_act_drawn", e.target.value === "yes")}>
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </SelectBase>
            </Field>
          )}
        </div>
      </div>
      <Field label="Описание нарушения *">
        <TextareaBase value={remark.description} onChange={e => set("description", e.target.value)} placeholder="Опишите выявленное нарушение" rows={4} />
      </Field>

      {/* Фото нарушения */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {photos.map((url, i) => (
            <div key={i} className="relative group w-28 h-28 rounded-lg overflow-hidden border border-border flex-shrink-0">
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="block w-full h-full"
              >
                <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
              </button>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="pointer-events-auto p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Просмотреть"
                >
                  <Icon name="Eye" size={16} className="text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="pointer-events-auto p-1.5 rounded-full bg-white/10 hover:bg-red-500/60 transition-colors"
                  title="Удалить"
                >
                  <Icon name="Trash2" size={16} className="text-white" />
                </button>
              </div>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`w-28 h-28 rounded-lg border border-dashed transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary flex-shrink-0 ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
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

      {lightboxIndex !== null && (
        <EditablePhotoLightbox photos={photos} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} onSave={saveEditedPhoto} />
      )}

      <Field label="Ссылка на нормативный документ *">
        <TextareaBase value={remark.normRef} onChange={e => set("normRef", e.target.value)} placeholder="Например: ППР РФ п. 24" rows={4} />
      </Field>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Срок устранения *">
          <DatePicker value={remark.deadline} onChange={v => set("deadline", v)} placeholder="Выбрать дату" allowImmediate />
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