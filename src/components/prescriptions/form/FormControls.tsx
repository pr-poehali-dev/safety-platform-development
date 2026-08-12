import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { DEADLINE_IMMEDIATE } from "@/lib/prescriptionTypes";

// --- Базовые UI-элементы ---
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

export function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 ${props.className ?? ""}`}
    />
  );
}

export function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none ${props.className ?? ""}`}
    />
  );
}

export function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 ${props.className ?? ""}`}
    />
  );
}

export function DatePicker({ value, onChange, placeholder, allowImmediate }: { value: string; onChange: (v: string) => void; placeholder?: string; allowImmediate?: boolean }) {
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

  const isImmediate = value === DEADLINE_IMMEDIATE;

  const selected: Date | undefined = (() => {
    if (!value || isImmediate) return undefined;
    const d = parse(value, "dd.MM.yyyy", new Date());
    return isValid(d) ? d : undefined;
  })();

  const handleSelect = (day: Date | undefined) => {
    if (day) { onChange(format(day, "dd.MM.yyyy")); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-foreground/30 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || (placeholder ?? "Выбрать дату")}
        </span>
        <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl animate-fade-in p-3">
          {allowImmediate && (
            <div className="flex mb-3 pb-3 border-b border-border">
              <button
                type="button"
                onClick={() => { onChange(DEADLINE_IMMEDIATE); setOpen(false); }}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  isImmediate
                    ? "border-primary/40 bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/40 hover:bg-primary/10 hover:text-foreground text-muted-foreground"
                }`}
              >
                Незамедлительно
              </button>
            </div>
          )}
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ru}
            weekStartsOn={1}
            autoFocus
            styles={{ root: { fontFamily: "inherit", fontSize: "13px", margin: 0 } }}
            modifiersClassNames={{
              selected: "rdp-selected",
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
            .rdp-today .rdp-day_button { font-weight: 700; color: hsl(var(--primary)); }
          `}</style>
        </div>
      )}
    </div>
  );
}