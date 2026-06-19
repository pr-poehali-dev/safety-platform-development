import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export function DataTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch(API)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setNewName("");
    setAdding(false);
    load();
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || editId === null) return;
    setSaving(true);
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, name: editName.trim() }),
    });
    setSaving(false);
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(API, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleteConfirm(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="List" size={16} className="text-primary" />
          <h2 className="text-base font-semibold">Выпадающий список «Вид нарушения»</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Изменения сразу отображаются в форме добавления предписания у специалистов ОТ.
        </p>

        {/* Добавить новую категорию */}
        <div className="flex gap-2 mb-6">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Новый вид нарушения..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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

        {/* Список категорий */}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Список пуст</div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3 bg-background border border-border rounded-lg group"
              >
                <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}.</span>

                {editId === cat.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditId(null); }}
                      className="flex-1 bg-background border border-primary/50 rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editName.trim()}
                      className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                    >
                      {saving ? "..." : "Сохранить"}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Отмена
                    </button>
                  </>
                ) : deleteConfirm === cat.id ? (
                  <>
                    <span className="flex-1 text-sm text-red-400">Удалить «{cat.name}»?</span>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-xs px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Да, удалить
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Редактировать"
                      >
                        <Icon name="Pencil" size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cat.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Удалить"
                      >
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
  );
}
