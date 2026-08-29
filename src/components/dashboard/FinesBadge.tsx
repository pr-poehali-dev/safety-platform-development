import Icon from "@/components/ui/icon";

interface Props {
  totalIssued: number;
  totalPaid: number;
  monthIssued: number;
  monthPaid: number;
  loading?: boolean;
  monthLabel: string;
}

const fmt = (n: number) => n.toLocaleString("ru-RU");

export default function FinesBadge({ totalIssued, totalPaid, monthIssued, monthPaid, loading, monthLabel }: Props) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="Loader2" size={14} className="animate-spin" />
        Загрузка данных по штрафам...
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary/30 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon name="Banknote" size={15} className="text-primary" />
        <span className="text-sm font-semibold text-foreground">Штрафы</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Всего</p>
          <p className="text-sm font-semibold text-foreground">
            Выставлено {fmt(totalIssued)} · <span className="text-green-400">Оплачено {fmt(totalPaid)}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">За {monthLabel}</p>
          <p className="text-sm font-semibold text-foreground">
            Выставлено {fmt(monthIssued)} · <span className="text-green-400">Оплачено {fmt(monthPaid)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
