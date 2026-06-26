import { useState } from "react";
import Icon from "@/components/ui/icon";

interface ContractorStat {
  name: string;
  remarks: number;
  inspections: number;
  suspended: number;
}

interface TopContractorsProps {
  topContractors: ContractorStat[];
}

export default function TopContractors({ topContractors }: TopContractorsProps) {
  const [showAll, setShowAll] = useState(false);

  if (topContractors.length === 0) return null;

  const max = topContractors[0]?.remarks || 1;
  const visible = showAll ? topContractors : topContractors.slice(0, 3);

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Топ подрядчиков по нарушениям</h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {visible.map((co, idx) => (
          <div key={co.name} className="flex items-center gap-4 px-5 py-3 border-b border-border">
            <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium truncate">{co.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Icon name="TableProperties" size={11} />
                    {co.inspections} пров.
                  </span>
                  {co.suspended > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <Icon name="OctagonX" size={11} />
                      {co.suspended} пр.
                    </span>
                  )}
                  <span className="font-semibold text-foreground">{co.remarks} зам.</span>
                </div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((co.remarks / max) * 100)}%`,
                    background: idx === 0 ? "hsl(var(--destructive))" : idx === 1 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {topContractors.length > 3 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon name={showAll ? "ChevronUp" : "ChevronDown"} size={13} />
            {showAll ? "Скрыть" : `Показать все (${topContractors.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
