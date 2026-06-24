import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";

interface PlaceEntry { id: number; name: string; }
interface ObjectEntry { id: number; name: string; sort_order: number; places: PlaceEntry[]; }

function ObjectsEditor({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ObjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [newPlaceMap, setNewPlaceMap] = useState<Record<number, string>>({});
  const [addingPlace, setAddingPlace] = useState<number | null>(null);
  const [editPlaceId, setEditPlaceId] = useState<number | null>(null);
  const [editPlaceName, setEditPlaceName] = useState("");

  const inp = "bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

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

  const handleAddPlace = async (objectId: number) => {
    const name = (newPlaceMap[objectId] || "").trim();
    if (!name) return;
    setAddingPlace(objectId);
    await fetch(OBJECTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_place", object_id: objectId, name }),
    });
    setNewPlaceMap(prev => ({ ...prev, [objectId]: "" }));
    setAddingPlace(null);
    load();
  };

  const handleEditPlace = async () => {
    if (!editPlaceId || !editPlaceName.trim()) return;
    await fetch(OBJECTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit_place", place_id: editPlaceId, name: editPlaceName.trim() }),
    });
    setEditPlaceId(null);
    setEditPlaceName("");
    load();
  };

  const handleRemovePlace = async (placeId: number) => {
    await fetch(OBJECTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_place", place_id: placeId }),
    });
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
          <p className="text-xs text-muted-foreground">Изменения отображаются в форме добавления предписания. К каждому объекту можно добавить места нарушений.</p>

          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Название объекта..."
              className={inp + " flex-1"}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">

                  {editId === item.id ? (
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditId(null); }}
                        className={inp + " flex-1"}
                      />
                      <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors whitespace-nowrap">
                        {saving ? "..." : "Сохранить"}
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs px-2 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                    </div>
                  ) : deleteConfirm === item.id ? (
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                      <span className="flex-1 text-sm text-red-400">Удалить «{item.name}» и все его места?</span>
                      <button onClick={() => handleDelete(item.id)} className="text-xs px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Да, удалить</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 group border-b border-border">
                      <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}.</span>
                      <p className="flex-1 text-sm font-semibold truncate">{item.name}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditId(item.id); setEditName(item.name); setDeleteConfirm(null); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Переименовать">
                          <Icon name="Pencil" size={13} />
                        </button>
                        <button onClick={() => { setDeleteConfirm(item.id); setEditId(null); }} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Удалить">
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-2 space-y-1">
                    {item.places.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 py-1">Места нарушений не добавлены</p>
                    ) : (
                      item.places.map(p => (
                        <div key={p.id} className="flex items-center gap-2 group/place py-0.5">
                          <Icon name="MapPin" size={11} className="text-muted-foreground flex-shrink-0" />
                          {editPlaceId === p.id ? (
                            <>
                              <input
                                autoFocus
                                value={editPlaceName}
                                onChange={e => setEditPlaceName(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleEditPlace(); if (e.key === "Escape") setEditPlaceId(null); }}
                                className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                              <button onClick={handleEditPlace} className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap">Сохранить</button>
                              <button onClick={() => setEditPlaceId(null)} className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">✕</button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-foreground flex-1">{p.name}</span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/place:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditPlaceId(p.id); setEditPlaceName(p.name); }}
                                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                                  title="Редактировать"
                                >
                                  <Icon name="Pencil" size={11} />
                                </button>
                                <button
                                  onClick={() => handleRemovePlace(p.id)}
                                  className="p-0.5 rounded text-muted-foreground hover:text-red-400 transition-colors"
                                  title="Удалить место"
                                >
                                  <Icon name="X" size={11} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 pb-3 flex gap-2">
                    <input
                      value={newPlaceMap[item.id] || ""}
                      onChange={e => setNewPlaceMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handleAddPlace(item.id)}
                      placeholder="Добавить место нарушения..."
                      className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => handleAddPlace(item.id)}
                      disabled={addingPlace === item.id || !(newPlaceMap[item.id] || "").trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {addingPlace === item.id ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Plus" size={11} />}
                      Добавить
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ObjectsEditor;
