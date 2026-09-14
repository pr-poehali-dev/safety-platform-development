import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";
import { Suspension, SuspensionStatus, ALL_SUSPENSION_STATUSES, SUSPENSION_STATUS_STYLE } from "@/lib/suspensionTypes";

const SUSPENSIONS_API = "https://functions.poehali.dev/bcc14bec-45e7-4857-867d-95233fa38b64";

const inp = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
const lbl = "text-xs font-medium text-muted-foreground";

function SuspensionEditModal({ suspension: initial, onClose, onSave }: {
  suspension: Suspension;
  onClose: () => void;
  onSave: (s: Suspension) => Promise<void>;
}) {
  const [form, setForm] = useState<Suspension>({ ...initial });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Suspension, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => { setSaving(true); await onSave(form); setSaving(false); };

  const issuedAtLocal = (() => {
    const d = new Date(form.issuedAt);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Редактирование акта {form.number}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Дата и время выдачи</label>
              <input
                type="datetime-local"
                value={issuedAtLocal}
                onChange={e => set("issuedAt", new Date(e.target.value).toISOString())}
                className={inp}
              />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Статус</label>
              <select value={form.status} onChange={e => set("status", e.target.value as SuspensionStatus)} className={inp}>
                {ALL_SUSPENSION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Объект</label>
              <input value={form.object} onChange={e => set("object", e.target.value)} className={inp} />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Место нарушения</label>
              <input value={form.place} onChange={e => set("place", e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Подрядная организация</label>
              <input value={form.contractor} onChange={e => set("contractor", e.target.value)} className={inp} />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Приостановил</label>
              <input value={form.issuedBy} onChange={e => set("issuedBy", e.target.value)} className={inp} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={lbl}>Причина приостановки</label>
            <textarea value={form.reason} onChange={e => set("reason", e.target.value.slice(0, 1000))} className={inp + " resize-none"} rows={4} />
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

export function SuspensionsTab() {
  const [rows, setRows] = useState<Suspension[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editSuspension, setEditSuspension] = useState<Suspension | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(SUSPENSIONS_API)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.number.toLowerCase().includes(q) ||
      (r.contractor || "").toLowerCase().includes(q) ||
      (r.object || "").toLowerCase().includes(q) ||
      (r.place || "").toLowerCase().includes(q) ||
      (r.issuedBy || "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    setDeleting(true);
    await fetch(SUSPENSIONS_API, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRows(prev => prev.filter(r => r.id !== id));
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const handleExport = () => {
    const rowsData = filtered.map(r => ({
      "Номер": r.number,
      "Дата выдачи": r.issuedAt ? new Date(r.issuedAt).toLocaleString("ru-RU") : "",
      "Объект": r.object || "",
      "Место нарушения": r.place || "",
      "Подрядная организация": r.contractor || "",
      "Приостановил": r.issuedBy || "",
      "Причина приостановки": r.reason || "",
      "Статус": r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rowsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Приостановки");
    const colWidths = [14, 18, 25, 25, 25, 25, 40, 20];
    ws["!cols"] = colWidths.map(w => ({ wch: w }));
    XLSX.writeFile(wb, `Приостановки_${new Date().toLocaleDateString("ru-RU").replace(/\./g, "-")}.xlsx`);
  };

  const handleSave = async (updated: Suspension) => {
    await fetch(SUSPENSIONS_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditSuspension(null);
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
            placeholder="Поиск по номеру, объекту, подрядчику..."
            className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} приостановок</span>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="ml-auto flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="Download" size={14} />
          Экспорт в Excel
        </button>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="OctagonPause" size={32} className="opacity-30" />
          <p className="text-sm">Приостановки не найдены</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Номер</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Объект</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Подрядчик</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Приостановил</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("ru-RU") : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[150px] truncate">{r.object || "—"}</td>
                  <td className="px-4 py-3 max-w-[150px] truncate">{r.contractor || "—"}</td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground">{r.issuedBy || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-medium ${SUSPENSION_STATUS_STYLE[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deleteConfirm === r.id ? (
                        <>
                          <span className="text-xs text-muted-foreground">Удалить?</span>
                          <button onClick={() => handleDelete(r.id)} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50">
                            {deleting ? "..." : "Да"}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Нет</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditSuspension(r)} className="text-muted-foreground hover:text-foreground transition-colors" title="Редактировать">
                            <Icon name="Pencil" size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(r.id)} className="text-muted-foreground hover:text-red-400 transition-colors" title="Удалить">
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

      {editSuspension && (
        <SuspensionEditModal
          suspension={editSuspension}
          onClose={() => setEditSuspension(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default SuspensionsTab;
