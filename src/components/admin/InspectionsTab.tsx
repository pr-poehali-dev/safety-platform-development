import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Inspection } from "@/components/inspections/types";

const INSPECTIONS_API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";

const inp = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
const lbl = "text-xs font-medium text-muted-foreground";

function InspectionEditModal({ inspection: initial, onClose, onSave }: {
  inspection: Inspection;
  onClose: () => void;
  onSave: (i: Inspection) => Promise<void>;
}) {
  const [form, setForm] = useState<Inspection>({ ...initial });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Inspection, val: string | number | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => { setSaving(true); await onSave(form); setSaving(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Редактирование проверки #{form.id}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Дата проверки</label>
              <input type="date" value={form.inspection_date} onChange={e => set("inspection_date", e.target.value)} className={inp} />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Подрядчик</label>
              <input value={form.contractor} onChange={e => set("contractor", e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Объект</label>
              <input value={form.object_name} onChange={e => set("object_name", e.target.value)} className={inp} />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Вид нарушения</label>
              <input value={form.violation_type} onChange={e => set("violation_type", e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Инспектор</label>
              <input value={form.inspector_name} onChange={e => set("inspector_name", e.target.value)} className={inp} />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Кол-во замечаний</label>
              <input type="number" min={0} value={form.remarks_count} onChange={e => set("remarks_count", Number(e.target.value))} className={inp} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={lbl}>Примечание</label>
            <textarea value={form.note ?? ""} onChange={e => set("note", e.target.value)} className={inp + " resize-none"} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("works_suspended", !form.works_suspended)}
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${form.works_suspended ? "bg-red-500" : "bg-muted"}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${form.works_suspended ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <span className="text-sm text-foreground">Работы приостановлены</span>
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

export function InspectionsTab() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editInspection, setEditInspection] = useState<Inspection | null>(null);

  useState(() => {
    setLoading(true);
    fetch(INSPECTIONS_API)
      .then(r => r.json())
      .then(data => setInspections(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  });

  const filtered = inspections.filter(i => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(i.id).includes(q) ||
      (i.contractor || "").toLowerCase().includes(q) ||
      (i.object_name || "").toLowerCase().includes(q) ||
      (i.inspector_name || "").toLowerCase().includes(q) ||
      (i.violation_type || "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: number) => {
    setDeleting(true);
    await fetch(INSPECTIONS_API, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setInspections(prev => prev.filter(i => i.id !== id));
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const handleSave = async (updated: Inspection) => {
    await fetch(INSPECTIONS_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setInspections(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditInspection(null);
  };

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по подрядчику, объекту, инспектору..."
            className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} проверок</span>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="TableProperties" size={32} className="opacity-30" />
          <p className="text-sm">Проверки не найдены</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Подрядчик</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Объект</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Вид нарушения</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Замеч.</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">СПБ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">#{i.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {i.inspection_date ? new Date(i.inspection_date).toLocaleDateString("ru-RU") : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[150px] truncate">{i.contractor || "—"}</td>
                  <td className="px-4 py-3 max-w-[150px] truncate">{i.object_name || "—"}</td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground">{i.violation_type || "—"}</td>
                  <td className="px-4 py-3 text-center font-medium">{i.remarks_count}</td>
                  <td className="px-4 py-3 text-center">
                    {i.works_suspended
                      ? <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-medium text-red-400 bg-red-400/10 border-red-400/20">Да</span>
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deleteConfirm === i.id ? (
                        <>
                          <span className="text-xs text-muted-foreground">Удалить?</span>
                          <button onClick={() => handleDelete(i.id)} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50">
                            {deleting ? "..." : "Да"}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Нет</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditInspection(i)} className="text-muted-foreground hover:text-foreground transition-colors" title="Редактировать">
                            <Icon name="Pencil" size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(i.id)} className="text-muted-foreground hover:text-red-400 transition-colors" title="Удалить">
                            <Icon name="Trash2" size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editInspection && (
        <InspectionEditModal
          inspection={editInspection}
          onClose={() => setEditInspection(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default InspectionsTab;
