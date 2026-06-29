import { useState, useRef, useEffect } from "react";
import { AppUser, ROLE_LABELS, ROLE_COLORS } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import ChangePasswordModal from "@/components/ChangePasswordModal";

interface Props {
  user: AppUser;
  onLogout: () => void;
  onUserUpdate?: (u: AppUser) => void;
}

export default function UserMenu({ user, onLogout, onUserUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          title={ROLE_LABELS[user.role]}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          <span className="group-hover:text-foreground transition-colors">{user.name}</span>
          <Icon name="ChevronDown" size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
            {/* Шапка карточки */}
            <div className="px-4 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${ROLE_COLORS[user.role]}`}>
                  <Icon name="User" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{user.name}</p>
                  {user.position && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.position}</p>
                  )}
                  <span className={`inline-flex items-center mt-1.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
            </div>

            {/* Действия */}
            <div className="p-2">
              <button
                onClick={() => { setOpen(false); setShowPassword(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors text-left"
              >
                <Icon name="KeyRound" size={14} />
                Сменить пароль
              </button>
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-left"
              >
                <Icon name="LogOut" size={14} />
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>

      {showPassword && (
        <ChangePasswordModal
          user={user}
          onClose={() => setShowPassword(false)}
          onSuccess={u => { onUserUpdate?.(u); setShowPassword(false); }}
        />
      )}
    </>
  );
}
