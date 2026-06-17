import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AppUser, UserRole, ROLE_LABELS, ROLE_COLORS, apiCreateUser, apiUpdateUser, apiDeleteUser } from "@/lib/auth";
import { Template, TemplateColumn, DEFAULT_TEMPLATE } from "@/lib/template";
import PrescriptionDocument from "@/components/PrescriptionDocument";

// --- Типы предписаний (дублируем здесь, чтобы не создавать зависимости от Index) ---
type Status = "Черновик" | "Выдано" | "Устранено" | "Просрочено";
interface Remark { id: string; place: string; description: string; normRef: string; deadline: string; status: Status; }
interface Prescription { id: string; number: string; date: string; object: string; contractor: string; inspector: string; representative: string; responsible: string; replyEmail: string; reportDeadline: string; remarks: Remark[]; comments: unknown[]; }

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const TEMPLATES_API = PRESCRIPTIONS_API + "?type=templates";



const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "Выдано":     "text-primary bg-primary/10 border-primary/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

function isOverdue(r: Remark) {
  if (r.status === "Устранено" || !r.deadline) return false;
  const [d, m, y] = r.deadline.split(".").map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  return today > new Date(y, m - 1, d);
}
function effectiveStatus(r: Remark): Status {
  if (r.status === "Устранено") return "Устранено";
  if (isOverdue(r)) return "Просрочено";
  return r.status;
}
function overallStatus(remarks: Remark[]): Status {
  if (!remarks.length) return "Черновик";
  const ss = remarks.map(effectiveStatus);
  if (ss.some(s => s === "Просрочено")) return "Просрочено";
  if (ss.every(s => s === "Устранено")) return "Устранено";
  if (ss.some(s => s === "Выдано")) return "Выдано";
  return "Черновик";
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[status]}`}>{status}</span>;
}

// --- Admin props ---
interface AdminProps {
  currentUser: AppUser;
  users: AppUser[];
  onUsersChange: (users: AppUser[]) => void;
  onLogout: () => void;
}

const ROLE_ICONS: Record<UserRole, string> = { admin: "Crown", specialist: "ShieldCheck", contractor: "HardHat" };
const ALL_ROLES: UserRole[] = ["admin", "specialist", "contractor"];

interface UserFormData { login: string; password: string; name: string; position: string; role: UserRole; contractor: string; }
function emptyForm(): UserFormData { return { login: "", password: "", name: "", position: "", role: "specialist", contractor: "" }; }

function FormField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}
function FormInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />;
}

export default function Admin({ currentUser, users, onUsersChange, onLogout }: AdminProps) {
  const [tab, setTab] = useState<"users" | "prescriptions" | "templates">("users");

  // --- Templates state ---
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [tDeleteConfirm, setTDeleteConfirm] = useState<string | null>(null);

  // --- Users state ---
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loginManual, setLoginManual] = useState(false);
  const [passwordManual, setPasswordManual] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | null>(null);

  // --- Prescriptions state ---
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [pDeleteConfirm, setPDeleteConfirm] = useState<string | null>(null);
  const [pDeleting, setPDeleting] = useState(false);
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    if (tab === "prescriptions" && prescriptions.length === 0) {
      setPLoading(true);
      fetch(PRESCRIPTIONS_API).then(r => r.json()).then(setPrescriptions).finally(() => setPLoading(false));
    }
    if (tab === "templates" && templates.length === 0) {
      setTLoading(true);
      fetch(TEMPLATES_API).then(r => r.json()).then(data => setTemplates(Array.isArray(data) ? data : [])).finally(() => setTLoading(false));
    }
  }, [tab]);

  // --- Templates helpers ---
  const handleSaveTemplate = async (t: Template) => {
    const isNew = !templates.find(x => x.id === t.id);
    await fetch(TEMPLATES_API, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, _type: "templates" }),
    });
    if (isNew) {
      setTemplates(prev => [...prev, t]);
    } else {
      setTemplates(prev => prev.map(x => x.id === t.id ? t : x));
    }
    setEditTemplate(null);
  };

  const handleDeleteTemplate = async (id: string) => {
    await fetch(TEMPLATES_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, _type: "templates" }) });
    setTemplates(prev => prev.filter(t => t.id !== id));
    setTDeleteConfirm(null);
  };

  const createNewTemplate = () => {
    const t: Template = {
      ...DEFAULT_TEMPLATE,
      id: Date.now().toString(),
      name: "Новый шаблон",
      isDefault: false,
    };
    setEditTemplate(t);
  };

  // --- Users helpers ---
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

  const openCreate = () => { setForm(emptyForm()); setEditUser(null); setError(""); setLoginManual(false); setPasswordManual(false); setShowForm(true); };
  const openEdit = (u: AppUser) => { setForm({ login: u.login, password: u.password, name: u.name, position: u.position ?? "", role: u.role, contractor: u.contractor ?? "" }); setEditUser(u); setError(""); setShowForm(true); };

  const handleSave = async () => {
    if (!form.login.trim() || !form.password.trim() || !form.name.trim()) { setError("Заполните все обязательные поля"); return; }
    const duplicate = users.find(u => u.login === form.login.trim() && u.id !== editUser?.id);
    if (duplicate) { setError("Пользователь с таким логином уже существует"); return; }
    if (editUser) {
      const updated: AppUser = { ...editUser, login: form.login.trim(), password: form.password, name: form.name.trim(), position: form.position.trim() || undefined, role: form.role, contractor: form.role === "contractor" ? form.contractor.trim() : undefined };
      await apiUpdateUser(updated);
      onUsersChange(users.map(u => u.id === editUser.id ? updated : u));
    } else {
      const newUser: AppUser = { id: Date.now().toString(), login: form.login.trim(), password: form.password, name: form.name.trim(), position: form.position.trim() || undefined, role: form.role, contractor: form.role === "contractor" ? form.contractor.trim() : undefined };
      await apiCreateUser(newUser);
      onUsersChange([...users, newUser]);
    }
    setShowForm(false);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) return;
    await apiDeleteUser(id);
    onUsersChange(users.filter(u => u.id !== id));
    setDeleteConfirm(null);
  };

  // --- Prescriptions helpers ---
  const filteredPrescriptions = prescriptions.filter(p => {
    if (!pSearch) return true;
    const q = pSearch.toLowerCase();
    return p.number.toLowerCase().includes(q) || p.object.toLowerCase().includes(q) || p.contractor.toLowerCase().includes(q);
  });

  const handleDeletePrescription = async (id: string) => {
    setPDeleting(true);
    await fetch(PRESCRIPTIONS_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    setPDeleteConfirm(null);
    setPDeleting(false);
  };

  const handleSavePrescription = async (p: Prescription) => {
    await fetch(PRESCRIPTIONS_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    setPrescriptions(prev => prev.map(x => x.id === p.id ? p : x));
    setEditPrescription(null);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
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
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors">
            <Icon name="LogOut" size={13} />
            Выйти
          </button>
        </div>
      </header>

      {/* Табы */}
      <div className="border-b border-border bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 pt-2">
          {([
            { key: "users", label: "Управление пользователями", icon: "Users" },
            { key: "prescriptions", label: "Управление предписаниями", icon: "ClipboardList" },
            { key: "templates", label: "Управление шаблонами", icon: "FileText" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ===== РАЗДЕЛ: ПОЛЬЗОВАТЕЛИ ===== */}
        {tab === "users" && (
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

            <div className="grid grid-cols-3 gap-3">
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
          </>
        )}

        {/* ===== РАЗДЕЛ: ПРЕДПИСАНИЯ ===== */}
        {tab === "prescriptions" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold">Управление предписаниями</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {pLoading ? "Загрузка..." : `Всего: ${prescriptions.length}`}
                </p>
              </div>
              <div className="relative max-w-xs w-full">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={pSearch}
                  onChange={e => setPSearch(e.target.value)}
                  placeholder="Поиск по номеру, объекту..."
                  className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {pLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Загрузка предписаний...</p>
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Icon name="ClipboardList" size={40} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Предписания не найдены</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Номер / Дата</th>
                        <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Объект</th>
                        <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Подрядчик</th>
                        <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Замечания</th>
                        <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPrescriptions.map(p => {
                        const status = overallStatus(p.remarks);
                        const overdueCount = p.remarks.filter(r => effectiveStatus(r) === "Просрочено").length;
                        return (
                          <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</p>
                              <p className="text-[11px] text-muted-foreground">{p.date}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-sm text-foreground">{p.object}</p>
                              {p.inspector && <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{p.inspector}</p>}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-foreground">{p.contractor}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-foreground">{p.remarks.length}</span>
                                {overdueCount > 0 && <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded font-medium">{overdueCount} просрочено</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3.5"><StatusBadge status={status} /></td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => setEditPrescription(p)} className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary" title="Редактировать">
                                  <Icon name="Pencil" size={13} />
                                </button>
                                <button onClick={() => setPDeleteConfirm(p.id)} className="text-xs text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10" title="Удалить">
                                  <Icon name="Trash2" size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== РАЗДЕЛ: ШАБЛОНЫ ===== */}
        {tab === "templates" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Управление шаблонами</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Конструктор бланков актов-предписаний</p>
              </div>
              <button onClick={createNewTemplate} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Icon name="Plus" size={15} />
                Создать шаблон
              </button>
            </div>

            {tLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Загрузка шаблонов...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map(t => (
                  <div key={t.id} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <Icon name="FileText" size={15} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                          {t.isDefault && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">По умолчанию</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditTemplate(t)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Редактировать">
                          <Icon name="Pencil" size={13} />
                        </button>
                        {!t.isDefault && (
                          <button onClick={() => setTDeleteConfirm(t.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Удалить">
                            <Icon name="Trash2" size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
                      <p><span className="text-foreground/60">Шрифт:</span> {t.fontFamily}, {t.fontSize}pt</p>
                      <p><span className="text-foreground/60">Поля:</span> {t.marginTop}/{t.marginRight}/{t.marginBottom}/{t.marginLeft} мм</p>
                      <p><span className="text-foreground/60">Колонки таблицы:</span> {t.tableColumns.filter(c => c.enabled).length} из {t.tableColumns.length}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ===== МОДАЛКА: Удаление шаблона ===== */}
      {tDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Trash2" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Удалить шаблон?</p>
                <p className="text-xs text-muted-foreground mt-1">{templates.find(t => t.id === tDeleteConfirm)?.name} — действие нельзя отменить.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTDeleteConfirm(null)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={() => handleDeleteTemplate(tDeleteConfirm)} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛКА: Конструктор шаблона ===== */}
      {editTemplate && (
        <TemplateEditor
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSave={handleSaveTemplate}
        />
      )}

      {/* ===== МОДАЛКА: Форма пользователя ===== */}
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

      {/* ===== МОДАЛКА: Удаление пользователя ===== */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {users.find(u => u.id === deleteConfirm)?.name} — это действие нельзя отменить.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛКА: Удаление предписания ===== */}
      {pDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Trash2" size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Удалить предписание?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {prescriptions.find(p => p.id === pDeleteConfirm)?.number} — все замечания и комментарии будут удалены безвозвратно.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPDeleteConfirm(null)} className="flex-1 text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
              <button onClick={() => handleDeletePrescription(pDeleteConfirm)} disabled={pDeleting} className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                {pDeleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛКА: Редактирование предписания ===== */}
      {editPrescription && (
        <PrescriptionEditModal
          prescription={editPrescription}
          onClose={() => setEditPrescription(null)}
          onSave={handleSavePrescription}
        />
      )}
    </div>
  );
}

// --- Модалка редактирования предписания ---
function PrescriptionEditModal({ prescription: initial, onClose, onSave }: {
  prescription: Prescription;
  onClose: () => void;
  onSave: (p: Prescription) => Promise<void>;
}) {
  const [p, setP] = useState<Prescription>({ ...initial, remarks: initial.remarks.map(r => ({ ...r })) });
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof Omit<Prescription, "remarks" | "comments">, val: string) =>
    setP(prev => ({ ...prev, [key]: val }));

  const setRemark = (i: number, key: keyof Remark, val: string) =>
    setP(prev => ({ ...prev, remarks: prev.remarks.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(p);
    setSaving(false);
  };

  const inp = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const lbl = "text-xs font-medium text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Редактирование предписания {p.number}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Основные поля */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Основные сведения</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Объект</label><input value={p.object} onChange={e => setField("object", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>Подрядчик</label><input value={p.contractor} onChange={e => setField("contractor", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Проверку провёл</label><input value={p.inspector} onChange={e => setField("inspector", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>В присутствии</label><input value={p.representative} onChange={e => setField("representative", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={lbl}>Email для ответа</label><input value={p.replyEmail} onChange={e => setField("replyEmail", e.target.value)} className={inp} /></div>
              <div className="space-y-1.5"><label className={lbl}>Срок отчёта</label><input value={p.reportDeadline} onChange={e => setField("reportDeadline", e.target.value)} className={inp} placeholder="дд.мм.гггг" /></div>
            </div>
          </div>

          {/* Замечания */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Замечания ({p.remarks.length})</p>
            {p.remarks.map((r, i) => (
              <div key={r.id} className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10">
                <p className="text-xs font-semibold text-primary">Замечание #{i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className={lbl}>Место нарушения</label><input value={r.place} onChange={e => setRemark(i, "place", e.target.value)} className={inp} /></div>
                  <div className="space-y-1.5"><label className={lbl}>Срок устранения</label><input value={r.deadline} onChange={e => setRemark(i, "deadline", e.target.value)} className={inp} placeholder="дд.мм.гггг" /></div>
                </div>
                <div className="space-y-1.5"><label className={lbl}>Описание нарушения</label><textarea value={r.description} onChange={e => setRemark(i, "description", e.target.value)} className={inp + " resize-none"} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className={lbl}>НПА/ЛНА</label><input value={r.normRef} onChange={e => setRemark(i, "normRef", e.target.value)} className={inp} /></div>
                  <div className="space-y-1.5">
                    <label className={lbl}>Статус</label>
                    <select value={r.status} onChange={e => setRemark(i, "status", e.target.value)} className={inp}>
                      {(["Черновик","Выдано","Устранено","Просрочено"] as Status[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Размеры бумаги в мм
const PAPER_SIZES = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
};

// --- Конструктор шаблона (WYSIWYG) ---
function TemplateEditor({ template: initial, onClose, onSave }: {
  template: Template;
  onClose: () => void;
  onSave: (t: Template) => Promise<void>;
}) {
  const [t, setT] = useState<Template>({
    paperSize: "A4", orientation: "portrait",
    ...initial,
    tableColumns: initial.tableColumns.map(c => ({ ...c })),
  });
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<"page" | "table">("page");

  const set = <K extends keyof Template>(key: K, val: Template[K]) => setT(prev => ({ ...prev, [key]: val }));
  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const lbl = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1";

  const handleSave = async () => { setSaving(true); await onSave(t); setSaving(false); };

  const toggleColumn = (key: string) =>
    set("tableColumns", t.tableColumns.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c));
  const setColumnWidth = (key: string, width: string) =>
    set("tableColumns", t.tableColumns.map(c => c.key === key ? { ...c, width: width ? Number(width) : null } : c));

  // px per mm at 96dpi
  const px = (mm: number) => Math.round(mm * 96 / 25.4);
  const paperW = t.orientation === "portrait" ? PAPER_SIZES[t.paperSize].w : PAPER_SIZES[t.paperSize].h;
  const paperH = t.orientation === "portrait" ? PAPER_SIZES[t.paperSize].h : PAPER_SIZES[t.paperSize].w;
  const pageWpx = px(paperW);
  const pageHpx = px(paperH);

  // Масштаб чтобы лист влезал в правую область
  const CANVAS_W = typeof window !== "undefined" ? Math.max(window.innerWidth - 290, 500) : 800;
  const scale = Math.min(1, (CANVAS_W - 64) / pageWpx);

  const sampleData = {
    id: "sample",
    number: "МАН-2026-01", date: "16.06.2026",
    object: "Цех сборки №3", contractor: "ООО «СтройПодряд»",
    inspector: "Алексеев Сергей Николаевич", representative: "Козлов А.В.",
    responsible: "Алексеев С.Н.", replyEmail: "ot@sbd.ru", reportDeadline: "30.06.2026",
    remarks: [
      { id: "1", place: "Выход №2", description: "Захламление прохода посторонними предметами", normRef: "ППР п.24", deadline: "20.06.2026", status: "Выдано" },
    ],
  };

  const PANELS = [
    { key: "page",  label: "Страница", icon: "SlidersHorizontal" },
    { key: "table", label: "Колонки",  icon: "Table" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1b1e]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Топ-бар */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#25262b] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <Icon name="ArrowLeft" size={16} />
          </button>
          <Icon name="FileText" size={14} className="text-primary" />
          <input
            value={t.name}
            onChange={e => set("name", e.target.value)}
            className="text-sm font-semibold bg-transparent border-none outline-none text-white w-56 placeholder:text-white/30"
            placeholder="Название шаблона"
          />
          {t.isDefault && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium">По умолчанию</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 flex items-center gap-1.5">
            <Icon name="MousePointerClick" size={11} />
            Кликайте на синие поля чтобы редактировать
          </span>
          <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
            <input type="checkbox" checked={t.isDefault} onChange={e => set("isDefault", e.target.checked)} className="rounded" />
            По умолчанию
          </label>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Левая панель — только настройки страницы */}
        <div className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col bg-[#25262b]">
          <div className="flex border-b border-white/10 px-2 pt-2">
            {PANELS.map(p => (
              <button key={p.key} onClick={() => setActivePanel(p.key as typeof activePanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${activePanel === p.key ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/70"}`}>
                <Icon name={p.icon} size={11} />
                {p.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {activePanel === "page" && (<>
              <div>
                <label className={lbl + " text-white/40"}>Размер бумаги</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["A4","A3"] as const).map(s => (
                    <button key={s} onClick={() => set("paperSize", s)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${t.paperSize === s ? "bg-primary/20 border-primary text-primary" : "border-white/10 text-white/40 hover:text-white"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Ориентация</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["portrait","Книжная",18,24],["landscape","Альбомная",24,18]] as const).map(([val,label,w,h]) => (
                    <button key={val} onClick={() => set("orientation", val)}
                      className={`py-2.5 rounded-lg border text-[11px] font-medium flex flex-col items-center gap-1.5 transition-colors ${t.orientation === val ? "bg-primary/20 border-primary text-primary" : "border-white/10 text-white/40 hover:text-white"}`}>
                      <div className={`border-2 rounded-sm ${t.orientation === val ? "border-primary" : "border-white/20"}`} style={{width:w,height:h}} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Шрифт</label>
                <select value={t.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inp + " bg-white/5 border-white/10 text-white"}>
                  {["Times New Roman","Arial","Calibri","Georgia"].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Размер (pt)</label>
                <input type="number" min={8} max={16} value={t.fontSize} onChange={e => set("fontSize", Number(e.target.value))} className={inp + " bg-white/5 border-white/10 text-white"} />
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Поля (мм)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["marginTop","marginRight","marginBottom","marginLeft"] as const).map((k,i) => (
                    <div key={k}>
                      <div className="text-[10px] text-white/30 mb-0.5">{["Верх","Право","Низ","Лево"][i]}</div>
                      <input type="number" min={5} max={40} value={t[k]} onChange={e => set(k, Number(e.target.value))} className={inp + " bg-white/5 border-white/10 text-white"} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl + " text-white/40"}>Организация</label>
                <input value={t.companyName} onChange={e => set("companyName", e.target.value)} className={inp + " bg-white/5 border-white/10 text-white"} placeholder="СБД" />
              </div>
            </>)}

            {activePanel === "table" && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/30">Включайте/выключайте колонки. Ширина в px, пусто = авто.</p>
                {t.tableColumns.map(col => (
                  <div key={col.key} className={`border rounded-lg p-3 space-y-1.5 ${col.enabled ? "border-white/10" : "border-white/5 opacity-40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-white/40 uppercase">{col.key}</span>
                      <button onClick={() => toggleColumn(col.key)} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${col.enabled ? "bg-primary/20 border-primary/40 text-primary" : "border-white/10 text-white/30"}`}>
                        {col.enabled ? "вкл" : "выкл"}
                      </button>
                    </div>
                    <div className="text-[10px] text-white/50">Ширина (px)</div>
                    <input type="number" value={col.width ?? ""} onChange={e => setColumnWidth(col.key, e.target.value)} disabled={!col.enabled} placeholder="авто" className={inp + " bg-white/5 border-white/10 text-white"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Холст — лист документа */}
        <div className="flex-1 overflow-auto flex flex-col items-center py-8 gap-3" style={{ background: "#2c2d32" }}>
          <div className="text-[11px] text-white/30 flex items-center gap-4">
            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              {t.paperSize} · {t.orientation === "portrait" ? "Книжная" : "Альбомная"} · {paperW}×{paperH} мм
            </span>
            <span>масштаб {Math.round(scale * 100)}%</span>
          </div>

          {/* Лист */}
          <div style={{ width: pageWpx * scale, height: pageHpx * scale, position: "relative", flexShrink: 0 }}>
            <div style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: pageWpx,
              height: pageHpx,
              background: "#fff",
              boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}>
              <PrescriptionDocument
                template={t}
                prescription={sampleData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}