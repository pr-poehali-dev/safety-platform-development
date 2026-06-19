import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Template } from "@/lib/template";
import { RichToolbar } from "./RichToolbar";

const PAPER_SIZES = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

const PANELS = [
  { key: "page",  label: "Страница", icon: "SlidersHorizontal" },
  { key: "table", label: "Колонки",  icon: "Table" },
] as const;

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

export function TemplateEditor({ template: initial, onClose, onSave }: {
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
  const [activeField, setActiveField] = useState<string | null>(null);

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
          <RichToolbar activeField={activeField} />
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
              fontFamily: `'${t.fontFamily}', Times, serif`,
              fontSize: `${t.fontSize}pt`,
              color: "#000",
              lineHeight: 1.5,
              padding: `${px(t.marginTop)}px ${px(t.marginRight)}px ${px(t.marginBottom)}px ${px(t.marginLeft)}px`,
              boxSizing: "border-box" as const,
              overflow: "hidden",
            }}>
              {(() => {
                const editStyle: React.CSSProperties = { outline: "none", borderBottom: "1.5px dashed #3b82f6", cursor: "text", minWidth: 40, display: "inline-block" };
                const fieldLine: React.CSSProperties = { borderBottom: "1px solid #000", display: "inline-block", padding: "0 4px", fontWeight: "bold" };
                const sigLine: React.CSSProperties = { flex: 1, borderBottom: "1px solid #000", minWidth: 80, minHeight: 18 };
                const E = ({ field, style }: { field: keyof Template; style?: React.CSSProperties }) => {
                  const val = String(t[field]);
                  const isRich = val.includes("<");
                  return isRich ? (
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActiveField(String(field))}
                      onBlur={e => { set(field, e.currentTarget.innerHTML as Template[typeof field]); setActiveField(null); }}
                      dangerouslySetInnerHTML={{ __html: val }}
                      style={{ ...editStyle, ...style }}
                      title="Нажмите чтобы редактировать"
                    />
                  ) : (
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActiveField(String(field))}
                      onBlur={e => { set(field, e.currentTarget.innerHTML as Template[typeof field]); setActiveField(null); }}
                      style={{ ...editStyle, ...style }}
                      title="Нажмите чтобы редактировать"
                    >{val}</span>
                  );
                };
                const cols = t.tableColumns.filter(c => c.enabled);
                const totalW = cols.reduce((s, c) => s + (c.width ?? 0), 0);
                const getW = (col: typeof cols[0]) => totalW > 0 && col.width ? `${((col.width / totalW) * 100).toFixed(2)}%` : undefined;
                return (
                  <>
                    {/* Заголовок */}
                    <div style={{ textAlign: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: `${t.fontSize + 2}pt` }}>
                        <E field="title" />
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: `${t.fontSize - 0.5}pt`, marginTop: 3 }}>
                        <E field="subtitle" style={{ display: "block", textAlign: "center" }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: `${t.fontSize - 1}pt`, marginTop: 6, marginBottom: 10 }}>от {sampleData.date}</div>
                    {/* Реквизиты */}
                    <div style={{ fontSize: `${t.fontSize - 0.5}pt`, lineHeight: 1.7, marginBottom: 10 }}>
                      <p><strong><E field="blockObjectLabel" /></strong> <span style={fieldLine}>{sampleData.object}</span>.</p>
                      <p style={{ marginTop: 2 }}><strong><E field="blockContractorLabel" /></strong> <span style={fieldLine}>{sampleData.contractor}</span></p>
                      <p style={{ marginTop: 2 }}>
                        <E field="blockInspectorLabel" /> <span style={fieldLine}>{sampleData.inspector}</span>
                        {" "}<E field="blockRepresentativeLabel" /> <span style={fieldLine}>{sampleData.representative}</span>
                      </p>
                      <div style={{ display: "flex", gap: 40, fontSize: "8pt", color: "#555", paddingLeft: 120, marginTop: 1 }}>
                        <span>(Должность, ФИО представителя СОТ)</span>
                        <span>(Наименование организации)</span>
                      </div>
                    </div>
                    {/* Заголовок таблицы */}
                    <p style={{ fontWeight: "bold", margin: "10px 0 6px" }}><E field="blockViolationsTitle" /></p>
                    {/* Таблица */}
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginBottom: 12 }}>
                      <colgroup>{cols.map(col => <col key={col.key} style={getW(col) ? { width: getW(col) } : {}} />)}</colgroup>
                      <thead>
                        <tr>
                          {cols.map(col => (
                            <th key={col.key} style={{ border: "1px solid #000", padding: "5px 6px", fontWeight: "bold", textAlign: "center", fontSize: `${t.fontSize - 1.5}pt` }}>
                              {(() => {
                                const isRich = /<[a-z]/i.test(col.label);
                                return isRich ? (
                                  <span
                                    contentEditable suppressContentEditableWarning
                                    onFocus={() => setActiveField(`col_${col.key}`)}
                                    onBlur={e => { set("tableColumns", t.tableColumns.map(c => c.key === col.key ? { ...c, label: e.currentTarget.innerHTML } : c)); setActiveField(null); }}
                                    dangerouslySetInnerHTML={{ __html: col.label }}
                                    style={editStyle}
                                  />
                                ) : (
                                  <span
                                    contentEditable suppressContentEditableWarning
                                    onFocus={() => setActiveField(`col_${col.key}`)}
                                    onBlur={e => { set("tableColumns", t.tableColumns.map(c => c.key === col.key ? { ...c, label: e.currentTarget.innerHTML } : c)); setActiveField(null); }}
                                    style={editStyle}
                                  >{col.label}</span>
                                );
                              })()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>{cols.map((col, i) => <td key={col.key} style={{ border: "1px solid #000", padding: "4px 6px", fontSize: `${t.fontSize - 1}pt`, verticalAlign: "top" }}>{i === 0 ? "1" : i === 1 ? "Выход №2" : i === 2 ? "Захламление прохода" : i === 3 ? "ППР п.24" : "20.06.2026"}</td>)}</tr>
                      </tbody>
                    </table>
                    {/* Подпись инспектора */}
                    <div style={{ display: "flex", gap: 20, alignItems: "flex-end", fontSize: `${t.fontSize - 1}pt`, marginBottom: 16 }}>
                      <div style={sigLine} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ borderBottom: "1px solid #000", minWidth: 60 }}>&nbsp;</div>
                        <div style={{ fontSize: "7.5pt", color: "#444" }}>подпись</div>
                      </div>
                      <div>
                        <div style={{ borderBottom: "1px solid #000", minWidth: 120 }}>&nbsp;</div>
                        <div style={{ fontSize: "7.5pt", color: "#444" }}>Фамилия И.О.</div>
                      </div>
                    </div>
                    {/* Тексты */}
                    <div style={{ fontSize: `${t.fontSize - 1}pt`, lineHeight: 1.6, marginBottom: 14 }}>
                      <p><E field="blockCopiesText" style={{ display: "block" }} /></p>
                      <p style={{ marginTop: 6 }}><E field="blockReportText" style={{ display: "block" }} /></p>
                    </div>
                    {/* Подписи */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: `${t.fontSize - 1}pt`, minWidth: 130, lineHeight: 1.4 }}><E field="sigIssuerLabel" style={{ display: "block" }} /></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                          <strong style={{ whiteSpace: "nowrap" }}><E field="sigIssuerLabel" /></strong>
                          <div style={sigLine} /><span>(</span><div style={sigLine} /><span>)</span><div style={sigLine} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16 }}>
                      <span style={{ fontSize: `${t.fontSize - 1}pt`, minWidth: 130, lineHeight: 1.4 }}><E field="sigReceiverLabel" style={{ display: "block" }} /></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                          <div style={sigLine} /><div style={sigLine} /><span>(</span><div style={sigLine} /><span>)</span><div style={sigLine} />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
