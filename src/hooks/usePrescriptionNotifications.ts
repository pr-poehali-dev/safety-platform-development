import { useState, useEffect, useCallback } from "react";
import { AppUser } from "@/lib/auth";
import { PrescriptionNotification, PRESCRIPTION_NOTIFICATIONS_API } from "@/lib/prescriptionTypes";

export function usePrescriptionNotifications(user: AppUser) {
  const [notifications, setNotifications] = useState<PrescriptionNotification[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${PRESCRIPTION_NOTIFICATIONS_API}?login=${user.login}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, [user.login]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await fetch(PRESCRIPTION_NOTIFICATIONS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", login: user.login }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount, load, markAllRead };
}
