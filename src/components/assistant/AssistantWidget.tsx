import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AppUser, ROLE_LABELS } from "@/lib/auth";

const AI_ASSISTANT_URL = "https://functions.poehali.dev/8baa3992-c91f-45b7-abf8-2a4082e8c671";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default function AssistantWidget({ user }: { user: AppUser }) {
  const [enabled, setEnabled] = useState(true);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${AI_ASSISTANT_URL}?public=1`)
      .then(r => r.json())
      .then(data => setEnabled(data.assistant_enabled !== false))
      .catch(() => setEnabled(true))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages;
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(AI_ASSISTANT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          user_name: user.name,
          user_role: ROLE_LABELS[user.role],
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "model", text: data.reply || data.error || "Не удалось получить ответ." }]);
    } catch {
      setMessages(prev => [...prev, { role: "model", text: "Ошибка соединения. Попробуйте ещё раз." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!checked || !enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:bg-primary/90 transition-colors"
        title="ИИ-помощник"
      >
        <Icon name={open ? "X" : "Sparkles"} size={22} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[70vh] max-h-[600px] bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                <Icon name="Sparkles" size={14} />
              </div>
              <span className="text-sm font-semibold">ИИ-помощник</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="text-center text-xs text-muted-foreground py-8 leading-relaxed">
                Спросите про охрану труда, нормы и правила или попросите помочь сформулировать замечание для предписания.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center flex-shrink-0">
                  <Icon name={m.role === "user" ? "User" : "Sparkles"} size={12} />
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary/15 text-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center flex-shrink-0">
                  <Icon name="Sparkles" size={12} />
                </div>
                <div className="bg-secondary text-muted-foreground rounded-xl rounded-tl-sm px-3 py-2 text-sm flex items-center gap-1.5">
                  <Icon name="Loader2" size={13} className="animate-spin" />
                  Думаю...
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-3 border-t border-border flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Спросите про охрану труда..."
              disabled={loading}
              className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="bg-primary text-primary-foreground p-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Icon name="Send" size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}