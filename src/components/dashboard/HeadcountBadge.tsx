import Icon from "@/components/ui/icon";
import { YtdStats } from "@/lib/headcountTypes";

interface Props {
  stats: YtdStats;
  loading?: boolean;
}

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
        <span className="text-sm font-semibold text-foreground">Человекочасы на {stats.dateLabel}</span>
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground mb-1">Среднесписочная численность
(за текущий месяц)</p>
        <p className="text-sm font-semibold text-foreground">ПО {fmtAvg(stats.poAvgListed)} · СБД {fmtAvg(stats.sbdAvgListed)}</p>
      </div>
    </div>
  );
}