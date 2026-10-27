import { useEffect, useState } from "react";

const CHANNEL = "prescription-edit-tabs";

type Msg = { type: "open" | "here" | "close"; id: string; sessionId: string };

export function useOtherTabOpen(editId: string | undefined, sessionId: string): boolean {
  const [others, setOthers] = useState<string[]>([]);

  useEffect(() => {
    if (!editId || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    const add = (s: string) => setOthers(prev => (prev.includes(s) ? prev : [...prev, s]));
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (!m || m.id !== editId || m.sessionId === sessionId) return;
      if (m.type === "open") {
        add(m.sessionId);
        ch.postMessage({ type: "here", id: editId, sessionId } as Msg);
      } else if (m.type === "here") {
        add(m.sessionId);
      } else if (m.type === "close") {
        setOthers(prev => prev.filter(s => s !== m.sessionId));
      }
    };
    ch.postMessage({ type: "open", id: editId, sessionId } as Msg);
    return () => {
      ch.postMessage({ type: "close", id: editId, sessionId } as Msg);
      ch.close();
    };
  }, [editId, sessionId]);

  return others.length > 0;
}
