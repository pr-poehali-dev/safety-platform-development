import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Inspection } from "./types";

function InfoRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className={`text-sm ${highlight ? "text-red-400 font-medium" : "text-foreground"}`}>{value}</span>
      </div>
    </div>
  );
}

const formatDate = (iso: string) => {
  try { return format(parseISO(iso), "d MMMM yyyy", { locale: ru }); } catch { return iso; }
};

export default function InspectionDetail({ inspection, onClose }: { inspection: Inspection; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const photos = inspection.photos ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl animate-fade-in flex flex-col max-h-[88vh]">

        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <span className="text-base font-semibold">Запись проверки</span>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(inspection.inspection_date)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4 flex-shrink-0">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {inspection.works_suspended && (
            <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium px-3 py-2 rounded-lg">
              <Icon name="OctagonX" size={14} />
              Работы приостановлены
            </div>
          )}

          <div className="space-y-3">
            <InfoRow icon="Building2" label="Объект" value={inspection.object_name} />
            <InfoRow icon="HardHat" label="Подрядчик" value={inspection.contractor} />
            <InfoRow icon="TriangleAlert" label="Вид нарушения" value={inspection.violation_type} />
            <InfoRow icon="ListChecks" label="ОД/ОУ" value={`${inspection.remarks_count} шт.`} />
            <InfoRow icon="UserCheck" label="Проверяющий" value={inspection.inspector_name} />
          </div>

          {inspection.note && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1.5">Примечание</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{inspection.note}</p>
            </div>
          )}

          {photos.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Фото ({photos.length})</p>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox({ photos, index: i })}
                    className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors flex-shrink-0"
                  >
                    <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <PhotoLightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
