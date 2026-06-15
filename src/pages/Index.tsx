import { useState } from "react";
import Icon from "@/components/ui/icon";

// --- Типы ---
type Status = "Черновик" | "Выдано" | "В работе" | "Устранено" | "Просрочено";

interface Prescription {
  id: string;
  number: string;
  date: string;
  object: string;
  contractor: string;
  responsible: string;
  description: string;
  normRef: string;
  deadline: string;
  status: Status;
  photos: string[];
  comments: Comment[];
}

interface Comment {
  id: number;
  author: string;
  role: string;
  text: string;
  time: string;
}

// --- Начальные данные ---
const INITIAL: Prescription[] = [
  {
    id: "1",
    number: "П-2024-089",
    date: "05.06.2024",
    object: "Цех №3",
    contractor: "ООО «СтройПодряд»",
    responsible: "Козлов А.В.",
    description: "Нарушение требований пожарной безопасности: захламление эвакуационного выхода посторонними предметами",
    normRef: "ППР РФ п. 24, ГОСТ 12.1.004-91",
    deadline: "14.06.2024",
    status: "Просрочено",
    photos: [],
    comments: [
      { id: 1, author: "Алексеев С.Н.", role: "Специалист ОТ", text: "Выдано предписание. Прошу устранить в указанный срок.", time: "05.06.2024 10:00" },
      { id: 2, author: "Козлов А.В.", role: "Подрядчик", text: "Принято, начинаем работы.", time: "06.06.2024 09:15" },
    ],
  },
  {
    id: "2",
    number: "П-2024-088",
    date: "07.06.2024",
    object: "Склад А",
    contractor: "ИП Морозов В.П.",
    responsible: "Морозов В.П.",
    description: "Неисправность вентиляционной системы в помещении склада: отсутствует принудительная вытяжка",
    normRef: "СП 60.13330.2020 п. 8.2",
    deadline: "20.06.2024",
    status: "В работе",
    photos: [],
    comments: [],
  },
  {
    id: "3",
    number: "П-2024-087",
    date: "09.06.2024",
    object: "Участок сварки",
    contractor: "ООО «СтройПодряд»",
    responsible: "Петрова М.С.",
    description: "Работники выполняют сварочные работы без СИЗ органов дыхания (респираторов)",
    normRef: "Приказ Минтруда №772н, п. 14",
    deadline: "30.06.2024",
    status: "Выдано",
    photos: [],
    comments: [],
  },
  {
    id: "4",
    number: "П-2024-086",
    date: "01.06.2024",
    object: "Линия сборки",
    contractor: "ООО «МонтажГрупп»",
    responsible: "Иванов Д.К.",
    description: "Отсутствует ограждение опасной зоны около конвейера №2",
    normRef: "ГОСТ 12.2.062-81 п. 4.1",
    deadline: "10.06.2024",
    status: "Устранено",
    photos: [],
    comments: [
      { id: 1, author: "Иванов Д.К.", role: "Подрядчик", text: "Ограждение установлено, прикладываю фото.", time: "09.06.2024 14:30" },
      { id: 2, author: "Алексеев С.Н.", role: "Специалист ОТ", text: "Устранение подтверждено. Предписание закрыто.", time: "10.06.2024 09:00" },
    ],
  },
];

const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "Выдано":     "text-primary bg-primary/10 border-primary/20",
  "В работе":   "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

const ALL_STATUSES: Status[] = ["Черновик", "Выдано", "В работе", "Устранено", "Просрочено"];

// --- Бейдж статуса ---
function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

// --- Форма добавления предписания ---
interface AddFormProps {
  onClose: () => void;
  onSave: (p: Prescription) => void;
}

function AddForm({ onClose, onSave }: AddFormProps) {
  const [form, setForm] = useState({
    object: "",
    contractor: "",
    responsible: "",
    description: "",
    normRef: "",
    deadline: "",
    status: "Выдано" as Status,
  });

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.object || !form.contractor || !form.description || !form.deadline) return;
    const now = new Date();
    const date = now.toLocaleDateString("ru-RU");
    const num = "П-" + now.getFullYear() + "-" + String(Math.floor(Math.random() * 900) + 100);
    onSave({
      id: Date.now().toString(),
      number: num,
      date,
      object: form.object,
      contractor: form.contractor,
      responsible: form.responsible,
      description: form.description,
      normRef: form.normRef,
      deadline: form.deadline,
      status: form.status,
      photos: [],
      comments: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold">Новое предписание</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Объект *">
            <input
              value={form.object}
              onChange={e => set("object", e.target.value)}
              placeholder="Например: Цех №3"
              className="input-base"
            />
          </Field>

          <Field label="Подрядчик *">
            <input
              value={form.contractor}
              onChange={e => set("contractor", e.target.value)}
              placeholder="Название организации или ИП"
              className="input-base"
            />
          </Field>

          <Field label="Ответственный от подрядчика">
            <input
              value={form.responsible}
              onChange={e => set("responsible", e.target.value)}
              placeholder="ФИО ответственного лица"
              className="input-base"
            />
          </Field>

          <Field label="Описание нарушения *">
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Опишите выявленное нарушение"
              rows={3}
              className="input-base resize-none"
            />
          </Field>

          <Field label="Ссылка на нормативный документ">
            <input
              value={form.normRef}
              onChange={e => set("normRef", e.target.value)}
              placeholder="Например: ППР РФ п. 24"
              className="input-base"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Срок устранения *">
              <input
                type="date"
                value={form.deadline}
                onChange={e => set("deadline", e.target.value)}
                className="input-base"
              />
            </Field>

            <Field label="Статус">
              <select
                value={form.status}
                onChange={e => set("status", e.target.value as Status)}
                className="input-base"
              >
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!form.object || !form.contractor || !form.description || !form.deadline}
            className="text-sm px-5 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Создать предписание
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

// --- Детальная карточка предписания ---
interface DetailProps {
  prescription: Prescription;
  onClose: () => void;
  onUpdate: (p: Prescription) => void;
}

function PrescriptionDetail({ prescription, onClose, onUpdate }: DetailProps) {
  const [p, setP] = useState(prescription);
  const [newComment, setNewComment] = useState("");

  const sendComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now(),
      author: "Алексеев С.Н.",
      role: "Специалист ОТ",
      text: newComment.trim(),
      time: new Date().toLocaleString("ru-RU"),
    };
    const updated = { ...p, comments: [...p.comments, comment] };
    setP(updated);
    onUpdate(updated);
    setNewComment("");
  };

  const setStatus = (status: Status) => {
    const updated = { ...p, status };
    setP(updated);
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-semibold">{p.number}</span>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Выдано {p.date} · {p.object}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 flex-shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Основная информация */}
          <div className="px-6 py-5 space-y-4 border-b border-border">
            <InfoRow icon="Building2" label="Объект" value={p.object} />
            <InfoRow icon="Users" label="Подрядчик" value={p.contractor} />
            {p.responsible && <InfoRow icon="User" label="Ответственный" value={p.responsible} />}
            <InfoRow icon="Calendar" label="Срок устранения" value={p.deadline} highlight={p.status === "Просрочено"} />
            {p.normRef && <InfoRow icon="BookOpen" label="Нормативный документ" value={p.normRef} />}

            <div className="pt-1">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Описание нарушения</p>
              <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg p-3">{p.description}</p>
            </div>
          </div>

          {/* Смена статуса */}
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium mb-2.5">Изменить статус</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${p.status === s ? STATUS_STYLE[s] + " opacity-100" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Чат / комментарии */}
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground font-medium mb-3">Переписка по предписанию</p>
            {p.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Комментариев пока нет</p>
            ) : (
              <div className="space-y-3 mb-4">
                {p.comments.map(c => (
                  <div key={c.id} className={`flex gap-3 ${c.role === "Специалист ОТ" ? "flex-row-reverse" : ""}`}>
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {c.author[0]}
                    </div>
                    <div className={`max-w-[75%] ${c.role === "Специалист ОТ" ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${c.role === "Специалист ОТ" ? "bg-primary/15 text-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                        {c.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">{c.author} · {c.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendComment()}
                placeholder="Написать комментарий..."
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={sendComment}
                disabled={!newComment.trim()}
                className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Icon name="Send" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className={`text-sm ${highlight ? "text-red-400 font-medium" : "text-foreground"}`}>{value}</span>
      </div>
    </div>
  );
}

// --- Главный компонент ---
export default function Index() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Все");
  const [search, setSearch] = useState("");

  const filtered = prescriptions.filter(p => {
    const matchStatus = filterStatus === "Все" || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || p.number.toLowerCase().includes(q) || p.object.toLowerCase().includes(q) || p.contractor.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const addPrescription = (p: Prescription) => {
    setPrescriptions(prev => [p, ...prev]);
  };

  const updatePrescription = (updated: Prescription) => {
    setPrescriptions(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Top bar */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Shield" size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Алексеев С.Н. · Специалист ОТ
        </div>
      </header>

      {/* Page */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Предписания</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Всего: {prescriptions.length} · Активных: {prescriptions.filter(p => p.status === "В работе" || p.status === "Выдано").length} · Просрочено: {prescriptions.filter(p => p.status === "Просрочено").length}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium self-start sm:self-auto"
          >
            <Icon name="Plus" size={15} />
            Добавить предписание
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по номеру, объекту, подрядчику..."
              className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Все", ...ALL_STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="ClipboardList" size={40} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Предписания не найдены</p>
              {search && <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить параметры поиска</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Номер</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Объект</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Подрядчик</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Нарушение</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Срок</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="hover:bg-secondary/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-primary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{p.date}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-foreground">{p.object}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-foreground">{p.contractor}</span>
                        {p.responsible && <div className="text-[11px] text-muted-foreground mt-0.5">{p.responsible}</div>}
                      </td>
                      <td className="px-5 py-4 max-w-[240px]">
                        <p className="text-sm text-foreground line-clamp-2 leading-snug">{p.description}</p>
                        {p.normRef && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.normRef}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm ${p.status === "Просрочено" ? "text-red-400 font-medium" : "text-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {p.deadline}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-4">
                        <Icon name="ChevronRight" size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Модалки */}
      {showAdd && <AddForm onClose={() => setShowAdd(false)} onSave={addPrescription} />}
      {selected && (
        <PrescriptionDetail
          prescription={selected}
          onClose={() => setSelected(null)}
          onUpdate={updatePrescription}
        />
      )}
    </div>
  );
}
