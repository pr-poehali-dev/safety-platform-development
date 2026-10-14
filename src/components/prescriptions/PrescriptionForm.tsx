import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import {
  Remark, Prescription,
  newRemark, detectGenderFromName, declinePosition, toInstrumental,
  ConflictError,
} from "@/lib/prescriptionTypes";
import { Field, InputBase, TextareaBase, SelectBase, DatePicker } from "./form/FormControls";
import { RemarkRow } from "./form/RemarkRow";
import { GeneralInfoSection, FormState } from "./form/GeneralInfoSection";

export { Field, InputBase, TextareaBase, SelectBase, DatePicker };

const PRESCRIPTIONS_URL = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const CATEGORIES_URL = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const OBJECTS_URL = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const CONTRACTORS_URL = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";
const MAX_REMARKS = 100;
const SUSPENSIONS_URL = "https://functions.poehali.dev/bcc14bec-45e7-4857-867d-95233fa38b64";

const REMARK_FIELDS: (keyof Remark)[] = [
  "place", "category", "description", "normRef", "deadline", "status", "photos",
  "work_suspended", "suspension_act_drawn", "suspension_act_number",
];
const FORM_FIELDS = ["object", "contractor", "contractNumber", "representative", "replyEmail", "reportDeadline"] as const;
const FORM_FIELD_LABELS: Record<string, string> = {
  object: "Объект", contractor: "Подрядчик", contractNumber: "Номер договора",
  representative: "Представитель", replyEmail: "Почта для ответа", reportDeadline: "Срок отчёта",
};

const sameVal = (a: unknown, b: unknown) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

const toFormState = (p: Prescription): FormState => ({
  object: p.object,
  contractor: p.contractor,
  contractNumber: p.contractNumber || "",
  representative: p.representative || "",
  representativeEnabled: !!p.representative,
  replyEmail: p.replyEmail,
  reportDeadline: p.reportDeadline,
  remarks: p.remarks.map(r => ({ ...r })),
});

type Highlight = { kind: "changed" | "added" | "conflict" | "removed"; fields: string[]; server?: Remark };

function mergeWithServer(base: FormState, mine: FormState, fresh: FormState) {
  const highlights: Record<string, Highlight> = {};
  const generalNotes: string[] = [];
  const merged: FormState = { ...mine };

  for (const key of FORM_FIELDS) {
    const serverChanged = !sameVal(base[key], fresh[key]);
    const iChanged = !sameVal(base[key], mine[key]);
    if (serverChanged && !iChanged) {
      merged[key] = fresh[key];
      generalNotes.push(`${FORM_FIELD_LABELS[key]}: обновлено с сервера`);
    } else if (serverChanged && iChanged && !sameVal(mine[key], fresh[key])) {
      generalNotes.push(`${FORM_FIELD_LABELS[key]}: оставлена ваша версия (на сервере другое значение: «${fresh[key] || "—"}»)`);
    }
  }
  merged.representativeEnabled = !!merged.representative || mine.representativeEnabled;

  const baseById = new Map(base.remarks.map(r => [r.id, r]));
  const mineById = new Map(mine.remarks.map(r => [r.id, r]));
  const freshById = new Map(fresh.remarks.map(r => [r.id, r]));
  const result: Remark[] = [];

  for (const mr of mine.remarks) {
    const br = baseById.get(mr.id);
    const fr = freshById.get(mr.id);
    if (!br) { result.push(mr); continue; }
    if (!fr) {
      const iEdited = REMARK_FIELDS.some(f => !sameVal(br[f], mr[f]));
      if (iEdited) {
        highlights[mr.id] = { kind: "removed", fields: [] };
        result.push(mr);
      } else {
        highlights[mr.id] = { kind: "removed", fields: [] };
      }
      continue;
    }
    const out: Remark = { ...mr };
    const serverFields: string[] = [];
    const conflictFields: string[] = [];
    for (const f of REMARK_FIELDS) {
      const sc = !sameVal(br[f], fr[f]);
      if (!sc) continue;
      const ic = !sameVal(br[f], mr[f]);
      if (!ic) {
        (out as unknown as Record<string, unknown>)[f] = fr[f];
        serverFields.push(f);
      } else if (!sameVal(mr[f], fr[f])) {
        conflictFields.push(f);
      }
    }
    if (conflictFields.length) highlights[mr.id] = { kind: "conflict", fields: [...serverFields, ...conflictFields], server: { ...fr } };
    else if (serverFields.length) highlights[mr.id] = { kind: "changed", fields: serverFields };
    result.push(out);
  }

  for (const fr of fresh.remarks) {
    if (!baseById.has(fr.id) && !mineById.has(fr.id)) {
      result.push({ ...fr });
      highlights[fr.id] = { kind: "added", fields: [] };
    }
  }

  const removedNotes = base.remarks.filter(r => !freshById.has(r.id) && mineById.has(r.id) === false).length;
  merged.remarks = result.length ? result : mine.remarks;
  return { merged, highlights, generalNotes, removedByServer: removedNotes };
}

// --- Форма добавления / редактирования ---
export function AddForm({ onClose, onSave, user, editPrescription }: { onClose: () => void; onSave: (p: Prescription) => Promise<void>; user: AppUser; editPrescription?: Prescription | null }) {
  const isMale = user.name ? detectGenderFromName(user.name) : true;
  const inspectorPosition = user.position ? declinePosition(user.position, isMale) : "";
  const inspectorName = user.name ? toInstrumental(user.name) : "";
  const inspectorLabel = editPrescription ? editPrescription.inspector : [inspectorPosition, inspectorName].filter(Boolean).join(" ");
  const inspectorNominativeLabel = editPrescription ? (editPrescription.inspectorNominative ?? "") : [user.position || "", user.name || ""].filter(Boolean).join(" ");

  const [categories, setCategories] = useState<string[]>([]);
  const [objectsList, setObjectsList] = useState<{ id: number; name: string; places: { id: number; name: string }[] }[]>([]);
  const [contractorsList, setContractorsList] = useState<{ name: string; contracts: { id: number; contract_number: string }[] }[]>([]);
  const [suspensionNumbers, setSuspensionNumbers] = useState<string[]>([]);
  useEffect(() => {
    fetch(CATEGORIES_URL)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data.map((d: { name: string }) => d.name) : []));
    fetch(OBJECTS_URL)
      .then(r => r.json())
      .then(data => setObjectsList(Array.isArray(data) ? data : []));
    fetch(CONTRACTORS_URL)
      .then(r => r.json())
      .then(data => setContractorsList(Array.isArray(data) ? data : []));
    fetch(SUSPENSIONS_URL)
      .then(r => r.json())
      .then((data: { number: string }[]) => setSuspensionNumbers(Array.isArray(data) ? data.map(s => s.number).filter(Boolean) : []));
  }, []);

  const [form, setForm] = useState<FormState>(() => editPrescription ? {
    object: editPrescription.object,
    contractor: editPrescription.contractor,
    contractNumber: editPrescription.contractNumber || "",
    representative: editPrescription.representative || "",
    representativeEnabled: !!editPrescription.representative,
    replyEmail: editPrescription.replyEmail,
    reportDeadline: editPrescription.reportDeadline,
    remarks: editPrescription.remarks.map(r => ({ ...r })),
  } : {
    object: "", contractor: "", contractNumber: "", representative: "", representativeEnabled: false, replyEmail: "", reportDeadline: "", remarks: [newRemark()],
  });

  const selectedObject = objectsList.find(o => o.name === form.object);
  const availablePlaces = selectedObject ? selectedObject.places.map(p => p.name) : [];

  const setField = (key: keyof Omit<FormState, "remarks">, val: string) =>
    setForm(prev => ({
      ...prev,
      [key]: val,
      ...(key === "contractor" ? { contractNumber: "" } : {}),
      ...(key === "object" ? { remarks: prev.remarks.map(r => ({ ...r, place: "" })) } : {}),
    }));

  const updateRemark = (id: string, r: Remark) =>
    setForm(prev => ({ ...prev, remarks: prev.remarks.map(x => x.id === id ? r : x) }));

  const limitReached = form.remarks.length >= MAX_REMARKS;

  const addRemark = () =>
    setForm(prev => prev.remarks.length >= MAX_REMARKS ? prev : ({ ...prev, remarks: [...prev.remarks, newRemark()] }));

  const removeRemark = (id: string) =>
    setForm(prev => ({ ...prev, remarks: prev.remarks.filter(x => x.id !== id) }));

  const isValid =
    form.object.trim() &&
    form.contractor.trim() &&
    form.reportDeadline &&
    form.replyEmail.trim() &&
    form.remarks.every(r =>
      r.category.trim() &&
      r.description.trim() &&
      r.normRef.trim() &&
      r.deadline
    );

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildPrescription = (asDraft: boolean, force = false, idle = false): Prescription => {
    const now = new Date();
    return {
      id: editPrescription?.id ?? Date.now().toString(),
      number: editPrescription?.number ?? "",
      date: editPrescription?.date ?? now.toLocaleDateString("ru-RU"),
      object: form.object,
      contractor: form.contractor,
      contractNumber: form.contractNumber || undefined,
      inspector: inspectorLabel,
      inspectorNominative: inspectorNominativeLabel,
      representative: form.representative,
      responsible: editPrescription?.responsible ?? "",
      replyEmail: form.replyEmail,
      reportDeadline: form.reportDeadline,
      remarks: asDraft ? form.remarks.map(r => ({ ...r, status: "Черновик" })) : form.remarks,
      comments: editPrescription?.comments ?? [],
      createdBy: editPrescription?.createdBy ?? user.login,
      baseVersion: editId && !force ? baseVersion.current ?? undefined : undefined,
      lockSession: editId ? sessionId : undefined,
      idleAutosave: idle || undefined,
    };
  };

  const editId = editPrescription?.id;
  const baseSnapshot = useRef<FormState | null>(editPrescription ? toFormState(editPrescription) : null);
  const [highlights, setHighlights] = useState<Record<string, Highlight>>({});
  const [mergeNotes, setMergeNotes] = useState<string[]>([]);
  const baseVersion = useRef<string | null>(null);
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [conflict, setConflict] = useState<null | "save" | "draft">(null);

  const fetchVersion = async (): Promise<string | null> => {
    if (!editId) return null;
    try {
      const r = await fetch(`${PRESCRIPTIONS_URL}?type=version&id=${encodeURIComponent(editId)}`);
      const d = await r.json();
      return d.version ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    fetchVersion().then(v => { if (alive && baseVersion.current === null) baseVersion.current = v; });
    const check = async () => {
      if (document.visibilityState !== "visible" || baseVersion.current === null) return;
      const v = await fetchVersion();
      if (alive && v && v !== baseVersion.current) setStale(true);
    };
    const timer = setInterval(check, 20000);
    document.addEventListener("visibilitychange", check);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [editId]);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    const call = async (action: "acquire" | "heartbeat" | "release") => {
      try {
        const r = await fetch(PRESCRIPTIONS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _type: "lock", action, id: editId, sessionId, userLogin: user.login, userName: user.name }),
          keepalive: action === "release",
        });
        return await r.json();
      } catch {
        return null;
      }
    };
    call("acquire").then(d => {
      if (alive && d && d.granted === false) setLockedBy(d.ownerName || "другой пользователь");
    });
    const timer = setInterval(async () => {
      const d = await call("heartbeat");
      if (alive && d && d.granted === false) setLockedBy(d.ownerName || "другой пользователь");
    }, 15000);
    return () => { alive = false; clearInterval(timer); call("release"); };
  }, [editId]);

  const reloadFromServer = async () => {
    try {
      const r = await fetch(`${PRESCRIPTIONS_URL}?full=1`);
      const data: Prescription[] = await r.json();
      const fresh = data.find(x => x.id === editId);
      if (!fresh) throw new Error("not found");
      const freshForm = toFormState(fresh);
      const base = baseSnapshot.current ?? freshForm;
      const { merged, highlights: hl, generalNotes, removedByServer } = mergeWithServer(base, form, freshForm);
      setForm(merged);
      setHighlights(hl);
      const notes = [...generalNotes];
      const nChanged = Object.values(hl).filter(h => h.kind === "changed" || h.kind === "conflict").length;
      const nAdded = Object.values(hl).filter(h => h.kind === "added").length;
      const nRemoved = Object.values(hl).filter(h => h.kind === "removed").length;
      if (nChanged) notes.push(`Изменены на сервере пункты: ${nChanged}`);
      if (nAdded) notes.push(`Добавлены на сервере пункты: ${nAdded}`);
      if (nRemoved || removedByServer) notes.push(`Удалены на сервере пункты: ${nRemoved || removedByServer} (ваши правки в них сохранены, проверьте)`);
      setMergeNotes(notes);
      baseSnapshot.current = freshForm;
      baseVersion.current = await fetchVersion();
      setStale(false);
      setConflict(null);
      setShowCloseConfirm(false);
    } catch {
      setSaveError("Не удалось обновить данные. Проверьте соединение и попробуйте ещё раз.");
    }
  };

  const doSave = async (asDraft: boolean, force: boolean, idle = false) => {
    if (isSaving) return;
    setSaveError(null);
    if (editId && !force) {
      const v = await fetchVersion();
      if (v && baseVersion.current && v !== baseVersion.current) {
        setStale(true);
        setConflict(asDraft ? "draft" : "save");
        return;
      }
    }
    setConflict(null);
    setIsSaving(true);
    try {
      await onSave(buildPrescription(asDraft, force, idle));
      onClose();
    } catch (e) {
      if (e instanceof ConflictError) {
        setStale(true);
        setConflict(asDraft ? "draft" : "save");
        return;
      }
      setSaveError(asDraft
        ? "Не удалось сохранить черновик. Проверьте соединение и попробуйте ещё раз."
        : "Не удалось сохранить предписание. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  const IDLE_LIMIT_MS = 30 * 60 * 1000;
  const IDLE_WARN_MS = 28 * 60 * 1000;
  const lastActivity = useRef(Date.now());
  const idleAction = useRef<() => void>(() => {});
  const [idleWarning, setIdleWarning] = useState(false);

  idleAction.current = () => {
    const hasContent = !!editId || !!form.object;
    if (lockedBy || !hasContent) { onClose(); return; }
    doSave(true, true, true);
  };

  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
      setIdleWarning(false);
    };
    const events = ["keydown", "input", "change", "paste", "pointerdown"];
    events.forEach(e => document.addEventListener(e, touch, true));
    const timer = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_LIMIT_MS) {
        clearInterval(timer);
        idleAction.current();
      } else {
        setIdleWarning(idle >= IDLE_WARN_MS);
      }
    }, 10000);
    return () => {
      events.forEach(e => document.removeEventListener(e, touch, true));
      clearInterval(timer);
    };
  }, []);

  const handleSave = () => { if (isValid) doSave(false, false); };
  const handleSaveDraft = () => doSave(true, false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-[1344px] shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-12 py-8 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-semibold">{editPrescription ? "Редактирование предписания" : "Новое предписание"}</h2>
          <button onClick={() => setShowCloseConfirm(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={22} />
          </button>
        </div>
        {stale && (
          <div className="flex items-center gap-3 px-12 py-3 bg-amber-500/15 border-b border-amber-500/40 text-sm flex-shrink-0">
            <Icon name="TriangleAlert" size={16} />
            <span className="flex-1">Это предписание изменили на другом компьютере. Обновите данные, чтобы не потерять чужие правки ваши несохранённые правки сохранятся, а изменённые на сервере пункты будут подсвечены.</span>
            <button onClick={reloadFromServer} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Обновить</button>
          </div>
        )}
        {mergeNotes.length > 0 && (
          <div className="px-12 py-3 bg-sky-500/10 border-b border-sky-500/30 text-sm flex-shrink-0 flex items-start gap-3">
            <Icon name="Info" size={16} className="mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <p className="font-medium">Данные обновлены, ваши правки сохранены</p>
              {mergeNotes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
            </div>
            <button onClick={() => { setMergeNotes([]); setHighlights({}); }} className="text-xs text-muted-foreground hover:text-foreground">Скрыть</button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-12 py-10 space-y-10">
          <GeneralInfoSection
            form={form}
            setField={setField}
            setForm={setForm}
            objectsList={objectsList}
            contractorsList={contractorsList}
            inspectorLabel={inspectorLabel}
          />
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Замечания <span className="text-primary ml-1">{form.remarks.length}</span><span className="ml-1 normal-case font-normal">из {MAX_REMARKS}</span>
              </p>
            </div>
            {form.remarks.map((r, i) => (
              <RemarkRow
                key={r.id} remark={r} index={i}
                onChange={updated => updateRemark(r.id, updated)}
                onRemove={() => removeRemark(r.id)}
                canRemove={form.remarks.length > 1}
                categories={categories}
                places={availablePlaces}
                suspensionNumbers={suspensionNumbers}
                highlight={highlights[r.id]}
                onTakeServer={() => {
                  const server = highlights[r.id]?.server;
                  if (!server) return;
                  updateRemark(r.id, { ...server });
                  setHighlights(prev => { const next = { ...prev }; delete next[r.id]; return next; });
                }}
              />
            ))}
            <button
              onClick={addRemark}
              disabled={limitReached}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-5 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:border-border"
            >
              <Icon name="Plus" size={16} />
              {limitReached ? `Достигнут лимит: ${MAX_REMARKS} замечаний в одном предписании` : "Добавить замечание"}
            </button>
          </div>
          <div className="border-t border-border pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Срок предоставления отчёта *">
                <DatePicker value={form.reportDeadline} onChange={v => setField("reportDeadline", v)} placeholder="Выбрать дату" />
              </Field>
              <Field label="Электронная почта для ответа *">
                <InputBase type="email" value={form.replyEmail} onChange={e => setField("replyEmail", e.target.value)} placeholder="example@company.ru" />
              </Field>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 px-12 py-6 border-t border-border flex-shrink-0">
          {saveError && (
            <p className="text-sm text-red-400 mr-auto flex items-center gap-1.5">
              <Icon name="AlertTriangle" size={15} />
              {saveError}
            </p>
          )}
          <button onClick={() => setShowCloseConfirm(true)} className="text-base px-8 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="text-base px-10 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Сохранение..." : editPrescription ? "Сохранить изменения" : "Создать предписание"}
          </button>
        </div>
      </div>

      {idleWarning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-card border border-border rounded-lg shadow-2xl px-5 py-3 text-sm animate-fade-in">
          Нет действий почти 30 минут. Предписание будет сохранено как черновик и закроется. Нажмите любую клавишу, чтобы продолжить.
        </div>
      )}

      {lockedBy && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 animate-fade-in space-y-4">
            <h3 className="text-lg font-semibold">Предписание занято</h3>
            <p className="text-sm text-muted-foreground">
              С данным предписанием работает {lockedBy}, одновременная работа двух пользователей невозможна.
            </p>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Понятно</button>
            </div>
          </div>
        </div>
      )}

      {conflict && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 animate-fade-in space-y-4">
            <h3 className="text-lg font-semibold">Предписание уже изменено</h3>
            <p className="text-sm text-muted-foreground">
              Пока вы его редактировали, его изменили с другого компьютера. Рекомендуем обновить данные: ваши правки сохранятся, а изменённые на сервере пункты будут подсвечены. Если сохранить без обновления, чужие изменения могут быть перезаписаны.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConflict(null)} className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Назад</button>
              <button onClick={() => doSave(conflict === "draft", true)} className="px-4 py-2 rounded-md border border-border text-sm">Сохранить всё равно</button>
              <button onClick={reloadFromServer} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Обновить данные</button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCloseConfirm(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Save" size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Сохранить изменения?</p>
                <p className="text-xs text-muted-foreground mt-1">Предписание будет сохранено как черновик. Вы сможете вернуться к нему позже.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex-1 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? "Сохранение..." : "Да"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}