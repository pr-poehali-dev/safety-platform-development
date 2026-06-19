import Icon from "@/components/ui/icon";
import { Template } from "@/lib/template";
import { TemplateCard } from "./templates/TemplateCard";
import { TemplateEditor } from "./templates/TemplateEditor";
import { DeleteTemplateDialog } from "./templates/DeleteTemplateDialog";

interface TemplatesTabProps {
  templates: Template[];
  tLoading: boolean;
  onSave: (t: Template) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: () => void;
  editTemplate: Template | null;
  setEditTemplate: (t: Template | null) => void;
  tDeleteConfirm: string | null;
  setTDeleteConfirm: (id: string | null) => void;
}

export function TemplatesTab({
  templates, tLoading, onSave, onDelete, onCreate,
  editTemplate, setEditTemplate, tDeleteConfirm, setTDeleteConfirm,
}: TemplatesTabProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Управление шаблонами</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Конструктор бланков актов-предписаний</p>
        </div>
        <button onClick={onCreate} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={15} />
          Создать шаблон
        </button>
      </div>

      {tLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Загрузка шаблонов...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={setEditTemplate}
              onDelete={setTDeleteConfirm}
            />
          ))}
        </div>
      )}

      {tDeleteConfirm && (
        <DeleteTemplateDialog
          templateId={tDeleteConfirm}
          templates={templates}
          onConfirm={onDelete}
          onCancel={() => setTDeleteConfirm(null)}
        />
      )}

      {editTemplate && (
        <TemplateEditor
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSave={onSave}
        />
      )}
    </>
  );
}
