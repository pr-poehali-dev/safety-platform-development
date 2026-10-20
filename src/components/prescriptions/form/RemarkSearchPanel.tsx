import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import FilterDropdown from "@/components/inspections/FilterDropdown";
import DateRangePicker from "@/components/ui/date-range-picker";
import { StatusMultiSelect } from "@/components/prescriptions/list/PrescriptionListFilterHelpers";
import { Highlight, matchingRemarks, searchWords } from "@/components/prescriptions/list/RemarkMatches";
import { Prescription, Remark } from "@/lib/prescriptionTypes";

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

interface RemarkSearchPanelProps {
  onInsert: (r: Remark) => void;
  onClose: () => void;
}

export default function RemarkSearchPanel({ onInsert, onClose }: RemarkSearchPanelProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [objects, setObjects] = useState<string[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);
  const [inspectors, setInspectors] = useState<string[]>([]);
  const [suspended, setSuspended] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [meta, setMeta] = useState<{ objects: string[]; contractors: string[]; inspectors: string[] }>({ objects: [], contractors: [], inspectors: [] });
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}?type=meta`)
      .then(r => r.json())
      .then(d => setMeta({
        objects: Array.isArray(d.objects) ? d.objects : [],
        contractors: Array.isArray(d.contractors) ? d.contractors : [],
        inspectors: Array.isArray(d.inspectors) ? d.inspectors : [],
      }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!search.trim()) { setItems([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ page: "1", page_size: "30", search: search.trim() });
      if (status.length) params.set("status", status.join("|"));
      if (objects.length) params.set("object", objects.join("|"));
      if (contractors.length) params.set("contractor", contractors.join("|"));
      if (inspectors.length) params.set("inspector", inspectors.join("|"));
      if (suspended) params.set("suspended", "1");
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      fetch(`${API}?${params}`)
        .then(r => r.json())
        .then(d => setItems(Array.isArray(d.items) ? d.items : []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [search, status, objects, contractors, inspectors, suspended, dateFrom, dateTo]);

  const words = searchWords(search);
  const results = items.flatMap(p =>
    matchingRemarks(p.remarks || [], words).map(r => ({ p, r, idx: (p.remarks || []).findIndex(x => x.id === r.id) + 1 }))
  );

  const copyText = (r: Remark) => {
    const text = [r.description, r.normRef].filter(Boolean).join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const hasFilters = status.length || objects.length || contractors.length || inspectors.length || suspended || dateFrom || dateTo;

  return (
    <div className="flex flex-col min-h-0 h-full border-t-2 border-primary/40 bg-background/40">
      <div className="flex items-center gap-3 px-12 py-3 border-b border-border flex-shrink-0 flex-wrap">
        <div className="relative w-72">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск нарушения по тексту..."
            className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          onReset={() => { setDateFrom(""); setDateTo(""); }}
        />
        <StatusMultiSelect value={status} onChange={setStatus} />
        <FilterDropdown label="Объект" options={meta.objects} value={objects} onChange={setObjects} />
        <FilterDropdown label="Подрядчик" options={meta.contractors} value={contractors} onChange={setContractors} />
        <FilterDropdown label="Выдал" options={meta.inspectors} value={inspectors} onChange={setInspectors} />
        <button
          onClick={() => setSuspended(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${suspended ? "border-red-500 bg-red-500/10 text-red-400" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="OctagonX" size={12} />
          Приостановлено
        </button>
        {hasFilters ? (
          <button
            onClick={() => { setStatus([]); setObjects([]); setContractors([]); setInspectors([]); setSuspended(false); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Icon name="X" size={11} />
            Сбросить
          </button>
        ) : null}
        <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition-colors" title="Закрыть поиск">
          <Icon name="X" size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-12 py-4 space-y-2">
        {!search.trim() && <p className="text-sm text-muted-foreground">Введите слово или фразу, чтобы найти нарушение в выданных предписаниях.</p>}
        {search.trim() && loading && <p className="text-sm text-muted-foreground">Поиск...</p>}
        {search.trim() && !loading && results.length === 0 && <p className="text-sm text-muted-foreground">Ничего не найдено</p>}
        {results.map(({ p, r, idx }) => (
          <div key={`${p.id}-${r.id}`} className="bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs mb-0.5">
                <span className="font-medium text-primary">{p.number} · №{idx}</span>
                {r.category && <span className="text-muted-foreground"> · {r.category}</span>}
              </div>
              {r.place && <div className="text-xs text-muted-foreground"><Highlight text={r.place} words={words} /></div>}
              <div className="whitespace-pre-wrap"><Highlight text={r.description} words={words} /></div>
              {r.normRef && <div className="text-xs text-muted-foreground mt-1"><Highlight text={r.normRef} words={words} /></div>}
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => onInsert(r)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                <Icon name="Plus" size={12} />
                В предписание
              </button>
              <button
                onClick={() => copyText(r)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <Icon name={copiedId === r.id ? "Check" : "Copy"} size={12} />
                {copiedId === r.id ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
