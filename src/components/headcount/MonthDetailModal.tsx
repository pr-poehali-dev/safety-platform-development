import { useState } from "react";
import Icon from "@/components/ui/icon";
import { MonthStats, PO_RATE, SBD_RATE } from "@/lib/headcountTypes";

interface Props {
  month: MonthStats;
  editable: boolean;
  saving: boolean;
  onClose: () => void;
  onSaveDay: (date: string, po: number | null, sbd: number | null) => Promise<void>;
}

const fmt = (n: number) => n.toLocaleString("ru-RU");

export default function MonthDetailModal({ month, editable, saving, onClose, onSaveDay }: Props) {
  const [editDate, setEditDate] = useState<string | null>(null);
  const [poVal, setPoVal] = useState("");
  const [sbdVal, setSbdVal] = useState("");

  const startEdit = (date: string, po: number | null, sbd: number | null) => {
    setEditDate(date);
    setPoVal(po === null ? "" : String(po));
    setSbdVal(sbd === null ? "" : String(sbd));
  };

  const commit = async () => {
    if (!editDate) return;
    const po = poVal.trim() === "" ? null : Number(poVal);
    const sbd = sbdVal.trim() === "" ? null : Number(sbdVal);
    await onSaveDay(editDate, po, sbd);
    setEditDate(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold">{month.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Сумма ЧЧ: <span className="text-foreground font-medium">{fmt(month.totalHours)}</span>
              {" · "}ПО {fmt(month.poHours)} + СБД {fmt(month.sbdHours)}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Дата</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">ПО (числ.)</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">СБД (числ.)</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">ЧЧ за день</th>
                {editable && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {month.days.map(d => {
                const isEditing = editDate === d.date;
                const dayHours = (d.po ?? 0) * PO_RATE + (d.sbd ?? 0) * SBD_RATE;
                const isToday = d.date === today;
                return (
                  <tr key={d.date} className={`border-b border-border last:border-0 ${isToday ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2 text-foreground">
                      {new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", weekday: "short" })}
                    </td>
                    {isEditing ? (
                      <>
                        <td className="px-2 py-1.5">
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            value={poVal}
                            onChange={e => setPoVal(e.target.value)}
                            className="w-20 bg-background border border-border rounded-md px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            value={sbdVal}
                            onChange={e => setSbdVal(e.target.value)}
                            className="w-20 bg-background border border-border rounded-md px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground">—</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={commit} disabled={saving} className="p-1 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
                              <Icon name="Check" size={14} />
                            </button>
                            <button onClick={() => setEditDate(null)} className="p-1 rounded text-muted-foreground hover:bg-secondary transition-colors">
                              <Icon name="X" size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-center text-foreground">{d.po ?? "—"}</td>
                        <td className="px-3 py-2 text-center text-foreground">{d.sbd ?? "—"}</td>
                        <td className="px-3 py-2 text-center font-medium text-foreground">{d.po === null && d.sbd === null ? "—" : fmt(dayHours)}</td>
                        {editable && (
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => startEdit(d.date, d.po, d.sbd)}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Редактировать"
                            >
                              <Icon name="Pencil" size={13} />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
