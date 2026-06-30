import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Template } from "@/lib/template";
import WordEditor from "./WordEditor";

const DEFAULT_CONTENT = `<p style="text-align:center"><strong>АКТ-ПРЕДПИСАНИЕ № {{number}}</strong></p>
<p style="text-align:center">о нарушении требований охраны труда, пожарной, промышленной безопасности и экологии</p>
<p style="text-align:right">от {{date}}</p>
<p><strong>Проверяемый объект:</strong> {{object}}</p>
<p><strong>Работы проводит подрядная организация:</strong> {{contractor}}</p>
<p>Проверка проведена <strong>{{inspector}}</strong> в присутствии представителя подрядной организации <strong>{{representative}}</strong></p>
<p><strong>В ходе проверки выявлены следующие нарушения:</strong></p>
<table>
  <thead>
    <tr>
      <th>№ п/п</th>
      <th>Место нарушения</th>
      <th>Описание нарушения</th>
      <th>Нарушен пункт НПА/ЛНА</th>
      <th>Срок устранения</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1</td><td></td><td></td><td></td><td></td></tr>
  </tbody>
</table>
<p>Акт составлен в 2-х экземплярах. 1 экз. остается у Заказчика ООО «{{companyName}}», 2-й экземпляр передается представителю {{contractor}}.</p>
<p>Отчет об устранении нарушений направить по электронной почте {{replyEmail}} не позднее {{reportDeadline}}.</p>
<p><strong>Выдал:</strong></p>
<p><strong>С Актом ознакомлен, согласен и принял к исполнению:</strong></p>`;

export function TemplateEditor({ template: initial, onClose, onSave }: {
  template: Template;
  onClose: () => void;
  onSave: (t: Template) => Promise<void>;
}) {
  const [t, setT] = useState<Template>({
    ...initial,
    tableColumns: initial.tableColumns.map(c => ({ ...c })),
    content: initial.content ?? (initial.title ? undefined : DEFAULT_CONTENT),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(t);
    setSaving(false);
  };

  const pageSettings = {
    paperSize: t.paperSize ?? "A4",
    orientation: t.orientation ?? "portrait",
    marginTop: t.marginTop ?? 20,
    marginRight: t.marginRight ?? 20,
    marginBottom: t.marginBottom ?? 20,
    marginLeft: t.marginLeft ?? 30,
  };

  const handlePageSettings = (s: typeof pageSettings) => {
    setT(prev => ({ ...prev, ...s }));
  };

  const editorContent = t.content ?? DEFAULT_CONTENT;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1b1e]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Топ-бар */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#25262b] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <Icon name="ArrowLeft" size={16} />
          </button>
          <Icon name="FileText" size={14} className="text-primary" />
          <input
            value={t.name}
            onChange={e => setT(prev => ({ ...prev, name: e.target.value }))}
            className="text-sm font-semibold bg-transparent border-none outline-none text-white w-56 placeholder:text-white/30"
            placeholder="Название шаблона"
          />
          {t.isDefault && (
            <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">
              По умолчанию
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[10px] text-white/30 flex items-center gap-1.5 hidden sm:flex">
            <Icon name="Info" size={11} />
            Используйте &#123;&#123;number&#125;&#125;, &#123;&#123;date&#125;&#125;, &#123;&#123;contractor&#125;&#125; для переменных
          </div>
          <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
            <input
              type="checkbox"
              checked={t.isDefault}
              onChange={e => setT(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="rounded"
            />
            По умолчанию
          </label>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Редактор */}
      <div className="flex-1 overflow-hidden">
        <WordEditor
          content={editorContent}
          onChange={html => setT(prev => ({ ...prev, content: html }))}
          pageSettings={pageSettings}
          onPageSettingsChange={handlePageSettings}
        />
      </div>
    </div>
  );
}
