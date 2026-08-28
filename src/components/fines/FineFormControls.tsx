import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";

// --- Календарь для выбора даты (значение хранится в формате YYYY-MM-DD) ---
export function IsoDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

  const selected: Date | undefined = (() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  })();

  const handleSelect = (day: Date | undefined) => {
    if (day) { onChange(format(day, "yyyy-MM-dd")); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-foreground/30 transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? format(selected, "dd.MM.yyyy") : "Выбрать дату"}
        </span>
        <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl animate-fade-in p-3">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ru}
            weekStartsOn={1}
            autoFocus
            styles={{ root: { fontFamily: "inherit", fontSize: "13px", margin: 0 } }}
            modifiersClassNames={{ selected: "rdp-selected", today: "rdp-today" }}
            classNames={{
              month_caption: "flex items-center justify-between px-1 mb-2",
              caption_label: "text-sm font-semibold text-foreground capitalize",
              nav: "flex gap-1",
              button_previous: "w-7 h-7 rounded-lg border border-border hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs",
              button_next: "w-7 h-7 rounded-lg border border-border hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs",
              weeks: "",
              weekdays: "flex mb-1",
              weekday: "w-9 text-center text-[11px] text-muted-foreground font-medium",
              week: "flex",
              day: "p-0",
              day_button: "w-9 h-9 text-xs rounded-lg hover:bg-secondary transition-colors flex items-center justify-center cursor-pointer text-foreground",
              outside: "opacity-30",
              disabled: "opacity-25 cursor-not-allowed",
            }}
          />
          <style>{`
            .rdp-selected .rdp-day_button { background: hsl(var(--primary)) !important; color: hsl(var(--primary-foreground)) !important; border-radius: 8px; }
            .rdp-today .rdp-day_button { font-weight: 700; color: hsl(var(--primary)); }
          `}</style>
        </div>
      )}
    </div>
  );
}

// --- Множественный выбор из списка (с поиском и чипами выбранных значений) ---
export function MultiSelectField({
  options, selected, onChange, placeholder, searchPlaceholder,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // объединяем список опций с уже выбранными значениями, которых может не быть в справочнике (историчные данные)
  const allOptions = [...new Set([...options, ...selected])];
  const filtered = allOptions.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(v => v !== opt) : [...selected, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-foreground/30 transition-colors"
      >
        <span className={selected.length > 0 ? "text-foreground" : "text-muted-foreground"}>
          {selected.length > 0 ? `Выбрано: ${selected.length}` : (placeholder ?? "Выбрать")}
        </span>
        <Icon name="ChevronDown" size={14} className={`text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-red-400 transition-colors">
                <Icon name="X" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl animate-fade-in w-full min-w-[260px] max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border sticky top-0 bg-card">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? "Поиск..."}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">Ничего не найдено</div>
            ) : (
              filtered.map(o => (
                <label key={o} className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(o)}
                    onChange={() => toggle(o)}
                    className="accent-primary w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-xs text-foreground leading-tight">{o}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
