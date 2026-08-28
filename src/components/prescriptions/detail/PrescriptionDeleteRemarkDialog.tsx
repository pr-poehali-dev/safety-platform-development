import Icon from "@/components/ui/icon";

interface PrescriptionDeleteRemarkDialogProps {
  deleteRemarkId: string;
  setDeleteRemarkId: (id: string | null) => void;
  deleteRemark: (remarkId: string) => void;
}

export function PrescriptionDeleteRemarkDialog({
  deleteRemarkId, setDeleteRemarkId, deleteRemark,
}: PrescriptionDeleteRemarkDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteRemarkId(null)} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Trash2" size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Удалить замечание?</p>
            <p className="text-xs text-muted-foreground mt-1">Пункт предписания будет удалён безвозвратно. Это действие нельзя отменить.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDeleteRemarkId(null)}
            className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => deleteRemark(deleteRemarkId)}
            className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
