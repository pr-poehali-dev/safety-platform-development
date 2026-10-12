import Icon from "@/components/ui/icon";
import { Fine, fmt } from "@/components/fines/finesShared";

interface FinesTableProps {
  loading: boolean;
  filteredRows: Fine[];
  canManage: boolean;
  deleteConfirm: number | null;
  onAdd: () => void;
  onEdit: (row: Fine) => void;
  onDelete: (id: number) => void;
  onDeleteConfirmChange: (id: number | null) => void;
}

export default function FinesTable({
  loading, filteredRows, canManage, deleteConfirm, onAdd, onEdit, onDelete, onDeleteConfirmChange,
}: FinesTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Icon name="Banknote" size={40} className="opacity-20" />
        <p className="text-sm">Штрафов не зафиксировано</p>
        {canManage && (
          <button onClick={onAdd} className="text-sm text-primary hover:underline">
            Добавить первый
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Месяц</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Организация</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Договор</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Акт</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Выставлено</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Оплачено</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Проактив</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Статус</th>
              {canManage && <th className="w-16" />}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => (
              <tr key={row.id} className={`group border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap align-top">
                  {row.period_date ? new Date(row.period_date).toLocaleDateString("ru-RU", { month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3 text-foreground align-top">{row.contractor}</td>
                <td className="px-4 py-3 text-muted-foreground align-top">{row.contract_number || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground align-top">{row.act_number || "—"}</td>
                <td className="px-3 py-3 text-right font-medium text-foreground align-top whitespace-nowrap">{fmt(row.amount_issued)}</td>
                <td className="px-3 py-3 text-right align-top whitespace-nowrap">{row.amount_paid ? <span className="font-medium text-green-400">{fmt(row.amount_paid)}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                <td className="px-3 py-3 text-right align-top whitespace-nowrap">{row.amount_proactive ? <span className="font-medium text-amber-400">{fmt(row.amount_proactive)}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                <td className="px-4 py-3 text-muted-foreground align-top max-w-[220px]">{row.status || "—"}</td>
                {canManage && (
                  <td className="px-2 py-3 align-top" onClick={e => e.stopPropagation()}>
                    {deleteConfirm === row.id ? (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <button onClick={() => onDelete(row.id)} className="text-[10px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Удалить</button>
                        <button onClick={() => onDeleteConfirmChange(null)} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">Нет</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(row)} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Редактировать">
                          <Icon name="Pencil" size={13} />
                        </button>
                        <button onClick={() => onDeleteConfirmChange(row.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Удалить">
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
