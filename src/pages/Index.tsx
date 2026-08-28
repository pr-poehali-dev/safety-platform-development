import { useState, useEffect, useRef } from "react";
import { AppUser } from "@/lib/auth";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import UserMenu from "@/components/UserMenu";
import { Prescription, Status } from "@/lib/prescriptionTypes";
import { AddForm } from "@/components/prescriptions/PrescriptionForm";
import { PrescriptionDetail } from "@/components/prescriptions/PrescriptionDetail";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";
import Inspections from "@/pages/Inspections";
import Incidents from "@/pages/Incidents";
import Dashboard from "@/pages/Dashboard";
import Headcount from "@/pages/Headcount";
import TasksBlock from "@/components/tasks/TasksBlock";
import TasksLoginPopup from "@/components/tasks/TasksLoginPopup";
import { useTasks } from "@/hooks/useTasks";
import { useInspectionNotifications } from "@/hooks/useInspectionNotifications";
import { usePrescriptionNotifications } from "@/hooks/usePrescriptionNotifications";
import { playNotificationSound } from "@/lib/notificationSound";
import Icon from "@/components/ui/icon";

interface IndexProps {
  user: AppUser;
  onLogout: () => void;
  onUserUpdate?: (u: AppUser) => void;
  showTasksPopup?: boolean;
  onTasksPopupShown?: () => void;
}

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const TEMPLATES_API = "https://functions.poehali.dev/41ec60df-3f38-4561-ba9d-ca17ebd71553";
const USERS_URL = "https://functions.poehali.dev/9f213d27-a6a3-4ce0-b6b1-0d26003c43eb";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount";

export default function Index({ user, onLogout, onUserUpdate, showTasksPopup, onTasksPopupShown }: IndexProps) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterMine, setFilterMine] = useState(false);
  const [filterSuspended, setFilterSuspended] = useState(false);
  const [filterObject, setFilterObject] = useState<string[]>([]);
  const [filterContractor, setFilterContractor] = useState<string[]>([]);
  const [filterInspector, setFilterInspector] = useState<string[]>([]);
  const [presDateFrom, setPresDateFrom] = useState("");
  const [presDateTo, setPresDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [inspectionsSuspended, setInspectionsSuspended] = useState(false);
  const [inspectionsMine, setInspectionsMine] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string | undefined>(undefined);
  const [taskOpenId, setTaskOpenId] = useState<number | undefined>(undefined);
  const [inspectionOpenId, setInspectionOpenId] = useState<number | undefined>(undefined);
  const [prescriptionOpenId, setPrescriptionOpenId] = useState<string | undefined>(undefined);
  const [activeTemplate, setActiveTemplate] = useState<Template>({ ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true });
  const [availableUsers, setAvailableUsers] = useState<{ login: string; name: string; role: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tasksPopupOpen, setTasksPopupOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { assignments, notifications: taskNotifications, unreadCount: taskUnreadCount, markAllRead: markTaskNotificationsRead, createTask, updateTask, deleteTask, action, sendComment, fetchComments, load: reloadTasks, loading: tasksLoading } = useTasks(user);
  const { notifications: inspectionNotifications, unreadCount: inspectionUnreadCount, markAllRead: markInspectionNotificationsRead, load: reloadInspectionNotifications } = useInspectionNotifications(user);
  const { notifications: prescriptionNotifications, unreadCount: prescriptionUnreadCount, markAllRead: markPrescriptionNotificationsRead, load: reloadPrescriptionNotifications } = usePrescriptionNotifications(user);

  type MergedNotification = { id: string; kind: "task" | "inspection" | "prescription"; refId: number | string | null; message: string; is_read: boolean; created_at: string };
  const notifications: MergedNotification[] = [
    ...taskNotifications.map(n => ({ id: `t${n.id}`, kind: "task" as const, refId: n.assignment_id, message: n.message, is_read: n.is_read, created_at: n.created_at })),
    ...inspectionNotifications.map(n => ({ id: `i${n.id}`, kind: "inspection" as const, refId: n.inspection_id, message: n.message, is_read: n.is_read, created_at: n.created_at })),
    ...prescriptionNotifications.map(n => ({ id: `p${n.id}`, kind: "prescription" as const, refId: n.prescription_id, message: n.message, is_read: n.is_read, created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const unreadCount = taskUnreadCount + inspectionUnreadCount + prescriptionUnreadCount;
  const markAllRead = () => { markTaskNotificationsRead(); markInspectionNotificationsRead(); markPrescriptionNotificationsRead(); };

  // Звуковой сигнал при появлении нового непрочитанного уведомления (не при первой загрузке страницы)
  const prevUnreadCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadCount.current !== null && unreadCount > prevUnreadCount.current) {
      playNotificationSound();
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => setPrescriptions(data))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (prescriptionOpenId && prescriptions.length > 0) {
      const found = prescriptions.find(p => p.id === prescriptionOpenId);
      if (found) setSelected(found);
    }
  }, [prescriptionOpenId, prescriptions]);

  // Показываем попап с задачами при каждом входе в систему
  useEffect(() => {
    if (showTasksPopup && !tasksLoading) {
      setTasksPopupOpen(true);
      onTasksPopupShown?.();
    }
  }, [showTasksPopup, tasksLoading]);

  useEffect(() => {
    fetch(TEMPLATES_API)
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

  // Обновляем задачи и уведомления при возврате в браузерную вкладку
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reloadTasks();
        reloadInspectionNotifications();
        reloadPrescriptionNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadTasks, reloadInspectionNotifications, reloadPrescriptionNotifications]);

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

  const changePrescriptionStatus = (p: Prescription, status: Status) => {
    if (status === "Черновик") {
      setEditingPrescription(p);
      return;
    }
    const updated = { ...p, remarks: p.remarks.map(r => ({ ...r, status })) };
    updatePrescription(updated);
  };

  const canViewHeadcount = user.role === "manager" || user.role === "specialist";

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    { id: "prescriptions", label: "Предписания", icon: "ClipboardList" },
    { id: "inspections", label: "Проверки", icon: "TableProperties" },
    { id: "incidents", label: "Происшествия", icon: "TriangleAlert" },
    { id: "tasks", label: "Задачи", icon: "ListChecks" },
    ...(canViewHeadcount ? [{ id: "headcount" as Tab, label: "ЧеловекоЧасы", icon: "Users" }] : []),
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
                  onClick={() => {
                    if (!n.refId) return;
                    if (n.kind === "task") { setTaskFilter(undefined); setTaskOpenId(n.refId as number); setTab("tasks"); }
                    else if (n.kind === "inspection") { setInspectionOpenId(n.refId as number); setTab("inspections"); }
                    else { setPrescriptionOpenId(n.refId as string); setTab("prescriptions"); }
                    setShowNotifications(false);
                  }}
                  className={`px-4 py-3 border-b border-border last:border-0 text-xs transition-colors ${!n.is_read ? "bg-primary/5" : ""} ${n.refId ? "cursor-pointer hover:bg-muted/40" : ""}`}
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
        initialMine={inspectionsMine}
        initialOpenId={inspectionOpenId}
      />
    );
  }

  if (tab === "headcount" && canViewHeadcount) {
    return (
      <Headcount
        user={user}
        onLogout={onLogout}
        onTabChange={(t) => setTab(t as Tab)}
        activeTab={tab}
      />
    );
  }

  if (tab === "tasks") {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {renderHeader()}
        {renderNav()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <TasksBlock
            user={user}
            availableUsers={availableUsers}
            assignments={assignments}
            loading={false}
            initialFilter={taskFilter}
            initialTaskId={taskOpenId}
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAction={action}
            onSendComment={sendComment}
            onFetchComments={fetchComments}
          />
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
          taskAssignments={assignments}
          onNavigateToPrescriptions={(status, mine, suspended) => {
            setFilterStatus(status && status !== "Все" ? [status] : []);
            setFilterMine(mine ?? false);
            setFilterSuspended(suspended ?? false);
            setTab("prescriptions");
          }}
          onNavigateToInspections={(suspended, mine) => {
            setInspectionsSuspended(suspended ?? false);
            setInspectionsMine(mine ?? false);
            setTab("inspections");
          }}
          onNavigateToTasks={(filter, taskId) => { setTaskFilter(filter); setTaskOpenId(taskId); setTab("tasks"); }}
        />

        {tasksPopupOpen && (
          <TasksLoginPopup
            user={user}
            taskAssignments={assignments}
            prescriptions={prescriptions}
            onClose={() => setTasksPopupOpen(false)}
            onTaskClick={taskId => {
              setTasksPopupOpen(false);
              setTaskFilter(undefined);
              setTaskOpenId(taskId);
              setTab("tasks");
            }}
            onPrescriptionClick={prescriptionId => {
              setTasksPopupOpen(false);
              setPrescriptionOpenId(prescriptionId);
              setTab("prescriptions");
            }}
          />
        )}
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
        filterMine={filterMine}
        filterSuspended={filterSuspended}
        filterObject={filterObject}
        filterContractor={filterContractor}
        filterInspector={filterInspector}
        dateFrom={presDateFrom}
        dateTo={presDateTo}
        canEdit={canEdit}
        isContractor={isContractor}
        activeTemplate={activeTemplate}
        onSearchChange={setSearch}
        onFilterChange={setFilterStatus}
        onFilterMineChange={setFilterMine}
        onFilterSuspendedChange={setFilterSuspended}
        onFilterObjectChange={setFilterObject}
        onFilterContractorChange={setFilterContractor}
        onFilterInspectorChange={setFilterInspector}
        onDateFromChange={setPresDateFrom}
        onDateToChange={setPresDateTo}
        onSelect={setSelected}
        onAddClick={() => setShowAdd(true)}
        onInspectionsClick={() => setTab("inspections")}
        onDashboardClick={() => setTab("dashboard")}
        onIncidentsClick={() => setTab("incidents")}
        onTasksClick={() => setTab("tasks")}
        onStatusChange={changePrescriptionStatus}
        activeTab={tab}
      />

      {showAdd && canEdit && (
        <AddForm onClose={() => setShowAdd(false)} onSave={addPrescription} user={user} />
      )}

      {editingPrescription && (
        <AddForm
          onClose={() => setEditingPrescription(null)}
          onSave={async p => { await updatePrescription(p); setEditingPrescription(null); }}
          user={user}
          editPrescription={editingPrescription}
        />
      )}

      {selected && !editingPrescription && (
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
          onEditRequest={p => { setEditingPrescription(p); setSelected(null); }}
        />
      )}
    </>
  );
}