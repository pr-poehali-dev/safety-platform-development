// --- Склонение слова в творительный падеж ---
export function declineWordInstr(word: string, isMale: boolean): string {
  const w = word.toLowerCase();
  if (!isMale) {
    if (w.endsWith("ья")) return word.slice(0, -2) + "ьей";
    if (w.endsWith("ия")) return word.slice(0, -2) + "ией";
    if (w.endsWith("а"))  return word.slice(0, -1) + "ой";
    if (w.endsWith("я"))  return word.slice(0, -1) + "ей";
    return word;
  }
  if (w.endsWith("ий")) return word.slice(0, -2) + "им";
  if (w.endsWith("ой")) return word.slice(0, -2) + "ым";
  if (w.endsWith("ый")) return word.slice(0, -2) + "ым";
  if (w.endsWith("й"))  return word.slice(0, -1) + "ем";
  if (w.endsWith("ья")) return word.slice(0, -2) + "ьей";
  if (w.endsWith("ия")) return word.slice(0, -2) + "ием";
  if (w.endsWith("ь"))  return word.slice(0, -1) + "ем";
  if (/[жшщч]$/.test(w)) return word + "ем";
  if (/[оеё]в$/.test(w)) return word + "ым";
  if (/[иы]н$/.test(w)) return word + "ым";
  const consonants = "бвгджзклмнпрстфхцчшщ";
  if (consonants.includes(w.slice(-1))) return word + "ом";
  return word;
}

// Слова-исключения в должностях (предлоги/союзы — не склоняются)
export const STOP_WORDS = new Set(["и", "или", "по", "на", "в", "за", "с", "от", "для", "при", "к", "а", "но"]);

// Склонение произвольной фразы-должности (каждое слово отдельно)
export function declinePosition(position: string, isMale: boolean): string {
  return position.split(/\s+/).map(word => {
    const clean = word.toLowerCase().replace(/[^а-яё]/g, "");
    if (!clean || STOP_WORDS.has(clean)) return word;
    return declineWordInstr(word, isMale);
  }).join(" ");
}

// Склонение ФИО в творительный падеж
export function toInstrumental(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const [last, first, middle] = parts;
  const isMale = middle
    ? !(/вна$|чна$/i.test(middle))
    : !(/вна$|чна$/i.test(first ?? ""));
  return [
    declineWordInstr(last, isMale),
    first  ? declineWordInstr(first,  isMale) : "",
    middle ? declineWordInstr(middle, isMale) : "",
  ].filter(Boolean).join(" ");
}

// Определение пола по ФИО (для склонения должности)
export function detectGenderFromName(fullName: string): boolean {
  const parts = fullName.trim().split(/\s+/);
  const middle = parts[2];
  const first = parts[1];
  if (middle) return !(/вна$|чна$/i.test(middle));
  return !(/вна$|чна$/i.test(first ?? ""));
}

// --- Типы ---
export type Status = "Черновик" | "Выдано" | "Устранено" | "Просрочено";

export interface Remark {
  id: string;
  place: string;
  description: string;
  normRef: string;
  deadline: string;
  status: Status;
}

export interface Prescription {
  id: string;
  number: string;
  date: string;
  object: string;
  contractor: string;
  inspector: string;
  representative: string;
  responsible: string;
  replyEmail: string;
  reportDeadline: string;
  remarks: Remark[];
  comments: Comment[];
}

export interface Attachment {
  name: string;
  type: "image" | "pdf";
  dataUrl: string;
}

export interface Comment {
  id: number;
  author: string;
  role: string;
  text: string;
  time: string;
  attachments?: Attachment[];
}

// --- Вспомогательные ---
export const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "Выдано":     "text-primary bg-primary/10 border-primary/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

export const ALL_STATUSES: Status[] = ["Черновик", "Выдано", "Устранено", "Просрочено"];

export function isOverdue(remark: Remark): boolean {
  if (remark.status === "Устранено") return false;
  if (!remark.deadline) return false;
  const [d, m, y] = remark.deadline.split(".").map(Number);
  const deadline = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > deadline;
}

export function effectiveStatus(remark: Remark): Status {
  if (remark.status === "Устранено") return "Устранено";
  if (isOverdue(remark)) return "Просрочено";
  return remark.status;
}

export function overallStatus(remarks: Remark[]): Status {
  if (!remarks.length) return "Черновик";
  const statuses = remarks.map(effectiveStatus);
  if (statuses.some(s => s === "Просрочено")) return "Просрочено";
  if (statuses.every(s => s === "Устранено")) return "Устранено";
  if (statuses.some(s => s === "Выдано")) return "Выдано";
  return "Черновик";
}

export function newRemark(): Remark {
  return { id: Date.now().toString() + Math.random(), place: "", description: "", normRef: "", deadline: "", status: "Выдано" };
}

