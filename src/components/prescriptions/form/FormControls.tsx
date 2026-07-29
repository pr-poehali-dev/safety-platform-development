import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";

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

export function DatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
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
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl animate-fade-in">
          <Calendar mode="single" selected={selected} onSelect={handleSelect} locale={ru} initialFocus />
        </div>
      )}
    </div>
  );
}
