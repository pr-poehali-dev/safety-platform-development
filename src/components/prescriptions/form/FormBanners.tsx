import Icon from "@/components/ui/icon";

interface FormBannersProps {
  stale: boolean;
  otherTabOpen?: boolean;
  mergeNotes: string[];
  onReload: () => void;
  onHideNotes: () => void;
}

export default function FormBanners({ stale, otherTabOpen, mergeNotes, onReload, onHideNotes }: FormBannersProps) {
  return (
    <>
      {otherTabOpen && (
        <div className="flex items-center gap-3 px-12 py-3 bg-red-500/15 border-b border-red-500/40 text-sm flex-shrink-0">
          <Icon name="TriangleAlert" size={16} />
          <span className="flex-1">Это предписание уже открыто для редактирования в другой вкладке или окне. Закройте лишнюю, иначе устаревшая форма может затереть свежие правки.</span>
        </div>
      )}
      {stale && (
        <div className="flex items-center gap-3 px-12 py-3 bg-amber-500/15 border-b border-amber-500/40 text-sm flex-shrink-0">
          <Icon name="TriangleAlert" size={16} />
          <span className="flex-1">Это предписание изменили на другом компьютере. Обновите данные, чтобы не потерять чужие правки ваши несохранённые правки сохранятся, а изменённые на сервере пункты будут подсвечены.</span>
          <button onClick={onReload} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Обновить</button>
        </div>
      )}
      {mergeNotes.length > 0 && (
        <div className="px-12 py-3 bg-sky-500/10 border-b border-sky-500/30 text-sm flex-shrink-0 flex items-start gap-3">
          <Icon name="Info" size={16} className="mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-medium">Данные обновлены, ваши правки сохранены</p>
            {mergeNotes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
          </div>
          <button onClick={onHideNotes} className="text-xs text-muted-foreground hover:text-foreground">Скрыть</button>
        </div>
      )}
    </>
  );
}
