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

  // SVG dimensions
  const W = 340;
  const H = 300;

  // Pyramid apex and base
  const apexX = W / 2;
  const apexY = 18;
  const baseY = H - 10;
  const baseLeft = 18;
  const baseRight = W - 18;

  // 5 layers from top to bottom (y positions of dividing lines)
  // Layer proportions (height): fatal 16%, severe 16%, light 16%, micro 20%, base 32%
  const totalH = baseY - apexY;
  const cuts = [0, 0.16, 0.32, 0.48, 0.68, 1].map(p => apexY + p * totalH);

  // At each y, the triangle width
  function xAtY(y: number) {
    const t = (y - apexY) / totalH;
    const halfW = t * (baseRight - apexX);
    return { left: apexX - halfW, right: apexX + halfW };
  }

  // Build layer trapezoids
  const layers = [
    { fill: "#c0362a", stroke: "#e05248", label: "Смертельные случаи",        valOT: fatal,         valPB: null,             labelPB: null,                   dotColor: "#ef4444" },
    { fill: "#d9534f", stroke: "#e06b68", label: "Тяжелые несчастные случаи", valOT: severe_injury, valPB: null,             labelPB: null,                   dotColor: "#ef4444" },
    { fill: "#93b8d4", stroke: "#7aa8cb", label: "Легкие несчастные случаи",  valOT: light_injury,  valPB: null,             labelPB: null,                   dotColor: "#7db9e8" },
    { fill: "#5b8db8", stroke: "#4a7da8", label: "Микротравмы",               valOT: microtrauma,   valPB: no_consequences,  labelPB: "Происшествия",         dotColor: "#7db9e8" },
    { fill: "#8a9bb0", stroke: "#6e82a0", label: "Опасные действия/\nопасные условия\n(нарушения)", valOT: totalViolations, valPB: suspendedWorks, labelPB: "Приостановки работ", dotColor: null },
  ];

  // Left/right label panel widths
  const leftW = 88;
  const rightW = 88;
  const centerW = W;
  const totalW = leftW + centerW + rightW;
  const svgH = H + 28; // extra for OT/PB labels

  // Offset SVG pyramid inside full-width SVG
  const ox = leftW;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col h-full">
      {year && (
        <div className="text-center mb-0.5">
          <span className="text-sm font-bold text-foreground">{year} год</span>
        </div>
      )}
      <h3 className="text-sm font-semibold text-primary text-center mb-3">Пирамида происшествий (НИТ)</h3>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${totalW} ${svgH}`}
          width="100%"
          style={{ maxHeight: 340 }}
          fontFamily="'IBM Plex Sans', sans-serif"
        >
          {/* Render layers bottom-to-top so top renders on top */}
          {[...layers].reverse().map((layer, ri) => {
            const i = layers.length - 1 - ri;
            const y0 = cuts[i];
            const y1 = cuts[i + 1];
            const t0 = xAtY(y0);
            const t1 = xAtY(y1);
            const isTop = i === 0;
            const isBase = i === layers.length - 1;

            // Trapezoid points (or triangle for top)
            const points = isTop
              ? `${ox + apexX},${y0} ${ox + t1.left},${y1} ${ox + t1.right},${y1}`
              : `${ox + t0.left},${y0} ${ox + t0.right},${y0} ${ox + t1.right},${y1} ${ox + t1.left},${y1}`;

            // Center of layer for value label
            const midY = (y0 + y1) / 2;
            const midX = ox + apexX;

            // Dotted line at top of layer (except very top apex)
            const hasDotLine = !isTop && layer.dotColor;
            const dotLineY = y0;

            return (
              <g key={i}>
                <polygon
                  points={points}
                  fill={layer.fill}
                  stroke={layer.stroke}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />

                {/* White divider line between layers */}
                {!isTop && !isBase && (
                  <line
                    x1={ox + t0.left} y1={y0}
                    x2={ox + t0.right} y2={y0}
                    stroke="white" strokeWidth="1.5" strokeOpacity="0.5"
                  />
                )}

                {/* Dotted horizontal line extending left and right */}
                {hasDotLine && (
                  <>
                    <line
                      x1={0} y1={dotLineY}
                      x2={ox + t0.left} y2={dotLineY}
                      stroke={layer.dotColor!}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.8"
                    />
                    <line
                      x1={ox + t0.right} y1={dotLineY}
                      x2={totalW} y2={dotLineY}
                      stroke={layer.dotColor!}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.8"
                    />
                    {/* Dot on left edge */}
                    <circle cx={ox + t0.left} cy={dotLineY} r="3.5" fill={layer.dotColor!} />
                  </>
                )}

                {/* Value OT in center */}
                <text
                  x={midX} y={midY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={i === layers.length - 1 ? 13 : 12}
                  fontWeight="700"
                  fill="white"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  {layer.valOT}
                </text>

                {/* Left label */}
                <foreignObject
                  x={0}
                  y={y0}
                  width={leftW - 4}
                  height={y1 - y0}
                >
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 6,
                    }}
                  >
                    <span style={{
                      fontSize: 9,
                      color: "#94a3b8",
                      textAlign: "right",
                      lineHeight: 1.25,
                      whiteSpace: "pre-line",
                    }}>
                      {layer.label}
                    </span>
                  </div>
                </foreignObject>

                {/* Right value + label (PB column) */}
                {layer.valPB !== null && (
                  <foreignObject
                    x={ox + centerW + 4}
                    y={y0}
                    width={rightW - 4}
                    height={y1 - y0}
                  >
                    <div style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      paddingLeft: 4,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                        {layer.valPB}
                      </span>
                      <span style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.2 }}>
                        {layer.labelPB}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* OT / PB column headers at bottom */}
          {/* OT label — below center-left */}
          <text
            x={ox + apexX - 30}
            y={svgH - 6}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="#f59e0b"
          ></text>

          {/* PB label — below right column */}
          <text
            x={ox + centerW + rightW / 2}
            y={svgH - 6}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="#38bdf8"
          ></text>
        </svg>
      </div>
    </div>
  );
}