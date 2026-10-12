import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";

const BACKUPS_API = "https://functions.poehali.dev/e195ce29-77fe-460f-be3d-4cc99b9b8f86";

const SECTION_LABELS: Record<string, string> = {
  prescriptions: "Предписания",
  inspections: "Проверки",
  headcount: "Человекочасы",
  fines: "Штрафы",
  suspensions: "Приостановки",
  incidents: "Происшествия",
};

const TABLE_LABELS: Record<string, string> = {
  prescriptions: "Предписания",
  remarks: "Пункты предписаний",
  remark_history: "История пунктов",
  inspections: "Проверки",
  headcount_entries: "Человекочасы",
  fines: "Штрафы",
  suspensions: "Приостановки",
  incidents: "Происшествия",
};

interface Backup {
  id: number;
  created_at: string;
  created_by_name: string;
  sections: string[];
  counts: Record<string, number>;
  size_bytes: number;
}

type BackupData = {
  sections: string[];
  data: Record<string, Record<string, Record<string, unknown>[]>>;
};

const formatSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(b / 1024))} КБ`);
const formatDate = (iso: string) => new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
const fileStamp = (iso: string) => iso.slice(0, 19).split("-").join("").split(":").join("").split("T").join("_");

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function flatten(rows: Record<string, unknown>[]) {
  return rows.map(r =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === "object" ? JSON.stringify(v) : v]))
  );
}

export function BackupsTab({ currentUserId }: { currentUserId: string }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(Object.keys(SECTION_LABELS));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [restoreFor, setRestoreFor] = useState<Backup | null>(null);

  const headers = { "Content-Type": "application/json", "X-User-Id": currentUserId };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(BACKUPS_API, { headers });
      const data = await res.json();
      setBackups(data.backups ?? []);
    } catch {
      setMessage({ type: "error", text: "Не удалось загрузить список бэкапов" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (key: string) =>
    setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  const create = async () => {
    setBusy("create");
    setMessage(null);
    try {
      const res = await fetch(BACKUPS_API, { method: "POST", headers, body: JSON.stringify({ action: "create", sections: selected }) });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setBackups(data.backups ?? []);
      setMessage({ type: "ok", text: "Бэкап создан" });
    } catch {
      setMessage({ type: "error", text: "Не удалось создать бэкап" });
    } finally {
      setBusy(null);
    }
  };

  const fetchBackup = async (id: number): Promise<BackupData> => {
    const res = await fetch(`${BACKUPS_API}?id=${id}`, { headers });
    if (!res.ok) throw new Error();
    return res.json();
  };

  const downloadJson = async (b: Backup) => {
    setBusy(`json-${b.id}`);
    try {
      const data = await fetchBackup(b.id);
      download(new Blob([JSON.stringify(data)], { type: "application/json" }), `backup_${fileStamp(b.created_at)}.json`);
    } catch {
      setMessage({ type: "error", text: "Не удалось скачать бэкап" });
    } finally {
      setBusy(null);
    }
  };

  const downloadExcel = async (b: Backup) => {
    setBusy(`xlsx-${b.id}`);
    try {
      const data = await fetchBackup(b.id);
      const wb = XLSX.utils.book_new();
      for (const sec of data.sections) {
        for (const [table, rows] of Object.entries(data.data[sec] ?? {})) {
          const ws = XLSX.utils.json_to_sheet(flatten(rows));
          XLSX.utils.book_append_sheet(wb, ws, (TABLE_LABELS[table] ?? table).slice(0, 31));
        }
      }
      XLSX.writeFile(wb, `backup_${fileStamp(b.created_at)}.xlsx`);
    } catch {
      setMessage({ type: "error", text: "Не удалось скачать бэкап" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (b: Backup) => {
    if (!window.confirm(`Удалить бэкап от ${formatDate(b.created_at)}?`)) return;
    setBusy(`del-${b.id}`);
    try {
      const res = await fetch(`${BACKUPS_API}?id=${b.id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error();
      setBackups(prev => prev.filter(x => x.id !== b.id));
    } catch {
      setMessage({ type: "error", text: "Не удалось удалить бэкап" });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (b: Backup, sections: string[]) => {
    setBusy(`restore-${b.id}`);
    setMessage(null);
    try {
      const res = await fetch(BACKUPS_API, { method: "POST", headers, body: JSON.stringify({ action: "restore", id: b.id, sections }) });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const total = Object.values(data.added as Record<string, number>).reduce((a, n) => a + n, 0);
      setMessage({ type: "ok", text: total > 0 ? `Восстановлено записей: ${total}` : "Все записи из бэкапа уже есть в системе, добавлять нечего" });
      setRestoreFor(null);
    } catch {
      setMessage({ type: "error", text: "Не удалось восстановить данные" });
    } finally {
      setBusy(null);
    }
  };

  const btn = "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50";

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Бэкапы</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Резервные копии данных. Хранятся последние 30, более старые удаляются автоматически. Фото в копию не входят.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Что сохранить</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected.includes(key) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={create}
          disabled={busy !== null || selected.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Icon name={busy === "create" ? "Loader" : "DatabaseBackup"} size={15} className={busy === "create" ? "animate-spin" : ""} />
          Создать бэкап
        </button>
        {message && (
          <p className={`text-sm ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>{message.text}</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Icon name="Loader" size={24} className="text-primary animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Бэкапов пока нет</p>
        ) : (
          <div className="divide-y divide-border">
            {backups.map(b => (
              <div key={b.id} className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(b.created_at)}
                    <span className="text-xs text-muted-foreground font-normal ml-2">{b.created_by_name} · {formatSize(b.size_bytes)}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.sections.map(s => (
                      <span key={s} className="text-[11px] text-muted-foreground bg-secondary/50 border border-border rounded px-1.5 py-0.5">
                        {SECTION_LABELS[s] ?? s}: {b.counts?.[s] ?? 0}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btn} disabled={busy !== null} onClick={() => downloadJson(b)}>
                    <Icon name={busy === `json-${b.id}` ? "Loader" : "FileJson"} size={13} />
                    JSON
                  </button>
                  <button className={btn} disabled={busy !== null} onClick={() => downloadExcel(b)}>
                    <Icon name={busy === `xlsx-${b.id}` ? "Loader" : "FileSpreadsheet"} size={13} />
                    Excel
                  </button>
                  <button className={btn} disabled={busy !== null} onClick={() => setRestoreFor(b)}>
                    <Icon name="History" size={13} />
                    Восстановить
                  </button>
                  <button className={`${btn} hover:text-red-400`} disabled={busy !== null} onClick={() => remove(b)}>
                    <Icon name="Trash2" size={13} />
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {restoreFor && (
        <RestoreDialog
          backup={restoreFor}
          busy={busy === `restore-${restoreFor.id}`}
          onClose={() => setRestoreFor(null)}
          onConfirm={sections => restore(restoreFor, sections)}
        />
      )}
    </>
  );
}

function RestoreDialog({ backup, busy, onClose, onConfirm }: {
  backup: Backup;
  busy: boolean;
  onClose: () => void;
  onConfirm: (sections: string[]) => void;
}) {
  const [sections, setSections] = useState<string[]>(backup.sections);
  const toggle = (k: string) => setSections(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-base font-semibold text-foreground">Восстановление из бэкапа</p>
          <p className="text-xs text-muted-foreground mt-1">
            Бэкап от {formatDate(backup.created_at)}. В систему вернутся только отсутствующие записи. Существующие и новые записи не изменятся.
          </p>
        </div>
        <div className="space-y-2">
          {backup.sections.map(s => (
            <label key={s} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={sections.includes(s)} onChange={() => toggle(s)} />
              {SECTION_LABELS[s] ?? s}
              <span className="text-xs text-muted-foreground">({backup.counts?.[s] ?? 0})</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Отмена</button>
          <button
            onClick={() => onConfirm(sections)}
            disabled={busy || sections.length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy && <Icon name="Loader" size={14} className="animate-spin" />}
            Восстановить
          </button>
        </div>
      </div>
    </div>
  );
}
