import { altaiDate } from "@/lib/altaiTime";
import { useState, useEffect, useRef } from "react";
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
import { useOtherTabOpen } from "./form/useOtherTabOpen";
import { useFormHistory } from "./form/useFormHistory";
import { useFormLookups } from "./form/useFormLookups";
import FormHeader from "./form/FormHeader";
import FormReportSection from "./form/FormReportSection";
import FormFooter from "./form/FormFooter";
import FormRemarksSection from "./form/FormRemarksSection";
import FormDialogs from "./form/FormDialogs";
import RemarkSearchPanel from "./form/RemarkSearchPanel";

export { Field, InputBase, TextareaBase, SelectBase, DatePicker };

const PRESCRIPTIONS_URL = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

// --- Форма добавления / редактирования ---
export function AddForm({ onClose, onSave, onAutoSave, onAutoCreate, onSaveKeepOpen, user, editPrescription }: { onClose: () => void; onSave: (p: Prescription) => Promise<void>; onAutoSave?: (p: Prescription) => Promise<void>; onAutoCreate?: (p: Prescription) => Promise<Prescription>; onSaveKeepOpen?: (p: Prescription) => Promise<void>; user: AppUser; editPrescription?: Prescription | null }) {
  const isMale = user.name ? detectGenderFromName(user.name) : true;
  const inspectorPosition = user.position ? declinePosition(user.position, isMale) : "";
  const inspectorName = user.name ? toInstrumental(user.name) : "";
  const inspectorLabel = editPrescription ? editPrescription.inspector : [inspectorPosition, inspectorName].filter(Boolean).join(" ");
  const inspectorNominativeLabel = editPrescription ? (editPrescription.inspectorNominative ?? "") : [user.position || "", user.name || ""].filter(Boolean).join(" ");

  const { categories, objectsList, contractorsList, suspensionNumbers } = useFormLookups();

  const draftKey = `prescription-new-draft:${user.login}`;
  function loadLocalDraft(): FormState | null {
    if (editPrescription) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const d = JSON.parse(raw) as FormState;
      return d && Array.isArray(d.remarks) && d.remarks.length ? d : null;
    } catch {
      return null;
    }
  }
  const clearLocalDraft = () => { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } };

  const [created, setCreated] = useState<Prescription | null>(null);
  const base = editPrescription ?? created;

  const [form, setForm] = useState<FormState>(() => editPrescription ? {
    object: editPrescription.object,
    contractor: editPrescription.contractor,
    contractNumber: editPrescription.contractNumber || "",
    representative: editPrescription.representative || "",
    representativeEnabled: !!editPrescription.representative,
    replyEmail: editPrescription.replyEmail,
    reportDeadline: editPrescription.reportDeadline,
    remarks: editPrescription.remarks.map(r => ({ ...r })),
  } : (loadLocalDraft() ?? {
    object: "", contractor: "", contractNumber: "", representative: "", representativeEnabled: false, replyEmail: "", reportDeadline: "", remarks: [newRemark()],
  }));

  const { undo, redo, canUndo, canRedo } = useFormHistory(form, setForm);

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

  const [searchOpen, setSearchOpen] = useState(false);

  const insertFoundRemark = (src: Remark) =>
    setForm(prev => {
      const copy: Remark = { ...newRemark(), category: src.category, description: src.description, normRef: src.normRef };
      const last = prev.remarks[prev.remarks.length - 1];
      if (last && !last.description.trim() && !last.category.trim() && !last.normRef.trim()) {
        return { ...prev, remarks: [...prev.remarks.slice(0, -1), { ...last, category: copy.category, description: copy.description, normRef: copy.normRef }] };
      }
      if (prev.remarks.length >= MAX_REMARKS) return prev;
      return { ...prev, remarks: [...prev.remarks, copy] };
    });

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

  const isRemarkComplete = (r: Remark) =>
    !!(r.category.trim() && r.description.trim() && r.normRef.trim() && r.deadline);

  const normalizeRemarkStatuses = (remarks: Remark[]): Remark[] =>
    remarks.map(r => {
      if (!isRemarkComplete(r)) return r.status === "Черновик" ? r : { ...r, status: "Черновик" };
      return r.status === "Черновик" ? { ...r, status: "В работе" } : r;
    });

  const closedLogged = useRef(false);
  const lastEventKey = useRef("");
  const sendFormEvent = (kind: "closed" | "event", reason: string, text = "") => {
    if (!editId) return;
    fetch(PRESCRIPTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "form_event", id: editId, kind, reason, text, changedBy: user.login, changedByName: user.name }),
      keepalive: true,
    }).catch(() => {});
  };
  const logEvent = (reason: string, text = "") => {
    const key = `${reason}:${Math.floor(Date.now() / 60000)}`;
    if (key === lastEventKey.current) return;
    lastEventKey.current = key;
    sendFormEvent("event", reason, text);
  };
  const closeWith = (reason: string) => {
    clearLocalDraft();
    if (!closedLogged.current) {
      closedLogged.current = true;
      sendFormEvent("closed", reason);
    }
    onClose();
  };
  const logSaveFailure = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "";
    if (e instanceof TypeError) logEvent("network", "Нет связи с сервером");
    else if (msg.includes("другой пользователь")) logEvent("locked_save");
    else logEvent("server_error", msg);
  };

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [manualSavedAt, setManualSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildPrescription = (asDraft: boolean, force = false, idle = false, auto = false): Prescription => {
    const now = new Date();
    const keepIds = new Set(form.remarks.map(r => r.id));
    const deletedRemarkIds = baseSnapshot.current
      ? baseSnapshot.current.remarks.filter(r => !keepIds.has(r.id)).map(r => r.id)
      : [];
    return {
      id: base?.id ?? Date.now().toString(),
      number: base?.number ?? "",
      date: base?.date ?? altaiDate(now),
      object: form.object,
      contractor: form.contractor,
      contractNumber: form.contractNumber || undefined,
      inspector: inspectorLabel,
      inspectorNominative: inspectorNominativeLabel,
      representative: form.representative,
      responsible: base?.responsible ?? "",
      replyEmail: form.replyEmail,
      reportDeadline: form.reportDeadline,
      remarks: asDraft ? form.remarks.map(r => ({ ...r, status: "Черновик" })) : form.remarks,
      comments: base?.comments ?? [],
      createdBy: base?.createdBy ?? user.login,
      deletedRemarkIds: force ? [] : deletedRemarkIds,
      baseVersion: editId && !force ? baseVersion.current ?? undefined : undefined,
      lockSession: editId ? sessionId : undefined,
      idleAutosave: idle || undefined,
      autoSave: auto || undefined,
    };
  };

  const editId = base?.id;
  const baseSnapshot = useRef<FormState | null>(editPrescription ? toFormState(editPrescription) : null);
  const [highlights, setHighlights] = useState<Record<string, Highlight>>({});
  const [mergeNotes, setMergeNotes] = useState<string[]>([]);
  const baseVersion = useRef<string | null>(null);
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const otherTabOpen = useOtherTabOpen(editId, sessionId);
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
        logEvent("conflict");
        return;
      }
    }
    setConflict(null);
    setIsSaving(true);
    try {
      await onSave(buildPrescription(asDraft, force, idle));
      closeWith(idle ? "idle" : asDraft ? "button_draft" : "button_save");
    } catch (e) {
      if (e instanceof ConflictError) {
        setStale(true);
        setConflict(asDraft ? "draft" : "save");
        logEvent("conflict");
        return;
      }
      logSaveFailure(e);
      setSaveError(asDraft
        ? "Не удалось сохранить черновик. Проверьте соединение и попробуйте ещё раз."
        : "Не удалось сохранить предписание. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  const doSaveKeepOpen = async () => {
    if (!onSaveKeepOpen || isSaving || autoSaving.current) return;
    if (!form.object.trim() || !form.contractor.trim()) {
      setSaveError("Чтобы сохранить, выберите объект и подрядчика.");
      return;
    }
    setSaveError(null);
    if (editId) {
      const v = await fetchVersion();
      if (v && baseVersion.current && v !== baseVersion.current) {
        setStale(true);
        setConflict("save");
        logEvent("conflict");
        return;
      }
    }
    setIsSaving(true);
    try {
      const normalized = normalizeRemarkStatuses(form.remarks);
      await onSaveKeepOpen({ ...buildPrescription(false, false), remarks: normalized });
      if (!editId) clearLocalDraft();
      if (editId) {
        const nextForm = { ...form, remarks: normalized };
        setForm(nextForm);
        lastSavedJson.current = JSON.stringify(nextForm);
        baseSnapshot.current = { ...nextForm, remarks: normalized.map(r => ({ ...r })) };
        baseVersion.current = await fetchVersion();
        setManualSavedAt(new Date());
        setAutoSavedAt(null);
      }
    } catch (e) {
      if (e instanceof ConflictError) {
        setStale(true);
        setConflict("save");
        logEvent("conflict");
        return;
      }
      logSaveFailure(e);
      setSaveError("Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  const AUTOSAVE_INTERVAL_MS = 60 * 1000;
  const autoSaving = useRef(false);
  const lastSavedJson = useRef(JSON.stringify(form));
  const autoSaveAction = useRef<() => void>(() => {});
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);

  autoSaveAction.current = async () => {
    if (!editId) {
      if (!onAutoCreate || !hasContent || isSaving || autoSaving.current || showCloseConfirm) return;
      const json = JSON.stringify(form);
      autoSaving.current = true;
      try {
        const saved = await onAutoCreate(buildPrescription(true, false, false, true));
        lastSavedJson.current = json;
        baseSnapshot.current = { ...form, remarks: form.remarks.map(r => ({ ...r })) };
        clearLocalDraft();
        setCreated(saved);
        setAutoSavedAt(new Date());
        setManualSavedAt(null);
      } catch (e) {
        logSaveFailure(e);
      } finally {
        autoSaving.current = false;
      }
      return;
    }
    if (!onAutoSave || isSaving || autoSaving.current || lockedBy || stale || otherTabOpen || conflict || showCloseConfirm) return;
    const json = JSON.stringify(form);
    if (json === lastSavedJson.current) return;
    autoSaving.current = true;
    try {
      const v = await fetchVersion();
      if (v && baseVersion.current && v !== baseVersion.current) {
        setStale(true);
        logEvent("conflict", "Автосохранение пропущено");
        return;
      }
      await onAutoSave({ ...buildPrescription(false, false, false, true), remarks: normalizeRemarkStatuses(form.remarks) });
      lastSavedJson.current = json;
      baseSnapshot.current = { ...form, remarks: form.remarks.map(r => ({ ...r })) };
      baseVersion.current = await fetchVersion();
      setAutoSavedAt(new Date());
      setManualSavedAt(null);
    } catch (e) {
      if (e instanceof ConflictError) { setStale(true); logEvent("conflict", "Автосохранение отклонено"); }
      else logSaveFailure(e);
    } finally {
      autoSaving.current = false;
    }
  };

  useEffect(() => {
    if (!onAutoSave && !onAutoCreate) return;
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
    if (lockedBy || !hasContent) { closeWith(lockedBy ? "locked" : "idle"); return; }
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

  useEffect(() => {
    const onHide = () => {
      if (closedLogged.current) return;
      closedLogged.current = true;
      sendFormEvent("closed", "tab_closed");
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [editId]);

  const hasContent = !!form.object || !!form.contractor || form.remarks.some(r => r.description.trim() || r.normRef.trim() || r.category.trim());

  useEffect(() => {
    if (editId) return;
    const t = setTimeout(() => {
      try {
        if (hasContent) localStorage.setItem(draftKey, JSON.stringify(form));
        else localStorage.removeItem(draftKey);
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(t);
  }, [form, editId]);

  const dirtyRef = useRef(false);
  dirtyRef.current = editId ? JSON.stringify(form) !== lastSavedJson.current : hasContent;
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const handleSave = () => { if (isValid) doSave(false, false); };
  const handleSaveDraft = () => doSave(true, false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative bg-card border border-border rounded-xl w-full max-w-[1344px] shadow-2xl animate-fade-in flex flex-col overflow-hidden ${searchOpen ? "h-[92vh]" : "max-h-[92vh]"}`}>
        <div className={`flex flex-col min-h-0 ${searchOpen ? "flex-[7]" : "flex-1"}`}>
        <FormHeader
          isEdit={!!editPrescription}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onRequestClose={() => setShowCloseConfirm(true)}
        />
        <FormBanners
          stale={stale}
          otherTabOpen={otherTabOpen}
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
          <FormReportSection form={form} setField={setField} />
        </div>
        <FormFooter
          isEdit={!!editPrescription}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen(v => !v)}
          saveError={saveError}
          manualSavedAt={manualSavedAt}
          autoSavedAt={autoSavedAt}
          onRequestClose={() => setShowCloseConfirm(true)}
          showKeepOpen={!!onSaveKeepOpen}
          onSaveKeepOpen={doSaveKeepOpen}
          isSaving={isSaving}
          isValid={!!isValid}
          onSave={handleSave}
        />
        </div>
        {searchOpen && (
          <div className="flex-[3] min-h-0">
            <RemarkSearchPanel onInsert={insertFoundRemark} onClose={() => setSearchOpen(false)} />
          </div>
        )}
      </div>

      <FormDialogs
        idleWarning={idleWarning}
        lockedBy={lockedBy}
        conflict={conflict}
        showCloseConfirm={showCloseConfirm}
        isSaving={isSaving}
        onClose={() => closeWith("button_cancel")}
        onCloseLocked={() => closeWith("locked")}
        onCancelConflict={() => setConflict(null)}
        onSaveAnyway={() => doSave(conflict === "draft", true)}
        onReload={reloadFromServer}
        onDismissCloseConfirm={() => setShowCloseConfirm(false)}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
