import Icon from "@/components/ui/icon";

interface PyramidData {
  fatal: number;
  severe_injury: number;
  light_injury: number;
  microtrauma: number;
  no_consequences: number;
  totalViolations: number;
  suspendedWorks: number;
  suspendedWorksWithAct?: number;
}

interface IncidentPyramidProps {
  data: PyramidData;
  year?: number;
  editable?: boolean;
  manualDangerActions?: number;
  manualSuspendedWorks?: number;
  onManualDangerActionsChange?: (v: number) => void;
  onManualSuspendedWorksChange?: (v: number) => void;
  onSave?: () => void;
  saving?: boolean;
}

function clampFiveDigits(raw: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(n, 99999);
}

export default function IncidentPyramid({
  data, year, editable,
  manualDangerActions = 0, manualSuspendedWorks = 0,
  onManualDangerActionsChange, onManualSuspendedWorksChange,
  onSave, saving,
}: IncidentPyramidProps) {
  const { fatal, severe_injury, light_injury, microtrauma, no_consequences, totalViolations, suspendedWorks, suspendedWorksWithAct } = data;

  const totalDangerActions = totalViolations + (manualDangerActions || 0);
  const totalSuspendedWorks = suspendedWorks + (manualSuspendedWorks || 0);
  const suspendedWorksLabel = suspendedWorksWithAct
    ? `${totalSuspendedWorks}(${suspendedWorksWithAct})`
    : String(totalSuspendedWorks);
  const suspendedWorksCalcLabel = suspendedWorksWithAct ? `${suspendedWorks}(${suspendedWorksWithAct})` : String(suspendedWorks);

  const W = 420;
  const H = 340;

  const apexX = W / 2;
  const apexY = 20;
  const baseY = H - 44;
  const baseLeft = 30;
  const baseRight = W - 30;
  const totalH = baseY - apexY;

  const ratios = [0, 0.155, 0.31, 0.465, 0.665, 1];
  const cuts = ratios.map(r => apexY + r * totalH);

  function xAtY(y: number) {
    const t = (y - apexY) / totalH;
    const halfBase = (baseRight - baseLeft) / 2;
    return {
      left: apexX - t * halfBase,
      right: apexX + t * halfBase,
    };
  }

  const layers = [
    {
      label: "Смертельные\nслучаи",
      valLeft: fatal,
      valRight: null as number | null,
      labelRight: null as string | null,
      fillLeft: "#c0362a",
      fillRight: "#c0362a",
      stroke: "#e05248",
      dotColor: "#ef4444",
    },
    {
      label: "Тяжелые несчастные\nслучаи",
      valLeft: severe_injury,
      valRight: null,
      labelRight: null,
      fillLeft: "#d9534f",
      fillRight: "#d9534f",
      stroke: "#e06b68",
      dotColor: "#ef4444",
    },
    {
      label: "Легкие несчастные\nслучаи",
      valLeft: light_injury,
      valRight: null,
      labelRight: null,
      fillLeft: "#93b8d4",
      fillRight: "#93b8d4",
      stroke: "#7aa8cb",
      dotColor: "#7db9e8",
    },
    {
      label: "Микротравмы",
      valLeft: microtrauma,
      valRight: no_consequences,
      labelRight: "Происшествия",
      fillLeft: "#5b8db8",
      fillRight: "#4a7da8",
      stroke: "#3a6d98",
      dotColor: "#7db9e8",
    },
    {
      label: "Опасные действия/\nопасные условия\n(нарушения)",
      valLeft: totalDangerActions,
      valRight: totalSuspendedWorks,
      valRightDisplay: suspendedWorksLabel as string | number,
      labelRight: "Приостановки\nработ",
      fillLeft: "#8a9bb0",
      fillRight: "#7a8ba0",
      stroke: "#6e82a0",
      dotColor: null,
    },
  ];

  const labelPanelW = 90;
  const totalSvgW = labelPanelW + W + labelPanelW;
  const totalSvgH = H;
  const ox = labelPanelW;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col h-full py-0 my-0">
      {year && (
        <div className="text-center mb-0.5">
          <span className="text-foreground font-black text-sm"></span>
        </div>
      )}
      <h3 className="font-semibold text-primary text-center mb-2 text-base">Пирамида происшествий (НИТ)</h3>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${totalSvgW} ${totalSvgH}`}
          width="100%"
          style={{ maxHeight: 360 }}
          fontFamily="'IBM Plex Sans', sans-serif"
        >
          {[...layers].reverse().map((layer, ri) => {
            const i = layers.length - 1 - ri;
            const y0 = cuts[i];
            const y1 = cuts[i + 1];
            const t0 = xAtY(y0);
            const t1 = xAtY(y1);
            const isTop = i === 0;
            const hasSplit = layer.valRight !== null;
            const midY = (y0 + y1) / 2;
            // Split line parallel to right side: fixed horizontal offset from right edge
            const pbOffset = (baseRight - baseLeft) * 0.2;
            const cx0 = ox + t0.right - pbOffset;
            const cx1 = ox + t1.right - pbOffset;
            const cxMid = (cx0 + cx1) / 2;

            const fullPoints = isTop
              ? `${ox + apexX},${y0} ${ox + t1.left},${y1} ${ox + t1.right},${y1}`
              : `${ox + t0.left},${y0} ${ox + t0.right},${y0} ${ox + t1.right},${y1} ${ox + t1.left},${y1}`;

            const leftPoints = isTop
              ? `${ox + apexX},${y0} ${ox + t1.left},${y1} ${cx1},${y1}`
              : `${ox + t0.left},${y0} ${cx0},${y0} ${cx1},${y1} ${ox + t1.left},${y1}`;

            const rightPoints = isTop
              ? `${ox + apexX},${y0} ${cx1},${y1} ${ox + t1.right},${y1}`
              : `${cx0},${y0} ${ox + t0.right},${y0} ${ox + t1.right},${y1} ${cx1},${y1}`;

            const leftMidX = (ox + (isTop ? t1.left : t0.left) + cxMid) / 2;
            const rightMidX = (cxMid + ox + (isTop ? t1.right : t0.right)) / 2;

            return (
              <g key={i}>
                {!hasSplit ? (
                  <polygon points={fullPoints} fill={layer.fillLeft} stroke={layer.stroke} strokeWidth="1.2" strokeLinejoin="round" />
                ) : (
                  <>
                    <polygon points={leftPoints} fill={layer.fillLeft} stroke={layer.stroke} strokeWidth="1.2" strokeLinejoin="round" />
                    <polygon points={rightPoints} fill={layer.fillRight} stroke={layer.stroke} strokeWidth="1.2" strokeLinejoin="round" />
                  </>
                )}

                {!isTop && (
                  <line x1={ox + t0.left} y1={y0} x2={ox + t0.right} y2={y0} stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
                )}

                {hasSplit && (
                  <line x1={cx0} y1={y0} x2={cx1} y2={y1} stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
                )}

                {!isTop && layer.dotColor && (
                  <>
                    <line
                      x1={ox} y1={y0} x2={ox + t0.left} y2={y0}
                      stroke={layer.dotColor} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.9"
                    />
                    <circle cx={ox + t0.left - 1} cy={y0} r="3.5" fill={layer.dotColor} />
                  </>
                )}

                {!hasSplit ? (
                  <text x={ox + apexX} y={midY + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="white">
                    {layer.valLeft}
                  </text>
                ) : i === layers.length - 1 ? (
                  // Base layer: values centered in each half (80/20 split)
                  editable ? (
                    <>
                      <foreignObject x={(ox + t1.left + cx1) / 2 - 60} y={midY - 11} width={120} height={22}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            value={manualDangerActions || ""}
                            onChange={e => onManualDangerActionsChange?.(clampFiveDigits(e.target.value))}
                            placeholder="0"
                            style={{ width: 46, fontSize: 12, fontWeight: 700, textAlign: "center", background: "rgba(0,0,0,0.35)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 4, padding: "1px 2px" }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>+</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{totalViolations}</span>
                        </div>
                      </foreignObject>
                      <foreignObject x={((cx0 + cx1) / 2 + (ox + t0.right + ox + t1.right) / 2) / 2 - 65} y={midY - 11} width={130} height={22}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            value={manualSuspendedWorks || ""}
                            onChange={e => onManualSuspendedWorksChange?.(clampFiveDigits(e.target.value))}
                            placeholder="0"
                            style={{ width: 46, fontSize: 12, fontWeight: 700, textAlign: "center", background: "rgba(0,0,0,0.35)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 4, padding: "1px 2px" }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>+</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{suspendedWorksCalcLabel}</span>
                        </div>
                      </foreignObject>
                    </>
                  ) : (
                    <>
                      <text x={(ox + t1.left + cx1) / 2} y={midY} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="white">
                        {layer.valLeft}
                      </text>
                      <text x={((cx0 + cx1) / 2 + (ox + t0.right + ox + t1.right) / 2) / 2} y={midY} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="white">
                        {"valRightDisplay" in layer ? layer.valRightDisplay : layer.valRight}
                      </text>
                    </>
                  )
                ) : (
                  // Split layer (microtrauma): values centered in each half (80/20 split)
                  <>
                    <text x={leftMidX} y={midY} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill="white">
                      {layer.valLeft}
                    </text>
                    <text x={rightMidX} y={midY} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill="white">
                      {layer.valRight}
                    </text>
                  </>
                )}

                {/* Left label panel */}
                <foreignObject x={0} y={y0} width={labelPanelW - 6} height={y1 - y0}>
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
                    <span style={{ fontSize: 9, color: "#94a3b8", textAlign: "right", lineHeight: 1.3, whiteSpace: "pre-line" }}>
                      {layer.label}
                    </span>
                  </div>
                </foreignObject>

                {/* Right label panel — for base and microtrauma layers */}
                {(i === layers.length - 1 || i === layers.length - 2) && layer.labelRight && (
                  <foreignObject x={ox + W + 4} y={y0} width={labelPanelW - 4} height={y1 - y0}>
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 6 }}>
                      <span style={{ fontSize: 9, color: "#94a3b8", textAlign: "left", lineHeight: 1.3, whiteSpace: "pre-line" }}>
                        {layer.labelRight}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          <text x={ox + apexX - (xAtY(baseY).right - apexX) / 2} y={baseY + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f59e0b"></text>
          <text x={ox + apexX + (xAtY(baseY).right - apexX) / 2} y={baseY + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill="#38bdf8"></text>
        </svg>
      </div>

      {editable && (
        <div className="flex justify-end mt-1">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
          >
            <Icon name={saving ? "Loader" : "Save"} size={13} className={saving ? "animate-spin" : ""} />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}