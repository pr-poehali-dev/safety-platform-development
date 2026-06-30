import { useState, useEffect, useCallback } from "react";
import { TaskAssignment, TaskNotification } from "@/lib/taskTypes";
import { AppUser } from "@/lib/auth";

const TASKS_URL = "https://functions.poehali.dev/3cd2f397-c85b-47cf-88b9-f1d303552101";
const ACTIONS_URL = "https://functions.poehali.dev/570e5413-e4df-4335-9a01-f1ae1c598955";
const COMMENTS_URL = "https://functions.poehali.dev/c2751a4b-682c-4ef9-ac9e-8dfb976f5758";
const NOTIFICATIONS_URL = "https://functions.poehali.dev/644be78f-101c-4b5a-9b70-fe30ce8f0bdd";

export function useTasks(user: AppUser) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, notifRes] = await Promise.all([
        fetch(`${TASKS_URL}?role=${user.role}&login=${user.login}`),
        fetch(`${NOTIFICATIONS_URL}?login=${user.login}`),
      ]);
      const tasksData = await tasksRes.json();
      const notifData = await notifRes.json();
      setAssignments(Array.isArray(tasksData) ? tasksData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);
    } catch {
      setAssignments([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user.login, user.role]);

  useEffect(() => { load(); }, [load]);

  const createTask = async (description: string, assignees: { login: string; name: string; role: string; due_date: string }[]) => {
    await fetch(TASKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, assignees, created_by: user.login, created_by_name: user.name }),
    });
    await load();
  };

  const updateTask = async (task_id: number, description: string, assignees: { login: string; name: string; assignment_id?: number; due_date: string }[]) => {
    await fetch(TASKS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id, description, assignees }),
    });
    await load();
  };

  const deleteTask = async (task_id: number) => {
    await fetch(`${TASKS_URL}?task_id=${task_id}`, { method: "DELETE" });
    await load();
  };

  const action = async (payload: Record<string, unknown>) => {
    await fetch(ACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await load();
  };

  const sendComment = async (assignment_id: number, message: string) => {
    await fetch(COMMENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id, message, author_login: user.login, author_name: user.name, author_role: user.role }),
    });
  };

  const fetchComments = async (assignment_id: number) => {
    const res = await fetch(`${COMMENTS_URL}?assignment_id=${assignment_id}`);
    return res.json();
  };

  const markAllRead = async () => {
    await fetch(NOTIFICATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", login: user.login }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { assignments, notifications, unreadCount, loading, load, createTask, updateTask, deleteTask, action, sendComment, fetchComments, markAllRead };
}
