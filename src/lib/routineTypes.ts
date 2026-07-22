export interface RoutineCategory {
  id: number;
  name: string;
  sort_order: number;
}

export interface RoutineEntry {
  id: number;
  user_login: string;
  user_name: string;
  category_id: number | null;
  category_name: string;
  entry_date: string; // YYYY-MM-DD
  hours: number;
  comment: string;
  created_at: string;
}

export const WEEKDAY_LABELS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRu(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${m}.${d.getFullYear()}`;
}

export interface WeekDayInfo {
  label: string;
  date: Date;
  iso: string;
  display: string;
  isToday: boolean;
}

// Возвращает 7 дней текущей недели (пн-вс), пересчитывается на основе реальной даты
export function getCurrentWeekDays(reference: Date = new Date()): WeekDayInfo[] {
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  // getDay(): 0=вс,1=пн,...6=сб → смещение до понедельника
  const dow = ref.getDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + offsetToMonday);

  const todayIso = toISODate(ref);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISODate(d);
    return {
      label: WEEKDAY_LABELS[i],
      date: d,
      iso,
      display: formatRu(d),
      isToday: iso === todayIso,
    };
  });
}
