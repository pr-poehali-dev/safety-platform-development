import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import DateRangePicker from "@/components/ui/date-range-picker";
import FilterDropdown from "@/components/inspections/FilterDropdown";
import { VisibilitySettings, defaultVisibilitySettings } from "@/lib/visibilityTypes";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import FinesHeader from "@/components/fines/FinesHeader";
import FinesTable from "@/components/fines/FinesTable";
import FineFormModal from "@/components/fines/FineFormModal";
import {
  Tab, Fine, ContractorItem, FormState, fmt, emptyForm,
} from "@/components/fines/finesShared";

const FINES_API = "https://functions.poehali.dev/05dd11e6-f624-4a7b-a0b7-604951125a9b";
const CONTRACTORS_API = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";
const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

interface FinesProps {
  user: AppUser;
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
  visibility?: VisibilitySettings;
}

export default function Fines({ user, onLogout, onTabChange, activeTab = "fines", visibility }: FinesProps) {
  const tabs = visibility?.tabs ?? defaultVisibilitySettings().tabs;
  const [rows, setRows] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [prescriptionNumbers, setPrescriptionNumbers] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [filterContractors, setFilterContractors] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const canManage = user.role === "admin" || tabs.fines;

  const load = () => {
    setLoading(true);
    fetch(FINES_API)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch(CONTRACTORS_API)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setContractors(data);
      });
    fetch(`${PRESCRIPTIONS_API}?full=1`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const numbers = data.map((p: { number: string }) => p.number).filter(Boolean);
          setPrescriptionNumbers([...new Set(numbers)].sort());
        }
      });
  }, []);

  const set = (field: keyof Omit<FormState, "act_numbers">, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedContractor = contractors.find(c => c.name === form.contractor);
  const contractorNames = contractors.map(c => c.name);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (row: Fine) => {
    setEditingId(row.id);
    setForm({
      period_date: row.period_date,
      contractor: row.contractor,
      contract_number: row.contract_number ?? "",
      act_numbers: row.act_number ? row.act_number.split(",").map(s => s.trim()).filter(Boolean) : [],
      amount_issued: row.amount_issued ? String(row.amount_issued) : "",
      amount_paid: row.amount_paid !== null && row.amount_paid !== undefined ? String(row.amount_paid) : "",
      amount_proactive: row.amount_proactive !== null && row.amount_proactive !== undefined ? String(row.amount_proactive) : "",
      status: row.status ?? "",
    });
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.period_date || !form.contractor) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      period_date: form.period_date,
      contractor: form.contractor,
      contract_number: form.contract_number || null,
      act_number: form.act_numbers.length > 0 ? form.act_numbers.join(", ") : null,
      amount_issued: Number(form.amount_issued) || 0,
      amount_paid: form.amount_paid === "" ? null : Number(form.amount_paid),
      amount_proactive: form.amount_proactive === "" ? null : Number(form.amount_proactive),
      status: form.status || null,
      created_by_name: user.name,
    };
    try {
      const res = editingId
        ? await fetchWithRetry(FINES_API, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetchWithRetry(FINES_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("save failed");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      load();
    } catch {
      setSaveError("Не удалось сохранить запись. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetchWithRetry(FINES_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleteConfirm(null);
    if (res.ok) load();
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterContractors.length > 0 && !filterContractors.includes(r.contractor)) return false;
      if (filterDateFrom && r.period_date < filterDateFrom) return false;
      if (filterDateTo && r.period_date > filterDateTo) return false;
      return true;
    });
  }, [rows, filterContractors, filterDateFrom, filterDateTo]);

  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => {
      acc.issued += r.amount_issued || 0;
      acc.paid += r.amount_paid || 0;
      acc.proactive += r.amount_proactive || 0;
      return acc;
    }, { issued: 0, paid: 0, proactive: 0 });
  }, [filteredRows]);

  const rowContractors = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.contractor && set.add(r.contractor));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <FinesHeader
        user={user}
        onLogout={onLogout}
        onTabChange={onTabChange}
        activeTab={activeTab}
        tabs={tabs}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">Штрафы</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filteredRows.length} записей</p>
          </div>
          {canManage && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Icon name="Plus" size={15} />
              Добавить
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500">
              <Icon name="FileText" size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight">{fmt(totals.issued)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Выставлено, тыс руб</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-500">
              <Icon name="CheckCircle" size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight">{fmt(totals.paid)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Оплачено, тыс руб</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-500">
              <Icon name="Clock" size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight">{fmt(totals.proactive)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Проактив, тыс руб</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            dateFrom={filterDateFrom}
            dateTo={filterDateTo}
            onFromChange={setFilterDateFrom}
            onToChange={setFilterDateTo}
            onReset={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
          />
          <FilterDropdown
            label="Организация"
            options={rowContractors}
            value={filterContractors}
            onChange={setFilterContractors}
          />
          {(filterContractors.length > 0 || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setFilterContractors([]); setFilterDateFrom(""); setFilterDateTo(""); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Icon name="X" size={11} /> Сбросить всё
            </button>
          )}
        </div>

        <FinesTable
          loading={loading}
          filteredRows={filteredRows}
          canManage={canManage}
          deleteConfirm={deleteConfirm}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          onDeleteConfirmChange={setDeleteConfirm}
        />
      </main>

      {showForm && (
        <FineFormModal
          editingId={editingId}
          form={form}
          setForm={setForm}
          set={set}
          prescriptionNumbers={prescriptionNumbers}
          contractorNames={contractorNames}
          selectedContractor={selectedContractor}
          saveError={saveError}
          saving={saving}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
