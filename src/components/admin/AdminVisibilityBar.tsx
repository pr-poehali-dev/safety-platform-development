import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { UserRole, ROLE_LABELS } from "@/lib/auth";
import { TAB_KEYS, BLOCK_KEYS, TAB_LABELS, BLOCK_LABELS, TabKey, BlockKey } from "@/lib/visibilityTypes";
import { useAdminVisibilityEditor } from "@/hooks/useVisibilitySettings";

const PREVIEW_ROLES: UserRole[] = ["specialist", "manager", "contractor", "project_team"];

interface AvailableUser {
  id: string;
  login: string;
  name: string;
  role: string;
}

interface Props {
  currentAdminLogin: string;
  availableUsers: AvailableUser[];
  editor: ReturnType<typeof useAdminVisibilityEditor>;
}

export default function AdminVisibilityBar({ currentAdminLogin, availableUsers, editor }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setPanelOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  const { role, setRole, userId, setUserId, settings, hasUserOverride, loading, toggle, resetUserOverride } = editor;

  const usersForRole = role ? availableUsers.filter(u => u.role === role) : [];

  return (
    <div className="border-b border-border bg-amber-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2.5">
        <Icon name="Eye" size={14} className="text-amber-500 flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Предпросмотр и настройка видимости:</span>

        <select
          value={role ?? ""}
          onChange={e => setRole(e.target.value ? (e.target.value as UserRole) : null)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">— выбрать роль —</option>
          {PREVIEW_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>

        {role && (
          <select
            value={userId ?? ""}
            onChange={e => setUserId(e.target.value || null)}
            className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="">Вся роль «{ROLE_LABELS[role]}»</option>
            {usersForRole.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}

        {role && (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setPanelOpen(o => !o)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${panelOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="SlidersHorizontal" size={12} />
              Настроить видимость
              <Icon name="ChevronDown" size={11} className={`transition-transform ${panelOpen ? "rotate-180" : ""}`} />
            </button>

            {panelOpen && settings && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-2xl w-80 max-h-[70vh] overflow-y-auto">
                <div className="px-4 py-3 border-b border-border sticky top-0 bg-card">
                  <p className="text-sm font-semibold text-foreground">
                    {userId ? usersForRole.find(u => u.id === userId)?.name ?? "Пользователь" : `Роль «${ROLE_LABELS[role]}»`}
                  </p>
                  {userId && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {hasUserOverride ? "Индивидуальная настройка" : "Используются настройки роли"}
                    </p>
                  )}
                </div>

                <div className="p-3 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Вкладки навигации</p>
                    <div className="space-y-2">
                      {TAB_KEYS.map((key: TabKey) => (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <span className="text-xs text-foreground">{TAB_LABELS[key]}</span>
                          <Switch
                            checked={settings.tabs[key]}
                            onCheckedChange={v => toggle("tabs", key, v, currentAdminLogin)}
                            disabled={loading}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Блоки страницы «Главная»</p>
                    <div className="space-y-2">
                      {BLOCK_KEYS.map((key: BlockKey) => (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <span className="text-xs text-foreground leading-tight">{BLOCK_LABELS[key]}</span>
                          <Switch
                            checked={settings.blocks[key]}
                            onCheckedChange={v => toggle("blocks", key, v, currentAdminLogin)}
                            disabled={loading}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {userId && hasUserOverride && (
                    <button
                      onClick={() => resetUserOverride()}
                      className="w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-1.5 transition-colors"
                    >
                      Сбросить к настройкам роли
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {role && (
          <button
            onClick={() => setRole(null)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
          >
            <Icon name="X" size={11} /> Выйти из предпросмотра
          </button>
        )}
      </div>
    </div>
  );
}
