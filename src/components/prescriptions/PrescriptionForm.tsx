import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import {
  Remark, Prescription,
  newRemark, detectGenderFromName, declinePosition, toInstrumental,
  ConflictError,
} from "@/lib/prescriptionTypes";
import { Field, InputBase, TextareaBase, SelectBase, DatePicker } from "./form/FormControls";
import { GeneralInfoSection, FormState } from "./form/GeneralInfoSection";
import { Highlight, MAX_REMARKS, toFormState, mergeWithServer } from "./form/formMerge";
import FormBanners from "./form/FormBanners";
import FormRemarksSection from "./form/FormRemarksSection";
import FormDialogs from "./form/FormDialogs";

export { Field, InputBase, TextareaBase, SelectBase, DatePicker };

const PRESCRIPTIONS_URL = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const CATEGORIES_URL = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const OBJECTS_URL = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const CONTRACTORS_URL = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";
const SUSPENSIONS_URL = "https://functions.poehali.dev/bcc14bec-45e7-4857-867d-95233fa38b64";

// --- Форма добавления / редактирования ---
export function AddForm({ onClose, onSave, onAutoSave, user, editPrescription }: { onClose: () => void; onSave: (p: Prescription) => Promise<void>; onAutoSave?: (p: Prescription) => Promise<void>; user: AppUser; editPrescription?: Prescription | null }) {
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

  const buildPrescription = (asDraft: boolean, force = false, idle = false, auto = false): Prescription => {
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
      autoSave: auto || undefined,
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
    if (isSaving || autoSaving.current) return;
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

  const AUTOSAVE_INTERVAL_MS = 360 * 1000;
  const autoSaving = useRef(false);
  const lastSavedJson = useRef(JSON.stringify(form));
  const autoSaveAction = useRef<() => void>(() => {});
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);

  autoSaveAction.current = async () => {
    if (!editId || !onAutoSave || isSaving || autoSaving.current || lockedBy || stale || conflict || showCloseConfirm) return;
    const json = JSON.stringify(form);
    if (json === lastSavedJson.current) return;
    autoSaving.current = true;
    try {
      const v = await fetchVersion();
      if (v && baseVersion.current && v !== baseVersion.current) {
        setStale(true);
        return;
      }
      await onAutoSave(buildPrescription(false, false, false, true));
      lastSavedJson.current = json;
      baseSnapshot.current = { ...form, remarks: form.remarks.map(r => ({ ...r })) };
      baseVersion.current = await fetchVersion();
      setAutoSavedAt(new Date());
    } catch (e) {
      if (e instanceof ConflictError) setStale(true);
    } finally {
      autoSaving.current = false;
    }
  };

  useEffect(() => {
    if (!editId || !onAutoSave) return;
    const timer = setInterval(() => autoSaveAction.current(), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [editId]);

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
        <FormBanners
          stale={stale}
          mergeNotes={mergeNotes}
          onReload={reloadFromServer}
          onHideNotes={() => { setMergeNotes([]); setHighlights({}); }}
        />
        <div className="overflow-y-auto flex-1 px-12 py-10 space-y-10">
          <GeneralInfoSection
            form={form}
            setField={setField}
            setForm={setForm}
            objectsList={objectsList}
            contractorsList={contractorsList}
            inspectorLabel={inspectorLabel}
          />
          <FormRemarksSection
            form={form}
            categories={categories}
            places={availablePlaces}
            suspensionNumbers={suspensionNumbers}
            highlights={highlights}
            setHighlights={setHighlights}
            updateRemark={updateRemark}
            removeRemark={removeRemark}
            addRemark={addRemark}
            limitReached={limitReached}
          />
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
          {!saveError && autoSavedAt && (
            <p className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5">
              <Icon name="Check" size={14} />
              Автосохранено в {autoSavedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
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

      <FormDialogs
        idleWarning={idleWarning}
        lockedBy={lockedBy}
        conflict={conflict}
        showCloseConfirm={showCloseConfirm}
        isSaving={isSaving}
        onClose={onClose}
        onCancelConflict={() => setConflict(null)}
        onSaveAnyway={() => doSave(conflict === "draft", true)}
        onReload={reloadFromServer}
        onDismissCloseConfirm={() => setShowCloseConfirm(false)}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
