import { TaskAssignment } from "@/lib/taskTypes";
import Icon from "@/components/ui/icon";

interface TaskDeleteConfirmProps {
  task: TaskAssignment;
  deleteError: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TaskDeleteConfirm({ task, deleteError, onCancel, onConfirm }: TaskDeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Trash2" size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Удалить задачу?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Это действие нельзя отменить</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
        {deleteError && (
          <p className="text-xs text-red-400 mb-3 flex items-center gap-1.5">
            <Icon name="AlertTriangle" size={12} /> {deleteError}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-sm py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
            Отмена
          </button>
          <button onClick={onConfirm} className="flex-1 text-sm py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
