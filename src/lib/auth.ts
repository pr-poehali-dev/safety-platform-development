export type UserRole = "admin" | "specialist" | "contractor";

export interface AppUser {
  id: string;
  login: string;
  password: string;
  name: string;
  position?: string;
  role: UserRole;
  contractor?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  specialist: "Специалист ОТ",
  contractor: "Подрядчик",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  specialist: "text-primary bg-primary/10 border-primary/20",
  contractor: "text-green-400 bg-green-400/10 border-green-400/20",
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
const SESSION_TTL = 60 * 60 * 1000; // 1 час

interface Session { user: AppUser; loginAt: number; }

export function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: Session = JSON.parse(raw);
    if (Date.now() - s.loginAt > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return s.user;
  } catch (_) { return null; }
}

export function saveSession(user: AppUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, loginAt: Date.now() }));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
