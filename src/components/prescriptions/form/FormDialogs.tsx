import Icon from "@/components/ui/icon";

interface FormDialogsProps {
  idleWarning: boolean;
  lockedBy: string | null;
  conflict: null | "save" | "draft";
  showCloseConfirm: boolean;
  isSaving: boolean;
  onClose: () => void;
  onCancelConflict: () => void;
  onSaveAnyway: () => void;
  onReload: () => void;
  onDismissCloseConfirm: () => void;
  onSaveDraft: () => void;
}

export default function FormDialogs({
  idleWarning, lockedBy, conflict, showCloseConfirm, isSaving,
  onClose, onCancelConflict, onSaveAnyway, onReload, onDismissCloseConfirm, onSaveDraft,
}: FormDialogsProps) {
  return (
    <>
      {idleWarning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-card border border-border rounded-lg shadow-2xl px-5 py-3 text-sm animate-fade-in">
          Нет действий почти 30 минут. Предписание будет сохранено как черновик и закроется. Нажмите любую клавишу, чтобы продолжить.
        </div>
      )}

      {lockedBy && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 animate-fade-in space-y-4">
            <h3 className="text-lg font-semibold">Предписание занято</h3>
            <p className="text-sm text-muted-foreground">
              С данным предписанием работает {lockedBy}, одновременная работа двух пользователей невозможна.
            </p>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Понятно</button>
            </div>
          </div>
        </div>
      )}

      {conflict && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 animate-fade-in space-y-4">
            <h3 className="text-lg font-semibold">Предписание уже изменено</h3>
            <p className="text-sm text-muted-foreground">
              Пока вы его редактировали, его изменили с другого компьютера. Рекомендуем обновить данные: ваши правки сохранятся, а изменённые на сервере пункты будут подсвечены. Если сохранить без обновления, чужие изменения могут быть перезаписаны.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancelConflict} className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Назад</button>
              <button onClick={onSaveAnyway} className="px-4 py-2 rounded-md border border-border text-sm">Сохранить всё равно</button>
              <button onClick={onReload} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Обновить данные</button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismissCloseConfirm} />
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
                disabled={isSaving}
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="flex-1 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? "Сохранение..." : "Да"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
