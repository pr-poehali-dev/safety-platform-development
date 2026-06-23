import { useState } from "react";
import Icon from "@/components/ui/icon";
import ListEditor from "./ListEditor";
import ObjectsEditor from "./ObjectsEditor";
import ContractorsEditor from "./ContractorsEditor";

export function DataTab() {
  const [openEditor, setOpenEditor] = useState(false);
  const [openObjects, setOpenObjects] = useState(false);
  const [openContractors, setOpenContractors] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Управление данными</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Редактирование справочников и выпадающих списков</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setOpenEditor(true)}
          className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors text-left w-full"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="List" size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Вид нарушения</p>
                <p className="text-[10px] text-muted-foreground">Выпадающий список</p>
              </div>
            </div>
            <div className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Icon name="Pencil" size={13} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <p>Используется в форме добавления предписания у специалистов ОТ</p>
          </div>
        </button>

        <button
          onClick={() => setOpenObjects(true)}
          className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors text-left w-full"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Building2" size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Объект</p>
                <p className="text-[10px] text-muted-foreground">Выпадающий список</p>
              </div>
            </div>
            <div className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Icon name="Pencil" size={13} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <p>Используется в форме добавления проверки у специалистов ОТ</p>
          </div>
        </button>

        <button
          onClick={() => setOpenContractors(true)}
          className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors text-left w-full"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="HardHat" size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Подрядчик (ПО)</p>
                <p className="text-[10px] text-muted-foreground">Выпадающий список</p>
              </div>
            </div>
            <div className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Icon name="Pencil" size={13} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <p>Используется в формах предписания и проверки у специалистов ОТ</p>
          </div>
        </button>
      </div>

      {openEditor && <ListEditor onClose={() => setOpenEditor(false)} />}
      {openObjects && <ObjectsEditor onClose={() => setOpenObjects(false)} />}
      {openContractors && <ContractorsEditor onClose={() => setOpenContractors(false)} />}
    </>
  );
}
