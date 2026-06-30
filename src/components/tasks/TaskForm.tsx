import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import { TaskAssignment, NewTaskAssignee } from "@/lib/taskTypes";
import Icon from "@/components/ui/icon";

interface TaskFormProps {
  user: AppUser;
  onClose: () => void;
  onSave: (description: string, assignees: NewTaskAssignee[]) => Promise<void>;
  editing?: TaskAssignment | null;
  onUpdate?: (task_id: number, description: string, assignees: NewTaskAssignee[]) => Promise<void>;
  availableUsers: { login: string; name: string; role: string }[];
}

const ALLOWED_ROLES: Record<string, string[]> = {
  manager: ["specialist", "contractor"],
  specialist: ["contractor"],
  admin: ["specialist", "contractor", "manager"],
};

export default function TaskForm({ user, onClose, onSave, editing, onUpdate, availableUsers }: TaskFormProps) {
  const [description, setDescription] = useState(editing?.description ?? "");
  const [assignees, setAssignees] = useState<NewTaskAssignee[]>(
    editing ? [{ login: editing.assignee_login, name: editing.assignee_name, role: editing.assignee_role, due_date: editing.due_date, assignment_id: editing.id }] : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allowedRoles = ALLOWED_ROLES[user.role] ?? [];
  const filteredUsers = availableUsers.filter(u => allowedRoles.includes(u.role));

  const addAssignee = () => {
    setAssignees(prev => [...prev, { login: "", name: "", role: "", due_date: "" }]);
  };

  const removeAssignee = (idx: number) => {
    setAssignees(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAssignee = (idx: number, login: string) => {
    const found = filteredUsers.find(u => u.login === login);
    setAssignees(prev => prev.map((a, i) => i === idx ? { ...a, login, name: found?.name ?? "", role: found?.role ?? "" } : a));
  };

  const updateDueDate = (idx: number, due_date: string) => {
    setAssignees(prev => prev.map((a, i) => i === idx ? { ...a, due_date } : a));
  };

  const handleSave = async () => {
    if (!description.trim()) { setError("Введите описание задачи"); return; }
    if (assignees.length === 0) { setError("Добавьте хотя бы одного ответственного"); return; }
    if (assignees.some(a => !a.login || !a.due_date)) { setError("Заполните всех ответственных и укажите сроки"); return; }
    setError("");
    setSaving(true);
    try {
      if (editing && onUpdate) {
        await onUpdate(editing.task_id, description.trim(), assignees);
      } else {
        await onSave(description.trim(), assignees);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">{editing ? "Редактировать задачу" : "Новая задача"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание задачи <span className="text-red-400">*</span></label>
            <textarea
              className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              placeholder="Опишите, что необходимо сделать..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Ответственные <span className="text-red-400">*</span></label>
              <button onClick={addAssignee} className="text-xs text-primary hover:opacity-80 flex items-center gap-1 transition-opacity">
                <Icon name="Plus" size={12} /> Добавить
              </button>
            </div>

            {assignees.length === 0 && (
              <button onClick={addAssignee} className="w-full text-sm py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Icon name="UserPlus" size={14} /> Добавить ответственного
              </button>
            )}

            <div className="space-y-3">
              {assignees.map((a, idx) => (
                <div key={idx} className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ответственный {idx + 1}</span>
                    {!editing && (
                      <button onClick={() => removeAssignee(idx)} className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Icon name="X" size={13} />
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    value={a.login}
                    onChange={e => updateAssignee(idx, e.target.value)}
                    disabled={!!editing}
                  >
                    <option value="">Выбрать пользователя...</option>
                    {filteredUsers.map(u => (
                      <option key={u.login} value={u.login}>{u.name}</option>
                    ))}
                  </select>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Срок выполнения</label>
                    <input
                      type="date"
                      className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      value={a.due_date}
                      min={today}
                      onChange={e => updateDueDate(idx, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Отмена
          </button>
          <button disabled={saving} onClick={handleSave} className="flex-1 text-sm py-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity font-medium">
            {saving ? "Сохранение..." : editing ? "Сохранить" : "Создать задачу"}
          </button>
        </div>
      </div>
    </div>
  );
}
