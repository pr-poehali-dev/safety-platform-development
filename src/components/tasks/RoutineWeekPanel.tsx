import { useState } from "react";
import { AppUser } from "@/lib/auth";
import { useRoutine } from "@/hooks/useRoutine";
import { WeekDayInfo } from "@/lib/routineTypes";
import RoutineEntryModal from "./RoutineEntryModal";
import RoutineDayModal from "./RoutineDayModal";
import Icon from "@/components/ui/icon";

interface RoutineWeekPanelProps {
  user: AppUser;
}

export default function RoutineWeekPanel({ user }: RoutineWeekPanelProps) {
  const { categories, entries, weekDays, loading, createEntry, deleteEntry } = useRoutine(user);
  const [openDay, setOpenDay] = useState<WeekDayInfo | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryDefaultDate, setEntryDefaultDate] = useState<string>(weekDays[0]?.iso ?? "");

  const entriesForDate = (iso: string) => entries.filter(e => e.entry_date === iso);

  const weekTotalHours = entries.reduce((s, e) => s + e.hours, 0);

  const categoryBreakdown = Object.values(
    entries.reduce<Record<string, { name: string; hours: number }>>((acc, e) => {
      const key = e.category_name || "Без категории";
      if (!acc[key]) acc[key] = { name: key, hours: 0 };
      acc[key].hours += e.hours;
      return acc;
    }, {})
  ).sort((a, b) => b.hours - a.hours);

  const openAddModal = (iso?: string) => {
    setEntryDefaultDate(iso ?? weekDays.find(d => d.isToday)?.iso ?? weekDays[0].iso);
    setShowEntryModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon name="CalendarCheck" size={16} className="text-primary" />
          Самостоятельно выполненные задачи
        </h2>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} /> Что сделано?
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {weekDays.map(day => {
            const dayEntries = entriesForDate(day.iso);
            const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0);
            return (
              <button
                key={day.iso}
                onClick={() => setOpenDay(day)}
                className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                  day.isToday ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${day.isToday ? "text-primary" : "text-foreground"}`}>{day.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{day.display}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {dayEntries.length > 0 ? (
                    <>
                      <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                        {dayEntries.length} {dayEntries.length === 1 ? "запись" : "записи"}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{totalHours} ч</span>
                    </>
                  ) : (
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground/50" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Icon name="BarChart3" size={14} className="text-primary" />
              Итого за неделю
            </h3>
            <span className="text-sm font-bold text-primary">{weekTotalHours} ч</span>
          </div>
          <div className="space-y-2">
            {categoryBreakdown.map(({ name, hours }) => (
              <div key={name}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-muted-foreground truncate">{name}</span>
                  <span className="text-xs font-medium text-foreground flex-shrink-0">{hours} ч</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: weekTotalHours > 0 ? `${(hours / weekTotalHours) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {openDay && (
        <RoutineDayModal
          day={openDay}
          entries={entriesForDate(openDay.iso)}
          onClose={() => setOpenDay(null)}
          onAdd={() => { openAddModal(openDay.iso); }}
          onDelete={async (id) => { await deleteEntry(id); }}
        />
      )}

      {showEntryModal && (
        <RoutineEntryModal
          categories={categories}
          defaultDate={entryDefaultDate}
          onClose={() => setShowEntryModal(false)}
          onSave={createEntry}
        />
      )}
    </div>
  );
}