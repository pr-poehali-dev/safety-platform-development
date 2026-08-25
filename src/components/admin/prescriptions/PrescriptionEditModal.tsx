import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Prescription, Remark, Status } from "./types";

// --- Модалка редактирования предписания ---
export function PrescriptionEditModal({ prescription: initial, onClose, onSave }: {
  prescription: Prescription;
  onClose: () => void;
  onSave: (p: Prescription) => Promise<void>;
}) {
  const [p, setP] = useState<Prescription>({ ...initial, remarks: initial.remarks.map(r => ({ ...r })) });
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof Omit<Prescription, "remarks" | "comments">, val: string) =>
    setP(prev => ({ ...prev, [key]: val }));

  const setRemark = (i: number, key: keyof Remark, val: string) =>
    setP(prev => ({ ...prev, remarks: prev.remarks.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));

  const handleSave = async () => { setSaving(true); await onSave(p); setSaving(false); };

  const inp = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const lbl = "text-xs font-medium text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Редактирование предписания {p.number}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Основные сведения</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Объект</label><input value={p.object} onChange={e => setField("object", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>Подрядчик</label><input value={p.contractor} onChange={e => setField("contractor", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Проверку провёл</label><input value={p.inspector} onChange={e => setField("inspector", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>В присутствии</label><input value={p.representative} onChange={e => setField("representative", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Email для ответа</label><input value={p.replyEmail} onChange={e => setField("replyEmail", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>Срок отчёта</label><input value={p.reportDeadline} onChange={e => setField("reportDeadline", e.target.value)} className={inp} placeholder="дд.мм.гггг" /></div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Замечания ({p.remarks.length})</p>
            {p.remarks.map((r, i) => (
              <div key={r.id} className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10">
                <p className="text-xs font-semibold text-primary">Замечание #{i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className={lbl}>Место нарушения</label><input value={r.place} onChange={e => setRemark(i, "place", e.target.value)} className={inp} /></div>
                  <div className="space-y-1.5"><label className={lbl}>Срок устранения</label><input value={r.deadline} onChange={e => setRemark(i, "deadline", e.target.value)} className={inp} placeholder="дд.мм.гггг" /></div>
                </div>
                <div className="space-y-1.5"><label className={lbl}>Описание нарушения</label><textarea value={r.description} onChange={e => setRemark(i, "description", e.target.value)} className={inp + " resize-none"} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className={lbl}>НПА/ЛНА</label><input value={r.normRef} onChange={e => setRemark(i, "normRef", e.target.value)} className={inp} /></div>
                  <div className="space-y-1.5">
                    <label className={lbl}>Статус</label>
                    <select value={r.status} onChange={e => setRemark(i, "status", e.target.value)} className={inp}>
                      {(["Черновик","В работе","Устранено","Просрочено"] as Status[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}
