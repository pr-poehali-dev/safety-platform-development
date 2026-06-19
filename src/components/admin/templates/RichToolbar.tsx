import { useState, useCallback, useEffect } from "react";

const FONTS = ["Times New Roman", "Arial", "Calibri", "Georgia", "Courier New", "Verdana"];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

export function RichToolbar({ activeField }: { activeField: string | null }) {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [font, setFont] = useState("Times New Roman");
  const [size, setSize] = useState(12);

  const updateState = useCallback(() => {
    setBold(document.queryCommandState("bold"));
    setItalic(document.queryCommandState("italic"));
    setUnderline(document.queryCommandState("underline"));
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateState);
    return () => document.removeEventListener("selectionchange", updateState);
  }, [updateState]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  const applyFont = (f: string) => {
    setFont(f);
    exec("fontName", f);
  };

  const applySize = (s: number) => {
    setSize(s);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = `${s}pt`;
    try { range.surroundContents(span); } catch { exec("insertHTML", `<span style="font-size:${s}pt">${sel.toString()}</span>`); }
  };

  if (!activeField) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1e1f23] border border-white/10 rounded-lg shadow-lg flex-wrap">
      <select
        value={font}
        onChange={e => applyFont(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 max-w-[140px]"
      >
        {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
      <select
        value={size}
        onChange={e => applySize(Number(e.target.value))}
        onMouseDown={e => e.stopPropagation()}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 w-16"
      >
        {FONT_SIZES.map(s => <option key={s} value={s}>{s} pt</option>)}
      </select>
      <div className="w-px h-5 bg-white/10 mx-0.5" />
      {([
        ["bold", "Bold", "B", bold],
        ["italic", "Italic", "I", italic],
        ["underline", "Underline", "U", underline],
      ] as [string, string, string, boolean][]).map(([cmd, , label, active]) => (
        <button
          key={cmd}
          onMouseDown={e => { e.preventDefault(); exec(cmd); updateState(); }}
          className={`w-7 h-7 rounded text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-white/50 hover:text-white hover:bg-white/10"}`}
          style={{ fontStyle: cmd === "italic" ? "italic" : undefined, textDecoration: cmd === "underline" ? "underline" : undefined, fontWeight: cmd === "bold" ? "bold" : undefined }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
