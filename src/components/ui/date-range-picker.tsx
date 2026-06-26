import { useState, useRef, useEffect } from "react";
import { format, isValid, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker, DateRange } from "react-day-picker";
import Icon from "@/components/ui/icon";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onReset: () => void;
}

function toDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isValid(d) ? d : undefined;
}

function toIso(d: Date | undefined): string {
  if (!d || !isValid(d)) return "";
  return format(d, "yyyy-MM-dd");
}

export default function DateRangePicker({
  dateFrom, dateTo, onFromChange, onToChange, onReset,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const range: DateRange = {
    from: toDate(dateFrom),
    to: toDate(dateTo),
  };

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(r: DateRange | undefined) {
    onFromChange(toIso(r?.from));
    onToChange(toIso(r?.to));
    if (r?.from && r?.to) setOpen(false);
  }

  const hasFilter = dateFrom || dateTo;

  const label = (() => {
    if (range.from && range.to) {
      return `${format(range.from, "dd.MM.yyyy")} — ${format(range.to, "dd.MM.yyyy")}`;
    }
    if (range.from) return `с ${format(range.from, "dd.MM.yyyy")}`;
    return "Выбрать период";
  })();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
          hasFilter
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
        }`}
      >
        <Icon name="CalendarDays" size={13} />
        <span>{label}</span>
        {hasFilter && (
          <span
            onClick={e => { e.stopPropagation(); onReset(); }}
            className="ml-1 hover:text-foreground transition-colors cursor-pointer"
          >
            <Icon name="X" size={11} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-xl p-3">

          {/* Быстрые периоды */}
          <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border">
            {[
              { label: "Этот месяц", from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
              { label: "Прошлый месяц", from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
              { label: "Этот год", from: startOfYear(new Date()), to: endOfYear(new Date()) },
              { label: "Прошлый год", from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  onFromChange(toIso(preset.from));
                  onToChange(toIso(preset.to));
                  setOpen(false);
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-border hover:border-primary/40 hover:bg-primary/10 hover:text-foreground text-muted-foreground transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            locale={ru}
            weekStartsOn={1}
            styles={{
              root: { fontFamily: "inherit", fontSize: "13px" },
            }}
            modifiersClassNames={{
              selected: "rdp-selected",
              range_start: "rdp-range-start",
              range_end: "rdp-range-end",
              range_middle: "rdp-range-middle",
              today: "rdp-today",
            }}
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
            .rdp-range-start .rdp-day_button { background: hsl(var(--primary)) !important; color: hsl(var(--primary-foreground)) !important; border-radius: 8px 0 0 8px; }
            .rdp-range-end .rdp-day_button { background: hsl(var(--primary)) !important; color: hsl(var(--primary-foreground)) !important; border-radius: 0 8px 8px 0; }
            .rdp-range-middle .rdp-day_button { background: hsl(var(--primary) / 0.15) !important; color: hsl(var(--foreground)) !important; border-radius: 0; }
            .rdp-today .rdp-day_button { font-weight: 700; color: hsl(var(--primary)); }
          `}</style>
        </div>
      )}
    </div>
  );
}