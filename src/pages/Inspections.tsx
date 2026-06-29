import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import UserMenu from "@/components/UserMenu";
import { API, CATEGORIES_API, OBJECTS_API, CONTRACTORS_API, Inspection, InspectionFormData, ContractorItem, emptyForm } from "@/components/inspections/types";
import InspectionForm from "@/components/inspections/InspectionForm";
import FilterDropdown from "@/components/inspections/FilterDropdown";
import InspectionsTable from "@/components/inspections/InspectionsTable";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents";

interface InspectionsProps {
  user: AppUser;
  onLogout: () => void;
  onBack: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
  initialSuspended?: boolean;
}

export default function Inspections({ user, onLogout, onBack, onTabChange, activeTab = "inspections", initialSuspended }: InspectionsProps) {
  const [rows, setRows] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [objects, setObjects] = useState<string[]>([]);
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterContractor, setFilterContractor] = useState("");
  const [filterObject, setFilterObject] = useState("");
  const [filterSuspended, setFilterSuspended] = useState(initialSuspended ?? false);

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
      .then(data => setContractors(Array.isArray(data) ? data : []));
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
  const displayedRows = filterSuspended ? rows.filter(r => r.works_suspended) : rows;

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
        <UserMenu user={user} onLogout={onLogout} />
      </header>

      {/* Вкладки навигации */}
      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2">
          {[
            { id: "dashboard" as Tab, label: "Главная", icon: "LayoutDashboard", action: () => onTabChange ? onTabChange("dashboard") : onBack() },
            { id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList", action: onBack },
            { id: "inspections" as Tab, label: "Проверки", icon: "TableProperties", action: () => {} },
            { id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert", action: () => onTabChange?.("incidents") },
          ].map(t => (
            <button
              key={t.id}
              onClick={t.action}
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">По</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="w-px h-4 bg-border" />
          <FilterDropdown label="Подрядчик" options={uniqueContractors} value={filterContractor} onChange={setFilterContractor} />
          <FilterDropdown label="Объект" options={uniqueObjects} value={filterObject} onChange={setFilterObject} />
          <button
            onClick={() => setFilterSuspended(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${filterSuspended ? "border-red-500 bg-red-500/10 text-red-400" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="OctagonX" size={12} />
            Приостановлено
          </button>
          {(dateFrom || dateTo || filterContractor || filterObject || filterSuspended) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setFilterContractor(""); setFilterObject(""); setFilterSuspended(false); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Icon name="X" size={11} />
              Сбросить
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{displayedRows.length} записей</span>
        </div>

        {/* Таблица */}
        <InspectionsTable
          rows={displayedRows}
          loading={loading}
          deleteConfirm={deleteConfirm}
          onDeleteRequest={setDeleteConfirm}
          onDeleteConfirm={handleDelete}
          onDeleteCancel={() => setDeleteConfirm(null)}
          onAddFirst={() => setShowForm(true)}
        />
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