export type TaskStatus =
  | "active"
  | "overdue"
  | "extension_pending"
  | "done"
  | "revision"
  | "pending_report";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  active: "В работе",
  overdue: "Просрочена",
  extension_pending: "На согласовании продления",
  done: "Выполнена",
  revision: "Доработка",
  pending_report: "Отчёт на проверке",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  active: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  overdue: "text-red-400 bg-red-400/10 border-red-400/20",
  extension_pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  done: "text-green-400 bg-green-400/10 border-green-400/20",
  revision: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  pending_report: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export interface TaskAssignment {
  id: number;
  task_id: number;
  description: string;
  assignee_login: string;
  assignee_name: string;
  assignee_role: string;
  due_date: string;
  status: TaskStatus;
  extension_requested_date?: string | null;
  extension_comment?: string | null;
  extension_resolution?: string | null;
  extension_reject_comment?: string | null;
  report_text?: string | null;
  report_submitted_at?: string | null;
  rejection_comment?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  task_created_at: string;
}

export interface TaskComment {
  id: number;
  assignment_id: number;
  author_login: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

export interface TaskNotification {
  id: number;
  assignment_id: number | null;
  event_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NewTaskAssignee {
  login: string;
  name: string;
  role: string;
  due_date: string;
  assignment_id?: number;
}
