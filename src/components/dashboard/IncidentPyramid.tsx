interface PyramidData {
  fatal: number;
  severe_injury: number;
  light_injury: number;
  microtrauma: number;
  no_consequences: number;
  totalViolations: number;
  suspendedWorks: number;
}

interface IncidentPyramidProps {
  data: PyramidData;
  year?: number;
}

export default function IncidentPyramid({ data, year }: IncidentPyramidProps) {
  const { fatal, severe_injury, light_injury, microtrauma, no_consequences, totalViolations, suspendedWorks } = data;

  const layers = [
    {
      label: "Смертельные случаи",
      valueOT: fatal,
      widthPct: 22,
      color: "#ef4444",
      borderColor: "#dc2626",
      dotColor: "#ef4444",
      dotted: true,
    },
    {
      label: "Тяжелые несчастные случаи",
      valueOT: severe_injury,
      widthPct: 38,
      color: "#f87171",
      borderColor: "#ef4444",
      dotColor: "#ef4444",
      dotted: true,
    },
    {
      label: "Легкие несчастные случаи",
      valueOT: light_injury,
      widthPct: 54,
      color: "#93c5fd",
      borderColor: "#60a5fa",
      dotColor: "#60a5fa",
      dotted: true,
    },
    {
      label: "Микротравмы",
      valueOT: microtrauma,
      valuePB: no_consequences,
      labelPB: "Происшествия",
      widthPct: 70,
      color: "#60a5fa",
      borderColor: "#3b82f6",
      dotColor: "#60a5fa",
      dotted: true,
    },
    {
      label: "Опасные действия/ опасные условия (нарушения)",
      valueOT: totalViolations,
      valuePB: suspendedWorks,
      labelPB: "Приостановки работ",
      widthPct: 100,
      color: "#94a3b8",
      borderColor: "#64748b",
      dotted: false,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      {year && (
        <div className="text-center mb-1">
          <span className="text-base font-bold text-foreground">{year} год</span>
        </div>
      )}
      <h3 className="text-base font-semibold text-primary text-center mb-4">Пирамида происшествий (НИТ)</h3>

      <div className="flex-1 flex flex-col justify-end gap-0 relative" style={{ minHeight: 280 }}>
        {layers.map((layer, idx) => {
          const isBase = idx === layers.length - 1;
          return (
            <div key={idx} className="relative flex items-center w-full" style={{ marginBottom: isBase ? 0 : 0 }}>
              {/* Left label */}
              <div className="w-[28%] pr-2 flex flex-col items-end justify-center">
                <span className="text-[10px] text-muted-foreground text-right leading-tight">{layer.label}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 flex items-center justify-center relative">
                {layer.dotted && (
                  <div
                    className="absolute w-full"
                    style={{
                      top: 0,
                      borderTop: `1px dotted ${layer.dotColor}`,
                      zIndex: 0,
                    }}
                  />
                )}
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    width: `${layer.widthPct}%`,
                    backgroundColor: layer.color,
                    minHeight: isBase ? 36 : 32,
                    borderLeft: `2px solid ${layer.borderColor}`,
                    borderRight: `2px solid ${layer.borderColor}`,
                    borderBottom: isBase ? `2px solid ${layer.borderColor}` : "none",
                    clipPath: isBase
                      ? "none"
                      : idx === 0
                      ? "polygon(10% 100%, 50% 0%, 90% 100%)"
                      : "none",
                    zIndex: 1,
                  }}
                >
                  {idx !== 0 && (
                    <span className="text-sm font-bold text-white drop-shadow z-10">
                      {layer.valueOT}
                    </span>
                  )}
                </div>

                {/* Dot indicator */}
                {layer.dotted && (
                  <div
                    className="absolute left-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: layer.dotColor, zIndex: 2 }}
                  />
                )}
              </div>

              {/* Right label/value */}
              <div className="w-[28%] pl-2 flex flex-col justify-center">
                {layer.valuePB !== undefined && (
                  <>
                    <span className="text-sm font-bold text-foreground">{layer.valuePB}</span>
                    {layer.labelPB && (
                      <span className="text-[10px] text-muted-foreground leading-tight">{layer.labelPB}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* OT / PB labels */}
        <div className="flex items-center w-full mt-1">
          <div className="w-[28%]" />
          <div className="flex-1 flex justify-around">
            <span className="text-xs font-semibold text-amber-400">ОТ</span>
            <span className="text-xs font-semibold text-primary">ПБ</span>
          </div>
          <div className="w-[28%]" />
        </div>
      </div>

      {/* Fatal value overlay — top of pyramid */}
      <style>{`
        .pyramid-fatal {
          position: relative;
          z-index: 5;
        }
      `}</style>
    </div>
  );
}
