import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TableExtension from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import { useState, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";

const FONTS = [
  "Arial", "Calibri", "Times New Roman", "Georgia",
  "Courier New", "Verdana", "Tahoma", "Trebuchet MS",
];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 216, h: 279 },
};

const MARGINS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
  "Обычные": { top: 20, right: 20, bottom: 20, left: 30 },
  "Узкие":   { top: 12, right: 12, bottom: 12, left: 12 },
  "Широкие": { top: 25, right: 50, bottom: 25, left: 50 },
};

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize?.replace("pt", "") || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}pt` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: { chain: () => ReturnType<Editor["chain"]> }) =>
        chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: { chain: () => ReturnType<Editor["chain"]> }) =>
        chain().setMark("textStyle", { fontSize: null }).run(),
    } as ReturnType<typeof this.parent>;
  },
});

interface PageSettings {
  paperSize: string;
  orientation: "portrait" | "landscape";
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

interface WordEditorProps {
  content: string;
  onChange: (html: string) => void;
  pageSettings: PageSettings;
  onPageSettingsChange: (s: PageSettings) => void;
}

function Divider() {
  return <div className="w-px h-5 bg-white/15 mx-0.5 flex-shrink-0" />;
}

function ToolBtn({ title, active, onClick, children, disabled }: {
  title: string; active?: boolean; onClick: () => void;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`h-7 min-w-[28px] px-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-white/60 hover:text-white hover:bg-white/10"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function ColorPicker({ value, onChange, title }: { value: string; onChange: (c: string) => void; title: string }) {
  const COLORS = [
    "#000000","#ffffff","#ef4444","#f97316","#eab308","#22c55e",
    "#3b82f6","#8b5cf6","#ec4899","#6b7280","#b91c1c","#1d4ed8",
  ];
  return (
    <div className="relative group">
      <button
        title={title}
        onMouseDown={e => e.preventDefault()}
        className="h-7 w-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <div className="w-4 h-4 rounded-sm border border-white/20" style={{ background: value || "#000" }} />
      </button>
      <div className="absolute top-full left-0 mt-1 bg-[#1e1f23] border border-white/15 rounded-lg p-2 shadow-xl z-50 hidden group-hover:grid grid-cols-6 gap-1 w-[112px]">
        {COLORS.map(c => (
          <button
            key={c}
            onMouseDown={e => { e.preventDefault(); onChange(c); }}
            className="w-4 h-4 rounded-sm border border-white/20 hover:scale-110 transition-transform"
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={value || "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-4 h-4 rounded-sm cursor-pointer border-0 p-0"
          title="Произвольный цвет"
        />
      </div>
    </div>
  );
}

function Tab({ id, active, label, onClick }: { id: string; active: boolean; label: string; onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
        active ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

export default function WordEditor({ content, onChange, pageSettings, onPageSettingsChange }: WordEditorProps) {
  const [activeTab, setActiveTab] = useState<"home" | "layout" | "insert">("home");
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [fontSize, setFontSize] = useState("12");
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ resizable: true }),
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "outline-none min-h-full",
        spellcheck: "true",
      },
    },
  });

  const setFs = useCallback((v: string) => {
    setFontSize(v);
    if (editor && v) (editor.chain().focus() as unknown as Record<string, (s: string) => unknown>).setFontSize(v).run();
  }, [editor]);

  const setFf = useCallback((v: string) => {
    setFontFamily(v);
    editor?.chain().focus().setFontFamily(v).run();
  }, [editor]);

  const ins = useCallback((tag: string) => {
    if (!editor) return;
    const cols = parseInt(tag.split("x")[0]);
    const rows = parseInt(tag.split("x")[1]);
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  }, [editor]);

  const insertImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) editor.chain().focus().setImage({ src: ev.target.result as string }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [editor]);

  const pg = pageSettings;
  const paper = PAPER_SIZES[pg.paperSize] ?? PAPER_SIZES.A4;
  const pw = pg.orientation === "portrait" ? paper.w : paper.h;
  const ph = pg.orientation === "portrait" ? paper.h : paper.w;
  const pxMm = (mm: number) => Math.round(mm * 96 / 25.4);

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);

  return (
    <div className="flex flex-col h-full bg-[#1a1b1e]">
      {/* Лента */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#25262b]">
        {/* Вкладки ленты */}
        <div className="flex border-b border-white/10 px-2">
          <Tab id="home"   active={activeTab === "home"}   label="Главная"         onClick={id => setActiveTab(id as typeof activeTab)} />
          <Tab id="layout" active={activeTab === "layout"} label="Разметка"        onClick={id => setActiveTab(id as typeof activeTab)} />
          <Tab id="insert" active={activeTab === "insert"} label="Вставка"         onClick={id => setActiveTab(id as typeof activeTab)} />
        </div>

        {/* Содержимое вкладки */}
        <div className="flex items-center gap-1 px-3 py-1.5 flex-wrap min-h-[44px]">

          {activeTab === "home" && (<>
            {/* Отмена / Повтор */}
            <ToolBtn title="Отменить (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Icon name="Undo2" size={13} />
            </ToolBtn>
            <ToolBtn title="Повторить (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Icon name="Redo2" size={13} />
            </ToolBtn>
            <Divider />

            {/* Шрифт */}
            <select
              value={fontFamily}
              onChange={e => setFf(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 w-36"
            >
              {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>

            {/* Размер */}
            <div className="flex items-center gap-0.5">
              <select
                value={fontSize}
                onChange={e => setFs(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-l px-1.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 w-14"
              >
                {FONT_SIZES.map(s => <option key={s} value={String(s)}>{s}</option>)}
              </select>
              <input
                type="number"
                min={6} max={144}
                value={fontSize}
                onChange={e => setFs(e.target.value)}
                className="bg-white/5 border border-white/10 border-l-0 rounded-r px-1.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 w-12"
              />
            </div>
            <Divider />

            {/* Начертание */}
            <ToolBtn title="Жирный (Ctrl+B)" active={isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <span className="font-bold text-sm">B</span>
            </ToolBtn>
            <ToolBtn title="Курсив (Ctrl+I)" active={isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <span className="italic text-sm">I</span>
            </ToolBtn>
            <ToolBtn title="Подчёркнутый (Ctrl+U)" active={isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <span className="underline text-sm">U</span>
            </ToolBtn>
            <ToolBtn title="Зачёркнутый" active={isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <span className="line-through text-sm">S</span>
            </ToolBtn>
            <ToolBtn title="Надстрочный" active={isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
              <span className="text-xs">x²</span>
            </ToolBtn>
            <ToolBtn title="Подстрочный" active={isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
              <span className="text-xs">x₂</span>
            </ToolBtn>
            <Divider />

            {/* Цвет текста */}
            <ColorPicker
              title="Цвет текста"
              value={textColor}
              onChange={c => { setTextColor(c); editor.chain().focus().setColor(c).run(); }}
            />
            {/* Цвет выделения */}
            <ColorPicker
              title="Цвет выделения"
              value={highlightColor}
              onChange={c => { setHighlightColor(c); editor.chain().focus().setHighlight({ color: c }).run(); }}
            />
            <ToolBtn title="Очистить форматирование" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
              <Icon name="RemoveFormatting" size={13} />
            </ToolBtn>
            <Divider />

            {/* Выравнивание */}
            <ToolBtn title="По левому краю" active={isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <Icon name="AlignLeft" size={13} />
            </ToolBtn>
            <ToolBtn title="По центру" active={isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <Icon name="AlignCenter" size={13} />
            </ToolBtn>
            <ToolBtn title="По правому краю" active={isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <Icon name="AlignRight" size={13} />
            </ToolBtn>
            <ToolBtn title="По ширине" active={isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
              <Icon name="AlignJustify" size={13} />
            </ToolBtn>
            <Divider />

            {/* Списки */}
            <ToolBtn title="Маркированный список" active={isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <Icon name="List" size={13} />
            </ToolBtn>
            <ToolBtn title="Нумерованный список" active={isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <Icon name="ListOrdered" size={13} />
            </ToolBtn>
            <Divider />

            {/* Отступы */}
            <ToolBtn title="Уменьшить отступ" onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
              <Icon name="Outdent" size={13} />
            </ToolBtn>
            <ToolBtn title="Увеличить отступ" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
              <Icon name="Indent" size={13} />
            </ToolBtn>
            <Divider />

            {/* Заголовки */}
            {([1, 2, 3] as const).map(l => (
              <ToolBtn key={l} title={`Заголовок ${l}`} active={isActive("heading", { level: l })} onClick={() => editor.chain().focus().toggleHeading({ level: l }).run()}>
                <span className="text-xs">H{l}</span>
              </ToolBtn>
            ))}
            <ToolBtn title="Обычный текст" active={isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
              <span className="text-xs">¶</span>
            </ToolBtn>
          </>)}

          {activeTab === "layout" && (<>
            {/* Размер бумаги */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-white/40 uppercase tracking-wide mr-1">Бумага</span>
              {Object.keys(PAPER_SIZES).map(s => (
                <ToolBtn key={s} title={s} active={pg.paperSize === s} onClick={() => onPageSettingsChange({ ...pg, paperSize: s })}>
                  {s}
                </ToolBtn>
              ))}
            </div>
            <Divider />

            {/* Ориентация */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-white/40 uppercase tracking-wide mr-1">Ориентация</span>
              <ToolBtn title="Книжная" active={pg.orientation === "portrait"} onClick={() => onPageSettingsChange({ ...pg, orientation: "portrait" })}>
                <Icon name="RectangleVertical" size={13} />
              </ToolBtn>
              <ToolBtn title="Альбомная" active={pg.orientation === "landscape"} onClick={() => onPageSettingsChange({ ...pg, orientation: "landscape" })}>
                <Icon name="RectangleHorizontal" size={13} />
              </ToolBtn>
            </div>
            <Divider />

            {/* Поля */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-white/40 uppercase tracking-wide mr-1">Поля</span>
              {Object.entries(MARGINS).map(([name, m]) => (
                <ToolBtn key={name} title={name} active={pg.marginTop === m.top && pg.marginLeft === m.left} onClick={() => onPageSettingsChange({ ...pg, ...m })}>
                  <span className="text-[10px]">{name}</span>
                </ToolBtn>
              ))}
            </div>
            <Divider />

            {/* Поля вручную */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-white/40 uppercase tracking-wide">мм:</span>
              {(["marginTop", "marginRight", "marginBottom", "marginLeft"] as const).map((k, i) => (
                <div key={k} className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-white/30">{["↑", "→", "↓", "←"][i]}</span>
                  <input
                    type="number" min={5} max={50}
                    value={pg[k]}
                    onChange={e => onPageSettingsChange({ ...pg, [k]: Number(e.target.value) })}
                    className="w-10 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 text-center"
                  />
                </div>
              ))}
            </div>
            <Divider />

            {/* Разрыв страницы */}
            <ToolBtn title="Вставить разрыв страницы" onClick={() => editor.chain().focus().setHardBreak().run()}>
              <span className="text-[10px]">Разрыв</span>
            </ToolBtn>
          </>)}

          {activeTab === "insert" && (<>
            {/* Таблица */}
            <div className="relative group flex-shrink-0">
              <button
                onMouseDown={e => e.preventDefault()}
                className="h-7 px-2 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <Icon name="Table" size={13} />
                Таблица
                <Icon name="ChevronDown" size={10} />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-[#1e1f23] border border-white/15 rounded-lg p-2 shadow-xl z-50 hidden group-hover:block">
                <p className="text-[10px] text-white/40 mb-2 px-1">Вставить таблицу</p>
                <div className="grid grid-cols-5 gap-1">
                  {["2x2","3x2","4x3","5x3","3x4","4x4","5x5","2x5","6x3","5x4"].map(sz => (
                    <button
                      key={sz}
                      onMouseDown={e => { e.preventDefault(); ins(sz); }}
                      className="w-8 h-8 text-[9px] text-white/60 hover:text-white hover:bg-white/10 rounded border border-white/10 transition-colors"
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                  <ToolBtn title="Добавить строку выше" onClick={() => editor.chain().focus().addRowBefore().run()}>
                    <span className="text-[10px]">+ строка ↑</span>
                  </ToolBtn>
                  <ToolBtn title="Добавить строку ниже" onClick={() => editor.chain().focus().addRowAfter().run()}>
                    <span className="text-[10px]">+ строка ↓</span>
                  </ToolBtn>
                  <ToolBtn title="Добавить колонку слева" onClick={() => editor.chain().focus().addColumnBefore().run()}>
                    <span className="text-[10px]">+ столбец ←</span>
                  </ToolBtn>
                  <ToolBtn title="Добавить колонку справа" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                    <span className="text-[10px]">+ столбец →</span>
                  </ToolBtn>
                  <ToolBtn title="Удалить строку" onClick={() => editor.chain().focus().deleteRow().run()}>
                    <span className="text-[10px] text-red-400">− строка</span>
                  </ToolBtn>
                  <ToolBtn title="Удалить столбец" onClick={() => editor.chain().focus().deleteColumn().run()}>
                    <span className="text-[10px] text-red-400">− столбец</span>
                  </ToolBtn>
                  <ToolBtn title="Объединить ячейки" onClick={() => editor.chain().focus().mergeCells().run()}>
                    <span className="text-[10px]">Объединить</span>
                  </ToolBtn>
                  <ToolBtn title="Разделить ячейку" onClick={() => editor.chain().focus().splitCell().run()}>
                    <span className="text-[10px]">Разделить</span>
                  </ToolBtn>
                  <ToolBtn title="Удалить таблицу" onClick={() => editor.chain().focus().deleteTable().run()}>
                    <span className="text-[10px] text-red-400">Удалить таблицу</span>
                  </ToolBtn>
                </div>
              </div>
            </div>

            <Divider />

            {/* Изображение */}
            <ToolBtn title="Вставить изображение" onClick={() => fileInputRef.current?.click()}>
              <Icon name="Image" size={13} />
              <span className="text-xs ml-1">Изображение</span>
            </ToolBtn>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={insertImage} />
            <Divider />

            {/* Разрывы */}
            <ToolBtn title="Разрыв страницы" onClick={() => {
              editor.chain().focus().insertContent('<p style="page-break-after: always">&nbsp;</p>').run();
            }}>
              <Icon name="SeparatorHorizontal" size={13} />
              <span className="text-xs ml-1">Разрыв</span>
            </ToolBtn>

            {/* Горизонтальная линия */}
            <ToolBtn title="Горизонтальная линия" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <Icon name="Minus" size={13} />
              <span className="text-xs ml-1">Линия</span>
            </ToolBtn>
          </>)}
        </div>
      </div>

      {/* Рабочая область */}
      <div
        className="flex-1 overflow-auto flex flex-col items-center py-8 gap-4"
        style={{ background: "#2c2d32" }}
      >
        <div className="text-[11px] text-white/30 flex items-center gap-3 flex-shrink-0">
          <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            {pg.paperSize} · {pg.orientation === "portrait" ? "Книжная" : "Альбомная"} · {pw}×{ph} мм
          </span>
        </div>

        {/* Страница */}
        <div
          className="flex-shrink-0 bg-white shadow-2xl"
          style={{
            width: pxMm(pw),
            minHeight: pxMm(ph),
            padding: `${pxMm(pg.marginTop)}px ${pxMm(pg.marginRight)}px ${pxMm(pg.marginBottom)}px ${pxMm(pg.marginLeft)}px`,
            boxSizing: "border-box",
          }}
        >
          <style>{`
            .tiptap-editor { color: #000; font-size: 11pt; line-height: 1.5; font-family: 'Times New Roman', serif; }
            .tiptap-editor p { margin: 0 0 4px; }
            .tiptap-editor h1 { font-size: 20pt; font-weight: bold; margin: 12px 0 6px; }
            .tiptap-editor h2 { font-size: 16pt; font-weight: bold; margin: 10px 0 5px; }
            .tiptap-editor h3 { font-size: 13pt; font-weight: bold; margin: 8px 0 4px; }
            .tiptap-editor ul { padding-left: 20px; margin: 4px 0; }
            .tiptap-editor ol { padding-left: 20px; margin: 4px 0; }
            .tiptap-editor li { margin: 2px 0; }
            .tiptap-editor table { border-collapse: collapse; width: 100%; margin: 8px 0; }
            .tiptap-editor td, .tiptap-editor th { border: 1px solid #000; padding: 4px 6px; min-width: 40px; vertical-align: top; }
            .tiptap-editor th { font-weight: bold; background: #f5f5f5; }
            .tiptap-editor img { max-width: 100%; height: auto; }
            .tiptap-editor .selectedCell { background: rgba(59,130,246,0.15); }
            .tiptap-editor hr { border: none; border-top: 1px solid #999; margin: 8px 0; }
          `}</style>
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
}
