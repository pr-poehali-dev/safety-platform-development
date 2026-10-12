export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "В работе" },
  { value: "overdue", label: "Просроченные" },
  { value: "pending", label: "На согласовании" },
  { value: "done", label: "Выполненные" },
];

// Составные фильтры: один ключ → несколько статусов
export const FILTER_STATUSES: Record<string, string[]> = {
  active: ["active", "revision"],
  pending: ["extension_pending", "pending_report"],
  overdue: ["overdue"],
  done: ["done"],
};

export function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("ru-RU");
}
