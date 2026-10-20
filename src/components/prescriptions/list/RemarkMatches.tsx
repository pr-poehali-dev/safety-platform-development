import { Fragment } from "react";
import Icon from "@/components/ui/icon";
import { Remark, effectiveStatus } from "@/lib/prescriptionTypes";

export function searchWords(search: string): string[] {
  return search.split(/\s+/).map(w => w.trim()).filter(Boolean).slice(0, 10);
}

function remarkText(r: Remark): string {
  return [r.description, r.place, r.normRef, r.category].filter(Boolean).join(" ").toLowerCase();
}

export function matchingRemarks(remarks: Remark[], words: string[]): Remark[] {
  if (!words.length) return [];
  const lower = words.map(w => w.toLowerCase());
  return remarks.filter(r => {
    const text = remarkText(r);
    return lower.some(w => text.includes(w));
  });
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!text) return null;
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map(escapeRe).join("|")})`, "gi");
  const lower = words.map(w => w.toLowerCase());
  return (
    <>
      {text.split(re).map((part, i) => (
        <Fragment key={i}>
          {lower.includes(part.toLowerCase())
            ? <mark className="bg-yellow-300/80 text-foreground rounded px-0.5">{part}</mark>
            : part}
        </Fragment>
      ))}
    </>
  );
}

interface RemarkMatchesProps {
  remarks: Remark[];
  words: string[];
}

export function RemarkMatches({ remarks, words }: RemarkMatchesProps) {
  const found = matchingRemarks(remarks, words);
  if (!found.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
        Найдено в замечаниях: {found.length}
      </p>
      {found.map(r => {
        const idx = remarks.findIndex(x => x.id === r.id) + 1;
        return (
          <div key={r.id} className="bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <span className="text-xs font-medium text-primary mr-2">№{idx}</span>
            {r.place && <div className="text-xs text-muted-foreground"><Highlight text={r.place} words={words} /></div>}
            <div className="whitespace-pre-wrap"><Highlight text={r.description} words={words} /></div>
            {r.normRef && (
              <div className="text-xs text-muted-foreground mt-1">
                <Highlight text={r.normRef} words={words} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function overdueRemarks(remarks: Remark[]): Remark[] {
  return remarks.filter(r => effectiveStatus(r) === "Просрочено");
}

interface OverdueRemarksProps extends RemarkMatchesProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function OverdueRemarks({ remarks, words, collapsed = false, onToggle }: OverdueRemarksProps) {
  const found = overdueRemarks(remarks);
  if (!found.length) return null;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle?.(); }}
        className="flex items-center gap-1.5 text-[11px] text-red-400 uppercase tracking-wider hover:text-red-300 transition-colors"
      >
        <Icon name={collapsed ? "ChevronRight" : "ChevronDown"} size={13} />
        Просроченные пункты: {found.length}
        <span className="normal-case tracking-normal text-muted-foreground">
          · {collapsed ? "развернуть" : "свернуть"}
        </span>
      </button>
      {!collapsed && found.map(r => {
        const idx = remarks.findIndex(x => x.id === r.id) + 1;
        return (
          <div key={r.id} className="bg-red-500/5 border border-red-400/20 rounded-lg px-3 py-2 text-sm text-foreground">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-primary">№{idx}{r.category ? ` · ${r.category}` : ""}</span>
              <span className="text-[11px] text-red-400 whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                срок {r.deadline}
              </span>
            </div>
            {r.place && <div className="text-xs text-muted-foreground mt-0.5"><Highlight text={r.place} words={words} /></div>}
            <div className="whitespace-pre-wrap mt-0.5"><Highlight text={r.description} words={words} /></div>
            {r.normRef && (
              <div className="text-xs text-muted-foreground mt-1">
                <Highlight text={r.normRef} words={words} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
