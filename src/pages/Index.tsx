import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

type Section = "dashboard" | "incidents" | "communications" | "knowledge" | "analytics" | "prescriptions" | "inspections";

interface Notification {
  id: number;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  time: string;
}

const NAV_ITEMS: { id: Section; label: string; icon: string; badge?: number }[] = [
  { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
  { id: "incidents", label: "Инциденты", icon: "AlertTriangle", badge: 3 },
  { id: "communications", label: "Коммуникации", icon: "MessageSquare", badge: 7 },
  { id: "knowledge", label: "База знаний", icon: "BookOpen" },
  { id: "analytics", label: "Аналитика", icon: "BarChart2" },
  { id: "prescriptions", label: "Предписания", icon: "ClipboardList", badge: 2 },
  { id: "inspections", label: "Проверки", icon: "Search" },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "critical", title: "Критический инцидент", message: "Цех №3 — падение с высоты, требуется немедленное реагирование", time: "сейчас" },
  { id: 2, type: "warning", title: "Истекает срок предписания", message: "Предписание №П-2024-089 требует исполнения до 14 июня", time: "5 мин" },
  { id: 3, type: "info", title: "Новая проверка назначена", message: "Плановая проверка склада А назначена на 15 июня", time: "12 мин" },
];

const INCIDENTS = [
  { id: "ИНЦ-2024-0341", title: "Падение с высоты", location: "Цех №3", severity: "critical", status: "Открыт", date: "11.06.2024", assignee: "Козлов А.В." },
  { id: "ИНЦ-2024-0340", title: "Скользкое покрытие пола", location: "Склад Б", severity: "warning", status: "В работе", date: "10.06.2024", assignee: "Петрова М.С." },
  { id: "ИНЦ-2024-0339", title: "Неисправное оборудование", location: "Участок сварки", severity: "warning", status: "В работе", date: "09.06.2024", assignee: "Иванов Д.К." },
  { id: "ИНЦ-2024-0338", title: "Отсутствие СИЗ", location: "Линия сборки", severity: "low", status: "Закрыт", date: "08.06.2024", assignee: "Сидоров П.Н." },
  { id: "ИНЦ-2024-0337", title: "Нарушение маркировки", location: "Склад А", severity: "low", status: "Закрыт", date: "07.06.2024", assignee: "Новиков Е.Р." },
];

const PRESCRIPTIONS = [
  { id: "П-2024-089", title: "Устранение нарушений пожарной безопасности", issuer: "ГПН МЧС", deadline: "14.06.2024", status: "critical", progress: 65 },
  { id: "П-2024-088", title: "Ремонт вентиляционной системы цеха №2", issuer: "Роструд", deadline: "20.06.2024", status: "warning", progress: 30 },
  { id: "П-2024-087", title: "Обучение персонала первой помощи", issuer: "Внутренняя", deadline: "30.06.2024", status: "ok", progress: 80 },
  { id: "П-2024-086", title: "Замена устаревших СИЗ", issuer: "Роструд", deadline: "15.07.2024", status: "ok", progress: 45 },
];

const INSPECTIONS = [
  { id: "ПРВ-2024-022", title: "Плановая проверка складского комплекса", type: "Плановая", date: "15.06.2024", inspector: "Федоров К.А.", status: "Предстоит" },
  { id: "ПРВ-2024-021", title: "Внеплановая проверка цеха №3", type: "Внеплановая", date: "11.06.2024", inspector: "Морозов В.П.", status: "В процессе" },
  { id: "ПРВ-2024-020", title: "Проверка пожарной безопасности", type: "Плановая", date: "05.06.2024", inspector: "Федоров К.А.", status: "Завершена" },
  { id: "ПРВ-2024-019", title: "Аудит системы управления ОТ", type: "Аудит", date: "01.06.2024", inspector: "Волкова Н.С.", status: "Завершена" },
];

const KNOWLEDGE_ITEMS = [
  { id: 1, title: "Инструкция по охране труда при работе на высоте", category: "Инструкции", updated: "01.06.2024", views: 234 },
  { id: 2, title: "Правила использования СИЗ органов дыхания", category: "СИЗ", updated: "28.05.2024", views: 189 },
  { id: 3, title: "Порядок действий при несчастном случае", category: "Процедуры", updated: "25.05.2024", views: 312 },
  { id: 4, title: "Требования безопасности при сварочных работах", category: "Инструкции", updated: "20.05.2024", views: 156 },
  { id: 5, title: "Памятка по оказанию первой помощи", category: "Первая помощь", updated: "15.05.2024", views: 445 },
];

const MESSAGES = [
  { id: 1, from: "Козлов А.В.", avatar: "К", role: "Специалист ОТ", message: "Зафиксирован инцидент в цехе №3, направляю фотоматериалы", time: "10:32", unread: true, urgent: true },
  { id: 2, from: "Петрова М.С.", avatar: "П", role: "Инспектор", message: "Акт проверки по предписанию П-2024-088 готов к подписанию", time: "09:15", unread: true, urgent: false },
  { id: 3, from: "Морозов В.П.", avatar: "М", role: "Руководитель", message: "Согласовал план мероприятий по ОТ на июль 2024", time: "08:47", unread: false, urgent: false },
  { id: 4, from: "Иванов Д.К.", avatar: "И", role: "Мастер", message: "Заявка на ремонт оборудования подана в технический отдел", time: "вчера", unread: false, urgent: false },
];

function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const map: Record<string, { label: string; color: string }> = {
    critical: { label: "Критично", color: "text-red-400 bg-red-400/10 border-red-400/20" },
    warning: { label: "Среднее", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    low: { label: "Низкое", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    ok: { label: "В норме", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    "Открыт": { label: "Открыт", color: "text-red-400 bg-red-400/10 border-red-400/20" },
    "В работе": { label: "В работе", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    "Закрыт": { label: "Закрыт", color: "text-muted-foreground bg-muted border-border" },
    "Предстоит": { label: "Предстоит", color: "text-primary bg-primary/10 border-primary/20" },
    "В процессе": { label: "В процессе", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    "Завершена": { label: "Завершена", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  };
  const s = map[status] || { label: status, color: "text-muted-foreground bg-muted border-border" };
  return (
    <span className={`inline-flex items-center border font-medium tracking-tight ${size === "sm" ? "text-[10px] px-2 py-0.5 rounded" : "text-xs px-2.5 py-1 rounded-md"} ${s.color}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {s.label}
    </span>
  );
}

function MetricCard({ label, value, delta, icon, color }: { label: string; value: string; delta?: string; icon: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors duration-200 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
          <Icon name={icon} size={15} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-light text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
        {delta && (
          <span className={`text-xs mb-1 ${delta.startsWith("+") ? "text-red-400" : "text-green-400"}`}>{delta}</span>
        )}
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-medium text-foreground">Обзор системы</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Сегодня, 11 июня 2024 — Все объекты под контролем</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Открытых инцидентов" value="3" delta="+1" icon="AlertTriangle" color="bg-red-400/10 text-red-400" />
        <MetricCard label="Активных предписаний" value="2" icon="ClipboardList" color="bg-yellow-400/10 text-yellow-400" />
        <MetricCard label="Проверок в июне" value="4" icon="Search" color="bg-primary/10 text-primary" />
        <MetricCard label="Уровень безопасности" value="87%" delta="-2%" icon="Shield" color="bg-green-400/10 text-green-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">Последние инциденты</span>
            <button onClick={() => onNavigate("incidents")} className="text-xs text-primary hover:text-primary/80 transition-colors">Все инциденты →</button>
          </div>
          <div className="divide-y divide-border">
            {INCIDENTS.slice(0, 3).map((inc) => (
              <div key={inc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inc.severity === "critical" ? "bg-red-400 animate-pulse-dot" : inc.severity === "warning" ? "bg-yellow-400" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{inc.title}</p>
                  <p className="text-xs text-muted-foreground">{inc.location} · {inc.date}</p>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">Предписания</span>
            <button onClick={() => onNavigate("prescriptions")} className="text-xs text-primary hover:text-primary/80 transition-colors">Все →</button>
          </div>
          <div className="divide-y divide-border">
            {PRESCRIPTIONS.slice(0, 3).map((p) => (
              <div key={p.id} className="px-5 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.id}</span>
                  <span className={`text-xs ${p.status === "critical" ? "text-red-400" : p.status === "warning" ? "text-yellow-400" : "text-green-400"}`}>до {p.deadline}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed mb-2">{p.title}</p>
                <div className="w-full bg-border rounded-full h-1">
                  <div className={`h-1 rounded-full transition-all ${p.status === "critical" ? "bg-red-400" : p.status === "warning" ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">Ближайшие проверки</span>
            <button onClick={() => onNavigate("inspections")} className="text-xs text-primary hover:text-primary/80 transition-colors">Все →</button>
          </div>
          <div className="divide-y divide-border">
            {INSPECTIONS.slice(0, 3).map((insp) => (
              <div key={insp.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className="flex-1">
                  <p className="text-sm text-foreground">{insp.title}</p>
                  <p className="text-xs text-muted-foreground">{insp.date} · {insp.inspector}</p>
                </div>
                <StatusBadge status={insp.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-medium">Статистика инцидентов</span>
            <span className="text-xs text-muted-foreground">Июнь 2024</span>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Критические", count: 1, total: 5, color: "bg-red-400" },
              { label: "Средние", count: 2, total: 5, color: "bg-yellow-400" },
              { label: "Низкие", count: 2, total: 5, color: "bg-green-400" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{item.count}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${(item.count / item.total) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border flex justify-between text-xs">
              <span className="text-muted-foreground">Всего в этом месяце</span>
              <span className="text-foreground font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>5 инцидентов</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentsSection() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? INCIDENTS : INCIDENTS.filter(i => i.status === filter);
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Инциденты</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление и отслеживание нарушений безопасности</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={14} />
          Зарегистрировать
        </button>
      </div>

      <div className="flex items-center gap-2">
        {["all", "Открыт", "В работе", "Закрыт"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors font-medium ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
          >
            {f === "all" ? "Все" : f}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">ID</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Инцидент</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider hidden md:table-cell">Место</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider hidden lg:table-cell">Ответственный</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider hidden md:table-cell">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((inc, i) => (
              <tr key={inc.id} className="hover:bg-secondary/30 cursor-pointer transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                <td className="px-5 py-3.5">
                  <span className="text-xs text-primary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{inc.id}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inc.severity === "critical" ? "bg-red-400 animate-pulse-dot" : inc.severity === "warning" ? "bg-yellow-400" : "bg-muted-foreground"}`} />
                    <span className="text-sm text-foreground">{inc.title}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell text-sm text-muted-foreground">{inc.location}</td>
                <td className="px-5 py-3.5 hidden lg:table-cell text-sm text-muted-foreground">{inc.assignee}</td>
                <td className="px-5 py-3.5"><StatusBadge status={inc.status} /></td>
                <td className="px-5 py-3.5 hidden md:table-cell text-sm text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{inc.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunicationsSection() {
  const [active, setActive] = useState(1);
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-medium">Коммуникации</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Внутренние сообщения и оповещения по вопросам ОТ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[500px]">
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Сообщения</span>
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>7</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {MESSAGES.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setActive(msg.id)}
                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${active === msg.id ? "bg-secondary/50" : "hover:bg-secondary/20"}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-foreground">{msg.from}</span>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                </div>
                {msg.unread && (
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${msg.urgent ? "bg-red-400 animate-pulse-dot" : "bg-primary"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-lg flex flex-col">
          {(() => {
            const msg = MESSAGES.find(m => m.id === active);
            if (!msg) return null;
            return (
              <>
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">
                    {msg.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{msg.from}</p>
                    <p className="text-xs text-muted-foreground">{msg.role}</p>
                  </div>
                  {msg.urgent && (
                    <span className="ml-auto text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded font-medium">Срочно</span>
                  )}
                </div>
                <div className="flex-1 p-5">
                  <div className="bg-secondary/40 rounded-lg p-4 max-w-md">
                    <p className="text-sm text-foreground leading-relaxed">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{msg.time}</p>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <input
                    className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="Написать ответ..."
                  />
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Icon name="Send" size={14} />
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function KnowledgeSection() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Все");
  const categories = ["Все", "Инструкции", "СИЗ", "Процедуры", "Первая помощь"];
  const filtered = KNOWLEDGE_ITEMS.filter(k =>
    k.title.toLowerCase().includes(search.toLowerCase()) &&
    (cat === "Все" || k.category === cat)
  );
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">База знаний</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Инструкции, регламенты и обучающие материалы</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={14} />
          Добавить материал
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-md pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="Поиск по базе знаний..."
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`text-xs px-3 py-1.5 rounded-md border transition-colors font-medium ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item, i) => (
          <div key={item.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 cursor-pointer transition-colors group" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="FileText" size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground group-hover:text-primary transition-colors leading-snug">{item.title}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{item.category}</span>
                  <span className="text-xs text-muted-foreground">Обновлён {item.updated}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{item.views} просм.</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSection() {
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"];
  const values = [8, 12, 6, 9, 7, 5];
  const max = Math.max(...values);
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-medium">Аналитика и отчётность</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ключевые показатели безопасности труда</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Всего инцидентов" value="47" delta="-12%" icon="TrendingDown" color="bg-green-400/10 text-green-400" />
        <MetricCard label="Среднее время закрытия" value="3.2д" icon="Clock" color="bg-primary/10 text-primary" />
        <MetricCard label="Соблюдение предписаний" value="94%" icon="CheckCircle" color="bg-green-400/10 text-green-400" />
        <MetricCard label="Прошли обучение" value="218" icon="Users" color="bg-primary/10 text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium">Инциденты по месяцам</span>
            <span className="text-xs text-muted-foreground">2024</span>
          </div>
          <div className="flex items-end gap-2 h-36">
            {values.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
                <div className="w-full rounded-t-sm bg-primary/20 hover:bg-primary/40 transition-colors relative overflow-hidden" style={{ height: `${(v / max) * 100}%` }}>
                  <div className="absolute bottom-0 w-full bg-primary/60 rounded-t-sm" style={{ height: "60%" }} />
                </div>
                <span className="text-xs text-muted-foreground">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium">Виды нарушений</span>
            <span className="text-xs text-muted-foreground">Топ-5</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Нарушение правил работы на высоте", pct: 32 },
              { label: "Отсутствие / неправильное использование СИЗ", pct: 27 },
              { label: "Неисправное оборудование", pct: 18 },
              { label: "Нарушение пожарной безопасности", pct: 13 },
              { label: "Прочие нарушения", pct: 10 },
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate pr-2">{item.label}</span>
                  <span className="text-foreground flex-shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{item.pct}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Сводный отчёт за период</span>
          <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
            <Icon name="Download" size={12} />
            Скачать PDF
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Несчастных случаев", value: "0", note: "без травм" },
            { label: "Микротравм", value: "3", note: "мелкие травмы" },
            { label: "Нарушений устранено", value: "44", note: "из 47" },
            { label: "Коэффициент LTIFR", value: "0.0", note: "на 1M ч/ч" },
          ].map((item, i) => (
            <div key={i} className="text-center py-3 border-r border-border last:border-r-0">
              <div className="text-2xl font-light text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
              <div className="text-xs text-primary mt-0.5">{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrescriptionsSection() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Работа с предписаниями</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Контроль исполнения предписаний надзорных органов</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={14} />
          Добавить предписание
        </button>
      </div>

      <div className="space-y-3">
        {PRESCRIPTIONS.map((p, i) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors cursor-pointer" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-xs text-primary font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.id}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{p.issuer}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${p.status === "critical" ? "text-red-400 bg-red-400/10 border-red-400/20" : p.status === "warning" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" : "text-green-400 bg-green-400/10 border-green-400/20"}`}>
                    до {p.deadline}
                  </span>
                </div>
                <p className="text-sm text-foreground">{p.title}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-light text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.progress}%</div>
                <div className="text-xs text-muted-foreground">исполнено</div>
              </div>
            </div>
            <div className="mt-4 w-full bg-border rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-1000 ${p.status === "critical" ? "bg-red-400" : p.status === "warning" ? "bg-yellow-400" : "bg-green-400"}`}
                style={{ width: `${p.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionsSection() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Управление проверками</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Плановые и внеплановые проверки объектов</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium">
          <Icon name="Plus" size={14} />
          Назначить проверку
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Запланировано", count: 2, icon: "Calendar", color: "text-primary bg-primary/10" },
          { label: "В процессе", count: 1, icon: "Loader", color: "text-yellow-400 bg-yellow-400/10" },
          { label: "Завершено в июне", count: 2, icon: "CheckCircle", color: "text-green-400 bg-green-400/10" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
              <Icon name={s.icon} size={18} />
            </div>
            <div>
              <div className="text-2xl font-light text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <span className="text-sm font-medium">Список проверок</span>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Icon name="Filter" size={12} />
            Фильтр
          </button>
        </div>
        <div className="divide-y divide-border">
          {INSPECTIONS.map((insp, i) => (
            <div key={insp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                  <Icon name="ClipboardCheck" size={15} className="text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{insp.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insp.type} · {insp.inspector}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <StatusBadge status={insp.status} size="md" />
                <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{insp.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [section, setSection] = useState<Section>("dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => [...prev, MOCK_NOTIFICATIONS[0]]);
      setToasts([MOCK_NOTIFICATIONS[0]]);
      setTimeout(() => setToasts([]), 5000);
    }, 2000);
    const timer2 = setTimeout(() => {
      setNotifications(prev => [...prev, MOCK_NOTIFICATIONS[1]]);
      setToasts([MOCK_NOTIFICATIONS[1]]);
      setTimeout(() => setToasts([]), 5000);
    }, 8000);
    return () => { clearTimeout(timer); clearTimeout(timer2); };
  }, []);

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <Dashboard onNavigate={setSection} />;
      case "incidents": return <IncidentsSection />;
      case "communications": return <CommunicationsSection />;
      case "knowledge": return <KnowledgeSection />;
      case "analytics": return <AnalyticsSection />;
      case "prescriptions": return <PrescriptionsSection />;
      case "inspections": return <InspectionsSection />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-sidebar flex flex-col border-r border-sidebar-border transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Icon name="Shield" size={14} className="text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground tracking-tight">SafeWork</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Охрана труда</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${section === item.id ? "bg-primary/15 text-primary font-medium" : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"}`}
            >
              <Icon name={item.icon} size={15} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${section === item.id ? "bg-primary text-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">А</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">Алексеев С.Н.</div>
              <div className="text-[10px] text-muted-foreground">Специалист ОТ</div>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Settings" size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Icon name="Menu" size={18} />
          </button>
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
            Система активна
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="Bell" size={15} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse-dot" />
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-lg shadow-xl z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-medium">Уведомления</span>
                    <button onClick={() => setNotifications([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Очистить</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Нет новых уведомлений</div>
                  ) : (
                    <div className="divide-y divide-border max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="flex gap-3 px-4 py-3.5">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.type === "critical" ? "bg-red-400 animate-pulse-dot" : n.type === "warning" ? "bg-yellow-400" : "bg-primary"}`} />
                          <div>
                            <p className="text-xs font-medium text-foreground">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {renderSection()}
        </main>
      </div>

      {/* Real-time toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((n) => (
          <div key={n.id} className={`notification-enter flex items-start gap-3 p-4 rounded-lg border shadow-xl max-w-sm pointer-events-auto ${n.type === "critical" ? "bg-red-950/95 border-red-400/40 text-red-100" : n.type === "warning" ? "bg-yellow-950/95 border-yellow-400/40 text-yellow-100" : "bg-card border-primary/30 text-foreground"}`}>
            <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 animate-pulse-dot ${n.type === "critical" ? "bg-red-400" : n.type === "warning" ? "bg-yellow-400" : "bg-primary"}`} />
            <div className="flex-1">
              <p className="text-xs font-semibold">{n.title}</p>
              <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{n.message}</p>
            </div>
            <button onClick={() => setToasts([])} className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
