import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";

type Tool = "pen" | "circle" | "square" | "arrow" | "text";

interface Point { x: number; y: number; }

interface EditablePhotoLightboxProps {
  photos: string[];
  startIndex: number;
  onClose: () => void;
  onSave: (index: number, dataUrl: string) => Promise<void> | void;
}

export function EditablePhotoLightbox({ photos, startIndex, onClose, onSave }: EditablePhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(28);
  const [saving, setSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [textInput, setTextInput] = useState<Point | null>(null);
  const [textValue, setTextValue] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<string[]>([]);
  const drawingRef = useRef(false);
  const startPosRef = useRef<Point | null>(null);
  const snapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.9, 900);
      const maxH = window.innerHeight * 0.62;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      historyRef.current = [canvas.toDataURL("image/jpeg", 0.92)];
      setCanUndo(false);
    };
    img.src = photos[index];
  }, [editing, index, photos]);

  const restoreSnapshot = (dataUrl: string, cb?: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      cb?.();
    };
    img.src = dataUrl;
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current.push(canvas.toDataURL("image/jpeg", 0.92));
    if (historyRef.current.length > 25) historyRef.current.shift();
    setCanUndo(historyRef.current.length > 1);
  };

  const undo = () => {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    restoreSnapshot(historyRef.current[historyRef.current.length - 1]);
    setCanUndo(historyRef.current.length > 1);
  };

  const resetToOriginal = () => {
    if (!historyRef.current.length) return;
    historyRef.current = [historyRef.current[0]];
    restoreSnapshot(historyRef.current[0]);
    setCanUndo(false);
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLen = 10 + strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    if (tool === "text") {
      setTextInput(pos);
      setTextValue("");
      return;
    }
    drawingRef.current = true;
    startPosRef.current = pos;
    snapshotRef.current = canvas.toDataURL("image/jpeg", 0.92);
    if (tool === "pen") {
      const ctx = canvas.getContext("2d")!;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool === "text") return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }
    if (!snapshotRef.current || !startPosRef.current) return;
    restoreSnapshot(snapshotRef.current, () => {
      const start = startPosRef.current!;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      if (tool === "circle") {
        const rx = Math.abs(pos.x - start.x) / 2;
        const ry = Math.abs(pos.y - start.y) / 2;
        const cx = (pos.x + start.x) / 2;
        const cy = (pos.y + start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === "square") {
        ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
      } else if (tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        drawArrowHead(ctx, start, pos);
      }
    });
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    startPosRef.current = null;
    snapshotRef.current = null;
    pushHistory();
  };

  const commitText = () => {
    if (!textInput || !textValue.trim()) { setTextInput(null); return; }
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px 'IBM Plex Sans', sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(textValue, textInput.x, textInput.y);
    setTextInput(null);
    setTextValue("");
    pushHistory();
  };

  const handleSaveEdit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      await onSave(index, dataUrl);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const TOOLS: { id: Tool; icon: string; title: string }[] = [
    { id: "pen", icon: "Pencil", title: "Маркер" },
    { id: "circle", icon: "Circle", title: "Круг" },
    { id: "square", icon: "Square", title: "Прямоугольник" },
    { id: "arrow", icon: "ArrowUpRight", title: "Стрелка" },
    { id: "text", icon: "Type", title: "Текст" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!editing ? onClose : undefined} />

      {!editing && (
        <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
          <Icon name="X" size={26} />
        </button>
      )}

      {!editing && photos.length > 1 && (
        <button
          onClick={() => setIndex(i => (i - 1 + photos.length) % photos.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
        >
          <Icon name="ChevronLeft" size={32} />
        </button>
      )}

      {!editing ? (
        <div className="relative flex flex-col items-center gap-4">
          <img src={photos[index]} alt={`Фото ${index + 1}`} className="max-w-[90vw] max-h-[75vh] rounded-lg object-contain" />
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            <Icon name="Pencil" size={16} />
            Редактировать
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
          <div className="relative">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="rounded-lg border border-white/10 bg-black touch-none cursor-crosshair"
            />
            {textInput && (
              <div className="absolute" style={{ left: textInput.x, top: textInput.y }}>
                <input
                  autoFocus
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextInput(null); }}
                  onBlur={commitText}
                  style={{ color, fontSize: Math.max(fontSize * 0.7, 12) }}
                  className="bg-black/60 border border-white/40 rounded px-1.5 py-0.5 outline-none min-w-[120px]"
                  placeholder="Текст"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 bg-card/95 border border-border rounded-xl px-4 py-3 shadow-xl max-w-[95vw]">
            <div className="flex items-center gap-1">
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  title={t.title}
                  onClick={() => setTool(t.id)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    tool === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon name={t.icon} size={17} />
                </button>
              ))}
            </div>

            <div className="w-px h-7 bg-border" />

            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
              title="Цвет"
            />

            <div className="w-px h-7 bg-border" />

            {tool === "text" ? (
              <div className="flex items-center gap-2 w-32">
                <Icon name="Type" size={14} className="text-muted-foreground flex-shrink-0" />
                <Slider min={14} max={60} step={2} value={[fontSize]} onValueChange={v => setFontSize(v[0])} />
              </div>
            ) : (
              <div className="flex items-center gap-2 w-32">
                <Icon name="Minus" size={12} className="text-muted-foreground flex-shrink-0" />
                <Slider min={1} max={20} step={1} value={[strokeWidth]} onValueChange={v => setStrokeWidth(v[0])} />
              </div>
            )}

            <div className="w-px h-7 bg-border" />

            <button onClick={undo} disabled={!canUndo} title="Отменить" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 transition-colors">
              <Icon name="Undo2" size={17} />
            </button>
            <button onClick={resetToOriginal} title="Очистить всё" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Icon name="RotateCcw" size={17} />
            </button>

            <div className="w-px h-7 bg-border" />

            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              Отмена
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}
              Сохранить
            </button>
          </div>
        </div>
      )}

      {!editing && photos.length > 1 && (
        <button
          onClick={() => setIndex(i => (i + 1) % photos.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
        >
          <Icon name="ChevronRight" size={32} />
        </button>
      )}

      {!editing && photos.length > 1 && (
        <span className="absolute bottom-6 text-white/70 text-xs">{index + 1} / {photos.length}</span>
      )}
    </div>
  );
}
