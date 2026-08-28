import Icon from "@/components/ui/icon";
import { YtdStats } from "@/lib/headcountTypes";

interface Props {
  stats: YtdStats;
  loading?: boolean;
}

const fmt = (n: number) => n.toLocaleString("ru-RU");
const fmtAvg = (n: number | null) => n === null ? "—" : Math.round(n).toLocaleString("ru-RU");

export default function HeadcountBadge({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="Loader2" size={14} className="animate-spin" />
        Загрузка данных по человекочасам...
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary/30 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon name="Users" size={15} className="text-primary" />
        <span className="text-sm font-semibold text-foreground">ЧеловекоЧасы на {stats.dateLabel}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Среднесписочная</p>
          <p className="text-sm font-semibold text-foreground">ПО {fmtAvg(stats.poAvgListed)} · СБД {fmtAvg(stats.sbdAvgListed)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Средняя (по факту)</p>
          <p className="text-sm font-semibold text-foreground">ПО {fmtAvg(stats.poAvgWorked)} · СБД {fmtAvg(stats.sbdAvgWorked)}</p>
        </div>
        <div className="col-span-2 sm:col-span-2">
          <p className="text-[11px] text-muted-foreground mb-1">Сумма ЧЧ с начала года</p>
          <p className="text-sm font-semibold text-foreground">
            ПО {fmt(stats.poHours)} ч · СБД {fmt(stats.sbdHours)} ч
            <span className="text-primary ml-1.5">· Итого {fmt(stats.poHours + stats.sbdHours)} ч</span>
          </p>
        </div>
      </div>
    </div>
  );
}
