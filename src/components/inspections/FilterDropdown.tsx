import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

interface Props {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

export default function FilterDropdown({ label, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${value ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
      >
        {value || label}
        {value ? (
          <span onClick={e => { e.stopPropagation(); onChange(""); }} className="ml-0.5 hover:text-foreground">
            <Icon name="X" size={11} />
          </span>
        ) : (
          <Icon name="ChevronDown" size={11} />
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl z-20 min-w-[180px] py-1 max-h-52 overflow-y-auto">
          <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors">
            Все
          </button>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-secondary ${value === o ? "text-primary font-medium" : "text-foreground"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
