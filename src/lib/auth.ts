export type UserRole = "admin" | "specialist" | "contractor";

export interface AppUser {
  id: string;
  login: string;
  password: string;
  name: string;
  role: UserRole;
  contractor?: string; // для роли contractor — название организации
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

// Начальный список пользователей (хранится в памяти, управляется администратором)
export const INITIAL_USERS: AppUser[] = [
  {
    id: "1",
    login: "admin",
    password: "admin123",
    name: "Иванова О.В.",
    role: "admin",
  },
  {
    id: "2",
    login: "specialist",
    password: "spec123",
    name: "Алексеев С.Н.",
    role: "specialist",
  },
  {
    id: "3",
    login: "contractor",
    password: "contr123",
    name: "Козлов А.В.",
    role: "contractor",
    contractor: "ООО «СтройПодряд»",
  },
];
