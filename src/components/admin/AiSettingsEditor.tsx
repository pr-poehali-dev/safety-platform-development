import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";

const API = "https://functions.poehali.dev/8baa3992-c91f-45b7-abf8-2a4082e8c671";

type Provider = "gemini" | "yandexgpt" | "gigachat" | "deepseek" | "openai_compatible";

interface AiSettings {
  assistant_enabled: boolean;
  provider: Provider;
  api_base_url: string;
  model: string;
  api_key_masked: string;
  has_api_key: boolean;
}

const PROVIDERS: { value: Provider; label: string; hint: string; keyLabel: string; keyPlaceholder: string; needsBaseUrl: boolean; baseUrlLabel?: string; baseUrlPlaceholder?: string; modelPlaceholder: string }[] = [
  {
    value: "gemini",
    label: "Google Gemini",
    hint: "Ключ выдаётся в Google AI Studio",
    keyLabel: "API-ключ Gemini",
    keyPlaceholder: "Вставьте API-ключ Gemini",
    needsBaseUrl: false,
    modelPlaceholder: "gemini-flash-latest",
  },
  {
    value: "yandexgpt",
    label: "YandexGPT",
    hint: "Ключ в формате «ID каталога:API-ключ» из Yandex Cloud",
    keyLabel: "ID каталога : API-ключ",
    keyPlaceholder: "b1gxxxxxxxxxxxxxxxxx:AQVNxxxxxxxxxxxxxxxxxxxxxxxx",
    needsBaseUrl: false,
    modelPlaceholder: "yandexgpt-lite",
  },
  {
    value: "gigachat",
    label: "GigaChat (Сбер)",
    hint: "Authorization key из личного кабинета GigaChat API",
    keyLabel: "Authorization key",
    keyPlaceholder: "Вставьте Authorization key",
    needsBaseUrl: true,
    baseUrlLabel: "Scope",
    baseUrlPlaceholder: "GIGACHAT_API_PERS",
    modelPlaceholder: "GigaChat",
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    hint: "Ключ из платформы platform.deepseek.com",
    keyLabel: "API-ключ DeepSeek",
    keyPlaceholder: "Вставьте API-ключ DeepSeek",
    needsBaseUrl: false,
    modelPlaceholder: "deepseek-chat",
  },
  {
    value: "openai_compatible",
    label: "Другой (OpenAI-совместимый)",
    hint: "Подходит для любого сервиса с OpenAI-совместимым API (chat/completions)",
    keyLabel: "API-ключ",
    keyPlaceholder: "Вставьте API-ключ",
    needsBaseUrl: true,
    baseUrlLabel: "Базовый URL API",
    baseUrlPlaceholder: "https://api.example.com/v1",
    modelPlaceholder: "название модели",
  },
];

function AiSettingsEditor({ onClose, currentAdminLogin }: { onClose: () => void; currentAdminLogin: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [assistantEnabled, setAssistantEnabled] = useState(true);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [maskedKey, setMaskedKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  const cfg = PROVIDERS.find(p => p.value === provider) ?? PROVIDERS[0];

  const load = () => {
    setLoading(true);
    fetch(API)
      .then(r => r.json())
      .then((data: AiSettings) => {
        setAssistantEnabled(data.assistant_enabled !== false);
        setProvider(PROVIDERS.some(p => p.value === data.provider) ? data.provider : "gemini");
        setMaskedKey(data.api_key_masked ?? "");
        setHasKey(!!data.has_api_key);
        setBaseUrl(data.api_base_url ?? "");
        setModel(data.model ?? "");
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
        assistant_enabled: assistantEnabled,
        provider,
        api_key: newApiKey.trim(),
        api_base_url: baseUrl.trim(),
        model: model.trim(),
        updated_by: currentAdminLogin,
      }),
    });
    setNewApiKey("");
    setSaving(false);
    setSaved(true);
    load();
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
            <Icon name="Sparkles" size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold">Настройки ИИ-помощника</span>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          Закрыть
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-lg px-4 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground font-medium">ИИ-помощник включён</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {assistantEnabled ? "Виджет виден всем пользователям" : "Отключён — полностью скрыт у всех пользователей"}
                  </p>
                </div>
                <Switch
                  checked={assistantEnabled}
                  onCheckedChange={setAssistantEnabled}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Провайдер ИИ</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value as Provider)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">{cfg.hint}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">{cfg.keyLabel}</label>
                {hasKey && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 border border-border rounded-lg px-3 py-2">
                    <Icon name="KeyRound" size={13} />
                    Текущий ключ: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{maskedKey}</span>
                  </div>
                )}
                <input
                  value={newApiKey}
                  onChange={e => setNewApiKey(e.target.value)}
                  placeholder={hasKey ? "Вставьте новый ключ, чтобы заменить текущий" : cfg.keyPlaceholder}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                />
                <p className="text-[10px] text-muted-foreground">
                  Оставьте поле пустым, если не хотите менять текущий ключ
                </p>
              </div>

              {cfg.needsBaseUrl && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">{cfg.baseUrlLabel}</label>
                  <input
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder={cfg.baseUrlPlaceholder}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Модель (необязательно)</label>
                <input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder={cfg.modelPlaceholder}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  Если оставить пустым, используется модель по умолчанию для выбранного провайдера
                </p>
              </div>

              <div className="border-t border-border pt-5 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Чтобы сменить провайдера ИИ — выберите его в списке выше, вставьте новый ключ и сохраните.
                  Все провайдеры в списке доступны напрямую, без прокси.
                </p>
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

export default AiSettingsEditor;
