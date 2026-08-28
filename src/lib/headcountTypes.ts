export interface HeadcountDay {
  date: string; // YYYY-MM-DD
  po: number | null;
  sbd: number | null;
}

export interface MonthStats {
  month: number; // 1-12
  label: string;
  hasData: boolean;
  poHours: number;
  sbdHours: number;
  totalHours: number;
  poAvg: number | null;
  sbdAvg: number | null;
  days: HeadcountDay[];
}

export const MONTH_LABELS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const PO_RATE = 10;
export const SBD_RATE = 8;

export interface YtdStats {
  dateLabel: string;
  poSum: number;
  sbdSum: number;
  poHours: number;
  sbdHours: number;
  poAvgListed: number | null; // среднесписочная (по календарным дням с начала года)
  sbdAvgListed: number | null;
  poAvgWorked: number | null; // средняя (по факту заполненным дням)
  sbdAvgWorked: number | null;
}

export function buildYtdStats(days: HeadcountDay[]): YtdStats {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const ytdDays = days.filter(d => d.date <= todayIso);
  const poVals = ytdDays.map(d => d.po).filter((v): v is number => v !== null && v !== undefined);
  const sbdVals = ytdDays.map(d => d.sbd).filter((v): v is number => v !== null && v !== undefined);

  const poSum = poVals.reduce((s, v) => s + v, 0);
  const sbdSum = sbdVals.reduce((s, v) => s + v, 0);

  // Среднесписочная численность считается по текущему месяцу (с 1 числа по сегодня)
  const monthStartIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const daysElapsedInMonth = today.getDate();
  const monthDays = days.filter(d => d.date >= monthStartIso && d.date <= todayIso);
  const poMonthVals = monthDays.map(d => d.po).filter((v): v is number => v !== null && v !== undefined);
  const sbdMonthVals = monthDays.map(d => d.sbd).filter((v): v is number => v !== null && v !== undefined);
  const poMonthSum = poMonthVals.reduce((s, v) => s + v, 0);
  const sbdMonthSum = sbdMonthVals.reduce((s, v) => s + v, 0);

  return {
    dateLabel: today.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
    poSum,
    sbdSum,
    poHours: poSum * PO_RATE,
    sbdHours: sbdSum * SBD_RATE,
    poAvgListed: daysElapsedInMonth > 0 ? poMonthSum / daysElapsedInMonth : null,
    sbdAvgListed: daysElapsedInMonth > 0 ? sbdMonthSum / daysElapsedInMonth : null,
    poAvgWorked: poVals.length > 0 ? poSum / poVals.length : null,
    sbdAvgWorked: sbdVals.length > 0 ? sbdSum / sbdVals.length : null,
  };
}

export function buildMonthStats(year: number, days: HeadcountDay[]): MonthStats[] {
  const byMonth: Record<number, HeadcountDay[]> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = [];
  for (const d of days) {
    const m = Number(d.date.slice(5, 7));
    if (byMonth[m]) byMonth[m].push(d);
  }

  const daysInMonth = (m: number) => new Date(year, m, 0).getDate();

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const total = daysInMonth(month);
    const existing = byMonth[month];
    const map: Record<string, HeadcountDay> = {};
    existing.forEach(d => { map[d.date] = d; });

    const fullDays: HeadcountDay[] = Array.from({ length: total }, (_, di) => {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(di + 1).padStart(2, "0")}`;
      return map[date] ?? { date, po: null, sbd: null };
    });

    const poVals = fullDays.map(d => d.po).filter((v): v is number => v !== null && v !== undefined);
    const sbdVals = fullDays.map(d => d.sbd).filter((v): v is number => v !== null && v !== undefined);

    const poSum = poVals.reduce((s, v) => s + v, 0);
    const sbdSum = sbdVals.reduce((s, v) => s + v, 0);
    const hasData = poVals.length > 0 || sbdVals.length > 0;

    return {
      month,
      label: MONTH_LABELS[i],
      hasData,
      poHours: poSum * PO_RATE,
      sbdHours: sbdSum * SBD_RATE,
      totalHours: poSum * PO_RATE + sbdSum * SBD_RATE,
      poAvg: poVals.length > 0 ? poVals.reduce((s, v) => s + v, 0) / poVals.length : null,
      sbdAvg: sbdVals.length > 0 ? sbdVals.reduce((s, v) => s + v, 0) / sbdVals.length : null,
      days: fullDays,
    };
  });
}