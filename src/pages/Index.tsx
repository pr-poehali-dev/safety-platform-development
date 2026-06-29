import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import UserMenu from "@/components/UserMenu";
import { Prescription, overallStatus } from "@/lib/prescriptionTypes";
import { AddForm } from "@/components/prescriptions/PrescriptionForm";
import { PrescriptionDetail } from "@/components/prescriptions/PrescriptionDetail";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";
import Inspections from "@/pages/Inspections";
import Incidents from "@/pages/Incidents";
import Dashboard from "@/pages/Dashboard";
import Icon from "@/components/ui/icon";

interface IndexProps {
  user: AppUser;
  onLogout: () => void;
}

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents";

export default function Index({ user: initialUser, onLogout }: IndexProps) {
  const [user, setUser] = useState<AppUser>(initialUser);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Все");
  const [search, setSearch] = useState("");
  const [inspectionsSuspended, setInspectionsSuspended] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<Template>({ ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true });

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => setPrescriptions(data))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API}?type=templates`)
      .then(r => r.json())
      .then((data: Template[]) => {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const def = parsed.find((t: Template) => t.isDefault) ?? parsed[0];
        if (def) setActiveTemplate(def);
      })
      .catch(() => {});
  }, []);

  const isContractor = user.role === "contractor";
  const canEdit = user.role === "admin" || user.role === "specialist" || user.role === "manager";

  const addPrescription = async (p: Prescription) => {
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const data = await res.json();
    const saved = { ...p, number: data.number ?? p.number };
    setPrescriptions(prev => [saved, ...prev]);
  };

  const updatePrescription = async (updated: Prescription) => {
    await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setPrescriptions(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const NAV_TABS = [
    { id: "dashboard" as Tab, label: "Главная", icon: "LayoutDashboard" },
    { id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList" },
    ...(canEdit ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    { id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert" },
  ];

  const header = (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Shield" size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
        </div>
        <div className="flex items-center gap-3">
          <UserMenu user={user} onLogout={onLogout} onUserUpdate={setUser} />
        </div>
      </header>

      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
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
    </div>
  );

  if (tab === "incidents") {
    return (
      <Incidents
        user={user}
        onLogout={onLogout}
        onTabChange={setTab}
        activeTab={tab}
      />
    );
  }

  if (tab === "inspections") {
    return (
      <Inspections
        user={user}
        onLogout={onLogout}
        onBack={() => setTab("prescriptions")}
        onTabChange={setTab}
        activeTab={tab}
        initialSuspended={inspectionsSuspended}
      />
    );
  }

  if (tab === "dashboard") {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Icon name="Shield" size={14} className="text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
          </div>
          <UserMenu user={user} onLogout={onLogout} onUserUpdate={setUser} />
        </header>
        <div className="border-b border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2">
            {NAV_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
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
        <Dashboard
          user={user}
          onNavigateToPrescriptions={(status) => {
            if (status) setFilterStatus(status);
            setTab("prescriptions");
          }}
          onNavigateToInspections={(suspended) => {
            setInspectionsSuspended(suspended ?? false);
            setTab("inspections");
          }}
        />
      </div>
    );
  }

  return (
    <>
      <PrescriptionList
        user={user}
        onLogout={onLogout}
        prescriptions={prescriptions}
        loading={loading}
        search={search}
        filterStatus={filterStatus}
        canEdit={canEdit}
        isContractor={isContractor}
        activeTemplate={activeTemplate}
        onSearchChange={setSearch}
        onFilterChange={setFilterStatus}
        onSelect={setSelected}
        onAddClick={() => setShowAdd(true)}
        onInspectionsClick={canEdit ? () => setTab("inspections") : undefined}
        onDashboardClick={() => setTab("dashboard")}
        onIncidentsClick={() => setTab("incidents")}
        activeTab={tab}
      />

      {showAdd && canEdit && (
        <AddForm onClose={() => setShowAdd(false)} onSave={addPrescription} user={user} />
      )}

      {selected && (
        <PrescriptionDetail
          prescription={selected}
          onClose={() => setSelected(null)}
          onUpdate={updatePrescription}
          user={user}
          canEdit={
            user.role === "admin" ||
            (user.role === "specialist" && selected.createdBy === user.login)
          }
          template={activeTemplate}
        />
      )}
    </>
  );
}