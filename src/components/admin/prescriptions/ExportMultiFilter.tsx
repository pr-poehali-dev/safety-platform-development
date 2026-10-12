import { useState } from "react";
import Icon from "@/components/ui/icon";

export function ExportMultiFilter({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const shown = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/40 text-sm text-foreground hover:bg-secondary/60 transition-colors"
      >
        <span className="truncate text-left">
          {label}: {value.length === 0 ? "все" : value.length === 1 ? value[0] : `выбрано ${value.length}`}
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>
      {open && (
        <div className="mt-1 border border-border rounded-lg bg-background">
          <div className="p-2 border-b border-border">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Ничего не найдено</div>
            ) : shown.map(o => (
              <label key={o} className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground cursor-pointer hover:bg-secondary/50">
                <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} className="accent-primary" />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-[11px] text-primary border-t border-border hover:opacity-80"
            >
              Сбросить выбор
            </button>
          )}
        </div>
      )}
    </div>
  );
}
