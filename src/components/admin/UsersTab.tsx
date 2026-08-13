import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AppUser, UserRole, ROLE_LABELS, ROLE_COLORS, apiCreateUser, apiUpdateUser, apiDeleteUser, apiInvalidateSessions } from "@/lib/auth";

const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";

const ROLE_ICONS: Record<UserRole, string> = { admin: "Crown", specialist: "ShieldCheck", manager: "Briefcase", contractor: "HardHat", project_team: "Users" };
const ALL_ROLES: UserRole[] = ["admin", "specialist", "manager", "contractor", "project_team"];

interface ObjectItem { id: number; name: string; }

interface UserFormData { login: string; password: string; name: string; position: string; role: UserRole; contractor: string; objectIds: number[]; }
function emptyForm(): UserFormData { return { login: "", password: "", name: "", position: "", role: "specialist", contractor: "", objectIds: [] }; }

function FormField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}
function FormInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />;
}

interface UsersTabProps {
  currentUser: AppUser;
  users: AppUser[];
  onUsersChange: (users: AppUser[]) => void;
}

export function UsersTab({ currentUser, users, onUsersChange }: UsersTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [logoutAllConfirm, setLogoutAllConfirm] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [error, setError] = useState("");
  const [loginManual, setLoginManual] = useState(false);
  const [passwordManual, setPasswordManual] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | null>(null);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [objectsOpen, setObjectsOpen] = useState(false);

  useEffect(() => {
    fetch(OBJECTS_API)
      .then(r => r.json())
      .then(data => setObjects(Array.isArray(data) ? data.map((o: ObjectItem) => ({ id: o.id, name: o.name })) : []))
      .catch(() => {});
  }, []);

  const filteredUsers = roleFilter ? users.filter(u => u.role === roleFilter) : users;
  const toggleFilter = (role: UserRole) => setRoleFilter(prev => prev === role ? null : role);

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
  const setName = (v: string) => setForm(prev => ({
    ...prev, name: v,
    login: loginManual ? prev.login : generateLogin(v),
    password: passwordManual ? prev.password : generatePassword(v),
  }));

  const openCreate = () => { setForm(emptyForm()); setEditUser(null); setError(""); setLoginManual(false); setPasswordManual(false); setObjectsOpen(false); setShowForm(true); };
  const openEdit = (u: AppUser) => { setForm({ login: u.login, password: u.password, name: u.name, position: u.position ?? "", role: u.role, contractor: u.contractor ?? "", objectIds: u.objectIds ?? [] }); setEditUser(u); setError(""); setObjectsOpen(false); setShowForm(true); };

  const toggleObjectId = (id: number) => {
    setForm(prev => ({
      ...prev,
      objectIds: prev.objectIds.includes(id) ? prev.objectIds.filter(x => x !== id) : [...prev.objectIds, id],
    }));
  };

  const handleSave = async () => {
    if (!form.login.trim() || !form.password.trim() || !form.name.trim()) { setError("Заполните все обязательные поля"); return; }
    if (form.role === "project_team" && form.objectIds.length === 0) { setError("Выберите хотя бы один объект"); return; }
    const duplicate = users.find(u => u.login === form.login.trim() && u.id !== editUser?.id);
    if (duplicate) { setError("Пользователь с таким логином уже существует"); return; }
    if (editUser) {
      const updated = { ...editUser, ...form };
      await apiUpdateUser(updated);
      onUsersChange(users.map(u => u.id === editUser.id ? updated : u));
    } else {
      const newUser: AppUser = { id: Date.now().toString(), ...form };
      await apiCreateUser(newUser);
      onUsersChange([...users, newUser]);
    }
    setShowForm(false);
  };

  const handleDeleteUser = async (id: string) => {
    await apiDeleteUser(id);
    onUsersChange(users.filter(u => u.id !== id));
    setDeleteConfirm(null);
  };

  const handleLogoutAll = async (id: string) => {
    setLoggingOutAll(true);
    try {
      const sessionsInvalidatedAt = await apiInvalidateSessions(id);
      onUsersChange(users.map(u => u.id === id ? { ...u, sessionsInvalidatedAt } : u));
    } finally {
      setLoggingOutAll(false);
      setLogoutAllConfirm(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Управление пользователями</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Всего учётных записей: {users.length}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={15} />
          Создать пользователя
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_ROLES.map(role => {
          const active = roleFilter === role;
          return (
            <button key={role} onClick={() => toggleFilter(role)} className={`bg-card border rounded-xl p-4 flex items-center gap-3 transition-all text-left w-full ${active ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 ${ROLE_COLORS[role]}`}>
                <Icon name={ROLE_ICONS[role]} size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-light" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{users.filter(u => u.role === role).length}</div>
                <div className="text-xs text-muted-foreground truncate">{ROLE_LABELS[role]}</div>
              </div>
              {active && <Icon name="X" size={13} className="ml-auto text-muted-foreground flex-shrink-0" />}
            </button>
          );
        })}
      </div>

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
            {filteredUsers.map(u => (
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
                <td className="px-5 py-3.5"><span className="text-sm text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{u.login}</span></td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border font-medium ${ROLE_COLORS[u.role]}`}>
                    <Icon name={ROLE_ICONS[u.role]} size={10} />
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell text-sm text-muted-foreground">{u.contractor || <span className="text-muted-foreground/40">—</span>}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setLogoutAllConfirm(u.id)} title="Выйти со всех устройств" className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary">
                      <Icon name="MonitorX" size={13} />
                    </button>
                    <button onClick={() => openEdit(u)} className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary">
                      <Icon name="Pencil" size={13} />
                    </button>
                    {u.id !== currentUser.id && (
                      <button onClick={() => setDeleteConfirm(u.id)} className="text-xs text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10">
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

      {/* Форма пользователя */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editUser ? "Редактировать пользователя" : "Новый пользователь"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormField label="ФИО *">
                <FormInput value={form.name} onChange={editUser ? v => set("name", v) : setName} placeholder="Иванов Иван Иванович" />
              </FormField>
              <FormField label="Должность">
                <FormInput value={form.position} onChange={v => set("position", v)} placeholder="Инженер по охране труда" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={<span className="flex items-center gap-1.5">Логин *{!editUser && !loginManual && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">авто</span>}</span>}>
                  <FormInput value={form.login} onChange={v => { setLoginManual(true); set("login", v); }} placeholder="ivan_ivanov" />
                </FormField>
                <FormField label={<span className="flex items-center gap-1.5">Пароль *{!editUser && !passwordManual && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">авто</span>}</span>}>
                  <div className="relative">
                    <FormInput value={form.password} onChange={v => { setPasswordManual(true); set("password", v); }} placeholder="Пароль" type={showPassword ? "text" : "password"} />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Icon name={showPassword ? "EyeOff" : "Eye"} size={13} />
                    </button>
                  </div>
                </FormField>
              </div>
              <FormField label="Роль *">
                <div className="grid grid-cols-3 gap-2">
                  {ALL_ROLES.map(r => (
                    <button key={r} type="button" onClick={() => set("role", r)} className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${form.role === r ? ROLE_COLORS[r] : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}>
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
              {form.role === "project_team" && (
                <FormField label={`Объекты *${form.objectIds.length > 0 ? ` (выбрано: ${form.objectIds.length})` : ""}`}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setObjectsOpen(v => !v)}
                      className="w-full flex items-center justify-between bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <span className={form.objectIds.length === 0 ? "text-muted-foreground" : ""}>
                        {form.objectIds.length === 0 ? "Выберите объекты..." : `Выбрано объектов: ${form.objectIds.length}`}
                      </span>
                      <Icon name={objectsOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-muted-foreground flex-shrink-0" />
                    </button>
                    {objectsOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {objects.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-muted-foreground">Список объектов пуст</div>
                        ) : objects.map(o => (
                          <label key={o.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-secondary/30 cursor-pointer border-b border-border last:border-0">
                            <input
                              type="checkbox"
                              checked={form.objectIds.includes(o.id)}
                              onChange={() => toggleObjectId(o.id)}
                              className="accent-primary w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                            />
                            <span className="text-xs text-foreground leading-snug">{o.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.objectIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.objectIds.map(id => {
                        const obj = objects.find(o => o.id === id);
                        if (!obj) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1 text-[10px] bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded px-1.5 py-0.5 max-w-[220px]">
                            <span className="truncate">{obj.name}</span>
                            <button type="button" onClick={() => toggleObjectId(id)} className="flex-shrink-0 hover:text-red-400">
                              <Icon name="X" size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
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
              <button onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={handleSave} className="text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">{editUser ? "Сохранить изменения" : "Создать"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Удаление пользователя */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Trash2" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Удалить пользователя?</p>
                <p className="text-xs text-muted-foreground mt-1">{users.find(u => u.id === deleteConfirm)?.name} — это действие нельзя отменить.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Выйти со всех устройств */}
      {logoutAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLogoutAllConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="MonitorX" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Завершить все сессии?</p>
                <p className="text-xs text-muted-foreground mt-1">{users.find(u => u.id === logoutAllConfirm)?.name} будет разлогинен на всех устройствах и потребуется войти заново.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLogoutAllConfirm(null)} disabled={loggingOutAll} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">Отмена</button>
              <button onClick={() => handleLogoutAll(logoutAllConfirm)} disabled={loggingOutAll} className="flex-1 flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                {loggingOutAll ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="MonitorX" size={14} />}
                Выйти везде
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}