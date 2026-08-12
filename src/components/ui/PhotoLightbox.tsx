import { useState } from "react";
import Icon from "@/components/ui/icon";

export function PhotoLightbox({ photos, startIndex, onClose }: { photos: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
        <Icon name="X" size={26} />
      </button>
      {photos.length > 1 && (
        <button
          onClick={() => setIndex(i => (i - 1 + photos.length) % photos.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
        >
          <Icon name="ChevronLeft" size={32} />
        </button>
      )}
      <img src={photos[index]} alt={`Фото ${index + 1}`} className="relative max-w-[90vw] max-h-[85vh] rounded-lg object-contain" />
      {photos.length > 1 && (
        <button
          onClick={() => setIndex(i => (i + 1) % photos.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
        >
          <Icon name="ChevronRight" size={32} />
        </button>
      )}
      {photos.length > 1 && (
        <span className="absolute bottom-6 text-white/70 text-xs">{index + 1} / {photos.length}</span>
      )}
    </div>
  );
}
