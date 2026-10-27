import { Field, InputBase, DatePicker } from "./FormControls";
import { FormState } from "./GeneralInfoSection";

interface FormReportSectionProps {
  form: FormState;
  setField: (key: keyof Omit<FormState, "remarks">, val: string) => void;
}

export default function FormReportSection({ form, setField }: FormReportSectionProps) {
  return (
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
  );
}
