export const ALTAI_TZ = "Asia/Barnaul";

const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: ALTAI_TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateTimeSecFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: ALTAI_TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: ALTAI_TZ, hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: ALTAI_TZ, day: "2-digit", month: "2-digit", year: "numeric" });

export function altaiDateTime(value: string | Date = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return typeof value === "string" ? value : "";
  return dateTimeFmt.format(d);
}

export function altaiDateTimeSec(value: Date = new Date()): string {
  return dateTimeSecFmt.format(value);
}

export function altaiTime(value: Date = new Date()): string {
  return timeFmt.format(value);
}

export function altaiDate(value: Date = new Date()): string {
  return dateFmt.format(value);
}
