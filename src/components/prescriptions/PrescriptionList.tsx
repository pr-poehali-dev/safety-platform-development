import Icon from "@/components/ui/icon";
import { AppUser, ROLE_LABELS, ROLE_COLORS } from "@/lib/auth";
import { Template } from "@/lib/template";
import { printPrescription } from "@/lib/printPrescription";
import {
  Prescription, Status, ALL_STATUSES, STATUS_STYLE,
  effectiveStatus, overallStatus,
} from "@/lib/prescriptionTypes";

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

interface PrescriptionListProps {
  user: AppUser;
  onLogout: () => void;
  prescriptions: Prescription[];
  loading: boolean;
  search: string;
  filterStatus: string;
  canEdit: boolean;
  isContractor: boolean;
  activeTemplate: Template;
  onSearchChange: (v: string) => void;
  onFilterChange: (v: string) => void;
  onSelect: (p: Prescription) => void;
  onAddClick: () => void;
}

export function PrescriptionList({
  user, onLogout, prescriptions, loading, search, filterStatus,
  canEdit, isContractor, activeTemplate,
  onSearchChange, onFilterChange, onSelect, onAddClick,
}: PrescriptionListProps) {

  const filtered = prescriptions.filter(p => {
    if (isContractor && user.contractor && p.contractor !== user.contractor) return false;
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

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Icon name="Shield" size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Охрана Труда Онлайн</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            {user.name}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_COLORS[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Icon name="LogOut" size={13} />
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Предписания</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isContractor
                ? <>Организация: <span className="text-foreground">{user.contractor}</span> · Показаны только ваши предписания</>
                : <>Всего: {prescriptions.length} · Активных: {prescriptions.filter(p => overallStatus(p.remarks) === "Выдано").length} · Просрочено: {prescriptions.filter(p => overallStatus(p.remarks) === "Просрочено").length}</>
              }
            </p>
          </div>
          {canEdit && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium self-start sm:self-auto"
            >
              <Icon name="Plus" size={15} />
              Добавить предписание
            </button>
          )}
        </div>

        {/* Фильтры */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Поиск по номеру, объекту, подрядчику..."
              className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Все", ...ALL_STATUSES].map(s => (
              <button
                key={s}
                onClick={() => onFilterChange(s)}
                className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Таблица */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="Loader" size={28} className="text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Загрузка предписаний...</p>
            </div>
          ) : filtered.length === 0 ? (
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
                    <th className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Выдал</th>
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
                        onClick={() => onSelect(p)}
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
                        <td className="px-5 py-4 max-w-[180px]">
                          {p.inspector ? (() => {
                            const parts = p.inspector.trim().split(/\s+/);
                            let nameStart = parts.length;
                            for (let i = parts.length - 1; i >= 1; i--) {
                              if (/^[А-ЯЁ]/.test(parts[i])) nameStart = i; else break;
                            }
                            const position = parts.slice(0, nameStart).join(" ");
                            const name = parts.slice(nameStart).join(" ");
                            return <>
                              {name && <div className="text-sm text-foreground">{name}</div>}
                              {position && <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{position}</div>}
                            </>;
                          })() : <span className="text-muted-foreground text-sm">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.remarks.length}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.remarks.length === 1 ? "замечание" : p.remarks.length < 5 ? "замечания" : "замечаний"}
                            </span>
                            {(() => { const ov = p.remarks.filter(r => effectiveStatus(r) === "Просрочено").length; return ov > 0 ? <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded font-medium">{ov} просрочено</span> : null; })()}
                          </div>
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
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={e => { e.stopPropagation(); printPrescription(p, activeTemplate); }}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100"
                              title="Распечатать предписание"
                            >
                              <Icon name="Printer" size={13} />
                              Печать
                            </button>
                            <Icon name="ChevronRight" size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
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
    </div>
  );
}