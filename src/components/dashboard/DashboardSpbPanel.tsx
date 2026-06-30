import IncidentPyramid from "@/components/dashboard/IncidentPyramid";

interface SpbStat {
  name: string;
  count: number;
}

interface PyramidData {
  fatal: number;
  severe_injury: number;
  light_injury: number;
  microtrauma: number;
  no_consequences: number;
  totalViolations: number;
  suspendedWorks: number;
}

interface DashboardSpbPanelProps {
  spbCategories: { id: number; name: string; is_spb: boolean }[];
  spbStats: SpbStat[];
  spbTotal: number;
  pyramidData: PyramidData;
}

export default function DashboardSpbPanel({ spbCategories, spbStats, spbTotal, pyramidData }: DashboardSpbPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {spbCategories.length > 0 && (
        <div className="bg-card border border-primary/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 font-bold text-xs tracking-wide">СПБ</span>
              <span className="text-sm font-semibold text-foreground">Стратегические приоритеты безопасности</span>
            </div>
            <span className="font-bold text-primary text-3xl">{spbTotal}</span>
          </div>
          <div className="space-y-1.5">
            {spbStats.map(stat => (
              <div key={stat.name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground truncate">{stat.name}</span>
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">{stat.count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-blue-500"
                      style={{ width: spbTotal > 0 ? `${(stat.count / spbTotal) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {spbStats.every(s => s.count === 0) && (
              <p className="text-xs text-muted-foreground text-center py-1">Нарушений по СПБ не зафиксировано</p>
            )}
          </div>
        </div>
      )}

      <IncidentPyramid data={pyramidData} year={new Date().getFullYear()} />
    </div>
  );
}
