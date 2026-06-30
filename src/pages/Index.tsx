import { useState, useEffect, useRef } from "react";
import { AppUser } from "@/lib/auth";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import UserMenu from "@/components/UserMenu";
import { Prescription } from "@/lib/prescriptionTypes";
import { AddForm } from "@/components/prescriptions/PrescriptionForm";
import { PrescriptionDetail } from "@/components/prescriptions/PrescriptionDetail";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";
import Inspections from "@/pages/Inspections";
import Incidents from "@/pages/Incidents";
import Dashboard from "@/pages/Dashboard";
import TasksBlock from "@/components/tasks/TasksBlock";
import { useTasks } from "@/hooks/useTasks";
import Icon from "@/components/ui/icon";

interface IndexProps {
  user: AppUser;
  onLogout: () => void;
  onUserUpdate?: (u: AppUser) => void;
}

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const USERS_URL = "https://functions.poehali.dev/9f213d27-a6a3-4ce0-b6b1-0d26003c43eb";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks";

export default function Index({ user, onLogout, onUserUpdate }: IndexProps) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Все");
  const [search, setSearch] = useState("");
  const [inspectionsSuspended, setInspectionsSuspended] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<Template>({ ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true });
  const [availableUsers, setAvailableUsers] = useState<{ login: string; name: string; role: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAllRead } = useTasks(user);

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

  useEffect(() => {
    fetch(USERS_URL)
      .then(r => r.json())
      .then((data: { login: string; name: string; role: string }[]) => {
        setAvailableUsers(data.filter(u => u.login !== user.login));
      })
      .catch(() => {});
  }, [user.login]);

  // Закрытие панели уведомлений при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    { id: "prescriptions", label: "Предписания", icon: "ClipboardList" },
    ...(canEdit ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    { id: "incidents", label: "Происшествия", icon: "TriangleAlert" },
    { id: "tasks", label: "Задачи", icon: "ListChecks" },
  ];

  const NotificationBell = () => (
    <div className="relative" ref={notifRef}>
      <button
        onClick={() => {
          setShowNotifications(v => !v);
          if (!showNotifications && unreadCount > 0) markAllRead();
        }}
        className="relative p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Icon name="Bell" size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Уведомления</span>
            {notifications.some(n => !n.is_read) && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Нет уведомлений</div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (n.assignment_id) { setTab("tasks"); setShowNotifications(false); } }}
                  className={`px-4 py-3 border-b border-border last:border-0 text-xs transition-colors ${!n.is_read ? "bg-primary/5" : ""} ${n.assignment_id ? "cursor-pointer hover:bg-muted/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />}
                    <div className={!n.is_read ? "" : "pl-3.5"}>
                      <p className="text-foreground leading-snug">{n.message}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderNav = () => (
    <div className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2 overflow-x-auto">
        {NAV_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
  );

  const renderHeader = () => (
    <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Icon name="Shield" size={14} className="text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
      </div>
    </header>
  );

  if (tab === "incidents") {
    return (
      <Incidents
        user={user}
        onLogout={onLogout}
        onTabChange={(t) => setTab(t as Tab)}
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
        onTabChange={(t) => setTab(t as Tab)}
        activeTab={tab}
        initialSuspended={inspectionsSuspended}
      />
    );
  }

  if (tab === "tasks") {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {renderHeader()}
        {renderNav()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <TasksBlock user={user} availableUsers={availableUsers} />
        </div>
      </div>
    );
  }

  if (tab === "dashboard") {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {renderHeader()}
        {renderNav()}
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
        onTasksClick={() => setTab("tasks")}
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