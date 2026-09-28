import Icon from "@/components/ui/icon";
import DateRangePicker from "@/components/ui/date-range-picker";

interface Props {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  fatalCount: number;
  ltiCount: number;
  totalHours: number;
  loading?: boolean;
}

const RATE_MULTIPLIER = 1_000_000;

const fmtInt = (n: number) => Math.round(n).toLocaleString("ru-RU");
const fmtRate = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Fraction({ numerator, denominator }: { numerator: string; denominator: string }) {
  return (
    <div className="inline-flex flex-col items-center leading-tight">
      <span className="px-2 pb-1 border-b border-foreground/40 whitespace-nowrap">{numerator}</span>
      <span className="px-2 pt-1 whitespace-nowrap">{denominator}</span>
    </div>
  );
}

function RateFormula({
  label, description, count, countLabel, totalHours, result,
}: {
  label: string;
  description: string;
  count: number;
  countLabel: string;
  totalHours: number;
  result: number;
}) {
  return (
    <div className="flex-1 min-w-[260px] bg-background border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{description}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto pb-1">
        <span className="font-semibold text-foreground">{label}</span>
        <span>=</span>
        <Fraction
          numerator={`${countLabel} × 1 000 000`}
          denominator="Общее количество отработанных человеко-часов"
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border overflow-x-auto">
        <span>=</span>
        <Fraction numerator={`${fmtInt(count)} × 1 000 000`} denominator={totalHours > 0 ? fmtInt(totalHours) : "—"} />
        <span>=</span>
        <span className="text-lg font-bold text-foreground whitespace-nowrap">{totalHours > 0 ? fmtRate(result) : "—"}</span>
      </div>
    </div>
  );
}

export default function IncidentRatesCard({
  dateFrom, dateTo, onFromChange, onToChange,
  fatalCount, ltiCount, totalHours, loading,
}: Props) {
  const fifr = totalHours > 0 ? (fatalCount * RATE_MULTIPLIER) / totalHours : 0;
  const ltifr = totalHours > 0 ? (ltiCount * RATE_MULTIPLIER) / totalHours : 0;

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Icon name="Activity" size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Показатели травматизма</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Период:</span>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onFromChange={onFromChange}
            onToChange={onToChange}
            onReset={() => { onFromChange(""); onToChange(""); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Icon name="Loader2" size={14} className="animate-spin" />
          Загрузка данных о человеко-часах...
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <RateFormula
            label="FIFR"
            description="коэффициент частоты несчастных случаев со смертельным исходом"
            count={fatalCount}
            countLabel="Кол-во несчастных случаев со смертельным исходом"
            totalHours={totalHours}
            result={fifr}
          />
          <RateFormula
            label="LTIFR"
            description="коэффициент частоты травм с временной потерей трудоспособности"
            count={ltiCount}
            countLabel="Кол-во травм с временной потерей трудоспособности"
            totalHours={totalHours}
            result={ltifr}
          />
        </div>
      )}

      {!loading && totalHours === 0 && (
        <p className="text-[11px] text-amber-500 mt-3 flex items-center gap-1">
          <Icon name="AlertTriangle" size={11} />
          Нет данных о человеко-часах за выбранный период на вкладке «ЧеловекоЧасы»
        </p>
      )}
    </div>
  );
}
