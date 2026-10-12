import { Fragment, useState } from "react";
import Icon from "@/components/ui/icon";
import { RemarkMatches, OverdueRemarks, matchingRemarks, overdueRemarks, searchWords } from "@/components/prescriptions/list/RemarkMatches";
import { AppUser } from "@/lib/auth";
import { Template } from "@/lib/template";
import { printPrescription } from "@/lib/printPrescription";
import { DownloadFormatMenu } from "@/components/prescriptions/DownloadFormatMenu";
import {
  Prescription, Status, effectiveStatus, overallStatus,
} from "@/lib/prescriptionTypes";
import { StatusDropdown } from "@/components/prescriptions/StatusDropdown";
import { ColumnFilter } from "@/components/prescriptions/list/PrescriptionListFilterHelpers";

interface PrescriptionListTableProps {
  user: AppUser;
  loading: boolean;
  filtered: Prescription[];
  search: string;
  showOverdueRemarks?: boolean;
  uniqueDeadlines: string[];
  colFilterDeadline: string;
  onColFilterDeadlineChange: (v: string) => void;
  activeTemplate: Template;
  onSelect: (p: Prescription) => void;
  onStatusChange?: (p: Prescription, status: Status) => void;
}

export function PrescriptionListTable({
  user, loading, filtered, search, showOverdueRemarks, uniqueDeadlines, colFilterDeadline, onColFilterDeadlineChange,
  activeTemplate, onSelect, onStatusChange,
}: PrescriptionListTableProps) {
  const words = searchWords(search);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const withOverdue = showOverdueRemarks ? filtered.filter(p => overdueRemarks(p.remarks).length > 0) : [];
  const allCollapsed = withOverdue.length > 0 && withOverdue.every(p => collapsed.has(p.id));
  const toggleOne = (id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(withOverdue.map(p => p.id)));
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {!loading && withOverdue.length > 0 && (
        <div className="flex justify-end px-5 py-2.5 border-b border-border bg-secondary/10">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Icon name={allCollapsed ? "ChevronsUpDown" : "ChevronsDownUp"} size={13} />
            {allCollapsed ? "Развернуть все пункты" : "Свернуть все пункты"}
          </button>
        </div>
      )}
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
          <table style={{ tableLayout: "fixed", width: "1350px", minWidth: "1350px" }}>
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th style={{ width: "120px" }} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Номер</th>
                <th style={{ width: "350px" }} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Объект</th>
                <th style={{ width: "180px" }} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Подрядчик</th>
                <th style={{ width: "180px" }} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Выдан</th>
                <th style={{ width: "120px" }} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Замечания</th>
                <th style={{ width: "130px" }} className="text-left px-5 py-3">
                  <ColumnFilter label="Ближайший срок" options={uniqueDeadlines} value={colFilterDeadline} onChange={onColFilterDeadlineChange} />
                </th>
                <th style={{ width: "110px" }} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Статус</th>
                <th style={{ width: "160px" }} className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => {
                const status = overallStatus(p.remarks);
                const nearestDeadline = p.remarks.map(r => r.deadline).sort()[0];
                const matches = matchingRemarks(p.remarks, words);
                const overdue = showOverdueRemarks ? overdueRemarks(p.remarks) : [];
                return (
                  <Fragment key={p.id}>
                  <tr
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.remarks.length}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.remarks.length === 1 ? "замечание" : p.remarks.length < 5 ? "замечания" : "замечаний"}
                          </span>
                        </div>
                        {(() => { const ov = p.remarks.filter(r => effectiveStatus(r) === "Просрочено").length; return ov > 0 ? <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded font-medium w-fit">{ov} просрочено</span> : null; })()}
                        {(() => { const fx = p.remarks.filter(r => effectiveStatus(r) === "Устранено").length; return fx > 0 ? <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded font-medium w-fit">{fx} устранено</span> : null; })()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm ${status === "Просрочено" ? "text-red-400 font-medium" : "text-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {nearestDeadline}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusDropdown
                        status={status}
                        editable={user.role === "manager" || p.createdBy === user.login}
                        onChange={s => onStatusChange?.(p, s)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={e => { e.stopPropagation(); printPrescription(p, activeTemplate); }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
                            title="Распечатать предписание"
                          >
                            <Icon name="Printer" size={13} />
                            Печать
                          </button>
                          <DownloadFormatMenu
                            p={p}
                            template={activeTemplate}
                            stopPropagation
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
                          />
                        </div>
                        <Icon name="ChevronRight" size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </td>
                  </tr>
                  {(matches.length > 0 || overdue.length > 0) && (
                    <tr onClick={() => onSelect(p)} className="cursor-pointer bg-secondary/10">
                      <td colSpan={8} className="px-5 pb-4 pt-0 space-y-3">
                        {overdue.length > 0 && <OverdueRemarks remarks={p.remarks} words={words} collapsed={collapsed.has(p.id)} onToggle={() => toggleOne(p.id)} />}
                        {matches.length > 0 && !showOverdueRemarks && <RemarkMatches remarks={p.remarks} words={words} />}
                        {matches.length > 0 && showOverdueRemarks && matches.some(m => !overdue.some(o => o.id === m.id)) && (
                          <RemarkMatches remarks={p.remarks.filter(r => !overdue.some(o => o.id === r.id))} words={words} />
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}