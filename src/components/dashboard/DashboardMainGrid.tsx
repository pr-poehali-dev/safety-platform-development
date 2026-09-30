import DashboardStatCards from "@/components/dashboard/DashboardStatCards";
import DashboardTasksWidget from "@/components/dashboard/DashboardTasksWidget";
import DashboardSpbPanel from "@/components/dashboard/DashboardSpbPanel";
import HeadcountBadge from "@/components/dashboard/HeadcountBadge";
import FinesBadge from "@/components/dashboard/FinesBadge";
import InjuryRateBadge from "@/components/dashboard/InjuryRateBadge";
import { TaskAssignment } from "@/lib/taskTypes";
import { VisibilitySettings } from "@/lib/visibilityTypes";
import { SpbCategory } from "@/hooks/useDashboardData";
import { YtdStats, HeadcountSettings } from "@/lib/headcountTypes";

interface PyramidData {
  fatal: number;
  severe_injury: number;
  light_injury: number;
  microtrauma: number;
  no_consequences: number;
  totalViolations: number;
  suspendedWorks: number;
  suspendedWorksWithAct?: number;
}

interface DashboardMainGridProps {
  blocks: VisibilitySettings["blocks"];
  taskAssignments: TaskAssignment[];
  onNavigateToTasks?: (filter?: string, taskId?: number) => void;
  onNavigateToPrescriptions?: (status?: string, mine?: boolean, suspended?: boolean) => void;
  onNavigateToInspections?: (suspended?: boolean, mine?: boolean) => void;

  presTotal: number;
  presIssued: number;
  presFixed: number;
  presOverdue: number;
  presRemarksTotal: number;
  presSuspendedRemarks: number;
  inspTotal: number;
  inspRemarks: number;
  inspSuspended: number;

  isContractor: boolean;
  isAdmin: boolean;
  ytdStats: YtdStats;
  headcountLoading: boolean;
  headcountSettings: HeadcountSettings;

  finesStats: { totalIssued: number; totalPaid: number; monthIssued: number; monthPaid: number };
  finesLoading: boolean;
  currentMonthLabel: string;

  spbCategories: SpbCategory[];
  spbStats: { name: string; count: number }[];
  spbTotal: number;
  pyramidData: PyramidData;
  manualDangerActions: number;
  manualSuspendedWorks: number;
  onManualDangerActionsChange: (v: number) => void;
  onManualSuspendedWorksChange: (v: number) => void;
  onPyramidSave: () => void;
  pyramidSaving: boolean;

  totalWorkedHours: number;
  allHeadcountLoading: boolean;
  daysWithoutIncidents: number | null;
  lastIncidentDate: string | null;
}

// --- Основная двухколоночная сетка виджетов дашборда ---
export default function DashboardMainGrid({
  blocks, taskAssignments, onNavigateToTasks, onNavigateToPrescriptions, onNavigateToInspections,
  presTotal, presIssued, presFixed, presOverdue, presRemarksTotal, presSuspendedRemarks,
  inspTotal, inspRemarks, inspSuspended,
  isContractor, isAdmin, ytdStats, headcountLoading, headcountSettings,
  finesStats, finesLoading, currentMonthLabel,
  spbCategories, spbStats, spbTotal, pyramidData,
  manualDangerActions, manualSuspendedWorks, onManualDangerActionsChange, onManualSuspendedWorksChange,
  onPyramidSave, pyramidSaving,
  totalWorkedHours, allHeadcountLoading, daysWithoutIncidents, lastIncidentDate,
}: DashboardMainGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <div className="flex flex-col gap-4">
        <DashboardStatCards
          presTotal={presTotal}
          presIssued={presIssued}
          presFixed={presFixed}
          presOverdue={presOverdue}
          presRemarksTotal={presRemarksTotal}
          presSuspended={presSuspendedRemarks}
          inspTotal={inspTotal}
          inspRemarks={inspRemarks}
          inspSuspended={inspSuspended}
          showPresCards={blocks.presCards}
          showInspCards={blocks.inspCards}
          onNavigateToPrescriptions={onNavigateToPrescriptions}
          onNavigateToInspections={onNavigateToInspections}
        />

        {blocks.tasksWidget && (
          <DashboardTasksWidget
            taskAssignments={taskAssignments}
            onNavigateToTasks={onNavigateToTasks}
          />
        )}
      </div>

      <div className="flex flex-col gap-4">
        {!isContractor && blocks.headcountWidget && <HeadcountBadge stats={ytdStats} loading={headcountLoading} poLabel={headcountSettings.po_label} />}

        {!isContractor && blocks.finesWidget && (
          <FinesBadge
            totalIssued={finesStats.totalIssued}
            totalPaid={finesStats.totalPaid}
            monthIssued={finesStats.monthIssued}
            monthPaid={finesStats.monthPaid}
            loading={finesLoading}
            monthLabel={currentMonthLabel}
          />
        )}

        <DashboardSpbPanel
          spbCategories={spbCategories}
          spbStats={spbStats}
          spbTotal={spbTotal}
          pyramidData={pyramidData}
          pyramidEditable={isAdmin}
          manualDangerActions={manualDangerActions}
          manualSuspendedWorks={manualSuspendedWorks}
          onManualDangerActionsChange={onManualDangerActionsChange}
          onManualSuspendedWorksChange={onManualSuspendedWorksChange}
          onPyramidSave={onPyramidSave}
          pyramidSaving={pyramidSaving}
          showSpb={blocks.spb}
          showPyramid={blocks.pyramid}
        />

        {blocks.injuryRates && (
          <InjuryRateBadge
            fatalCount={pyramidData.fatal}
            ltiCount={pyramidData.severe_injury + pyramidData.light_injury}
            totalHours={totalWorkedHours}
            loading={allHeadcountLoading}
            daysWithoutIncidents={daysWithoutIncidents}
            lastIncidentDate={lastIncidentDate}
          />
        )}
      </div>
    </div>
  );
}