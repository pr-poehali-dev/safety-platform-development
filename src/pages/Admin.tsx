import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AppUser, UserRole, ROLE_LABELS, ROLE_COLORS } from "@/lib/auth";

interface AdminProps {
  currentUser: AppUser;
  users: AppUser[];
  onUsersChange: (users: AppUser[]) => void;
  onLogout: () => void;
}

const ROLE_ICONS: Record<UserRole, string> = {
  admin: "Crown",
  specialist: "ShieldCheck",
  contractor: "HardHat",
};

const ALL_ROLES: UserRole[] = ["admin", "specialist", "contractor"];

interface UserFormData {
  login: string;
  password: string;
  name: string;
  position: string;
  role: UserRole;
  contractor: string;
}

function emptyForm(): UserFormData {
  return { login: "", password: "", name: "", position: "", role: "specialist", contractor: "" };
}

export default function Admin({ currentUser, users, onUsersChange, onLogout }: AdminProps) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [loginManual, setLoginManual] = useState(false);
  const [passwordManual, setPasswordManual] = useState(false);

  const generateLogin = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name.toLowerCase().replace(/[^a-zа-яё]/gi, "");
    const [last, first, middle] = parts;
    const translit = (s: string) => s.toLowerCase().replace(/[а-яё]/g, c =>
      ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",
         л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",
         ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[c] ?? c));
    return translit(last) + (first ? "_" + translit(first[0]) : "") + (middle ? translit(middle[0]) : "");
  };

  const generatePassword = (name: string) => {
    const parts = name.trim().split(/\s+/);
    const last = parts[0] ?? "";
    const first = (parts[1] ?? "").slice(0, 1).toUpperCase();
    const year = new Date().getFullYear();
    return last.slice(0, 4).replace(/[а-яёa-z]/gi, c => c.toUpperCase()) + first + year;
  };

  const set = (k: keyof UserFormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const setName = (v: string) => {
    setForm(prev => ({
      ...prev,
      name: v,
      login: loginManual ? prev.login : generateLogin(v),
      password: passwordManual ? prev.password : generatePassword(v),
    }));
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditUser(null);
    setError("");
    setLoginManual(false);
    setPasswordManual(false);
    setShowForm(true);
  };

  const openEdit = (u: AppUser) => {
    setForm({ login: u.login, password: u.password, name: u.name, position: u.position ?? "", role: u.role, contractor: u.contractor ?? "" });
    setEditUser(u);
    setError("");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.login.trim() || !form.password.trim() || !form.name.trim()) {
      setError("Заполните все обязательные поля");
      return;
    }
    const duplicate = users.find(u => u.login === form.login.trim() && u.id !== editUser?.id);
    if (duplicate) {
      setError("Пользователь с таким логином уже существует");
      return;
    }
    if (editUser) {
      onUsersChange(users.map(u => u.id === editUser.id ? {
        ...u,
        login: form.login.trim(),
        password: form.password,
        name: form.name.trim(),
        position: form.position.trim() || undefined,
        role: form.role,
        contractor: form.role === "contractor" ? form.contractor.trim() : undefined,
      } : u));
    } else {
      const newUser: AppUser = {
        id: Date.now().toString(),
        login: form.login.trim(),
        password: form.password,
        name: form.name.trim(),
        position: form.position.trim() || undefined,
        role: form.role,
        contractor: form.role === "contractor" ? form.contractor.trim() : undefined,
      };
      onUsersChange([...users, newUser]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) return;
    onUsersChange(users.filter(u => u.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Shield" size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">· Панель администратора</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="Crown" size={12} className="text-yellow-400" />
            {currentUser.name}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Icon name="LogOut" size={13} />
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Управление пользователями</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Всего учётных записей: {users.length}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Icon name="Plus" size={15} />
            Создать пользователя
          </button>
        </div>

        {/* Статистика по ролям */}
        <div className="grid grid-cols-3 gap-3">
          {ALL_ROLES.map(role => (
            <div key={role} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${ROLE_COLORS[role]}`}>
                <Icon name={ROLE_ICONS[role]} size={16} />
              </div>
              <div>
                <div className="text-xl font-light" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {users.filter(u => u.role === role).length}
                </div>
                <div className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Таблица пользователей */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Пользователь</th>
                <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Логин</th>
                <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Роль</th>
                <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden md:table-cell">Организация</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center border flex-shrink-0 ${ROLE_COLORS[u.role]}`}>
                        <Icon name={ROLE_ICONS[u.role]} size={13} />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{u.name}</p>
                        {u.position && <p className="text-[11px] text-muted-foreground">{u.position}</p>}
                        {u.id === currentUser.id && <span className="text-[10px] text-primary">Это вы</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{u.login}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border font-medium ${ROLE_COLORS[u.role]}`}>
                      <Icon name={ROLE_ICONS[u.role]} size={10} />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-sm text-muted-foreground">
                    {u.contractor || <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary"
                      >
                        <Icon name="Pencil" size={13} />
                      </button>
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="text-xs text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10"
                        >
                          <Icon name="Trash2" size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Форма создания / редактирования */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editUser ? "Редактировать пользователя" : "Новый пользователь"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <FormField label="ФИО *">
                <FormInput value={form.name} onChange={editUser ? v => set("name", v) : setName} placeholder="Иванов Иван Иванович" />
              </FormField>

              <FormField label="Должность">
                <FormInput value={form.position} onChange={v => set("position", v)} placeholder="Инженер по охране труда" />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label={
                  <span className="flex items-center gap-1.5">
                    Логин *
                    {!editUser && !loginManual && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">авто</span>}
                  </span>
                }>
                  <FormInput
                    value={form.login}
                    onChange={v => { setLoginManual(true); set("login", v); }}
                    placeholder="ivan_ivanov"
                  />
                </FormField>
                <FormField label={
                  <span className="flex items-center gap-1.5">
                    Пароль *
                    {!editUser && !passwordManual && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">авто</span>}
                  </span>
                }>
                  <div className="relative">
                    <FormInput
                      value={form.password}
                      onChange={v => { setPasswordManual(true); set("password", v); }}
                      placeholder="Пароль"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Icon name={showPassword ? "EyeOff" : "Eye"} size={13} />
                    </button>
                  </div>
                </FormField>
              </div>

              <FormField label="Роль *">
                <div className="grid grid-cols-3 gap-2">
                  {ALL_ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set("role", r)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${form.role === r ? ROLE_COLORS[r] : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}
                    >
                      <Icon name={ROLE_ICONS[r]} size={16} />
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </FormField>

              {form.role === "contractor" && (
                <FormField label="Организация">
                  <FormInput value={form.contractor} onChange={v => set("contractor", v)} placeholder="ООО «Название»" />
                </FormField>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  <Icon name="AlertCircle" size={13} />
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                {editUser ? "Сохранить изменения" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl animate-fade-in p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="Trash2" size={18} className="text-red-400" />
            </div>
            <h3 className="text-base font-semibold mb-2">Удалить пользователя?</h3>
            <p className="text-sm text-muted-foreground mb-5">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 text-sm py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 text-sm py-2 rounded-lg bg-red-400 text-white font-medium hover:bg-red-500 transition-colors">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

function FormInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
    />
  );
}