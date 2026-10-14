import Icon from "@/components/ui/icon";
import { Remark } from "@/lib/prescriptionTypes";
import { RemarkRow } from "./RemarkRow";
import { FormState } from "./GeneralInfoSection";
import { Highlight, MAX_REMARKS } from "./formMerge";

interface FormRemarksSectionProps {
  form: FormState;
  categories: string[];
  places: string[];
  suspensionNumbers: string[];
  highlights: Record<string, Highlight>;
  setHighlights: React.Dispatch<React.SetStateAction<Record<string, Highlight>>>;
  updateRemark: (id: string, r: Remark) => void;
  removeRemark: (id: string) => void;
  addRemark: () => void;
  limitReached: boolean;
}

export default function FormRemarksSection({
  form, categories, places, suspensionNumbers, highlights, setHighlights,
  updateRemark, removeRemark, addRemark, limitReached,
}: FormRemarksSectionProps) {
  return (
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
          places={places}
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
  );
}
