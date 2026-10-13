import Icon from "@/components/ui/icon";
import { MonthStats } from "@/lib/headcountTypes";

interface Props {
  year: number;
  months: MonthStats[];
  poLabel: string;
  expanded: boolean;
  onToggle: () => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

function avgOf(values: (number | null)[]): number {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
}

export default function HeadcountYearBadge({ year, months, poLabel, expanded, onToggle }: Props) {
  const poHours = months.reduce((s, m) => s + m.poHours, 0);
  const sbdHours = months.reduce((s, m) => s + m.sbdHours, 0);
  const poAvg = avgOf(months.map(m => m.poAvg));
  const sbdAvg = avgOf(months.map(m => m.sbdAvg));

  return (
    <button
      onClick={onToggle}
      className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/50 transition-colors"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 rounded px-2.5 py-1 font-bold text-base">{year}</span>
          <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={16} className="text-muted-foreground" />
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Сумма ЧЧ</div>
          <div className="text-sm font-semibold text-foreground">
            {poLabel} {fmt(poHours)} · СБД {fmt(sbdHours)} · Всего {fmt(poHours + sbdHours)}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Среднесписочная численность</div>
          <div className="text-sm font-semibold text-foreground">
            {poLabel} {fmt(poAvg)} · СБД {fmt(sbdAvg)} · Всего {fmt(poAvg + sbdAvg)}
          </div>
        </div>
      </div>
    </button>
  );
}
