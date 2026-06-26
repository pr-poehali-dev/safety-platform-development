import Icon from "@/components/ui/icon";
import DateRangePicker from "@/components/ui/date-range-picker";

interface DashboardFiltersProps {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  selectedContractors: string[];
  setSelectedContractors: (v: string[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  allContractorOptions: string[];
  allCategoryOptions: string[];
  contractorOpen: boolean;
  setContractorOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  categoryOpen: boolean;
  setCategoryOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  isContractor: boolean;
  filteredPresCount: number;
  filteredInspCount: number;
  hasFilter: boolean;
  toggleItem: (list: string[], setList: (v: string[]) => void, item: string) => void;
}

export default function DashboardFilters({
  dateFrom, dateTo, onFromChange, onToChange,
  selectedContractors, setSelectedContractors,
  selectedCategories, setSelectedCategories,
  allContractorOptions, allCategoryOptions,
  contractorOpen, setContractorOpen,
  categoryOpen, setCategoryOpen,
  isContractor, filteredPresCount, filteredInspCount, hasFilter,
  toggleItem,
}: DashboardFiltersProps) {
  return (
    <>
      <div className="flex flex-wrap items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
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

        {!isContractor && allContractorOptions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => { setContractorOpen(v => !v); setCategoryOpen(false); }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${selectedContractors.length > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="Building2" size={12} />
              {selectedContractors.length > 0 ? `Орг.: ${selectedContractors.length}` : "Организация"}
              <Icon name="ChevronDown" size={11} />
            </button>
            {contractorOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl min-w-[260px] max-h-64 overflow-y-auto">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Организации</span>
                  {selectedContractors.length > 0 && (
                    <button onClick={() => setSelectedContractors([])} className="text-xs text-primary hover:underline">Сбросить</button>
                  )}
                </div>
                {allContractorOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedContractors.includes(opt)}
                      onChange={() => toggleItem(selectedContractors, setSelectedContractors, opt)}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-xs text-foreground leading-tight">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {allCategoryOptions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => { setCategoryOpen(v => !v); setContractorOpen(false); }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${selectedCategories.length > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="Tag" size={12} />
              {selectedCategories.length > 0 ? `Вид: ${selectedCategories.length}` : "Вид нарушения"}
              <Icon name="ChevronDown" size={11} />
            </button>
            {categoryOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl min-w-[240px] max-h-64 overflow-y-auto">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Виды нарушений</span>
                  {selectedCategories.length > 0 && (
                    <button onClick={() => setSelectedCategories([])} className="text-xs text-primary hover:underline">Сбросить</button>
                  )}
                </div>
                {allCategoryOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(opt)}
                      onChange={() => toggleItem(selectedCategories, setSelectedCategories, opt)}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-xs text-foreground leading-tight">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {hasFilter && (
            <>
              <span className="text-xs text-muted-foreground">{filteredPresCount} пред. · {filteredInspCount} пров.</span>
              <button
                onClick={() => { onFromChange(""); onToChange(""); setSelectedContractors([]); setSelectedCategories([]); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Icon name="X" size={11} /> Сбросить всё
              </button>
            </>
          )}
        </div>
      </div>

      {(contractorOpen || categoryOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setContractorOpen(false); setCategoryOpen(false); }} />
      )}
    </>
  );
}
