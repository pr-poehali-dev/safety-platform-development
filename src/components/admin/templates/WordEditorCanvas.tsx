import { EditorContent, type Editor } from "@tiptap/react";
import { PAPER_SIZES, type PageSettings } from "./wordEditorTypes";

interface WordEditorCanvasProps {
  editor: Editor;
  pageSettings: PageSettings;
}

const pxMm = (mm: number) => Math.round(mm * 96 / 25.4);

export function WordEditorCanvas({ editor, pageSettings: pg }: WordEditorCanvasProps) {
  const paper = PAPER_SIZES[pg.paperSize] ?? PAPER_SIZES.A4;
  const pw = pg.orientation === "portrait" ? paper.w : paper.h;
  const ph = pg.orientation === "portrait" ? paper.h : paper.w;

  return (
    <div
      className="flex-1 overflow-auto flex flex-col items-center py-8 gap-4"
      style={{ background: "#2c2d32" }}
    >
      <div className="text-[11px] text-white/30 flex items-center gap-3 flex-shrink-0">
        <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          {pg.paperSize} · {pg.orientation === "portrait" ? "Книжная" : "Альбомная"} · {pw}×{ph} мм
        </span>
      </div>

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
  );
}
