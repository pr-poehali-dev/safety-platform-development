import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Template } from "@/lib/template";
import { PrescriptionData } from "@/components/PrescriptionDocument";
import { downloadPrescriptionPdf, downloadPrescriptionWord } from "@/lib/printPrescription";

export function DownloadFormatMenu({ p, template, className, stopPropagation }: {
  p: PrescriptionData;
  template?: Template;
  className: string;
  stopPropagation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const run = async (format: "pdf" | "word") => {
    setOpen(false);
    setBusy(true);
    try {
      if (format === "pdf") await downloadPrescriptionPdf(p, template);
      else await downloadPrescriptionWord(p, template);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative" onClick={e => { if (stopPropagation) e.stopPropagation(); }}>
      <button onClick={() => setOpen(o => !o)} disabled={busy} className={`${className} disabled:opacity-50`} title="Скачать предписание">
        {busy ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Download" size={13} />}
        Скачать
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[130px] bg-card border border-border rounded-lg shadow-lg py-1">
          <button onClick={() => run("pdf")} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-secondary/50 text-left">
            <Icon name="FileText" size={13} />PDF
          </button>
          <button onClick={() => run("word")} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-secondary/50 text-left">
            <Icon name="FileType" size={13} />Word
          </button>
        </div>
      )}
    </div>
  );
}
