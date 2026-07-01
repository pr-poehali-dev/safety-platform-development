import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, FontFamily, Color, FontSize } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table as TableExtension, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { useState, useCallback, useRef } from "react";
import { type PageSettings } from "./wordEditorTypes";
import { WordEditorToolbar } from "./WordEditorToolbar";
import { WordEditorCanvas } from "./WordEditorCanvas";

interface WordEditorProps {
  content: string;
  onChange: (html: string) => void;
  pageSettings: PageSettings;
  onPageSettingsChange: (s: PageSettings) => void;
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
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false }),
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
    if (editor && v) editor.chain().focus().setMark("textStyle", { fontSize: `${v}pt` }).run();
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

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-[#1a1b1e]">
      <WordEditorToolbar
        editor={editor}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fontFamily={fontFamily}
        setFf={setFf}
        fontSize={fontSize}
        setFs={setFs}
        textColor={textColor}
        setTextColor={setTextColor}
        highlightColor={highlightColor}
        setHighlightColor={setHighlightColor}
        pageSettings={pageSettings}
        onPageSettingsChange={onPageSettingsChange}
        ins={ins}
        onImageClick={() => fileInputRef.current?.click()}
      />

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={insertImage} />

      <WordEditorCanvas editor={editor} pageSettings={pageSettings} />
    </div>
  );
}
