import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";

const API = "https://functions.poehali.dev/618f0e3d-5e12-4e77-9fc8-d29306fcc7a6";

interface ProxySettings {
  mode: "proxmint" | "paid";
  paid_proxy_url: string;
  paid_proxy_login: string;
  paid_proxy_password: string;
}

function ProxySettingsEditor({ onClose, currentAdminLogin }: { onClose: () => void; currentAdminLogin: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [mode, setMode] = useState<"proxmint" | "paid">("proxmint");
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyLogin, setProxyLogin] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");

  const load = () => {
    setLoading(true);
    fetch(API)
      .then(r => r.json())
      .then((data: ProxySettings) => {
        setMode(data.mode === "paid" ? "paid" : "proxmint");
        setProxyUrl(data.paid_proxy_url ?? "");
        setProxyLogin(data.paid_proxy_login ?? "");
        setProxyPassword(data.paid_proxy_password ?? "");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        paid_proxy_url: proxyUrl.trim(),
        paid_proxy_login: proxyLogin.trim(),
        paid_proxy_password: proxyPassword.trim(),
        updated_by: currentAdminLogin,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <Icon name="ArrowLeft" size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="Network" size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold">Прокси для ИИ-помощника</span>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          Закрыть
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
          <p className="text-xs text-muted-foreground">
            Google Gemini недоступен из региона размещения серверов проекта. Запросы ИИ-помощника идут через прокси.
            По умолчанию используется бесплатный список Proxmint (обновляется автоматически). При оформлении платной
            подписки на прокси включите переключатель и укажите свои данные — приоритет отдаётся платному прокси.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-lg px-4 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground font-medium">Использовать платный прокси</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {mode === "paid" ? "Включено — используются данные ниже" : "Выключено — используется бесплатный Proxmint"}
                  </p>
                </div>
                <Switch
                  checked={mode === "paid"}
                  onCheckedChange={v => setMode(v ? "paid" : "proxmint")}
                />
              </div>

              <div className={`space-y-4 transition-opacity ${mode === "paid" ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">Адрес прокси-сервера</label>
                  <input
                    value={proxyUrl}
                    onChange={e => setProxyUrl(e.target.value)}
                    placeholder="Например: http://1.2.3.4:8080"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <p className="text-[10px] text-muted-foreground">Полный адрес с протоколом (http:// или socks5://) и портом</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground block">Логин (если есть)</label>
                    <input
                      value={proxyLogin}
                      onChange={e => setProxyLogin(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground block">Пароль (если есть)</label>
                    <input
                      type="password"
                      value={proxyPassword}
                      onChange={e => setProxyPassword(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                  Сохранить
                </button>
                {saved && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <Icon name="CheckCircle2" size={13} />
                    Сохранено
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProxySettingsEditor;
