import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DAYS = 14;

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isStandalone) return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysPassed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysPassed < DISMISS_DAYS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-card border border-border rounded-xl shadow-lg px-4 py-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
        <Icon name="Download" size={16} className="text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Установить приложение</p>
        <p className="text-xs text-muted-foreground">Быстрый доступ с главного экрана</p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground p-1.5 flex-shrink-0"
        aria-label="Закрыть"
      >
        <Icon name="X" size={14} />
      </button>
      <button
        onClick={handleInstall}
        className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
      >
        Установить
      </button>
    </div>
  );
}
