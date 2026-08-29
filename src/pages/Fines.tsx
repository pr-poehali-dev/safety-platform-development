import { useState, useEffect, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import UserMenu from "@/components/UserMenu";
import { IsoDatePicker, MultiSelectField } from "@/components/fines/FineFormControls";
import DateRangePicker from "@/components/ui/date-range-picker";
import FilterDropdown from "@/components/inspections/FilterDropdown";
import { VisibilitySettings, defaultVisibilitySettings } from "@/lib/visibilityTypes";

const FINES_API = "https://functions.poehali.dev/05dd11e6-f624-4a7b-a0b7-604951125a9b";
const CONTRACTORS_API = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";
const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount" | "fines";

interface FinesProps {
  user: AppUser;
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
  visibility?: VisibilitySettings;
}

interface Fine {
  id: number;
  period_date: string;
  contractor: string;
  contract_number: string | null;
  act_number: string | null;
  amount_issued: number;
  amount_paid: number | null;
  amount_proactive: number | null;
  status: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface ContractorContract {
  id: number;
  contract_number: string;
}

interface ContractorItem {
  name: string;
  contracts: ContractorContract[];
}

const inp = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
const lbl = "text-xs font-medium text-muted-foreground block mb-1";
const fmt = (n: number) => n.toLocaleString("ru-RU");

function emptyForm() {
  return {
    period_date: new Date().toISOString().slice(0, 10),
    contractor: "",
    contract_number: "",
    act_numbers: [] as string[],
    amount_issued: "",
    amount_paid: "",
    amount_proactive: "",
    status: "",
  };
}

type FormState = ReturnType<typeof emptyForm>;

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
    fetch(PRESCRIPTIONS_API)
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
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.period_date || !form.contractor) return;
    setSaving(true);
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
    if (editingId) {
      await fetch(FINES_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...payload }),
      });
    } else {
      await fetch(FINES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(FINES_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleteConfirm(null);
    load();
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

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    ...(tabs.prescriptions ? [{ id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList" }] : []),
    ...(tabs.inspections ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    ...(tabs.incidents ? [{ id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert" }] : []),
    ...(tabs.tasks ? [{ id: "tasks" as Tab, label: "Задачи", icon: "ListChecks" }] : []),
    ...(tabs.headcount ? [{ id: "headcount" as Tab, label: "ЧеловекоЧасы", icon: "Users" }] : []),
    { id: "fines", label: "Штрафы", icon: "Banknote" },
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
        <UserMenu user={user} onLogout={onLogout} />
      </header>

      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2 overflow-x-auto">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange?.(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Icon name="Banknote" size={40} className="opacity-20" />
            <p className="text-sm">Штрафов не зафиксировано</p>
            {canManage && (
              <button onClick={openAdd} className="text-sm text-primary hover:underline">
                Добавить первый
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Месяц</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Организация</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Договор</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Акт</th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Выставлено</th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Оплачено</th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Проактив</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Статус</th>
                    {canManage && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={row.id} className={`group border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap align-top">
                        {row.period_date ? new Date(row.period_date).toLocaleDateString("ru-RU", { month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground align-top">{row.contractor}</td>
                      <td className="px-4 py-3 text-muted-foreground align-top">{row.contract_number || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground align-top">{row.act_number || "—"}</td>
                      <td className="px-3 py-3 text-right font-medium text-foreground align-top whitespace-nowrap">{fmt(row.amount_issued)}</td>
                      <td className="px-3 py-3 text-right align-top whitespace-nowrap">{row.amount_paid ? <span className="font-medium text-green-400">{fmt(row.amount_paid)}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-3 py-3 text-right align-top whitespace-nowrap">{row.amount_proactive ? <span className="font-medium text-amber-400">{fmt(row.amount_proactive)}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground align-top max-w-[220px]">{row.status || "—"}</td>
                      {canManage && (
                        <td className="px-2 py-3 align-top" onClick={e => e.stopPropagation()}>
                          {deleteConfirm === row.id ? (
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <button onClick={() => handleDelete(row.id)} className="text-[10px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Удалить</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Нет</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(row)} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Редактировать">
                                <Icon name="Pencil" size={13} />
                              </button>
                              <button onClick={() => setDeleteConfirm(row.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Удалить">
                                <Icon name="Trash2" size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editingId ? "Редактирование штрафа" : "Новый штраф"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Месяц/год *</label>
                  <IsoDatePicker value={form.period_date} onChange={v => set("period_date", v)} />
                </div>
                <div>
                  <label className={lbl}>Акт о нарушениях ОТ</label>
                  <MultiSelectField
                    options={prescriptionNumbers}
                    selected={form.act_numbers}
                    onChange={v => setForm(prev => ({ ...prev, act_numbers: v }))}
                    placeholder="Выбрать акты"
                    searchPlaceholder="Поиск по номеру предписания"
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Организация (КА) *</label>
                <select
                  value={form.contractor}
                  onChange={e => setForm(prev => ({ ...prev, contractor: e.target.value, contract_number: "" }))}
                  className={inp}
                >
                  <option value="">— выберите организацию —</option>
                  {contractorNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Договор</label>
                <select
                  value={form.contract_number}
                  onChange={e => set("contract_number", e.target.value)}
                  disabled={!selectedContractor || selectedContractor.contracts.length === 0}
                  className={inp + " disabled:opacity-50 disabled:cursor-not-allowed"}
                >
                  <option value="">— выберите договор —</option>
                  {form.contract_number && !(selectedContractor?.contracts ?? []).some(c => c.contract_number === form.contract_number) && (
                    <option value={form.contract_number}>{form.contract_number}</option>
                  )}
                  {(selectedContractor?.contracts ?? []).map(c => (
                    <option key={c.id} value={c.contract_number}>{c.contract_number}</option>
                  ))}
                </select>
                {selectedContractor && selectedContractor.contracts.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">У выбранной организации нет договоров в справочнике</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={lbl}>Выставлено, тыс руб *</label>
                  <input type="number" value={form.amount_issued} onChange={e => set("amount_issued", e.target.value)} placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Оплачено, тыс руб</label>
                  <input type="number" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Проактив, тыс руб</label>
                  <input type="number" value={form.amount_proactive} onChange={e => set("amount_proactive", e.target.value)} placeholder="0" className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>Статус</label>
                <textarea
                  rows={3}
                  value={form.status}
                  onChange={e => set("status", e.target.value)}
                  placeholder="Например: Удержана ЗРДС №... от ..."
                  className={inp + " resize-none"}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.period_date || !form.contractor}
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