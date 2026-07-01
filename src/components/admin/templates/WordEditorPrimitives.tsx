export function Divider() {
  return <div className="w-px h-5 bg-white/15 mx-0.5 flex-shrink-0" />;
}

export function ToolBtn({ title, active, onClick, children, disabled }: {
  title: string; active?: boolean; onClick: () => void;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`h-7 min-w-[28px] px-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-white/60 hover:text-white hover:bg-white/10"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function ColorPicker({ value, onChange, title }: { value: string; onChange: (c: string) => void; title: string }) {
  const COLORS = [
    "#000000","#ffffff","#ef4444","#f97316","#eab308","#22c55e",
    "#3b82f6","#8b5cf6","#ec4899","#6b7280","#b91c1c","#1d4ed8",
  ];
  return (
    <div className="relative group">
      <button
        title={title}
        onMouseDown={e => e.preventDefault()}
        className="h-7 w-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <div className="w-4 h-4 rounded-sm border border-white/20" style={{ background: value || "#000" }} />
      </button>
      <div className="absolute top-full left-0 mt-1 bg-[#1e1f23] border border-white/15 rounded-lg p-2 shadow-xl z-50 hidden group-hover:grid grid-cols-6 gap-1 w-[112px]">
        {COLORS.map(c => (
          <button
            key={c}
            onMouseDown={e => { e.preventDefault(); onChange(c); }}
            className="w-4 h-4 rounded-sm border border-white/20 hover:scale-110 transition-transform"
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={value || "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-4 h-4 rounded-sm cursor-pointer border-0 p-0"
          title="Произвольный цвет"
        />
      </div>
    </div>
  );
}

export function Tab({ id, active, label, onClick }: { id: string; active: boolean; label: string; onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
        active ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}
