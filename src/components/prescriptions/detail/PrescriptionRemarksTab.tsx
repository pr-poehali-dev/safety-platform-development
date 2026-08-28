import Icon from "@/components/ui/icon";
import {
  Prescription, Remark, Status,
  isOverdue, effectiveStatus,
} from "@/lib/prescriptionTypes";
import { StatusDropdown } from "@/components/prescriptions/StatusDropdown";

const MAX_PHOTOS = 3;

interface PrescriptionRemarksTabProps {
  p: Prescription;
  canEdit: boolean;
  canChangeStatus: boolean;
  canDeleteRemark: boolean;
  uploadingRemarkId: string | null;
  photoInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  setRemarkStatus: (remarkId: string, status: Status) => void;
  setDeleteRemarkId: (id: string | null) => void;
  setLightbox: (v: { remarkId: string; photos: string[]; index: number } | null) => void;
  removeRemarkPhoto: (remarkId: string, photoIdx: number) => void;
  handleRemarkPhotos: (remarkId: string, files: FileList | null) => void;
}

export function PrescriptionRemarksTab({
  p, canEdit, canChangeStatus, canDeleteRemark, uploadingRemarkId, photoInputRefs,
  setRemarkStatus, setDeleteRemarkId, setLightbox, removeRemarkPhoto, handleRemarkPhotos,
}: PrescriptionRemarksTabProps) {
  return (
    <div className="px-6 py-4 space-y-4">
      {p.remarks.map((r: Remark, i: number) => {
        const eStatus = effectiveStatus(r);
        const photosEditable = canEdit && eStatus !== "В работе" && eStatus !== "Просрочено";
        return (
        <div key={r.id} className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Замечание #{i + 1}</span>
              {r.work_suspended && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-red-400 border border-red-400/30 bg-red-400/10 rounded px-2 py-0.5 whitespace-nowrap">
                  <Icon name="OctagonX" size={11} />
                  Работы приостановлены
                </span>
              )}
              {r.work_suspended && r.suspension_act_drawn && (
                <span className="text-[11px] text-red-400/80 whitespace-nowrap">(составлен акт о приостановке)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusDropdown status={eStatus} editable={canChangeStatus} onChange={s => setRemarkStatus(r.id, s)} align="right" />
              {canDeleteRemark && (
                <button
                  type="button"
                  onClick={() => setDeleteRemarkId(r.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-400 border border-red-400/20 bg-red-400/10 hover:bg-red-400/20 rounded px-2 py-0.5 transition-colors whitespace-nowrap"
                  title="Удалить замечание"
                >
                  <Icon name="Trash2" size={11} />
                  Удалить
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg p-3">{r.description}</p>

          {/* Фото нарушения */}
          <div>
            {((r.photos ?? []).length > 0 || photosEditable) && (
              <div className="flex flex-wrap gap-2 items-center">
                {(r.photos ?? []).map((url, pi) => (
                  <div key={pi} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setLightbox({ remarkId: r.id, photos: r.photos ?? [], index: pi })}
                      className="block w-full h-full"
                    >
                      <img src={url} alt={`Фото ${pi + 1}`} className="w-full h-full object-cover" />
                    </button>
                    {photosEditable && (
                      <button
                        type="button"
                        onClick={() => removeRemarkPhoto(r.id, pi)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Icon name="X" size={14} className="text-white" />
                      </button>
                    )}
                  </div>
                ))}
                {photosEditable && (r.photos ?? []).length < MAX_PHOTOS && (
                  <>
                    <button
                      type="button"
                      onClick={() => photoInputRefs.current[r.id]?.click()}
                      disabled={uploadingRemarkId === r.id}
                      className="w-16 h-16 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary flex-shrink-0"
                    >
                      {uploadingRemarkId === r.id
                        ? <Icon name="Loader2" size={16} className="animate-spin" />
                        : <Icon name="Camera" size={16} />}
                      <span className="text-[10px] leading-tight text-center">
                        {uploadingRemarkId === r.id ? "Загрузка" : `${(r.photos ?? []).length}/${MAX_PHOTOS}`}
                      </span>
                    </button>
                    <input
                      ref={el => { photoInputRefs.current[r.id] = el; }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleRemarkPhotos(r.id, e.target.files)}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {r.normRef && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="BookOpen" size={12} />
              {r.normRef}
            </div>
          )}
          <div className="bg-secondary/30 rounded-lg p-3 inline-flex flex-col">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Срок устранения</p>
            <p className={`text-sm font-medium ${isOverdue(r) ? "text-red-400" : "text-foreground"}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {r.deadline}{isOverdue(r) && <span className="text-[10px] ml-2 font-normal">— просрочено</span>}
            </p>
          </div>
        </div>
      );})}
    </div>
  );
}
