import Icon from "@/components/ui/icon";
import { Field, InputBase, SelectBase } from "./FormControls";

export interface FormState {
  object: string;
  contractor: string;
  contractNumber: string;
  representative: string;
  representativeEnabled: boolean;
  replyEmail: string;
  reportDeadline: string;
  remarks: import("@/lib/prescriptionTypes").Remark[];
}

interface GeneralInfoSectionProps {
  form: FormState;
  setField: (key: keyof Omit<FormState, "remarks">, val: string) => void;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  objectsList: { id: number; name: string; places: { id: number; name: string }[] }[];
  contractorsList: { name: string; contracts: { id: number; contract_number: string }[] }[];
  inspectorLabel: string;
}

export function GeneralInfoSection({ form, setField, setForm, objectsList, contractorsList, inspectorLabel }: GeneralInfoSectionProps) {
  const selectedContractor = contractorsList.find(c => c.name === form.contractor);

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Общие сведения</p>
      <div className="grid grid-cols-2 gap-6">
        <Field label="Проверяемый объект *">
          <SelectBase value={form.object} onChange={e => setField("object", e.target.value)}>
            <option value="">— Выберите объект —</option>
            {objectsList.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
          </SelectBase>
        </Field>
        <Field label="Подрядчик *">
          <SelectBase value={form.contractor} onChange={e => setField("contractor", e.target.value)}>
            <option value="">— Выберите подрядчика —</option>
            {contractorsList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </SelectBase>
          {selectedContractor && selectedContractor.contracts.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedContractor.contracts.map(c => {
                const isSelected = form.contractNumber === c.contract_number;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setField("contractNumber", isSelected ? "" : c.contract_number)}
                    className={`inline-flex items-center gap-1 text-[10px] border rounded px-1.5 py-0.5 transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    }`}
                  >
                    <Icon name="FileText" size={10} />
                    № {c.contract_number}
                    {isSelected && <Icon name="Check" size={10} />}
                  </button>
                );
              })}
            </div>
          )}
          {form.contractNumber && (
            <p className="text-[10px] text-muted-foreground mt-1">Выбран договор № {form.contractNumber} — будет указан в печатной форме</p>
          )}
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
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.representative || form.representativeEnabled}
              onChange={e => {
                if (!e.target.checked) setField("representative", "");
                setForm(prev => ({ ...prev, representativeEnabled: e.target.checked }));
              }}
              className="w-4 h-4 rounded border border-border accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground font-medium">В присутствии представителя подрядчика</span>
          </label>
          {(form.representativeEnabled || !!form.representative) && (
            <InputBase value={form.representative} onChange={e => setField("representative", e.target.value)} placeholder="ФИО представителя подрядчика" autoFocus />
          )}
        </div>
      </div>
    </div>
  );
}
