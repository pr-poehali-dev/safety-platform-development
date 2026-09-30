import Icon from "@/components/ui/icon";
import TopContractors from "@/components/dashboard/TopContractors";
import PivotTable, { type PivotRow } from "@/components/dashboard/PivotTable";
import RemarksChart from "@/components/dashboard/RemarksChart";
import { VisibilitySettings } from "@/lib/visibilityTypes";

interface TopContractor {
  name: string;
  remarks: number;
  inspections: number;
  suspended: number;
}

interface DashboardAnalyticsSectionProps {
  blocks: VisibilitySettings["blocks"];
  topContractors: TopContractor[];
  pivotRows: PivotRow[];
  contractors: string[];
  grandTotal: Record<string, number>;
  chartData: Record<string, unknown>[];
}

// --- Топ подрядчиков, сводная таблица и график по нарушениям ---
export default function DashboardAnalyticsSection({
  blocks, topContractors, pivotRows, contractors, grandTotal, chartData,
}: DashboardAnalyticsSectionProps) {
  return (
    <>
      {blocks.topContractors && <TopContractors topContractors={topContractors} />}

      {blocks.pivotTable && <PivotTable pivotRows={pivotRows} contractors={contractors} grandTotal={grandTotal} />}

      {blocks.remarksChart && <RemarksChart chartData={chartData} contractors={contractors} />}

      {blocks.pivotTable && pivotRows.length === 0 && (
        <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="BarChart3" size={36} className="opacity-30" />
          <p className="text-sm">Нет данных для отображения</p>
        </div>
      )}
    </>
  );
}
