import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AppUser, apiUpdateUser, saveSession } from "@/lib/auth";

const inp = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

interface Props {
  user: AppUser;
  onClose: () => void;
  onSuccess: (updated: AppUser) => void;
}

export default function ChangePasswordModal({ user, onClose, onSuccess }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setError("");
    if (current !== user.password) { setError("Текущий пароль введён неверно"); return; }
    if (next.length < 4) { setError("Новый пароль должен быть не менее 4 символов"); return; }
    if (next !== confirm) { setError("Пароли не совпадают"); return; }
    setSaving(true);
    const updated = { ...user, password: next };
    await apiUpdateUser(updated);
    saveSession(updated);
    onSuccess(updated);
    setDone(true);
    setSaving(false);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl animate-fade-in">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="KeyRound" size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Смена пароля</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Icon name="Check" size={22} className="text-green-400" />
            </div>
            <p className="text-sm font-medium">Пароль успешно изменён</p>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Текущий пароль</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  placeholder="Введите текущий пароль"
                  className={inp + " pr-9"}
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name={showCurrent ? "EyeOff" : "Eye"} size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Новый пароль</label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={e => setNext(e.target.value)}
                  placeholder="Минимум 4 символа"
                  className={inp + " pr-9"}
                />
                <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name={showNext ? "EyeOff" : "Eye"} size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Повторите новый пароль</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Повторите пароль"
                  className={inp + " pr-9"}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name={showConfirm ? "EyeOff" : "Eye"} size={14} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 text-sm py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving || !current || !next || !confirm} className="flex-1 text-sm py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
