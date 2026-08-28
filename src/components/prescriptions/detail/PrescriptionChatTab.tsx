import { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { Prescription, Comment, Attachment } from "@/lib/prescriptionTypes";

interface PrescriptionChatTabProps {
  p: Prescription;
  isMine: (c: Comment) => boolean;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  newComment: string;
  setNewComment: (v: string) => void;
  sendComment: () => void;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFiles: (files: FileList | null) => void;
}

export function PrescriptionChatTab({
  p, isMine, attachments, setAttachments, newComment, setNewComment, sendComment, fileInputRef, handleFiles,
}: PrescriptionChatTabProps) {
  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      {p.comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Icon name="MessageSquare" size={32} className="text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {p.comments.map(c => (
            <div key={c.id} className={`flex gap-3 ${isMine(c) ? "flex-row-reverse" : ""}`}>
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                {c.author[0]}
              </div>
              <div className={`max-w-[80%] flex flex-col ${isMine(c) ? "items-end" : "items-start"}`}>
                {c.text && (
                  <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${isMine(c) ? "bg-primary/15 text-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                    {c.text}
                  </div>
                )}
                {c.attachments && c.attachments.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mt-1.5 ${isMine(c) ? "justify-end" : ""}`}>
                    {c.attachments.map((a, ai) => (
                      <a key={ai} href={a.dataUrl} download={a.name} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:border-primary/40 transition-colors"
                      >
                        <Icon name={a.type === "image" ? "Image" : "FileText"} size={12} className="text-primary" />
                        <span className="max-w-[120px] truncate">{a.name}</span>
                      </a>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{c.author} · {c.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 text-xs text-primary">
              <Icon name={a.type === "image" ? "Image" : "FileText"} size={12} />
              <span className="max-w-[100px] truncate">{a.name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-400 transition-colors ml-0.5">
                <Icon name="X" size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendComment()}
          placeholder="Написать сообщение..."
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 px-3 py-2 rounded-lg transition-colors"
          title="Прикрепить файл (фото или PDF)"
        >
          <Icon name="Paperclip" size={14} />
        </button>
        <button
          onClick={sendComment}
          disabled={!newComment.trim() && attachments.length === 0}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Icon name="Send" size={14} />
        </button>
      </div>
    </div>
  );
}
