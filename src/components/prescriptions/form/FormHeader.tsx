import Icon from "@/components/ui/icon";

interface FormHeaderProps {
  isEdit: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRequestClose: () => void;
}

export default function FormHeader({ isEdit, undo, redo, canUndo, canRedo, onRequestClose }: FormHeaderProps) {
  return (
    <div className="flex items-center justify-between px-12 py-8 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{isEdit ? "Редактирование предписания" : "Новое предписание"}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!canUndo} title="Отменить последнее действие" aria-label="Назад" className="p-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <Icon name="Undo2" size={18} />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Вернуть отменённое действие" aria-label="Вперёд" className="p-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <Icon name="Redo2" size={18} />
          </button>
        </div>
      </div>
      <button onClick={onRequestClose} className="text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="X" size={22} />
      </button>
    </div>
  );
}
