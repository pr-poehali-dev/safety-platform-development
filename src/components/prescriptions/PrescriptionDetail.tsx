import { useState, useRef } from "react";
import { EditablePhotoLightbox } from "@/components/ui/ImageAnnotator";
import { AppUser } from "@/lib/auth";
import { Template } from "@/lib/template";
import { downloadPrescriptionWord } from "@/lib/printPrescription";
import {
  Prescription, Comment, Attachment, Status,
  overallStatus,
} from "@/lib/prescriptionTypes";
import { PrescriptionDetailHeader } from "@/components/prescriptions/detail/PrescriptionDetailHeader";
import { PrescriptionRemarksTab } from "@/components/prescriptions/detail/PrescriptionRemarksTab";
import { PrescriptionChatTab } from "@/components/prescriptions/detail/PrescriptionChatTab";
import { PrescriptionDeleteRemarkDialog } from "@/components/prescriptions/detail/PrescriptionDeleteRemarkDialog";

const UPLOAD_URL = "https://functions.poehali.dev/b1d2899a-a609-43c1-81e8-34e4c4922136";
const MAX_PHOTOS = 3;
const MAX_PHOTO_SIZE = 1.5 * 1024 * 1024;
const MAX_PHOTO_WIDTH = 600;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = img.width > MAX_PHOTO_WIDTH ? MAX_PHOTO_WIDTH / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PrescriptionDetail({
  prescription, onClose, onUpdate, user, canEdit, template, onEditRequest,
}: {
  prescription: Prescription;
  onClose: () => void;
  onUpdate: (p: Prescription) => Promise<void>;
  user: AppUser;
  canEdit: boolean;
  template: Template;
  onEditRequest?: (p: Prescription) => void;
}) {
  const [p, setP] = useState(prescription);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"remarks" | "chat">("remarks");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingRemarkId, setUploadingRemarkId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [lightbox, setLightbox] = useState<{ remarkId: string; photos: string[]; index: number } | null>(null);
  const [deleteRemarkId, setDeleteRemarkId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDownloadWord = async () => {
    setDownloading(true);
    try {
      await downloadPrescriptionWord(p, template);
    } finally {
      setDownloading(false);
    }
  };

  const handleRemarkPhotos = async (remarkId: string, files: FileList | null) => {
    if (!files || !files.length) return;
    const remark = p.remarks.find(r => r.id === remarkId);
    if (!remark) return;
    const existing = remark.photos ?? [];
    const remaining = MAX_PHOTOS - existing.length;
    if (remaining <= 0) return;
    const oversized = Array.from(files).filter(f => f.size > MAX_PHOTO_SIZE);
    if (oversized.length > 0) {
      alert(`Файл "${oversized[0].name}" превышает допустимый размер 1,5 МБ.`);
      const input = photoInputRefs.current[remarkId];
      if (input) input.value = "";
      return;
    }
    setUploadingRemarkId(remarkId);
    const toUpload = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const file of toUpload) {
      const dataUrl = await resizeImage(file);
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    const remarks = p.remarks.map(r =>
      r.id === remarkId ? { ...r, photos: [...existing, ...urls] } : r
    );
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
    setUploadingRemarkId(null);
    const input = photoInputRefs.current[remarkId];
    if (input) input.value = "";
  };

  const removeRemarkPhoto = (remarkId: string, photoIdx: number) => {
    const remarks = p.remarks.map(r =>
      r.id === remarkId ? { ...r, photos: (r.photos ?? []).filter((_, i) => i !== photoIdx) } : r
    );
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const saveEditedPhoto = async (remarkId: string, photoIdx: number, dataUrl: string) => {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await res.json();
    if (!data.url) return;
    const remarks = p.remarks.map(r =>
      r.id === remarkId ? { ...r, photos: (r.photos ?? []).map((url, i) => (i === photoIdx ? data.url : url)) } : r
    );
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const isContractor = user.role === "contractor";
  const myRole = isContractor ? "Подрядчик" : user.role === "manager" ? "Руководитель" : user.role === "project_team" ? "Проектная команда" : "Специалист ОТ";

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) return;
      const reader = new FileReader();
      reader.onload = e => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: isImage ? "image" : "pdf",
          dataUrl: e.target?.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const sendComment = () => {
    if (!newComment.trim() && attachments.length === 0) return;
    const c: Comment = {
      id: Date.now(),
      author: user.name,
      authorLogin: user.login,
      role: myRole,
      text: newComment.trim(),
      time: new Date().toLocaleString("ru-RU"),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const updated = { ...p, comments: [...p.comments, c] };
    setP(updated);
    onUpdate(updated);
    setNewComment("");
    setAttachments([]);
  };

  const setRemarkStatus = (remarkId: string, status: Status) => {
    if (status === "Черновик") {
      onEditRequest?.(p);
      return;
    }
    const remarks = p.remarks.map(r => r.id === remarkId ? { ...r, status } : r);
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const setAllRemarksStatus = (status: Status) => {
    if (status === "Черновик") {
      onEditRequest?.(p);
      return;
    }
    const remarks = p.remarks.map(r => ({ ...r, status }));
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
  };

  const canChangeStatus = user.role === "manager" || p.createdBy === user.login;
  const canDeleteRemark = user.role === "admin";

  const deleteRemark = (remarkId: string) => {
    const remarks = p.remarks.filter(r => r.id !== remarkId);
    const updated = { ...p, remarks };
    setP(updated);
    onUpdate(updated);
    setDeleteRemarkId(null);
  };

  const status = overallStatus(p.remarks);
  const isMine = (c: Comment) => c.role === myRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-[1165px] shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">

        <PrescriptionDetailHeader
          p={p}
          status={status}
          canChangeStatus={canChangeStatus}
          setAllRemarksStatus={setAllRemarksStatus}
          template={template}
          downloading={downloading}
          handleDownloadWord={handleDownloadWord}
          onClose={onClose}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="overflow-y-auto flex-1">

          {/* Замечания */}
          {activeTab === "remarks" && (
            <PrescriptionRemarksTab
              p={p}
              canEdit={canEdit}
              canChangeStatus={canChangeStatus}
              canDeleteRemark={canDeleteRemark}
              uploadingRemarkId={uploadingRemarkId}
              photoInputRefs={photoInputRefs}
              setRemarkStatus={setRemarkStatus}
              setDeleteRemarkId={setDeleteRemarkId}
              setLightbox={setLightbox}
              removeRemarkPhoto={removeRemarkPhoto}
              handleRemarkPhotos={handleRemarkPhotos}
            />
          )}

          {/* Чат */}
          {activeTab === "chat" && (
            <PrescriptionChatTab
              p={p}
              isMine={isMine}
              attachments={attachments}
              setAttachments={setAttachments}
              newComment={newComment}
              setNewComment={setNewComment}
              sendComment={sendComment}
              fileInputRef={fileInputRef}
              handleFiles={handleFiles}
            />
          )}
        </div>
      </div>

      {lightbox && (
        <EditablePhotoLightbox
          photos={lightbox.photos}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onSave={(idx, dataUrl) => saveEditedPhoto(lightbox.remarkId, idx, dataUrl)}
        />
      )}

      {deleteRemarkId && (
        <PrescriptionDeleteRemarkDialog
          deleteRemarkId={deleteRemarkId}
          setDeleteRemarkId={setDeleteRemarkId}
          deleteRemark={deleteRemark}
        />
      )}
    </div>
  );
}
