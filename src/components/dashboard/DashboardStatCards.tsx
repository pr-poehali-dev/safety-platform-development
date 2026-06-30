import Icon from "@/components/ui/icon";

function StatCard({ label, value, icon, color, onClick }: {
  label: string; value: number | string; icon: string; color: string; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4 ${onClick ? "cursor-pointer hover:border-primary/50 hover:bg-card/80 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon name={icon as never} size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

interface DashboardStatCardsProps {
  presTotal: number;
  presIssued: number;
  presFixed: number;
  presOverdue: number;
  inspTotal: number;
  inspRemarks: number;
  inspSuspended: number;
  onNavigateToPrescriptions?: (status?: string) => void;
  onNavigateToInspections?: (suspended?: boolean) => void;
}

export default function DashboardStatCards({
  presTotal, presIssued, presFixed, presOverdue,
  inspTotal, inspRemarks, inspSuspended,
  onNavigateToPrescriptions, onNavigateToInspections,
}: DashboardStatCardsProps) {
  return (
    <>
      <div>
        <h2 className="text-base font-semibold py-0 my-0">Предписания</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Всего предписаний" value={presTotal} icon="ClipboardList" color="bg-indigo-500" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Все") : undefined} />
          <StatCard label="Выдано" value={presIssued} icon="Send" color="bg-primary" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Выдано") : undefined} />
          <StatCard label="Устранено" value={presFixed} icon="CheckCircle" color="bg-green-500" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Устранено") : undefined} />
          <StatCard label="Просрочено" value={presOverdue} icon="AlertCircle" color="bg-red-500" onClick={onNavigateToPrescriptions ? () => onNavigateToPrescriptions("Просрочено") : undefined} />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold py-0 my-0">Проверки</h2>
        <div className="flex flex-col gap-3">
          <StatCard label="Всего проверок" value={inspTotal} icon="TableProperties" color="bg-violet-500" onClick={onNavigateToInspections ? () => onNavigateToInspections(false) : undefined} />
          <StatCard label="Всего замечаний" value={inspRemarks} icon="AlertTriangle" color="bg-amber-500" onClick={onNavigateToInspections ? () => onNavigateToInspections(false) : undefined} />
          <StatCard label="Приостановлено работ" value={inspSuspended} icon="OctagonX" color="bg-red-600" onClick={onNavigateToInspections ? () => onNavigateToInspections(true) : undefined} />
        </div>
      </div>
    </>
  );
}
