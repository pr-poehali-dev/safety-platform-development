import { useEffect, useRef } from "react";
import { AppUser } from "@/lib/auth";
import { useTasks } from "@/hooks/useTasks";
import { useInspectionNotifications } from "@/hooks/useInspectionNotifications";
import { usePrescriptionNotifications } from "@/hooks/usePrescriptionNotifications";
import { playNotificationSound } from "@/lib/notificationSound";

export type MergedNotification = {
  id: string;
  kind: "task" | "inspection" | "prescription";
  refId: number | string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export function useAppNotifications(user: AppUser) {
  const { assignments, notifications: taskNotifications, unreadCount: taskUnreadCount, markAllRead: markTaskNotificationsRead, createTask, updateTask, deleteTask, action, sendComment, fetchComments, load: reloadTasks, loading: tasksLoading } = useTasks(user);
  const { notifications: inspectionNotifications, unreadCount: inspectionUnreadCount, markAllRead: markInspectionNotificationsRead, load: reloadInspectionNotifications } = useInspectionNotifications(user);
  const { notifications: prescriptionNotifications, unreadCount: prescriptionUnreadCount, markAllRead: markPrescriptionNotificationsRead, load: reloadPrescriptionNotifications } = usePrescriptionNotifications(user);

  const notifications: MergedNotification[] = [
    ...taskNotifications.map(n => ({ id: `t${n.id}`, kind: "task" as const, refId: n.assignment_id, message: n.message, is_read: n.is_read, created_at: n.created_at })),
    ...inspectionNotifications.map(n => ({ id: `i${n.id}`, kind: "inspection" as const, refId: n.inspection_id, message: n.message, is_read: n.is_read, created_at: n.created_at })),
    ...prescriptionNotifications.map(n => ({ id: `p${n.id}`, kind: "prescription" as const, refId: n.prescription_id, message: n.message, is_read: n.is_read, created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const unreadCount = taskUnreadCount + inspectionUnreadCount + prescriptionUnreadCount;
  const markAllRead = () => { markTaskNotificationsRead(); markInspectionNotificationsRead(); markPrescriptionNotificationsRead(); };

  // Звуковой сигнал при появлении нового непрочитанного уведомления (не при первой загрузке страницы)
  const prevUnreadCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadCount.current !== null && unreadCount > prevUnreadCount.current) {
      playNotificationSound();
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Обновляем задачи и уведомления при возврате в браузерную вкладку
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reloadTasks();
        reloadInspectionNotifications();
        reloadPrescriptionNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadTasks, reloadInspectionNotifications, reloadPrescriptionNotifications]);

  return {
    assignments,
    notifications,
    unreadCount,
    markAllRead,
    tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    action,
    sendComment,
    fetchComments,
  };
}