import { useState, useEffect, useCallback } from "react";
import { AppUser, UserRole } from "@/lib/auth";
import { VisibilitySettings, defaultVisibilitySettings, TabKey, BlockKey } from "@/lib/visibilityTypes";

const VISIBILITY_API = "https://functions.poehali.dev/9ab7051f-2cf9-4c03-8021-f7782287534c";

async function fetchResolved(role: string, userId?: string | null): Promise<VisibilitySettings> {
  const params = new URLSearchParams({ resolve: "1", role });
  if (userId) params.set("user_id", userId);
  const res = await fetch(`${VISIBILITY_API}?${params}`);
  const data = await res.json();
  return data?.settings ?? defaultVisibilitySettings();
}

async function fetchScoped(scopeType: "role" | "user", scopeKey: string): Promise<VisibilitySettings | null> {
  const params = new URLSearchParams({ scope_type: scopeType, scope_key: scopeKey });
  const res = await fetch(`${VISIBILITY_API}?${params}`);
  const data = await res.json();
  return data?.settings ?? null;
}

async function saveScoped(scopeType: "role" | "user", scopeKey: string, settings: VisibilitySettings, updatedBy: string) {
  await fetch(VISIBILITY_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope_type: scopeType, scope_key: scopeKey, settings, updated_by: updatedBy }),
  });
}

async function deleteScoped(scopeType: "role" | "user", scopeKey: string) {
  await fetch(VISIBILITY_API, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope_type: scopeType, scope_key: scopeKey }),
  });
}

// Итоговые настройки видимости для конкретного реального пользователя (по его роли/id, с учётом персонального переопределения)
export function useResolvedVisibility(user: AppUser) {
  const [settings, setSettings] = useState<VisibilitySettings>(defaultVisibilitySettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchResolved(user.role, user.id)
      .then(s => { if (!cancelled) setSettings(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.role, user.id]);

  return { settings, loading };
}

// Если передан override (админ-предпросмотр) — используем его, иначе резолвим настройки самого пользователя
export function useEffectiveVisibility(user: AppUser, override?: VisibilitySettings | null) {
  const resolved = useResolvedVisibility(user);
  if (override) return { settings: override, loading: false };
  return resolved;
}

// Редактор настроек для панели администратора: выбор роли/пользователя + чтение и сохранение тумблеров
export function useAdminVisibilityEditor() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<VisibilitySettings | null>(null);
  const [hasUserOverride, setHasUserOverride] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!role) { setSettings(null); setHasUserOverride(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (userId) {
        const direct = await fetchScoped("user", userId);
        if (cancelled) return;
        if (direct) {
          setSettings(direct);
          setHasUserOverride(true);
        } else {
          const fallback = await fetchResolved(role);
          if (!cancelled) { setSettings(fallback); setHasUserOverride(false); }
        }
      } else {
        const s = await fetchResolved(role);
        if (!cancelled) { setSettings(s); setHasUserOverride(false); }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role, userId]);

  const selectRole = useCallback((r: UserRole | null) => {
    setRole(r);
    setUserId(null);
  }, []);

  const toggle = useCallback(async (group: "tabs" | "blocks", key: TabKey | BlockKey, value: boolean, updatedBy: string) => {
    if (!settings || !role) return;
    const next: VisibilitySettings = {
      ...settings,
      [group]: { ...settings[group], [key]: value },
    };
    setSettings(next);
    const scopeType = userId ? "user" : "role";
    const scopeKey = userId ?? role;
    await saveScoped(scopeType, scopeKey, next, updatedBy);
    if (userId) setHasUserOverride(true);
  }, [settings, role, userId]);

  const resetUserOverride = useCallback(async () => {
    if (!userId || !role) return;
    await deleteScoped("user", userId);
    const fallback = await fetchResolved(role);
    setSettings(fallback);
    setHasUserOverride(false);
  }, [userId, role]);

  return {
    role, setRole: selectRole,
    userId, setUserId,
    settings, hasUserOverride, loading,
    toggle, resetUserOverride,
  };
}
