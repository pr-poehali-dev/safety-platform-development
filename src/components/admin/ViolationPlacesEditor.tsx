import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const PLACES_API = "https://functions.poehali.dev/6720e1ec-5646-4a64-8183-95ba73c130bd";

function ViolationPlacesEditor({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<{ id: number; name: string; sort_order: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch(PLACES_API)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    await fetch(PLACES_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setNewName("");
    setAdding(false);
    load();
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || editId === null) return;
    setSaving(true);
    await fetch(PLACES_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, name: editName.trim() }) });
    setSaving(false);
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(PLACES_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleteConfirm(null);
    load();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <Icon name="ArrowLeft" size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="MapPin" size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold">Место нарушения</span>
          <span className="text-xs text-muted-foreground">· Выпадающий список</span>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          Закрыть
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <p className="text-xs text-muted-foreground">Изменения сразу отображаются в форме добавления предписания.</p>

          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Новое место нарушения..."
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
              Добавить
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Список пуст</div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg group">
                  <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}.</span>
                  {editId === item.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditId(null); }}
                        className="flex-1 bg-background border border-primary/50 rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                        {saving ? "..." : "Сохранить"}
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                    </>
                  ) : deleteConfirm === item.id ? (
                    <>
                      <span className="flex-1 text-sm text-red-400">Удалить «{item.name}»?</span>
                      <button onClick={() => handleDelete(item.id)} className="text-xs px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Да, удалить</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{item.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditId(item.id); setEditName(item.name); setDeleteConfirm(null); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Редактировать">
                          <Icon name="Pencil" size={13} />
                        </button>
                        <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Удалить">
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViolationPlacesEditor;
