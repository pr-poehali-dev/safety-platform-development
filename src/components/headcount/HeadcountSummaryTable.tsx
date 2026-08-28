import { Fragment } from "react";
import { MonthStats } from "@/lib/headcountTypes";
import Icon from "@/components/ui/icon";

interface Props {
  year: number;
  periodLabel: string;
  months: MonthStats[];
  onMonthClick: (m: MonthStats) => void;
}

const fmt = (n: number) => n === 0 ? "0" : n.toLocaleString("ru-RU");
const fmtAvg = (n: number | null) => n === null ? "—" : Math.round(n).toLocaleString("ru-RU");

const highlightMonths = new Set([7]); // Июль выделен жёлтым как в исходном файле

export default function HeadcountSummaryTable({ year, periodLabel, months, onMonthClick }: Props) {
  const grandPo = months.reduce((s, m) => s + m.poHours, 0);
  const grandSbd = months.reduce((s, m) => s + m.sbdHours, 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b border-border bg-secondary/30">{year}</th>
              <th colSpan={months.length * 2} className="text-center px-3 py-2 font-semibold border-b border-border bg-secondary/30">{periodLabel}</th>
            </tr>
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b border-border">Месяц</th>
              {months.map(m => (
                <th
                  key={m.month}
                  colSpan={2}
                  onClick={() => onMonthClick(m)}
                  title="Показать детали по дням"
                  className={`text-center px-2 py-2 font-semibold border-b border-border cursor-pointer transition-colors hover:opacity-80 ${
                    highlightMonths.has(m.month) ? "bg-yellow-400/80 text-black" : "bg-primary/10 text-foreground"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {m.label}
                    <Icon name="ChevronDown" size={11} />
                  </span>
                </th>
              ))}
            </tr>
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b border-border">Организация</th>
              {months.map(m => (
                <Fragment key={m.month}>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border">ПО</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border">СБД</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">Сумма ЧЧ</td>
              {months.map(m => (
                <Fragment key={m.month}>
                  <td
                    onClick={() => onMonthClick(m)}
                    className={`text-center px-2 py-2.5 font-medium cursor-pointer hover:bg-primary/5 transition-colors ${highlightMonths.has(m.month) ? "bg-yellow-400/20" : ""}`}
                  >
                    {fmt(m.poHours)}
                  </td>
                  <td
                    onClick={() => onMonthClick(m)}
                    className={`text-center px-2 py-2.5 font-medium cursor-pointer hover:bg-primary/5 transition-colors ${highlightMonths.has(m.month) ? "bg-yellow-400/20" : ""}`}
                  >
                    {fmt(m.sbdHours)}
                  </td>
                </Fragment>
              ))}
            </tr>
            <tr className="border-b border-border bg-secondary/10">
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">Средняя численность</td>
              {months.map(m => (
                <Fragment key={m.month}>
                  <td className="text-center px-2 py-2.5 text-foreground">{fmtAvg(m.poAvg)}</td>
                  <td className="text-center px-2 py-2.5 text-foreground">{fmtAvg(m.sbdAvg)}</td>
                </Fragment>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">ЧЧ общ</td>
              {months.map(m => (
                <td key={m.month} colSpan={2} className="text-center px-2 py-2.5 font-semibold text-foreground">
                  {m.hasData ? fmt(m.totalHours) : "-"}
                </td>
              ))}
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/30">
              <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">Итого за полугодие</td>
              <td colSpan={months.length * 2} className="text-center px-3 py-2.5 font-bold text-foreground">
                {fmt(grandPo + grandSbd)} ч (ПО {fmt(grandPo)} + СБД {fmt(grandSbd)})
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}