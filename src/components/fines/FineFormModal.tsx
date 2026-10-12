import { Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import { IsoDatePicker, MultiSelectField } from "@/components/fines/FineFormControls";
import { ContractorItem, FormState, inp, lbl } from "@/components/fines/finesShared";

interface FineFormModalProps {
  editingId: number | null;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  set: (field: keyof Omit<FormState, "act_numbers">, value: string) => void;
  prescriptionNumbers: string[];
  contractorNames: string[];
  selectedContractor: ContractorItem | undefined;
  saveError: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function FineFormModal({
  editingId, form, setForm, set, prescriptionNumbers, contractorNames, selectedContractor,
  saveError, saving, onClose, onSave,
}: FineFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">{editingId ? "Редактирование штрафа" : "Новый штраф"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Месяц/год *</label>
              <IsoDatePicker value={form.period_date} onChange={v => set("period_date", v)} />
            </div>
            <div>
              <label className={lbl}>Акт о нарушениях ОТ</label>
              <MultiSelectField
                options={prescriptionNumbers}
                selected={form.act_numbers}
                onChange={v => setForm(prev => ({ ...prev, act_numbers: v }))}
                placeholder="Выбрать акты"
                searchPlaceholder="Поиск по номеру предписания"
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Организация (КА) *</label>
            <select
              value={form.contractor}
              onChange={e => setForm(prev => ({ ...prev, contractor: e.target.value, contract_number: "" }))}
              className={inp}
            >
              <option value="">— выберите организацию —</option>
              {contractorNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Договор</label>
            <select
              value={form.contract_number}
              onChange={e => set("contract_number", e.target.value)}
              disabled={!selectedContractor || selectedContractor.contracts.length === 0}
              className={inp + " disabled:opacity-50 disabled:cursor-not-allowed"}
            >
              <option value="">— выберите договор —</option>
              {form.contract_number && !(selectedContractor?.contracts ?? []).some(c => c.contract_number === form.contract_number) && (
                <option value={form.contract_number}>{form.contract_number}</option>
              )}
              {(selectedContractor?.contracts ?? []).map(c => (
                <option key={c.id} value={c.contract_number}>{c.contract_number}</option>
              ))}
            </select>
            {selectedContractor && selectedContractor.contracts.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">У выбранной организации нет договоров в справочнике</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Выставлено, тыс руб *</label>
              <input type="number" value={form.amount_issued} onChange={e => set("amount_issued", e.target.value)} placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Оплачено, тыс руб</label>
              <input type="number" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Проактив, тыс руб</label>
              <input type="number" value={form.amount_proactive} onChange={e => set("amount_proactive", e.target.value)} placeholder="0" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Статус</label>
            <textarea
              rows={3}
              value={form.status}
              onChange={e => set("status", e.target.value)}
              placeholder="Например: Удержана ЗРДС №... от ..."
              className={inp + " resize-none"}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center gap-3 justify-end">
          {saveError && (
            <p className="text-sm text-red-400 mr-auto flex items-center gap-1.5">
              <Icon name="AlertTriangle" size={15} />
              {saveError}
            </p>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.period_date || !form.contractor}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Icon name="Save" size={14} />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
