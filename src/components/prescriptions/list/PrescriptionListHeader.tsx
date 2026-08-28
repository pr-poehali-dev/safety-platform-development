import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

interface PrescriptionListHeaderProps {
  user: AppUser;
  onLogout: () => void;
  onInspectionsClick?: () => void;
  onDashboardClick?: () => void;
  onIncidentsClick?: () => void;
  onTasksClick?: () => void;
  onHeadcountClick?: () => void;
  onFinesClick?: () => void;
  activeTab?: string;
}

export function PrescriptionListHeader({
  user, onLogout, onInspectionsClick, onDashboardClick, onIncidentsClick, onTasksClick,
  onHeadcountClick, onFinesClick, activeTab = "prescriptions",
}: PrescriptionListHeaderProps) {
  const canViewHeadcount = user.role === "manager" || user.role === "admin";
  const canViewFines = user.role === "manager" || user.role === "admin";
  return (
    <>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Shield" size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
        </div>
        <UserMenu user={user} onLogout={onLogout} />
      </header>

      {/* Навигационные вкладки */}
      {(onInspectionsClick || onDashboardClick) && (
        <div className="border-b border-border bg-background">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex gap-1 pt-2">
            {onDashboardClick && (
              <button
                onClick={onDashboardClick}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "dashboard" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name="LayoutDashboard" size={14} />
                Главная
              </button>
            )}
            <button
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "prescriptions" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="ClipboardList" size={14} />
              Предписания
            </button>
            {onInspectionsClick && (
              <button
                onClick={onInspectionsClick}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "inspections" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name="TableProperties" size={14} />
                Проверки
              </button>
            )}
            <button
              onClick={onIncidentsClick}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "incidents" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="TriangleAlert" size={14} />
              Происшествия
            </button>
            <button
              onClick={onTasksClick}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "tasks" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="ListChecks" size={14} />
              Задачи
            </button>
            {canViewHeadcount && onHeadcountClick && (
              <button
                onClick={onHeadcountClick}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "headcount" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name="Users" size={14} />
                ЧеловекоЧасы
              </button>
            )}
            {canViewFines && onFinesClick && (
              <button
                onClick={onFinesClick}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "fines" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name="Banknote" size={14} />
                Штрафы
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}