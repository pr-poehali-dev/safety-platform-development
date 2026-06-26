export type PivotRow = {
  category: string;
  byContractor: Record<string, number>;
  total: number;
};

interface PivotTableProps {
  pivotRows: PivotRow[];
  contractors: string[];
  grandTotal: Record<string, number>;
}

export default function PivotTable({ pivotRows, contractors, grandTotal }: PivotTableProps) {
  if (pivotRows.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Замечания по категориям и подрядчикам</h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ minWidth: 180 }} />
              {contractors.map(c => <col key={c} style={{ width: 50, maxWidth: 50 }} />)}
              <col style={{ width: 50, maxWidth: 50 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Вид нарушения</th>
                {contractors.map(c => (
                  <th key={c} className="text-center py-2.5 font-semibold text-muted-foreground" style={{ width: 50, maxWidth: 50 }}>
                    <div
                      className="overflow-hidden mx-auto"
                      style={{ width: 50, maxHeight: "2.8em", lineHeight: "1.4em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", cursor: "default" }}
                      title={c}
                    >
                      {c}
                    </div>
                  </th>
                ))}
                <th className="text-center py-2.5 font-semibold text-foreground" style={{ width: 50 }}>Итого</th>
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((row, idx) => {
                const isTop = idx < 3;
                const rowBg = idx === 0 ? "bg-red-500/10" : idx === 1 ? "bg-amber-500/8" : idx === 2 ? "bg-yellow-500/6" : idx % 2 !== 0 ? "bg-secondary/10" : "";
                return (
                  <tr key={row.category} className={`border-b border-border last:border-0 ${rowBg}`}>
                    <td className="px-4 py-2 text-foreground">
                      <span className="flex items-center gap-1.5">
                        {isTop && <span className="text-xs">{medals[idx]}</span>}
                        <span className={isTop ? "font-semibold" : ""}>{row.category}</span>
                      </span>
                    </td>
                    {contractors.map(c => (
                      <td key={c} className="py-2 text-center text-muted-foreground" style={{ width: 50, maxWidth: 50 }}>
                        {row.byContractor[c] ? (
                          <span className="text-foreground font-medium">{row.byContractor[c]}</span>
                        ) : ""}
                      </td>
                    ))}
                    <td className="py-2 text-center font-bold text-foreground" style={{ width: 50 }}>
                      {isTop ? <span className={idx === 0 ? "text-red-400" : idx === 1 ? "text-amber-400" : "text-yellow-500"}>{row.total}</span> : row.total}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-secondary/30 border-t-2 border-border">
                <td className="px-4 py-2.5 font-bold text-foreground">Общий итог</td>
                {contractors.map(c => (
                  <td key={c} className="py-2.5 text-center font-bold text-foreground" style={{ width: 50, maxWidth: 50 }}>
                    {grandTotal[c] || ""}
                  </td>
                ))}
                <td className="py-2.5 text-center font-bold text-foreground" style={{ width: 50 }}>
                  {pivotRows.reduce((s, r) => s + r.total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
