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

const STORAGE_KEY = "ot_users_v2";

export const INITIAL_USERS: AppUser[] = [
  { id: "1", login: "admin", password: "admin123", name: "Иванова О.В.", role: "admin" },
  { id: "2", login: "specialist", password: "spec123", name: "Алексеев С.Н.", role: "specialist" },
  { id: "3", login: "contractor", password: "contr123", name: "Козлов А.В.", role: "contractor", contractor: "ООО «СтройПодряд»" },
];

export function getUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppUser[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  // Первый запуск — сохраняем дефолтных пользователей
  saveUsers(INITIAL_USERS);
  return INITIAL_USERS;
}

export function saveUsers(users: AppUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
