export const TAB_KEYS = ["prescriptions", "inspections", "incidents", "tasks", "headcount", "fines"] as const;
export type TabKey = typeof TAB_KEYS[number];

export const BLOCK_KEYS = [
  "presCards", "inspCards", "tasksWidget", "headcountWidget",
  "spb", "pyramid", "topContractors", "pivotTable", "remarksChart",
] as const;
export type BlockKey = typeof BLOCK_KEYS[number];

export interface VisibilitySettings {
  tabs: Record<TabKey, boolean>;
  blocks: Record<BlockKey, boolean>;
}

export const TAB_LABELS: Record<TabKey, string> = {
  prescriptions: "Предписания",
  inspections: "Проверки",
  incidents: "Происшествия",
  tasks: "Задачи",
  headcount: "ЧеловекоЧасы",
  fines: "Штрафы",
};

export const TAB_ICONS: Record<TabKey, string> = {
  prescriptions: "ClipboardList",
  inspections: "TableProperties",
  incidents: "TriangleAlert",
  tasks: "ListChecks",
  headcount: "Users",
  fines: "Banknote",
};

export const BLOCK_LABELS: Record<BlockKey, string> = {
  presCards: "Карточки предписаний",
  inspCards: "Карточки проверок",
  tasksWidget: "Виджет «Задачи»",
  headcountWidget: "Виджет «Человекочасы»",
  spb: "Стратегические приоритеты безопасности (СПБ)",
  pyramid: "Пирамида происшествий",
  topContractors: "Топ подрядчиков",
  pivotTable: "Сводная таблица",
  remarksChart: "График замечаний",
};

export function defaultVisibilitySettings(): VisibilitySettings {
  return {
    tabs: Object.fromEntries(TAB_KEYS.map(k => [k, true])) as Record<TabKey, boolean>,
    blocks: Object.fromEntries(BLOCK_KEYS.map(k => [k, true])) as Record<BlockKey, boolean>,
  };
}