import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface ObjectPickerProps {
  value: string;
  onChange: (v: string) => void;
  options: { name: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export function ObjectPicker({ value, onChange, options, placeholder = "— Выберите объект —", disabled }: ObjectPickerProps) {
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

  return (
    <div className="relative w-full min-w-0" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full min-w-0 flex items-center justify-between gap-2 bg-background border border-border rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-foreground/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`min-w-0 break-words whitespace-normal ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || placeholder}
        </span>
        <Icon name="ChevronDown" size={14} className="text-muted-foreground flex-shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-72 overflow-y-auto overflow-x-hidden bg-card border border-border rounded-xl shadow-xl animate-fade-in py-1">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            {placeholder}
          </button>
          {options.map(o => (
            <button
              key={o.name}
              type="button"
              onClick={() => { onChange(o.name); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm break-words whitespace-normal hover:bg-secondary transition-colors ${
                o.name === value ? "bg-primary/10 text-primary font-medium" : "text-foreground"
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
