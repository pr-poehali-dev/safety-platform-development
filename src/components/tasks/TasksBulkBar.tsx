import Icon from "@/components/ui/icon";

interface TasksBulkBarProps {
  checkedCount: number;
  bulkError: string;
  bulkSaving: boolean;
  showBulkDate: boolean;
  bulkDate: string;
  onBulkDateChange: (v: string) => void;
  onToggleBulkDate: () => void;
  onBulkClose: () => void;
  onBulkExtend: () => void;
  onClearSelection: () => void;
}

export default function TasksBulkBar({
  checkedCount, bulkError, bulkSaving, showBulkDate, bulkDate,
  onBulkDateChange, onToggleBulkDate, onBulkClose, onBulkExtend, onClearSelection,
}: TasksBulkBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
      {bulkError && (
        <span className="w-full text-xs text-red-400 flex items-center gap-1.5">
          <Icon name="AlertTriangle" size={12} /> {bulkError}
        </span>
      )}
      <span className="text-sm text-muted-foreground">Выбрано: {checkedCount}</span>
      <button
        disabled={bulkSaving}
        onClick={onBulkClose}
        className="text-sm px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
      >
        Закрыть выбранные
      </button>
      <button
        onClick={onToggleBulkDate}
        className="text-sm px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
      >
        Продлить срок
      </button>
      {showBulkDate && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="text-sm bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none"
            value={bulkDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => onBulkDateChange(e.target.value)}
          />
          <button
            disabled={bulkSaving || !bulkDate}
            onClick={onBulkExtend}
            className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            Применить
          </button>
        </div>
      )}
      <button
        onClick={onClearSelection}
        className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Снять выделение
      </button>
    </div>
  );
}
