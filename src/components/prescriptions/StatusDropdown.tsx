import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Status, STATUS_STYLE } from "@/lib/prescriptionTypes";

const CHANGE_OPTIONS: Status[] = ["Черновик", "В работе", "Устранено"];

const DOT_COLOR: Record<Status, string> = {
  "Черновик": "bg-muted-foreground",
  "В работе": "bg-primary",
  "Устранено": "bg-green-400",
  "Просрочено": "bg-red-400",
};

interface StatusDropdownProps {
  status: Status;
  editable: boolean;
  onChange: (status: Status) => void;
  align?: "left" | "right";
}

export function StatusDropdown({ status, editable, onChange, align = "left" }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!editable) {
    return (
      <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${STATUS_STYLE[status]}`}>
        {status}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap transition-colors hover:brightness-110 ${STATUS_STYLE[status]}`}
      >
        {status}
        <Icon name="ChevronDown" size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[130px] ${align === "right" ? "right-0" : "left-0"}`}>
          {CHANGE_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-secondary/50 flex items-center gap-2 ${s === status ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_COLOR[s]}`} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
