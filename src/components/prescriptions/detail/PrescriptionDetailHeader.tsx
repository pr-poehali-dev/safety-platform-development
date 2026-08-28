import Icon from "@/components/ui/icon";
import { Template } from "@/lib/template";
import { printPrescription } from "@/lib/printPrescription";
import { Prescription, Status } from "@/lib/prescriptionTypes";
import { StatusDropdown } from "@/components/prescriptions/StatusDropdown";

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

interface PrescriptionDetailHeaderProps {
  p: Prescription;
  status: Status;
  canChangeStatus: boolean;
  setAllRemarksStatus: (status: Status) => void;
  template: Template;
  downloading: boolean;
  handleDownloadWord: () => void;
  onClose: () => void;
  activeTab: "remarks" | "chat";
  setActiveTab: (t: "remarks" | "chat") => void;
}

export function PrescriptionDetailHeader({
  p, status, canChangeStatus, setAllRemarksStatus, template, downloading, handleDownloadWord,
  onClose, activeTab, setActiveTab,
}: PrescriptionDetailHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.number}</span>
            <StatusDropdown status={status} editable={canChangeStatus} onChange={setAllRemarksStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Выдано {p.date} · {p.object}</p>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <button
            onClick={() => printPrescription(p, template)}
            className="flex items-center gap-1.5 text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 rounded-lg px-3 py-1.5 transition-colors"
            title="Сформировать PDF для печати"
          >
            <Icon name="Printer" size={13} />
            Распечатать
          </button>
          <button
            onClick={handleDownloadWord}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            title="Скачать в формате Word"
          >
            {downloading ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Download" size={13} />}
            Скачать
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow icon="Building2" label="Объект" value={p.object} />
        <InfoRow icon="Users" label="Подрядчик" value={p.contractor} />
        {p.responsible && <InfoRow icon="User" label="Ответственный" value={p.responsible} />}
        {p.reportDeadline && <InfoRow icon="FileCheck" label="Срок предоставления отчёта" value={p.reportDeadline} />}
      </div>

      {/* Табы */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setActiveTab("remarks")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "remarks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="AlertCircle" size={14} />
          Замечания
          <span className="text-[11px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">{p.remarks.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="MessageSquare" size={14} />
          Переписка
          {p.comments.length > 0 && <span className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">{p.comments.length}</span>}
        </button>
      </div>
    </>
  );
}
