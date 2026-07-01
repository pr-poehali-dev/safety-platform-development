import { type Editor } from "@tiptap/react";
import Icon from "@/components/ui/icon";
import { Divider, ToolBtn, ColorPicker, Tab } from "./WordEditorPrimitives";
import { FONTS, FONT_SIZES, PAPER_SIZES, MARGINS, type PageSettings } from "./wordEditorTypes";

interface WordEditorToolbarProps {
  editor: Editor;
  activeTab: "home" | "layout" | "insert";
  setActiveTab: (tab: "home" | "layout" | "insert") => void;
  fontFamily: string;
  setFf: (v: string) => void;
  fontSize: string;
  setFs: (v: string) => void;
  textColor: string;
  setTextColor: (c: string) => void;
  highlightColor: string;
  setHighlightColor: (c: string) => void;
  pageSettings: PageSettings;
  onPageSettingsChange: (s: PageSettings) => void;
  ins: (tag: string) => void;
  onImageClick: () => void;
}

export function WordEditorToolbar({
  editor, activeTab, setActiveTab,
  fontFamily, setFf, fontSize, setFs,
  textColor, setTextColor, highlightColor, setHighlightColor,
  pageSettings: pg, onPageSettingsChange,
  ins, onImageClick,
}: WordEditorToolbarProps) {
  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);

  return (
    <div className="flex-shrink-0 border-b border-white/10 bg-[#25262b]">
      {/* Вкладки ленты */}
      <div className="flex border-b border-white/10 px-2">
        <Tab id="home"   active={activeTab === "home"}   label="Главная" onClick={id => setActiveTab(id as typeof activeTab)} />
        <Tab id="layout" active={activeTab === "layout"} label="Разметка" onClick={id => setActiveTab(id as typeof activeTab)} />
        <Tab id="insert" active={activeTab === "insert"} label="Вставка" onClick={id => setActiveTab(id as typeof activeTab)} />
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
          <ToolBtn title="Вставить изображение" onClick={onImageClick}>
            <Icon name="Image" size={13} />
            <span className="text-xs ml-1">Изображение</span>
          </ToolBtn>
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
  );
}
