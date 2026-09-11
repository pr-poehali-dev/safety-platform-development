export type SuspensionStatus = "Приостановлено" | "Нарушения устранены";

export interface Suspension {
  id: string;
  number: string;
  issuedAt: string;
  object: string;
  place: string;
  contractor: string;
  issuedBy: string;
  reason: string;
  status: SuspensionStatus;
  createdBy?: string;
}

export const SUSPENSION_STATUS_STYLE: Record<SuspensionStatus, string> = {
  "Приостановлено": "text-red-400 bg-red-400/10 border-red-400/20",
  "Нарушения устранены": "text-green-400 bg-green-400/10 border-green-400/20",
};

export const ALL_SUSPENSION_STATUSES: SuspensionStatus[] = ["Приостановлено", "Нарушения устранены"];

export function newSuspensionId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}
