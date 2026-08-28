import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { HeadcountSettings } from "@/lib/headcountTypes";

interface Props {
  year: number;
  settings: HeadcountSettings;
  editable: boolean;
  saving: boolean;
  onSave: (poLabel: string, poRate: number, sbdRate: number) => Promise<void>;
}

const clampRate = (n: number) => Math.min(12, Math.max(1, n));

export default function HeadcountSettingsBar({ year, settings, editable, saving, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [poLabel, setPoLabel] = useState(settings.po_label);
  const [poRate, setPoRate] = useState(String(settings.po_rate));
  const [sbdRate, setSbdRate] = useState(String(settings.sbd_rate));

  useEffect(() => {
    if (!editing) {
      setPoLabel(settings.po_label);
      setPoRate(String(settings.po_rate));
      setSbdRate(String(settings.sbd_rate));
    }
  }, [settings, editing]);

  const startEdit = () => {
    setPoLabel(settings.po_label);
    setPoRate(String(settings.po_rate));
    setSbdRate(String(settings.sbd_rate));
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const commit = async () => {
    const label = poLabel.trim() || "ПО";
    const po = clampRate(Number(poRate) || settings.po_rate);
    const sbd = clampRate(Number(sbdRate) || settings.sbd_rate);
    await onSave(label, po, sbd);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground mt-0.5">
          Учёт ежедневной численности персонала за {year} год · {settings.po_label} × {settings.po_rate}ч + СБД × {settings.sbd_rate}ч
        </p>
        {editable && (
          <button
            onClick={startEdit}
            className="text-muted-foreground hover:text-primary transition-colors mt-0.5"
            title="Редактировать"
          >
            <Icon name="Pencil" size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-0.5">
      <span className="text-sm text-muted-foreground">Учёт ежедневной численности персонала за {year} год ·</span>
      <input
        value={poLabel}
        onChange={e => setPoLabel(e.target.value)}
        maxLength={20}
        className="w-20 bg-background border border-border rounded-md px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      <span className="text-sm text-muted-foreground">×</span>
      <input
        type="number"
        min={1}
        max={12}
        value={poRate}
        onChange={e => setPoRate(e.target.value)}
        className="w-14 bg-background border border-border rounded-md px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      <span className="text-sm text-muted-foreground">ч + СБД ×</span>
      <input
        type="number"
        min={1}
        max={12}
        value={sbdRate}
        onChange={e => setSbdRate(e.target.value)}
        className="w-14 bg-background border border-border rounded-md px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      <span className="text-sm text-muted-foreground">ч</span>
      <button onClick={commit} disabled={saving} className="p-1 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
        <Icon name="Check" size={14} />
      </button>
      <button onClick={cancel} className="p-1 rounded text-muted-foreground hover:bg-secondary transition-colors">
        <Icon name="X" size={14} />
      </button>
    </div>
  );
}
