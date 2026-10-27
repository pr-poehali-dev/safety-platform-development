import Icon from "@/components/ui/icon";
import { altaiTime } from "@/lib/altaiTime";

interface FormFooterProps {
  isEdit: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  saveError: string | null;
  manualSavedAt: Date | null;
  autoSavedAt: Date | null;
  onRequestClose: () => void;
  showKeepOpen: boolean;
  onSaveKeepOpen: () => void;
  isSaving: boolean;
  isValid: boolean;
  onSave: () => void;
}

export default function FormFooter({
  isEdit, searchOpen, onToggleSearch, saveError, manualSavedAt, autoSavedAt,
  onRequestClose, showKeepOpen, onSaveKeepOpen, isSaving, isValid, onSave,
}: FormFooterProps) {
  return (
    <div className="flex items-center justify-end gap-4 px-12 py-6 border-t border-border flex-shrink-0">
      <button
        onClick={onToggleSearch}
        className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border transition-colors whitespace-nowrap ${searchOpen ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
      >
        <Icon name="Search" size={15} />
        Поиск внутри предписаний
      </button>
      {saveError && (
        <p className="text-sm text-red-400 mr-auto flex items-center gap-1.5">
          <Icon name="AlertTriangle" size={15} />
          {saveError}
        </p>
      )}
      {!saveError && manualSavedAt && (
        <p className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5">
          <Icon name="Check" size={14} />
          Сохранено в {altaiTime(manualSavedAt)}
        </p>
      )}
      {!saveError && autoSavedAt && (
        <p className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5">
          <Icon name="Check" size={14} />
          Автосохранено в {altaiTime(autoSavedAt)}
        </p>
      )}
      <button onClick={onRequestClose} className="text-base px-8 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
        Отмена
      </button>
      {showKeepOpen && (
        <button
          onClick={onSaveKeepOpen}
          disabled={isSaving}
          className="flex items-center gap-2 text-base px-8 py-3 rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="Save" size={16} />
          Сохранить
        </button>
      )}
      <button
        onClick={onSave}
        disabled={!isValid || isSaving}
        className="text-base px-10 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? "Сохранение..." : isEdit ? "Сохранить изменения" : "Создать предписание"}
      </button>
    </div>
  );
}
