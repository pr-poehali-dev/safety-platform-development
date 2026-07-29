import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}

export default function FilterDropdown({ label, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${value.length > 0 ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
      >
        {value.length > 0 ? `${label}: ${value.length}` : label}
        {value.length > 0 ? (
          <span onClick={e => { e.stopPropagation(); onChange([]); }} className="ml-0.5 hover:text-foreground">
            <Icon name="X" size={11} />
          </span>
        ) : (
          <Icon name="ChevronDown" size={11} />
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl z-20 min-w-[220px] max-h-64 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between sticky top-0 bg-card">
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            {value.length > 0 && (
              <button onClick={() => onChange([])} className="text-xs text-primary hover:underline">Сбросить</button>
            )}
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">Список пуст</div>
          ) : (
            options.map(o => (
              <label key={o} className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(o)}
                  onChange={() => toggle(o)}
                  className="accent-primary w-3.5 h-3.5 flex-shrink-0"
                />
                <span className="text-xs text-foreground leading-tight">{o}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
