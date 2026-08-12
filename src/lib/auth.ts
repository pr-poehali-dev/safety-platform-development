export type UserRole = "admin" | "specialist" | "manager" | "contractor" | "project_team";

export interface AppUser {
  id: string;
  login: string;
  password: string;
  name: string;
  position?: string;
  role: UserRole;
  contractor?: string;
  objectIds?: number[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  specialist: "Специалист ОТ",
  manager: "Руководитель",
  contractor: "Подрядчик",
  project_team: "Проектная команда",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  specialist: "text-primary bg-primary/10 border-primary/20",
  manager: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  contractor: "text-green-400 bg-green-400/10 border-green-400/20",
  project_team: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const USERS_URL = "https://functions.poehali.dev/9f213d27-a6a3-4ce0-b6b1-0d26003c43eb";

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await fetch(USERS_URL);
  const data = await res.json();
  return (typeof data === "string" ? JSON.parse(data) : data) as AppUser[];
}

export async function apiCreateUser(user: AppUser): Promise<void> {
  await fetch(USERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
}

export async function apiUpdateUser(user: AppUser): Promise<void> {
  await fetch(USERS_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
}

export async function apiDeleteUser(id: string): Promise<void> {
  await fetch(USERS_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

// Сессия хранится в localStorage — это нормально, она привязана к конкретному браузеру
const SESSION_KEY = "ot_session_v2";
const SESSION_TTL_DEFAULT = 60 * 60 * 1000; // 1 час
const SESSION_TTL_REMEMBER = 24 * 60 * 60 * 1000; // 24 часа при "Запомнить меня на сегодня"

interface Session { user: AppUser; loginAt: number; remember: boolean; }

export function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: Session = JSON.parse(raw);
    const ttl = s.remember ? SESSION_TTL_REMEMBER : SESSION_TTL_DEFAULT;
    if (Date.now() - s.loginAt > ttl) { localStorage.removeItem(SESSION_KEY); return null; }
    return s.user;
  } catch (_) { return null; }
}

// remember: true — сессия живёт 24 часа. Если не передан — сохраняются параметры текущей сессии (используется при фоновом обновлении данных пользователя)
export function saveSession(user: AppUser, remember?: boolean): void {
  let loginAt = Date.now();
  let rememberFlag = remember ?? false;
  if (remember === undefined) {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s: Session = JSON.parse(raw);
        loginAt = s.loginAt;
        rememberFlag = s.remember;
      }
    } catch (_) { /* используем значения по умолчанию */ }
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, loginAt, remember: rememberFlag }));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}