export type Status = "Черновик" | "В работе" | "Устранено" | "Просрочено";
export interface Remark { id: string; place: string; description: string; normRef: string; deadline: string; status: Status; photos?: string[]; }
export interface ImportLogEntry { date: string; adminLogin: string; adminName: string; }
export interface Prescription { id: string; number: string; date: string; object: string; contractor: string; inspector: string; inspectorNominative?: string; representative: string; responsible: string; replyEmail: string; reportDeadline: string; remarks: Remark[]; comments: unknown[]; importLog?: ImportLogEntry[]; }
export interface ImportPreview {
  fileKey: string;
  prescriptionsCount: number;
  remarksCount: number;
  photosCount: number;
  duplicateNumbers: string[];
  preview: { number: string; date: string; object: string; contractor: string; remarksCount: number; isDuplicate: boolean }[];
}

export const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "В работе":   "text-primary bg-primary/10 border-primary/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

export const ALL_STATUSES: Status[] = ["Черновик", "В работе", "Устранено", "Просрочено"];

export function isOverdue(r: Remark) {
  if (r.status === "Устранено" || !r.deadline || r.deadline === "Незамедлительно") return false;
  const [d, m, y] = r.deadline.split(".").map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  return today > new Date(y, m - 1, d);
}
export function effectiveStatus(r: Remark): Status {
  if (r.status === "Устранено") return "Устранено";
  if (isOverdue(r)) return "Просрочено";
  return r.status;
}
export function overallStatus(remarks: Remark[]): Status {
  if (!remarks.length) return "Черновик";
  const ss = remarks.map(effectiveStatus);
  if (ss.some(s => s === "Просрочено")) return "Просрочено";
  if (ss.every(s => s === "Устранено")) return "Устранено";
  if (ss.some(s => s === "В работе")) return "В работе";
  return "Черновик";
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[status]}`}>{status}</span>;
}

// Парсит дату предписания "дд.мм.гггг" в Date
export function parsePrescriptionDate(str: string): Date | null {
  if (!str) return null;
  const [d, m, y] = str.split(".").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

// Форматирует ISO-дату записи журнала импорта в читаемый вид
export function fmtImportDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
