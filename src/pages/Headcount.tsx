import { useState, useMemo } from "react";
import { AppUser } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import UserMenu from "@/components/UserMenu";
import { useHeadcount } from "@/hooks/useHeadcount";
import { useHeadcountSettings } from "@/hooks/useHeadcountSettings";
import { buildMonthStats, MonthStats } from "@/lib/headcountTypes";
import HeadcountSummaryTable from "@/components/headcount/HeadcountSummaryTable";
import MonthDetailModal from "@/components/headcount/MonthDetailModal";
import HeadcountSettingsBar from "@/components/headcount/HeadcountSettingsBar";
import HeadcountTrendChart from "@/components/headcount/HeadcountTrendChart";
import { VisibilitySettings, defaultVisibilitySettings } from "@/lib/visibilityTypes";

type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount" | "fines";

interface Props {
  user: AppUser;
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
  visibility?: VisibilitySettings;
}

export default function Headcount({ user, onLogout, onTabChange, activeTab = "headcount", visibility }: Props) {
  const year = new Date().getFullYear();
  const tabs = visibility?.tabs ?? defaultVisibilitySettings().tabs;
  const canViewHeadcount = (user.role === "manager" || user.role === "admin") && tabs.headcount;

  const NAV_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    ...(tabs.prescriptions ? [{ id: "prescriptions" as Tab, label: "Предписания", icon: "ClipboardList" }] : []),
    ...(tabs.inspections ? [{ id: "inspections" as Tab, label: "Проверки", icon: "TableProperties" }] : []),
    ...(tabs.incidents ? [{ id: "incidents" as Tab, label: "Происшествия", icon: "TriangleAlert" }] : []),
    ...(tabs.tasks ? [{ id: "tasks" as Tab, label: "Задачи", icon: "ListChecks" }] : []),
    ...(canViewHeadcount ? [{ id: "headcount" as Tab, label: "ЧеловекоЧасы", icon: "Users" }] : []),
    ...((user.role === "manager" || user.role === "admin") && tabs.fines
      ? [{ id: "fines" as Tab, label: "Штрафы", icon: "Banknote" }]
      : []),
  ];
  const { days, loading, saveDay } = useHeadcount(year);
  const { settings, saveSettings } = useHeadcountSettings();
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const canEdit = user.role === "manager" || user.role === "admin";

  const months = useMemo(() => buildMonthStats(year, days, settings.po_rate, settings.sbd_rate), [year, days, settings]);
  const firstHalf = months.slice(0, 6);
  const secondHalf = months.slice(6, 12);
  const activeMonth: MonthStats | null = openMonth !== null ? months.find(m => m.month === openMonth) ?? null : null;

  const handleSaveDay = async (date: string, po: number | null, sbd: number | null) => {
    setSaving(true);
    try {
      await saveDay(date, po, sbd, user.login);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (poLabel: string, poRate: number, sbdRate: number) => {
    setSettingsSaving(true);
    try {
      await saveSettings(poLabel, poRate, sbdRate, user.login);
    } finally {
      setSettingsSaving(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Человекочасы</h1>
            <HeadcountSettingsBar
              year={year}
              settings={settings}
              editable={canEdit}
              saving={settingsSaving}
              onSave={handleSaveSettings}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка данных...
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Icon name="MousePointerClick" size={12} />
              Нажмите на месяц, чтобы посмотреть данные по дням{canEdit ? " и отредактировать их" : ""}
            </p>
            <HeadcountSummaryTable year={year} periodLabel="Январь — Июнь" months={firstHalf} poLabel={settings.po_label} onMonthClick={m => setOpenMonth(m.month)} />
            <HeadcountSummaryTable year={year} periodLabel="Июль — Декабрь" months={secondHalf} poLabel={settings.po_label} onMonthClick={m => setOpenMonth(m.month)} />
            <HeadcountTrendChart months={months} poLabel={settings.po_label} />
          </>
        )}
      </main>

      {activeMonth && (
        <MonthDetailModal
          month={activeMonth}
          editable={canEdit}
          saving={saving}
          poLabel={settings.po_label}
          poRate={settings.po_rate}
          sbdRate={settings.sbd_rate}
          onClose={() => setOpenMonth(null)}
          onSaveDay={handleSaveDay}
        />
      )}
    </div>
  );
}