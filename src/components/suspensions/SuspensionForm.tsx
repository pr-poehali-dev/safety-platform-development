import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import { Suspension, newSuspensionId } from "@/lib/suspensionTypes";
import { Field, InputBase, SelectBase, TextareaBase } from "@/components/prescriptions/form/FormControls";

const OBJECTS_URL = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const CONTRACTORS_URL = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";

const MAX_REASON_LENGTH = 1000;

function nowLocalDatetime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SuspensionForm({ onClose, onSave, user }: {
  onClose: () => void;
  onSave: (s: Suspension) => Promise<void>;
  user: AppUser;
}) {
  const issuedBy = [user.position, user.name].filter(Boolean).join(", ");

  const [objectsList, setObjectsList] = useState<{ id: number; name: string; places: { id: number; name: string }[] }[]>([]);
  const [contractorsList, setContractorsList] = useState<{ name: string }[]>([]);
  const [issuedAtLocal, setIssuedAtLocal] = useState(nowLocalDatetime());
  const [object, setObject] = useState("");
  const [place, setPlace] = useState("");
  const [contractor, setContractor] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    fetch(OBJECTS_URL).then(r => r.json()).then(data => setObjectsList(Array.isArray(data) ? data : []));
    fetch(CONTRACTORS_URL).then(r => r.json()).then(data => setContractorsList(Array.isArray(data) ? data : []));
  }, []);

  const selectedObject = objectsList.find(o => o.name === object);
  const availablePlaces = selectedObject ? selectedObject.places.map(p => p.name) : [];

  const isValid = object.trim() && place.trim() && contractor.trim() && reason.trim();

  const build = (): Suspension => ({
    id: newSuspensionId(),
    number: "",
    issuedAt: new Date(issuedAtLocal).toISOString(),
    object,
    place,
    contractor,
    issuedBy,
    reason,
    status: "Приостановлено",
    createdBy: user.login,
  });

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(build());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-8 py-6 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-semibold">Выдать акт о приостановке</h2>
          <button onClick={() => (isValid ? setShowCloseConfirm(true) : onClose())} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={22} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-8 space-y-6">
          <Field label="Дата и время выдачи *">
            <InputBase type="datetime-local" value={issuedAtLocal} onChange={e => setIssuedAtLocal(e.target.value)} />
          </Field>

          <Field label="Объект *">
            <SelectBase value={object} onChange={e => { setObject(e.target.value); setPlace(""); }}>
              <option value="">— Выберите объект —</option>
              {objectsList.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
            </SelectBase>
          </Field>

          <Field label="Место нарушения *">
            <SelectBase value={place} onChange={e => setPlace(e.target.value)} disabled={availablePlaces.length === 0}>
              <option value="">{availablePlaces.length === 0 ? "— Сначала выберите объект —" : "— Выберите место нарушения —"}</option>
              {availablePlaces.map(p => <option key={p} value={p}>{p}</option>)}
            </SelectBase>
          </Field>

          <Field label="Подрядная организация *">
            <SelectBase value={contractor} onChange={e => setContractor(e.target.value)}>
              <option value="">— Выберите подрядчика —</option>
              {contractorsList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </SelectBase>
          </Field>

          <Field label="Выдал">
            <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground min-h-[44px]">
              <Icon name="UserCheck" size={15} className="text-primary flex-shrink-0" />
              <span className="truncate">{issuedBy || <span className="text-muted-foreground italic">Заполните профиль</span>}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Заполняется автоматически из вашей учётной записи</p>
          </Field>

          <Field label="Причина приостановки *">
            <TextareaBase
              value={reason}
              onChange={e => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
              placeholder="Опишите причину приостановки работ"
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{reason.length}/{MAX_REASON_LENGTH}</p>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-border flex-shrink-0">
          <button onClick={() => (isValid ? setShowCloseConfirm(true) : onClose())} className="text-base px-8 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="text-base px-10 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Сохранение..." : "Выдать акт"}
          </button>
        </div>
      </div>

      {showCloseConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCloseConfirm(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="TriangleAlert" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Закрыть без сохранения?</p>
                <p className="text-xs text-muted-foreground mt-1">Введённые данные не будут сохранены.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCloseConfirm(false)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                Нет
              </button>
              <button type="button" onClick={onClose} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">
                Да, закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}