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

export const DEFAULT_PO_LABEL = "ПО";
export const DEFAULT_PO_RATE = 10;
export const DEFAULT_SBD_RATE = 8;

export interface HeadcountSettings {
  po_label: string;
  po_rate: number;
  sbd_rate: number;
}

export interface YtdStats {
  dateLabel: string;
  poAvgListed: number | null; // среднесписочная численность за текущий месяц
  sbdAvgListed: number | null;
  poHours: number; // сумма ЧЧ за текущий месяц
  sbdHours: number;
}

export function buildYtdStats(days: HeadcountDay[], poRate = DEFAULT_PO_RATE, sbdRate = DEFAULT_SBD_RATE): YtdStats {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const monthStats = buildMonthStats(year, days, poRate, sbdRate).find(m => m.month === month);

  return {
    dateLabel: today.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
    poAvgListed: monthStats?.poAvg ?? null,
    sbdAvgListed: monthStats?.sbdAvg ?? null,
    poHours: monthStats?.poHours ?? 0,
    sbdHours: monthStats?.sbdHours ?? 0,
  };
}

export function buildMonthStats(year: number, days: HeadcountDay[], poRate = DEFAULT_PO_RATE, sbdRate = DEFAULT_SBD_RATE): MonthStats[] {
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
      poHours: poSum * poRate,
      sbdHours: sbdSum * sbdRate,
      totalHours: poSum * poRate + sbdSum * sbdRate,
      poAvg: poVals.length > 0 ? poVals.reduce((s, v) => s + v, 0) / poVals.length : null,
      sbdAvg: sbdVals.length > 0 ? sbdVals.reduce((s, v) => s + v, 0) / sbdVals.length : null,
      days: fullDays,
    };
  });
}