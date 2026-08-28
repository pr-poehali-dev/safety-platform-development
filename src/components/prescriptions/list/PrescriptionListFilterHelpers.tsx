import Icon from "@/components/ui/icon";
import { ALL_STATUSES } from "@/lib/prescriptionTypes";
import { useState, useRef, useEffect } from "react";

export function ColumnFilter({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const active = value !== "Все";
  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className={`flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        {label}
        <Icon name={active ? "FilterX" : "ChevronDown"} size={11} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[200px]">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Поиск...`}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="py-1 max-h-52 overflow-y-auto">
            {!search && (
              <button
                onClick={() => { onChange("Все"); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-secondary/50 ${value === "Все" ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                Все {label.toLowerCase()}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Ничего не найдено</div>
            ) : filtered.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-secondary/50 ${value === opt ? "text-primary font-medium" : "text-foreground"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusMultiSelect({ value, onChange }: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (s: string) => {
    onChange(value.includes(s) ? value.filter(v => v !== s) : [...value, s]);
  };

  const label = value.length === 0 ? "Все" : value.length === 1 ? value[0] : `Статус: ${value.length}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap ${value.length > 0 ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"}`}
      >
        {label}
        <Icon name="ChevronDown" size={12} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[180px]">
          <div className="py-1">
            <button
              onClick={() => { onChange([]); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-secondary/50 ${value.length === 0 ? "text-primary font-medium" : "text-foreground"}`}
            >
              Все статусы
            </button>
            <div className="h-px bg-border my-1" />
            {ALL_STATUSES.map(s => (
              <label
                key={s}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground cursor-pointer hover:bg-secondary/50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(s)}
                  onChange={() => toggle(s)}
                  className="accent-primary"
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
