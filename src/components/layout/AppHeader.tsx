import { useRef, useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import { AppUser } from "@/lib/auth";
import { MergedNotification } from "@/hooks/useAppNotifications";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount" | "fines" | "suspensions";

interface NavTabItem {
  id: Tab;
  label: string;
  icon: string;
}

interface AppHeaderProps {
  user: AppUser;
  onLogout: () => void;
  onUserUpdate?: (u: AppUser) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  navTabs: NavTabItem[];
  notifications: MergedNotification[];
  unreadCount: number;
  markAllRead: () => void;
  onNotificationClick: (n: MergedNotification) => void;
}

export function AppHeader({
  user, onLogout, onUserUpdate, tab, setTab, navTabs,
  notifications, unreadCount, markAllRead, onNotificationClick,
}: AppHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
                    onNotificationClick(n);
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

  return (
    <>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <button
          onClick={() => setTab("dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Logo size={28} />
          <span className="text-sm font-semibold tracking-tight">SafeWork</span>
        </button>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
        </div>
      </header>

      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-2 overflow-x-auto">
          {navTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
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
