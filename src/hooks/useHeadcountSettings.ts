import { useState, useEffect, useCallback } from "react";
import { HeadcountSettings, DEFAULT_PO_LABEL, DEFAULT_PO_RATE, DEFAULT_SBD_RATE } from "@/lib/headcountTypes";

const SETTINGS_URL = "https://functions.poehali.dev/a35a7916-2f1f-489a-9f1d-158bfade8b39";

export function useHeadcountSettings() {
  const [settings, setSettings] = useState<HeadcountSettings>({
    po_label: DEFAULT_PO_LABEL,
    po_rate: DEFAULT_PO_RATE,
    sbd_rate: DEFAULT_SBD_RATE,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(SETTINGS_URL);
      const data = await res.json();
      if (data && typeof data === "object") {
        setSettings({
          po_label: data.po_label ?? DEFAULT_PO_LABEL,
          po_rate: Number(data.po_rate) || DEFAULT_PO_RATE,
          sbd_rate: Number(data.sbd_rate) || DEFAULT_SBD_RATE,
        });
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (po_label: string, po_rate: number, sbd_rate: number, updated_by: string) => {
    await fetch(SETTINGS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ po_label, po_rate, sbd_rate, updated_by }),
    });
    await load();
  };

  return { settings, loading, saveSettings };
}
