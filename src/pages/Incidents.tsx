import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";

const INCIDENTS_API = "https://functions.poehali.dev/4aedfdd0-d096-43ad-b4e7-b7b2aec3f753";
const CONTRACTORS_API = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents";

interface IncidentsProps {
  user: AppUser;
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
}

interface Incident {
  id: number;
  description: string;
  incident_date: string;
  location: string | null;
  contractor: string | null;
  microtrauma: number;
  light_injury: number;
  severe_injury: number;
  fatal: number;
  no_consequences: number;
  created_by_name: string | null;
  created_at: string;
}

interface ContractorItem {
  name: string;
}

const inp = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
const lbl = "text-xs font-medium text-muted-foreground block mb-1";

const emptyForm = () => ({
  description: "",
  incident_date: new Date().toISOString().slice(0, 10),
  location: "",
  contractor: "",
  microtrauma: 0,
  light_injury: 0,
  severe_injury: 0,
  fatal: 0,
  no_consequences: 0,
});

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className={inp}
      />
    </div>
  );
}

export default function Incidents({ user, onLogout, onTabChange, activeTab = "incidents" }: IncidentsProps) {
  const [rows, setRows] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const canAdd = user.role === "admin" || user.role === "specialist";

  const load = () => {
    setLoading(true);
    fetch(INCIDENTS_API)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch(CONTRACTORS_API)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setContractors(data.map((c: ContractorItem) => c.name).filter(Boolean));
      });
  }, []);

  const handleSave = async () => {
    if (!form.description.trim() || !form.incident_date) return;
    setSaving(true);
    await fetch(INCIDENTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        created_by: user.id,
        created_by_name: user.name,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm());
    load();
  };

  const set = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    { id: "prescriptions", label: "Предписания", icon: "ClipboardList" },
    ...(user.role === "admin" || user.role === "specialist"
      ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }]
      : []),
    { id: "incidents", label: "Происшествия", icon: "TriangleAlert" },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Shield" size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            {user.name}
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors">
            <Icon name="LogOut" size={13} />
            Выйти
          </button>
        </div>
      </header>

      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange?.(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={t.icon as never} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Журнал происшествий</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{rows.length} записей</p>
          </div>
          {canAdd && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Icon name="Plus" size={15} />
              Добавить
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Icon name="TriangleAlert" size={40} className="opacity-20" />
            <p className="text-sm">Происшествий не зафиксировано</p>
            {canAdd && (
              <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline">
                Добавить первое
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[30%]">Происшествие (кратко)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Дата</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Место</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Организация</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Микро-<br />травма</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Лёгкий<br />НС</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Тяжёлый<br />НС</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Смерт.<br />НС</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Без<br />послед.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 text-foreground align-top">{row.description}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap align-top">
                        {row.incident_date ? new Date(row.incident_date).toLocaleDateString("ru-RU") : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground align-top">{row.location || "нет данных"}</td>
                      <td className="px-4 py-3 text-muted-foreground align-top">{row.contractor || "—"}</td>
                      <td className="px-3 py-3 text-center align-top">{row.microtrauma > 0 ? <span className="font-medium text-amber-400">{row.microtrauma}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-center align-top">{row.light_injury > 0 ? <span className="font-medium text-orange-400">{row.light_injury}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-center align-top">{row.severe_injury > 0 ? <span className="font-medium text-red-400">{row.severe_injury}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-center align-top">{row.fatal > 0 ? <span className="font-bold text-red-600">{row.fatal}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-center align-top">{row.no_consequences > 0 ? <span className="font-medium text-green-400">{row.no_consequences}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Новое происшествие</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={lbl}>Происшествие (кратко) *</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Краткое описание происшествия"
                  className={inp + " resize-none"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Дата происшествия *</label>
                  <input type="date" value={form.incident_date} onChange={e => set("incident_date", e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Место происшествия</label>
                  <input type="text" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Укажите место" className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>Подрядная организация</label>
                <select value={form.contractor} onChange={e => set("contractor", e.target.value)} className={inp}>
                  <option value="">— не указана —</option>
                  {contractors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Пострадавшие</p>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Микротравма (чел.)" value={form.microtrauma} onChange={v => set("microtrauma", v)} />
                  <NumField label="Лёгкий НС (чел.)" value={form.light_injury} onChange={v => set("light_injury", v)} />
                  <NumField label="Тяжёлый НС (чел.)" value={form.severe_injury} onChange={v => set("severe_injury", v)} />
                  <NumField label="Смертельный НС (чел.)" value={form.fatal} onChange={v => set("fatal", v)} />
                  <NumField label="Без последствий" value={form.no_consequences} onChange={v => set("no_consequences", v)} />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description.trim() || !form.incident_date}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Icon name="Save" size={14} />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
