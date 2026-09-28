import Icon from "@/components/ui/icon";

interface Props {
  fatalCount: number;
  ltiCount: number;
  totalHours: number;
  loading?: boolean;
  daysWithoutIncidents: number | null;
  lastIncidentDate?: string | null;
}

const RATE_MULTIPLIER = 1_000_000;

function fmtRate(n: number): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InjuryRateBadge({ fatalCount, ltiCount, totalHours, loading, daysWithoutIncidents, lastIncidentDate }: Props) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="Loader2" size={14} className="animate-spin" />
        Загрузка показателей травматизма...
      </div>
    );
  }

  const fifr = totalHours > 0 ? (fatalCount * RATE_MULTIPLIER) / totalHours : 0;
  const ltifr = totalHours > 0 ? (ltiCount * RATE_MULTIPLIER) / totalHours : 0;

  return (
    <div className="bg-card border border-primary/30 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon name="Activity" size={15} className="text-primary" />
        <span className="text-sm font-semibold text-foreground">Показатели травматизма</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground mb-1" title="Коэффициент частоты несчастных случаев со смертельным исходом">FIFR</p>
          <p className="text-lg font-semibold text-foreground">{totalHours > 0 ? fmtRate(fifr) : "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Смерт. НС: {fatalCount}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1" title="Коэффициент частоты травм с временной потерей трудоспособности">LTIFR</p>
          <p className="text-lg font-semibold text-foreground">{totalHours > 0 ? fmtRate(ltifr) : "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Лёгкий + Тяжёлый НС: {ltiCount}</p>
        </div>
        <div className="border-l border-border pl-3">
          <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <Icon name="ShieldCheck" size={11} className="text-green-500" />
            Дней без происшествий
          </p>
          <p className="text-lg font-semibold text-green-500">{daysWithoutIncidents !== null ? daysWithoutIncidents : "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {lastIncidentDate ? `с ${new Date(lastIncidentDate).toLocaleDateString("ru-RU")}` : "происшествий не было"}
          </p>
        </div>
      </div>
      {totalHours === 0 && (
        <p className="text-[11px] text-amber-500 mt-2 flex items-center gap-1">
          <Icon name="AlertTriangle" size={11} />
          Нет данных о человеко-часах на вкладке «ЧеловекоЧасы»
        </p>
      )}
    </div>
  );
}