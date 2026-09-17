import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import { AddForm } from "@/components/prescriptions/PrescriptionForm";
import { PrescriptionDetail } from "@/components/prescriptions/PrescriptionDetail";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";
import Inspections from "@/pages/Inspections";
import Incidents from "@/pages/Incidents";
import Dashboard from "@/pages/Dashboard";
import Headcount from "@/pages/Headcount";
import Fines from "@/pages/Fines";
import Suspensions from "@/pages/Suspensions";
import TasksBlock from "@/components/tasks/TasksBlock";
import TasksLoginPopup from "@/components/tasks/TasksLoginPopup";
import { useAppNotifications, MergedNotification } from "@/hooks/useAppNotifications";
import { useIndexPrescriptions } from "@/hooks/useIndexPrescriptions";
import { AppHeader } from "@/components/layout/AppHeader";
import { VisibilitySettings, TabKey, defaultVisibilitySettings } from "@/lib/visibilityTypes";
import { useResolvedVisibility } from "@/hooks/useVisibilitySettings";

interface IndexProps {
  user: AppUser;
  onLogout: () => void;
  onUserUpdate?: (u: AppUser) => void;
  showTasksPopup?: boolean;
  onTasksPopupShown?: () => void;
  visibilityOverride?: VisibilitySettings | null;
}

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount" | "fines" | "suspensions";

export default function Index({ user, onLogout, onUserUpdate, showTasksPopup, onTasksPopupShown, visibilityOverride }: IndexProps) {
  const resolvedVisibility = useResolvedVisibility(user);
  const visibility: VisibilitySettings = visibilityOverride ?? resolvedVisibility.settings ?? defaultVisibilitySettings();
  const [tab, setTab] = useState<Tab>("dashboard");
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
  const [suspensionOpenNumber, setSuspensionOpenNumber] = useState<string | undefined>(undefined);
  const [tasksPopupOpen, setTasksPopupOpen] = useState(false);

  const {
    assignments, notifications, unreadCount, markAllRead, tasksLoading,
    createTask, updateTask, deleteTask, action, sendComment, fetchComments,
  } = useAppNotifications(user);

  const {
    prescriptions, showAdd, setShowAdd, editingPrescription, setEditingPrescription,
    selected, setSelected, activeTemplate, availableUsers,
    setPrescriptionOpenId,
    addPrescription, updatePrescription, changePrescriptionStatus,
  } = useIndexPrescriptions(user);

  // Показываем попап с задачами при каждом входе в систему
  useEffect(() => {
    if (showTasksPopup && !tasksLoading) {
      setTasksPopupOpen(true);
      onTasksPopupShown?.();
    }
  }, [showTasksPopup, tasksLoading]);

  // Если текущая вкладка скрыта настройками видимости — переключаемся на Главную
  useEffect(() => {
    if (resolvedVisibility.loading) return;
    if (tab === "dashboard") return;
    if (!visibility.tabs[tab as TabKey]) setTab("dashboard");
  }, [tab, visibility, resolvedVisibility.loading]);

  const isContractor = user.role === "contractor";
  const canEdit = user.role === "admin" || user.role === "specialist" || user.role === "manager";

  const canViewHeadcount = visibility.tabs.headcount;
  const canViewFines = visibility.tabs.fines;
  const canViewSuspensions = visibility.tabs.suspensions;

  const tabVisible = (key: TabKey) => visibility.tabs[key];

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    ...(tabVisible("prescriptions") ? [{ id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList" }] : []),
    ...(tabVisible("inspections") ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    ...(tabVisible("incidents") ? [{ id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert" }] : []),
    ...(tabVisible("tasks") ? [{ id: "tasks" as Tab, label: "Задачи", icon: "ListChecks" }] : []),
    ...(canViewHeadcount ? [{ id: "headcount" as Tab, label: "ЧеловекоЧасы", icon: "Users" }] : []),
    ...(canViewFines ? [{ id: "fines" as Tab, label: "Штрафы", icon: "Banknote" }] : []),
    ...(canViewSuspensions ? [{ id: "suspensions" as Tab, label: "Приостановки", icon: "OctagonPause" }] : []),
  ];

  const handleNotificationClick = (n: MergedNotification) => {
    if (!n.refId) return;
    if (n.kind === "task") { setTaskFilter(undefined); setTaskOpenId(n.refId as number); setTab("tasks"); }
    else if (n.kind === "inspection") { setInspectionOpenId(n.refId as number); setTab("inspections"); }
    else { setPrescriptionOpenId(n.refId as string); setTab("prescriptions"); }
  };

  const renderHeader = () => (
    <AppHeader
      user={user}
      onLogout={onLogout}
      onUserUpdate={onUserUpdate}
      tab={tab}
      setTab={setTab}
      navTabs={NAV_TABS}
      notifications={notifications}
      unreadCount={unreadCount}
      markAllRead={markAllRead}
      onNotificationClick={handleNotificationClick}
    />
  );

  if (tab === "incidents" && tabVisible("incidents")) {
    return (
      <Incidents
        user={user}
        onLogout={onLogout}
        onTabChange={(t) => setTab(t as Tab)}
        activeTab={tab}
        visibility={visibility}
      />
    );
  }

  if (tab === "inspections" && tabVisible("inspections")) {
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
        visibility={visibility}
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
        visibility={visibility}
      />
    );
  }

  if (tab === "fines" && canViewFines) {
    return (
      <Fines
        user={user}
        onLogout={onLogout}
        onTabChange={(t) => setTab(t as Tab)}
        activeTab={tab}
        visibility={visibility}
      />
    );
  }

  if (tab === "suspensions" && canViewSuspensions) {
    return (
      <Suspensions
        user={user}
        onLogout={onLogout}
        onTabChange={(t) => setTab(t as Tab)}
        activeTab={tab}
        visibility={visibility}
        initialOpenNumber={suspensionOpenNumber}
      />
    );
  }

  if (tab === "tasks" && tabVisible("tasks")) {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {renderHeader()}
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
        <Dashboard
          user={user}
          taskAssignments={assignments}
          visibility={visibility}
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

  if (!tabVisible("prescriptions")) {
    return null;
  }

  return (
    <>
      <PrescriptionList
        user={user}
        onLogout={onLogout}
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
        onHeadcountClick={canViewHeadcount ? () => setTab("headcount") : undefined}
        onFinesClick={canViewFines ? () => setTab("fines") : undefined}
        onSuspensionsClick={canViewSuspensions ? () => setTab("suspensions") : undefined}
        onStatusChange={changePrescriptionStatus}
        activeTab={tab}
        visibility={visibility}
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
          onOpenSuspension={canViewSuspensions ? (number) => {
            setSuspensionOpenNumber(number);
            setSelected(null);
            setTab("suspensions");
          } : undefined}
        />
      )}
    </>
  );
}