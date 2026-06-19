import Icon from "@/components/ui/icon";
import { Template } from "@/lib/template";

interface TemplateCardProps {
  template: Template;
  onEdit: (t: Template) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({ template: t, onEdit, onDelete }: TemplateCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon name="FileText" size={15} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
            {t.isDefault && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">По умолчанию</span>}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(t)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Редактировать">
            <Icon name="Pencil" size={13} />
          </button>
          {!t.isDefault && (
            <button onClick={() => onDelete(t.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Удалить">
              <Icon name="Trash2" size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
        <p><span className="text-foreground/60">Шрифт:</span> {t.fontFamily}, {t.fontSize}pt</p>
        <p><span className="text-foreground/60">Поля:</span> {t.marginTop}/{t.marginRight}/{t.marginBottom}/{t.marginLeft} мм</p>
        <p><span className="text-foreground/60">Колонки таблицы:</span> {t.tableColumns.filter(c => c.enabled).length} из {t.tableColumns.length}</p>
      </div>
    </div>
  );
}
