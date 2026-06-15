import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";

// --- Типы ---
type Status = "Черновик" | "Выдано" | "Устранено" | "Просрочено";

interface Remark {
  id: string;
  description: string;
  normRef: string;
  deadline: string; // срок устранения
  status: Status;
}

interface Prescription {
  id: string;
  number: string;
  date: string;
  object: string;
  contractor: string;
  responsible: string;
  reportDeadline: string; // единый срок предоставления отчёта
  remarks: Remark[];
  comments: Comment[];
}

interface Comment {
  id: number;
  author: string;
  role: string;
  text: string;
  time: string;
}

// --- Вспомогательные ---
const STATUS_STYLE: Record<Status, string> = {
  "Черновик":   "text-muted-foreground bg-muted border-border",
  "Выдано":     "text-primary bg-primary/10 border-primary/20",
  "Устранено":  "text-green-400 bg-green-400/10 border-green-400/20",
  "Просрочено": "text-red-400 bg-red-400/10 border-red-400/20",
};

const ALL_STATUSES: Status[] = ["Черновик", "Выдано", "Устранено", "Просрочено"];

function overallStatus(remarks: Remark[]): Status {
  if (!remarks.length) return "Черновик";
  if (remarks.some(r => r.status === "Просрочено")) return "Просрочено";
  if (remarks.every(r => r.status === "Устранено")) return "Устранено";
  if (remarks.some(r => r.status === "Выдано")) return "Выдано";
  return "Черновик";
}

function newRemark(): Remark {
  return { id: Date.now().toString() + Math.random(), description: "", normRef: "", deadline: "", status: "Выдано" };
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
    reportDeadline: "12.06.2024",
    remarks: [
      { id: "r1", description: "Захламление эвакуационного выхода посторонними предметами", normRef: "ППР РФ п. 24", deadline: "14.06.2024", status: "Просрочено" },
      { id: "r2", description: "Отсутствует план эвакуации на видном месте", normRef: "ГОСТ 12.1.004-91", deadline: "20.06.2024", status: "Выдано" },
    ],
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
    reportDeadline: "18.06.2024",
    remarks: [
      { id: "r3", description: "Отсутствует принудительная вытяжка в помещении склада", normRef: "СП 60.13330.2020 п. 8.2", deadline: "20.06.2024", status: "Выдано" },
    ],
    comments: [],
  },
  {
    id: "3",
    number: "П-2024-086",
    date: "01.06.2024",
    object: "Линия сборки",
    contractor: "ООО «МонтажГрупп»",
    responsible: "Иванов Д.К.",
    reportDeadline: "09.06.2024",
    remarks: [
      { id: "r4", description: "Отсутствует ограждение опасной зоны около конвейера №2", normRef: "ГОСТ 12.2.062-81 п. 4.1", deadline: "10.06.2024", status: "Устранено" },
    ],
    comments: [
      { id: 1, author: "Иванов Д.К.", role: "Подрядчик", text: "Ограждение установлено, прикладываю фото.", time: "09.06.2024 14:30" },
      { id: 2, author: "Алексеев С.Н.", role: "Специалист ОТ", text: "Устранение подтверждено. Предписание закрыто.", time: "10.06.2024 09:00" },
    ],
  },
];

// --- UI-компоненты ---
function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {status}
    </span>
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

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 ${props.className ?? ""}`}
    />
  );
}

function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none ${props.className ?? ""}`}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 ${props.className ?? ""}`}
    />
  );
}

// Формат хранения дат в данных: "dd.MM.yyyy"
function DatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрытие по клику снаружи
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Парсим "dd.MM.yyyy" → Date для Calendar
  const selected: Date | undefined = (() => {
    if (!value) return undefined;
    const d = parse(value, "dd.MM.yyyy", new Date());
    return isValid(d) ? d : undefined;
  })();

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "dd.MM.yyyy"));
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-foreground/30 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || (placeholder ?? "Выбрать дату")}
        </span>
        <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl animate-fade-in">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ru}
            initialFocus
          />
        </div>
      )}
    </div>
  );
}

// --- Форма добавления / редактирования ---
interface FormState {
  object: string;
  contractor: string;
  responsible: string;
  reportDeadline: string;
  remarks: Remark[];
}

function RemarkRow({
  remark,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  remark: Remark;
  index: number;
  onChange: (r: Remark) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const set = (key: keyof Remark, val: string) => onChange({ ...remark, [key]: val });

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/20 relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Замечание #{index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>

      <Field label="Описание нарушения *">
        <TextareaBase
          value={remark.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Опишите выявленное нарушение"
          rows={2}
        />
      </Field>

      <Field label="Ссылка на нормативный документ">
        <InputBase
          value={remark.normRef}
          onChange={e => set("normRef", e.target.value)}
          placeholder="Например: ППР РФ п. 24"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Срок устранения *">
          <DatePicker
            value={remark.deadline}
            onChange={v => set("deadline", v)}
            placeholder="Выбрать дату"
          />
        </Field>
        <Field label="Статус">
          <SelectBase
            value={remark.status}
            onChange={e => set("status", e.target.value as Status)}
          >
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </SelectBase>
        </Field>
      </div>
    </div>
  );
}

function AddForm({ onClose, onSave }: { onClose: () => void; onSave: (p: Prescription) => void }) {
  const [form, setForm] = useState<FormState>({
    object: "",
    contractor: "",
    responsible: "",
    reportDeadline: "",
    remarks: [newRemark()],
  });

  const setField = (key: keyof Omit<FormState, "remarks">, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const updateRemark = (index: number, r: Remark) =>
    setForm(prev => ({ ...prev, remarks: prev.remarks.map((x, i) => i === index ? r : x) }));

  const addRemark = () =>
    setForm(prev => ({ ...prev, remarks: [...prev.remarks, newRemark()] }));

  const removeRemark = (index: number) =>
    setForm(prev => ({ ...prev, remarks: prev.remarks.filter((_, i) => i !== index) }));

  const isValid =
    form.object.trim() &&
    form.contractor.trim() &&
    form.reportDeadline &&
    form.remarks.every(r => r.description.trim() && r.deadline);

  const handleSave = () => {
    if (!isValid) return;
    const now = new Date();
    const num = "П-" + now.getFullYear() + "-" + String(Math.floor(Math.random() * 900) + 100);
    onSave({
      id: Date.now().toString(),
      number: num,
      date: now.toLocaleDateString("ru-RU"),
      object: form.object,
      contractor: form.contractor,
      responsible: form.responsible,
      reportDeadline: form.reportDeadline,
      remarks: form.remarks,
      comments: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Новое предписание</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Общие сведения */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Общие сведения</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Объект *">
                <InputBase
                  value={form.object}
                  onChange={e => setField("object", e.target.value)}
                  placeholder="Например: Цех №3"
                />
              </Field>
              <Field label="Подрядчик *">
                <InputBase
                  value={form.contractor}
                  onChange={e => setField("contractor", e.target.value)}
                  placeholder="Название организации или ИП"
                />
              </Field>
            </div>
            <Field label="Ответственный от подрядчика">
              <InputBase
                value={form.responsible}
                onChange={e => setField("responsible", e.target.value)}
                placeholder="ФИО ответственного лица"
              />
            </Field>
          </div>

          {/* Замечания */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Замечания <span className="text-primary ml-1">{form.remarks.length}</span>
              </p>
            </div>

            {form.remarks.map((r, i) => (
              <RemarkRow
                key={r.id}
                remark={r}
                index={i}
                onChange={updated => updateRemark(i, updated)}
                onRemove={() => removeRemark(i)}
                canRemove={form.remarks.length > 1}
              />
            ))}

            <button
              onClick={addRemark}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Icon name="Plus" size={14} />
              Добавить замечание
            </button>
          </div>

          {/* Срок отчёта — единый */}
          <div className="border-t border-border pt-5">
            <Field label="Срок предоставления отчёта по всем замечаниям *">
              <DatePicker
                value={form.reportDeadline}
                onChange={v => setField("reportDeadline", v)}
                placeholder="Выбрать дату"
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Создать предписание
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Карточка предписания ---
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

function PrescriptionDetail({
  prescription,
  onClose,
  onUpdate,
}: {
  prescription: Prescription;
  onClose: () => void;
  onUpdate: (p: Prescription) => void;
}) {
  const [p, setP] = useState(prescription);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"remarks" | "chat">("remarks");

  const sendComment = () => {
    if (!newComment.trim()) return;
    const c: Comment = {
      id: Date.now(),
      author: "Алексеев С.Н.",
      role: "Специалист ОТ",
      text: newComment.trim(),
      time: new Date().toLocaleString("ru-RU"),
    };
    const updated = { ...p, comments: [...p.comments, c] };
    setP(updated);
    onUpdate(updated);
    setNewComment("");
  };

  const setRemarkStatus = (remarkId: string, status: Status) => {
    const remarks = p.remarks.map(r => r.id === remarkId ? { ...r, status } : r);
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const status = overallStatus(p.remarks);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Выдано {p.date} · {p.object}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 flex-shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Общая информация */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon="Building2" label="Объект" value={p.object} />
          <InfoRow icon="Users" label="Подрядчик" value={p.contractor} />
          {p.responsible && <InfoRow icon="User" label="Ответственный" value={p.responsible} />}
          {p.reportDeadline && <InfoRow icon="FileCheck" label="Срок предоставления отчёта" value={p.reportDeadline} />}
        </div>

        {/* Табы */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setActiveTab("remarks")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "remarks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="AlertCircle" size={14} />
            Замечания
            <span className="text-[11px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
              {p.remarks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="MessageSquare" size={14} />
            Переписка
            {p.comments.length > 0 && (
              <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                {p.comments.length}
              </span>
            )}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* Вкладка замечаний */}
          {activeTab === "remarks" && (
            <div className="px-6 py-4 space-y-4">
              {p.remarks.map((r, i) => (
                <div key={r.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Замечание #{i + 1}</span>
                    <StatusBadge status={r.status} />
                  </div>

                  <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg p-3">{r.description}</p>

                  {r.normRef && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon name="BookOpen" size={12} />
                      {r.normRef}
                    </div>
                  )}

                  <div className="bg-secondary/30 rounded-lg p-3 inline-flex flex-col">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Срок устранения</p>
                    <p className={`text-sm font-medium ${r.status === "Просрочено" ? "text-red-400" : "text-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {r.deadline}
                    </p>
                  </div>

                  {/* Смена статуса замечания */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">Изменить статус замечания:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => setRemarkStatus(r.id, s)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${r.status === s ? STATUS_STYLE[s] : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Вкладка чата */}
          {activeTab === "chat" && (
            <div className="px-6 py-4">
              {p.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Icon name="MessageSquare" size={32} className="text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {p.comments.map(c => (
                    <div key={c.id} className={`flex gap-3 ${c.role === "Специалист ОТ" ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {c.author[0]}
                      </div>
                      <div className={`max-w-[75%] flex flex-col ${c.role === "Специалист ОТ" ? "items-end" : "items-start"}`}>
                        <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${c.role === "Специалист ОТ" ? "bg-primary/15 text-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                          {c.text}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">{c.author} · {c.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 sticky bottom-0 bg-card pt-2">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendComment()}
                  placeholder="Написать сообщение..."
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
          )}
        </div>
      </div>
    </div>
  );
}

// --- Главный экран ---
export default function Index() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Все");
  const [search, setSearch] = useState("");

  const filtered = prescriptions.filter(p => {
    const status = overallStatus(p.remarks);
    const matchStatus = filterStatus === "Все" || status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.number.toLowerCase().includes(q) ||
      p.object.toLowerCase().includes(q) ||
      p.contractor.toLowerCase().includes(q) ||
      p.remarks.some(r => r.description.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const addPrescription = (p: Prescription) => setPrescriptions(prev => [p, ...prev]);

  const updatePrescription = (updated: Prescription) => {
    setPrescriptions(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Предписания</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Всего: {prescriptions.length} ·{" "}
              Активных: {prescriptions.filter(p => ["В работе", "Выдано"].includes(overallStatus(p.remarks))).length} ·{" "}
              Просрочено: {prescriptions.filter(p => overallStatus(p.remarks) === "Просрочено").length}
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

        {/* Фильтры */}
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

        {/* Таблица */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="ClipboardList" size={40} className="text-muted-foreground/30 mb-3" />
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
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Замечания</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Ближайший срок</th>
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(p => {
                    const status = overallStatus(p.remarks);
                    const nearestDeadline = p.remarks.map(r => r.deadline).sort()[0];
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className="hover:bg-secondary/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-primary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</span>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{p.date}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-foreground">{p.object}</td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-foreground">{p.contractor}</span>
                          {p.responsible && <div className="text-[11px] text-muted-foreground mt-0.5">{p.responsible}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.remarks.length}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.remarks.length === 1 ? "замечание" : p.remarks.length < 5 ? "замечания" : "замечаний"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.remarks[0]?.description}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-sm ${status === "Просрочено" ? "text-red-400 font-medium" : "text-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {nearestDeadline}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-4">
                          <Icon name="ChevronRight" size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

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