import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import { VisibilitySettings } from "@/lib/visibilityTypes";
import { Tab } from "@/components/fines/finesShared";

interface FinesHeaderProps {
  user: AppUser;
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab: Tab;
  tabs: VisibilitySettings["tabs"];
}

export default function FinesHeader({ user, onLogout, onTabChange, activeTab, tabs }: FinesHeaderProps) {
  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    ...(tabs.prescriptions ? [{ id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList" }] : []),
    ...(tabs.inspections ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    ...(tabs.incidents ? [{ id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert" }] : []),
    ...(tabs.tasks ? [{ id: "tasks" as Tab, label: "Задачи", icon: "ListChecks" }] : []),
    ...(tabs.headcount ? [{ id: "headcount" as Tab, label: "ЧеловекоЧасы", icon: "Users" }] : []),
    { id: "fines", label: "Штрафы", icon: "Banknote" },
    ...(tabs.suspensions ? [{ id: "suspensions" as Tab, label: "Приостановки", icon: "OctagonPause" }] : []),
  ];

  return (
    <>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <button
          onClick={() => onTabChange?.("dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Logo size={28} />
          <span className="text-sm font-semibold tracking-tight">SafeWork</span>
        </button>
        <UserMenu user={user} onLogout={onLogout} />
      </header>

      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2 overflow-x-auto">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange?.(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={t.icon as never} size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
