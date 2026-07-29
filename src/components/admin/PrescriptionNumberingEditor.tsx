import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69?type=numbering";

interface NumberingSettings {
  prefix: string;
  start_number: number;
  next_number: number;
  auto_reset_yearly: boolean;
}

function PrescriptionNumberingEditor({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<NumberingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [prefix, setPrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [autoReset, setAutoReset] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(API)
      .then(r => r.json())
      .then((data: NumberingSettings) => {
        setSettings(data);
        setPrefix(data.prefix ?? "");
        setStartNumber(data.start_number ?? 1);
        setAutoReset(!!data.auto_reset_yearly);
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
      body: JSON.stringify({ prefix, start_number: Math.max(1, startNumber || 1), auto_reset_yearly: autoReset }),
    });
    setSaving(false);
    setSaved(true);
    load();
    setTimeout(() => setSaved(false), 2000);
  };

  const previewNumber = `${prefix}${settings?.next_number ?? startNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <Icon name="ArrowLeft" size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="Hash" size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold">Настройки нумерации Предписаний</span>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          Закрыть
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
          <p className="text-xs text-muted-foreground">
            Настройки применяются к новым предписаниям. Уже созданные номера не изменятся.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Префикс номера</label>
                <input
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                  placeholder="Например: МАН-"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">Будет добавлен перед номером. Оставьте пустым, если префикс не нужен</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Стартовый номер / текущий счётчик</label>
                <input
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={e => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">С этого числа начнётся отсчёт при сохранении настроек</p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none bg-card border border-border rounded-lg px-3 py-3">
                <input
                  type="checkbox"
                  checked={autoReset}
                  onChange={e => setAutoReset(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary mt-0.5"
                />
                <div>
                  <span className="text-sm text-foreground block">Автосброс счётчика каждый год</span>
                  <span className="text-[10px] text-muted-foreground">Нумерация начнётся заново со стартового номера с 1 января</span>
                </div>
              </label>

              <div className="bg-secondary/30 border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                <Icon name="Eye" size={13} className="text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">Следующий номер предписания:</span>
                <span className="text-sm font-semibold text-primary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {previewNumber}
                </span>
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

export default PrescriptionNumberingEditor;
