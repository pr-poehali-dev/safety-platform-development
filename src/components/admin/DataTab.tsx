import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";

interface Category {
  id: number;
  name: string;
  sort_order: number;
  is_spb: boolean;
}

// --- Редактор списка (открывается поверх, как TemplateEditor) ---
function ListEditor({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSpb, setNewSpb] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpb, setEditSpb] = useState(false);
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
      body: JSON.stringify({ name, is_spb: newSpb }),
    });
    setNewName("");
    setNewSpb(false);
    setAdding(false);
    load();
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditSpb(cat.is_spb);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || editId === null) return;
    setSaving(true);
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, name: editName.trim(), is_spb: editSpb }),
    });
    setSaving(false);
    setEditId(null);
    load();
  };

  const handleToggleSpb = async (cat: Category) => {
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, name: cat.name, is_spb: !cat.is_spb }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleteConfirm(null);
    load();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Топ-бар */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <Icon name="ArrowLeft" size={16} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="List" size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold">Вид нарушения</span>
          <span className="text-xs text-muted-foreground">· Выпадающий список</span>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          Закрыть
        </button>
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <p className="text-xs text-muted-foreground">
            Изменения сразу отображаются в форме добавления предписания у специалистов ОТ.
          </p>

          {/* Добавить новую категорию */}
          <div className="flex gap-2 items-center">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Новый вид нарушения..."
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 select-none" title="Стратегический приоритет безопасности">
              <input
                type="checkbox"
                checked={newSpb}
                onChange={e => setNewSpb(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <span className="text-xs font-semibold text-muted-foreground">СПБ</span>
            </label>
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
              Добавить
            </button>
          </div>

          {/* Легенда */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-semibold text-[10px]">СПБ</span>
            <span>— стратегический приоритет безопасности</span>
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
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg group">
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
                      <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 select-none" title="Стратегический приоритет безопасности">
                        <input
                          type="checkbox"
                          checked={editSpb}
                          onChange={e => setEditSpb(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary"
                        />
                        <span className="text-xs font-semibold text-muted-foreground">СПБ</span>
                      </label>
                      <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                        {saving ? "..." : "Сохранить"}
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">
                        Отмена
                      </button>
                    </>
                  ) : deleteConfirm === cat.id ? (
                    <>
                      <span className="flex-1 text-sm text-red-400">Удалить «{cat.name}»?</span>
                      <button onClick={() => handleDelete(cat.id)} className="text-xs px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Да, удалить</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{cat.name}</span>
                      {/* Чек-бокс СПБ — всегда виден */}
                      <label
                        className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 select-none"
                        title="Стратегический приоритет безопасности"
                        onClick={e => { e.stopPropagation(); handleToggleSpb(cat); }}
                      >
                        <input
                          type="checkbox"
                          checked={cat.is_spb}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 accent-primary pointer-events-none"
                        />
                        <span className={`text-xs font-semibold ${cat.is_spb ? "text-primary" : "text-muted-foreground"}`}>СПБ</span>
                      </label>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(cat)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Редактировать">
                          <Icon name="Pencil" size={13} />
                        </button>
                        <button onClick={() => setDeleteConfirm(cat.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Удалить">
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

// --- Простой редактор для объектов (без СПБ) ---
function ObjectsEditor({ onClose }: { onClose: () => void }) {
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
    fetch(OBJECTS_API)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    await fetch(OBJECTS_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setNewName("");
    setAdding(false);
    load();
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || editId === null) return;
    setSaving(true);
    await fetch(OBJECTS_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, name: editName.trim() }) });
    setSaving(false);
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(OBJECTS_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
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
            <Icon name="Building2" size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold">Объект</span>
          <span className="text-xs text-muted-foreground">· Выпадающий список</span>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          Закрыть
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <p className="text-xs text-muted-foreground">Изменения сразу отображаются в форме добавления проверки.</p>

          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Новый объект..."
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

// --- Вкладка Управление данными ---
export function DataTab() {
  const [openEditor, setOpenEditor] = useState(false);
  const [openObjects, setOpenObjects] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Управление данными</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Редактирование справочников и выпадающих списков</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setOpenEditor(true)}
          className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors text-left w-full"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="List" size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Вид нарушения</p>
                <p className="text-[10px] text-muted-foreground">Выпадающий список</p>
              </div>
            </div>
            <div className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Icon name="Pencil" size={13} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <p>Используется в форме добавления предписания у специалистов ОТ</p>
          </div>
        </button>

        <button
          onClick={() => setOpenObjects(true)}
          className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors text-left w-full"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Building2" size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Объект</p>
                <p className="text-[10px] text-muted-foreground">Выпадающий список</p>
              </div>
            </div>
            <div className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Icon name="Pencil" size={13} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <p>Используется в форме добавления проверки у специалистов ОТ</p>
          </div>
        </button>
      </div>

      {openEditor && <ListEditor onClose={() => setOpenEditor(false)} />}
      {openObjects && <ObjectsEditor onClose={() => setOpenObjects(false)} />}
    </>
  );
}