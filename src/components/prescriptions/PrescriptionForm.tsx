import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import {
  Remark, Prescription,
  newRemark, detectGenderFromName, declinePosition, toInstrumental,
} from "@/lib/prescriptionTypes";
import { Field, InputBase, TextareaBase, SelectBase, DatePicker } from "./form/FormControls";
import { RemarkRow } from "./form/RemarkRow";
import { GeneralInfoSection, FormState } from "./form/GeneralInfoSection";

export { Field, InputBase, TextareaBase, SelectBase, DatePicker };

const CATEGORIES_URL = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const OBJECTS_URL = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const CONTRACTORS_URL = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";

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
    form.replyEmail.trim() &&
    form.remarks.every(r =>
      r.category.trim() &&
      r.description.trim() &&
      r.normRef.trim() &&
      r.deadline
    );

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const buildPrescription = (asDraft: boolean): Prescription => {
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
    };
  };

  const handleSave = async () => {
    if (!isValid) return;
    await onSave(buildPrescription(false));
    onClose();
  };

  const handleSaveDraft = async () => {
    await onSave(buildPrescription(true));
    onClose();
  };

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
                Замечания <span className="text-primary ml-1">{form.remarks.length}</span>
              </p>
            </div>
            {form.remarks.map((r, i) => (
              <RemarkRow
                key={r.id} remark={r} index={i}
                onChange={updated => updateRemark(i, updated)}
                onRemove={() => removeRemark(i)}
                canRemove={form.remarks.length > 1}
                categories={categories}
                places={availablePlaces}
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
              <Field label="Электронная почта для ответа *">
                <InputBase type="email" value={form.replyEmail} onChange={e => setField("replyEmail", e.target.value)} placeholder="example@company.ru" />
              </Field>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 px-12 py-6 border-t border-border flex-shrink-0">
          <button onClick={() => setShowCloseConfirm(true)} className="text-base px-8 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="text-base px-10 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {editPrescription ? "Сохранить изменения" : "Создать предписание"}
          </button>
        </div>
      </div>

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
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}