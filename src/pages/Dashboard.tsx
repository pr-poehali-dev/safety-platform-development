import { AppUser } from "@/lib/auth";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardMainGrid from "@/components/dashboard/DashboardMainGrid";
import DashboardAnalyticsSection from "@/components/dashboard/DashboardAnalyticsSection";
import { TaskAssignment } from "@/lib/taskTypes";
import { VisibilitySettings, defaultVisibilitySettings } from "@/lib/visibilityTypes";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

interface DashboardProps {
  user: AppUser;
  taskAssignments: TaskAssignment[];
  visibility?: VisibilitySettings;
  onNavigateToPrescriptions?: (status?: string, mine?: boolean, suspended?: boolean) => void;
  onNavigateToInspections?: (suspended?: boolean, mine?: boolean) => void;
  onNavigateToIncidents?: () => void;
  onNavigateToTasks?: (filter?: string, taskId?: number) => void;
}

export default function Dashboard({ user, taskAssignments, visibility, onNavigateToPrescriptions, onNavigateToInspections, onNavigateToIncidents, onNavigateToTasks }: DashboardProps) {
  const blocks = visibility?.blocks ?? defaultVisibilitySettings().blocks;

  const {
    prescriptions, inspections, incidents, spbCategories, loading,
    myObjectNames,
    finesStats, finesLoading, currentMonthLabel,
    manualDangerActions, manualSuspendedWorks, setManualDangerActions, setManualSuspendedWorks,
    pyramidSaving, savePyramidStats,
    ytdStats, headcountLoading, totalWorkedHours, allHeadcountLoading, headcountSettings,
  } = useDashboardData(user);

  const {
    dateFrom, setDateFrom, dateTo, setDateTo,
    selectedContractors, setSelectedContractors,
    selectedCategories, setSelectedCategories,
    contractorOpen, setContractorOpen, categoryOpen, setCategoryOpen,
    isContractor, isAdmin, isSpecialist, filterMine, setFilterMine,
    allContractorOptions, allCategoryOptions,
    filteredPrescriptions, filteredInspections,
    presTotal, presIssued, presFixed, presOverdue, presRemarksTotal,
    inspTotal, inspSuspended, inspRemarks,
    presSuspendedRemarks,
    pyramidData, daysWithoutIncidents, lastIncidentDate,
    spbStats, spbTotal,
    contractors, pivotRows, grandTotal, chartData, topContractors,
    hasFilter, toggleItem,
  } = useDashboardFilters(user, prescriptions, inspections, incidents, spbCategories, myObjectNames);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <DashboardFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFromChange={setDateFrom}
        onToChange={setDateTo}
        selectedContractors={selectedContractors}
        setSelectedContractors={setSelectedContractors}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        allContractorOptions={allContractorOptions}
        allCategoryOptions={allCategoryOptions}
        contractorOpen={contractorOpen}
        setContractorOpen={setContractorOpen}
        categoryOpen={categoryOpen}
        setCategoryOpen={setCategoryOpen}
        isContractor={isContractor}
        isSpecialist={isSpecialist}
        filterMine={filterMine}
        onFilterMineChange={setFilterMine}
        filteredPresCount={filteredPrescriptions.length}
        filteredInspCount={filteredInspections.length}
        hasFilter={hasFilter}
        toggleItem={toggleItem}
      />

      <DashboardMainGrid
        blocks={blocks}
        taskAssignments={taskAssignments}
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToPrescriptions={onNavigateToPrescriptions}
        onNavigateToInspections={onNavigateToInspections}
        presTotal={presTotal}
        presIssued={presIssued}
        presFixed={presFixed}
        presOverdue={presOverdue}
        presRemarksTotal={presRemarksTotal}
        presSuspendedRemarks={presSuspendedRemarks}
        inspTotal={inspTotal}
        inspRemarks={inspRemarks}
        inspSuspended={inspSuspended}
        isContractor={isContractor}
        isAdmin={isAdmin}
        ytdStats={ytdStats}
        headcountLoading={headcountLoading}
        headcountSettings={headcountSettings}
        finesStats={finesStats}
        finesLoading={finesLoading}
        currentMonthLabel={currentMonthLabel}
        spbCategories={spbCategories}
        spbStats={spbStats}
        spbTotal={spbTotal}
        pyramidData={pyramidData}
        manualDangerActions={manualDangerActions}
        manualSuspendedWorks={manualSuspendedWorks}
        onManualDangerActionsChange={setManualDangerActions}
        onManualSuspendedWorksChange={setManualSuspendedWorks}
        onPyramidSave={savePyramidStats}
        pyramidSaving={pyramidSaving}
        totalWorkedHours={totalWorkedHours}
        allHeadcountLoading={allHeadcountLoading}
        daysWithoutIncidents={daysWithoutIncidents}
        lastIncidentDate={lastIncidentDate}
      />

      <DashboardAnalyticsSection
        blocks={blocks}
        topContractors={topContractors}
        pivotRows={pivotRows}
        contractors={contractors}
        grandTotal={grandTotal}
        chartData={chartData}
      />
    </div>
  );
}