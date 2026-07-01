import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import { UsersTab } from "@/components/admin/UsersTab";
import { PrescriptionsTab } from "@/components/admin/PrescriptionsTab";
import { TemplatesTab } from "@/components/admin/TemplatesTab";
import { DataTab } from "@/components/admin/DataTab";
import { InspectionsTab } from "@/components/admin/InspectionsTab";

const TEMPLATES_API = "https://functions.poehali.dev/41ec60df-3f38-4561-ba9d-ca17ebd71553";

interface AdminProps {
  currentUser: AppUser;
  users: AppUser[];
  onUsersChange: (users: AppUser[]) => void;
  onLogout: () => void;
}

export default function Admin({ currentUser, users, onUsersChange, onLogout }: AdminProps) {
  const [tab, setTab] = useState<"users" | "prescriptions" | "inspections" | "templates" | "data">("users");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [tDeleteConfirm, setTDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "templates" && templates.length === 0) {
      setTLoading(true);
      fetch(TEMPLATES_API).then(r => r.json()).then(data => setTemplates(Array.isArray(data) ? data : [])).finally(() => setTLoading(false));
    }
  }, [tab]);

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
    const t: Template = { ...DEFAULT_TEMPLATE, id: Date.now().toString(), name: "Новый шаблон", isDefault: false };
    setEditTemplate(t);
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
            { key: "inspections", label: "Управление проверками", icon: "TableProperties" },
            { key: "templates", label: "Управление шаблонами", icon: "FileText" },
            { key: "data", label: "Управление данными", icon: "Database" },
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
        {tab === "users" && (
          <UsersTab currentUser={currentUser} users={users} onUsersChange={onUsersChange} />
        )}
        {tab === "prescriptions" && (
          <PrescriptionsTab />
        )}
        {tab === "templates" && (
          <TemplatesTab
            templates={templates}
            tLoading={tLoading}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
            onCreate={createNewTemplate}
            editTemplate={editTemplate}
            setEditTemplate={setEditTemplate}
            tDeleteConfirm={tDeleteConfirm}
            setTDeleteConfirm={setTDeleteConfirm}
          />
        )}
        {tab === "inspections" && <InspectionsTab />}
        {tab === "data" && <DataTab />}
      </main>
    </div>
  );
}