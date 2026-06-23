import { useState, useEffect, useRef } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";
const CATEGORIES_API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
const CONTRACTORS_API = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";

interface Inspection {
  id: number;
  inspection_date: string;
  contractor: string;
  violation_type: string;
  object_name: string;
  remarks_count: number;
  works_suspended: boolean;
  inspector_name: string;
  note: string | null;
  created_by: string;
}

interface InspectionFormData {
  inspection_date: string;
  contractor: string;
  violation_type: string;
  object_name: string;
  remarks_count: number;
  works_suspended: boolean;
  note: string;
}

const emptyForm = (): InspectionFormData => ({
  inspection_date: format(new Date(), "yyyy-MM-dd"),
  contractor: "",
  violation_type: "",
  object_name: "",
  remarks_count: 0,
  works_suspended: false,
  note: "",
});

const inp = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
const lbl = "text-xs font-medium text-muted-foreground block mb-1";

// --- Форма добавления/редактирования ---
function InspectionForm({
  initial, inspectorName, categories, objects, contractors, onSave, onCancel, saving,
}: {
  initial: InspectionFormData;
  inspectorName: string;
  categories: string[];
  objects: string[];
  contractors: string[];
  onSave: (data: InspectionFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<InspectionFormData>(initial);
  const set = (key: keyof InspectionFormData, val: string | number | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const isValid = form.inspection_date && form.contractor.trim() && form.violation_type && form.object_name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Новая запись в журнал проверок</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Дата проверки *</label>
              <input type="date" value={form.inspection_date} onChange={e => set("inspection_date", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Проверяющий</label>
              <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground min-h-[38px]">
                <Icon name="UserCheck" size={13} className="text-primary flex-shrink-0" />
                <span className="truncate text-sm">{inspectorName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>ПО (подрядчик) *</label>
              <select value={form.contractor} onChange={e => set("contractor", e.target.value)} className={inp}>
                <option value="">— Выберите подрядчика —</option>
                {contractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Проверяемый объект *</label>
              <select value={form.object_name} onChange={e => set("object_name", e.target.value)} className={inp}>
                <option value="">— Выберите объект —</option>
                {objects.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Вид нарушения *</label>
            <select value={form.violation_type} onChange={e => set("violation_type", e.target.value)} className={inp}>
              <option value="">— Выберите вид нарушения —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Количество замечаний</label>
              <input
                type="number" min={0} value={form.remarks_count}
                onChange={e => set("remarks_count", Math.max(0, parseInt(e.target.value) || 0))}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Работы приостановлены</label>
              <select value={form.works_suspended ? "yes" : "no"} onChange={e => set("works_suspended", e.target.value === "yes")} className={inp}>
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Примечание <span className="text-muted-foreground/60">(не обязательно, до 300 символов)</span></label>
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value.slice(0, 300))}
              placeholder="Дополнительная информация..."
              rows={3}
              className={inp + " resize-none"}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">{form.note.length}/300</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onCancel} className="text-sm px-5 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!isValid || saving}
            className="text-sm px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Сохранение..." : "Добавить запись"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Фильтр-дропдаун ---
function FilterDropdown({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${value ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
      >
        {value || label}
        {value ? (
          <span onClick={e => { e.stopPropagation(); onChange(""); }} className="ml-0.5 hover:text-foreground">
            <Icon name="X" size={11} />
          </span>
        ) : (
          <Icon name="ChevronDown" size={11} />
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl z-20 min-w-[180px] py-1 max-h-52 overflow-y-auto">
          <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors">
            Все
          </button>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-secondary ${value === o ? "text-primary font-medium" : "text-foreground"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Главная страница ---
interface InspectionsProps {
  user: AppUser;
  onLogout: () => void;
  onBack: () => void;
}

export default function Inspections({ user, onLogout, onBack }: InspectionsProps) {
  const [rows, setRows] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [objects, setObjects] = useState<string[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Фильтры
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterContractor, setFilterContractor] = useState("");
  const [filterObject, setFilterObject] = useState("");

  const inspectorName = user.name || "";

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (filterContractor) params.set("contractor", filterContractor);
    if (filterObject) params.set("object_name", filterObject);
    fetch(`${API}?${params}`)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFrom, dateTo, filterContractor, filterObject]);

  useEffect(() => {
    fetch(CATEGORIES_API)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data.map((d: { name: string }) => d.name) : []));
    fetch(OBJECTS_API)
      .then(r => r.json())
      .then(data => setObjects(Array.isArray(data) ? data.map((d: { name: string }) => d.name) : []));
    fetch(CONTRACTORS_API)
      .then(r => r.json())
      .then(data => setContractors(Array.isArray(data) ? data.map((d: { name: string }) => d.name) : []));
  }, []);

  const handleSave = async (form: InspectionFormData) => {
    setSaving(true);
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, inspector_name: inspectorName, created_by: user.id }),
    });
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleteConfirm(null);
    load();
  };

  const uniqueContractors = [...new Set(rows.map(r => r.contractor))].filter(Boolean);
  const uniqueObjects = [...new Set(rows.map(r => r.object_name))].filter(Boolean);

  const formatDate = (iso: string) => {
    try { return format(parseISO(iso), "dd.MM.yyyy", { locale: ru }); } catch { return iso; }
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
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

      {/* Вкладки навигации */}
      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ClipboardList" size={14} />
            Предписания
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-foreground transition-colors"
          >
            <Icon name="TableProperties" size={14} />
            Проверки
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Заголовок + кнопка */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Журнал проверок</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Записи всех специалистов ОТ</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Icon name="Plus" size={15} />
            Добавить запись
          </button>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
          <Icon name="Filter" size={14} className="text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">С</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <span className="text-xs text-muted-foreground">По</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="w-px h-4 bg-border" />
          <FilterDropdown label="Подрядчик" options={uniqueContractors} value={filterContractor} onChange={setFilterContractor} />
          <FilterDropdown label="Объект" options={uniqueObjects} value={filterObject} onChange={setFilterObject} />
          {(dateFrom || dateTo || filterContractor || filterObject) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setFilterContractor(""); setFilterObject(""); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Icon name="X" size={11} />
              Сбросить
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} записей</span>
        </div>

        {/* Таблица */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Icon name="Loader2" size={18} className="animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Icon name="TableProperties" size={32} className="opacity-30" />
            <p className="text-sm">Записей пока нет</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline">Добавить первую запись</button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Дата</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">ПО</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Вид нарушения</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Объект</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Замечаний</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Работы<br/>приостановлены</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Проверяющий</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Примечание</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(row.inspection_date)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{row.contractor}</td>
                      <td className="px-4 py-3 text-sm">{row.violation_type}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{row.object_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {row.remarks_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.works_suspended
                          ? <span className="text-xs font-semibold text-red-400">да</span>
                          : <span className="text-xs text-muted-foreground">нет</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{row.inspector_name}</td>
                      <td className="px-4 py-3 text-sm max-w-[200px]">
                        {row.note ? (
                          <span className="text-muted-foreground line-clamp-2" title={row.note}>{row.note}</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {deleteConfirm === row.id ? (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <button onClick={() => handleDelete(row.id)} className="text-[10px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Удалить</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Нет</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(row.id)}
                            className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Удалить"
                          >
                            <Icon name="Trash2" size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <InspectionForm
          initial={emptyForm()}
          inspectorName={inspectorName}
          categories={categories}
          objects={objects}
          contractors={contractors}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}