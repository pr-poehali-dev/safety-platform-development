import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import PrescriptionDocument from "@/components/PrescriptionDocument";

const TEMPLATES_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69?type=templates";

const PAPER_SIZES = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

// --- Конструктор шаблона (WYSIWYG) ---
function TemplateEditor({ template: initial, onClose, onSave }: {
  template: Template;
  onClose: () => void;
  onSave: (t: Template) => Promise<void>;
}) {
  const [t, setT] = useState<Template>({
    paperSize: "A4", orientation: "portrait",
    ...initial,
    tableColumns: initial.tableColumns.map(c => ({ ...c })),
  });
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<"page" | "table">("page");

  const set = <K extends keyof Template>(key: K, val: Template[K]) => setT(prev => ({ ...prev, [key]: val }));
  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const lbl = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1";

  const handleSave = async () => { setSaving(true); await onSave(t); setSaving(false); };

  const toggleColumn = (key: string) =>
    set("tableColumns", t.tableColumns.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c));
  const setColumnWidth = (key: string, width: string) =>
    set("tableColumns", t.tableColumns.map(c => c.key === key ? { ...c, width: width ? Number(width) : null } : c));

  const px = (mm: number) => Math.round(mm * 96 / 25.4);
  const paperW = t.orientation === "portrait" ? PAPER_SIZES[t.paperSize].w : PAPER_SIZES[t.paperSize].h;
  const paperH = t.orientation === "portrait" ? PAPER_SIZES[t.paperSize].h : PAPER_SIZES[t.paperSize].w;
  const pageWpx = px(paperW);
  const pageHpx = px(paperH);

  const CANVAS_W = typeof window !== "undefined" ? Math.max(window.innerWidth - 290, 500) : 800;
  const scale = Math.min(1, (CANVAS_W - 64) / pageWpx);

  const sampleData = {
    id: "sample",
    number: "МАН-2026-01", date: "16.06.2026",
    object: "Цех сборки №3", contractor: "ООО «СтройПодряд»",
    inspector: "Алексеев Сергей Николаевич", representative: "Козлов А.В.",
    responsible: "Алексеев С.Н.", replyEmail: "ot@sbd.ru", reportDeadline: "30.06.2026",
    remarks: [
      { id: "1", place: "Выход №2", description: "Захламление прохода посторонними предметами", normRef: "ППР п.24", deadline: "20.06.2026", status: "Выдано" },
    ],
  };

  const PANELS = [
    { key: "page",  label: "Страница", icon: "SlidersHorizontal" },
    { key: "table", label: "Колонки",  icon: "Table" },
  ] as const;

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
            onChange={e => set("name", e.target.value)}
            className="text-sm font-semibold bg-transparent border-none outline-none text-white w-56 placeholder:text-white/30"
            placeholder="Название шаблона"
          />
          {t.isDefault && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">По умолчанию</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 flex items-center gap-1.5">
            <Icon name="MousePointerClick" size={11} />
            Кликайте на синие поля чтобы редактировать
          </span>
          <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
            <input type="checkbox" checked={t.isDefault} onChange={e => set("isDefault", e.target.checked)} className="rounded" />
            По умолчанию
          </label>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Левая панель */}
        <div className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col bg-[#25262b]">
          <div className="flex border-b border-white/10 px-2 pt-2">
            {PANELS.map(p => (
              <button key={p.key} onClick={() => setActivePanel(p.key as typeof activePanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${activePanel === p.key ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/70"}`}>
                <Icon name={p.icon} size={11} />
                {p.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {activePanel === "page" && (<>
              <div>
                <label className={lbl + " text-white/40"}>Размер бумаги</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["A4","A3"] as const).map(s => (
                    <button key={s} onClick={() => set("paperSize", s)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${t.paperSize === s ? "bg-primary/20 border-primary text-primary" : "border-white/10 text-white/40 hover:text-white"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Ориентация</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["portrait","Книжная",18,24],["landscape","Альбомная",24,18]] as const).map(([val,label,w,h]) => (
                    <button key={val} onClick={() => set("orientation", val)}
                      className={`py-2.5 rounded-lg border text-[11px] font-medium flex flex-col items-center gap-1.5 transition-colors ${t.orientation === val ? "bg-primary/20 border-primary text-primary" : "border-white/10 text-white/40 hover:text-white"}`}>
                      <div className={`border-2 rounded-sm ${t.orientation === val ? "border-primary" : "border-white/20"}`} style={{width:w,height:h}} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Шрифт</label>
                <select value={t.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inp + " bg-white/5 border-white/10 text-white"}>
                  {["Times New Roman","Arial","Calibri","Georgia"].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Размер (pt)</label>
                <input type="number" min={8} max={16} value={t.fontSize} onChange={e => set("fontSize", Number(e.target.value))} className={inp + " bg-white/5 border-white/10 text-white"} />
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Поля (мм)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["marginTop","marginRight","marginBottom","marginLeft"] as const).map((k,i) => (
                    <div key={k}>
                      <div className="text-[10px] text-white/30 mb-0.5">{["Верх","Право","Низ","Лево"][i]}</div>
                      <input type="number" min={5} max={40} value={t[k]} onChange={e => set(k, Number(e.target.value))} className={inp + " bg-white/5 border-white/10 text-white"} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Организация</label>
                <input value={t.companyName} onChange={e => set("companyName", e.target.value)} className={inp + " bg-white/5 border-white/10 text-white"} placeholder="СБД" />
              </div>
            </>)}

            {activePanel === "table" && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/30">Включайте/выключайте колонки. Ширина в px, пусто = авто.</p>
                {t.tableColumns.map(col => (
                  <div key={col.key} className={`border rounded-lg p-3 space-y-1.5 ${col.enabled ? "border-white/10" : "border-white/5 opacity-40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-white/40 uppercase">{col.key}</span>
                      <button onClick={() => toggleColumn(col.key)} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${col.enabled ? "bg-primary/20 border-primary/40 text-primary" : "border-white/10 text-white/30"}`}>
                        {col.enabled ? "вкл" : "выкл"}
                      </button>
                    </div>
                    <div className="text-[10px] text-white/50">Ширина (px)</div>
                    <input type="number" value={col.width ?? ""} onChange={e => setColumnWidth(col.key, e.target.value)} disabled={!col.enabled} placeholder="авто" className={inp + " bg-white/5 border-white/10 text-white"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Холст */}
        <div className="flex-1 overflow-auto flex flex-col items-center py-8 gap-3" style={{ background: "#2c2d32" }}>
          <div className="text-[11px] text-white/30 flex items-center gap-4">
            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              {t.paperSize} · {t.orientation === "portrait" ? "Книжная" : "Альбомная"} · {paperW}×{paperH} мм
            </span>
            <span>масштаб {Math.round(scale * 100)}%</span>
          </div>
          <div style={{ width: pageWpx * scale, height: pageHpx * scale, position: "relative", flexShrink: 0 }}>
            <div style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: pageWpx,
              height: pageHpx,
              background: "#fff",
              boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}>
              <PrescriptionDocument template={t} prescription={sampleData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Вкладка шаблонов ---
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
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors">
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
                  <button onClick={() => setEditTemplate(t)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Редактировать">
                    <Icon name="Pencil" size={13} />
                  </button>
                  {!t.isDefault && (
                    <button onClick={() => setTDeleteConfirm(t.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Удалить">
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
          ))}
        </div>
      )}

      {/* Удаление шаблона */}
      {tDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Trash2" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Удалить шаблон?</p>
                <p className="text-xs text-muted-foreground mt-1">{templates.find(t => t.id === tDeleteConfirm)?.name} — действие нельзя отменить.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTDeleteConfirm(null)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={() => onDelete(tDeleteConfirm)} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Конструктор шаблона */}
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
