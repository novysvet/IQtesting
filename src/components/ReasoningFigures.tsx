/**
 * Renderers for the 2026-08-22 fluid/quantitative additions: Figure Weights
 * balance scales and the Graph Mapping model/copy pair. Pure SVG derived
 * from the same structured specs the answer keys are machine-verified
 * against (test/weights.test.ts, test/graphmap.test.ts).
 */

import type { WeightShapeId } from "../core/types.ts";

/** FIXED shape palette for Figure Weights: geometry and color are 1:1, so
 * color is always redundant information — color-blind examinees lose an
 * anchor, never a discriminant (the Pearson WAIS-IV color-vision caveat,
 * designed out). */
const WEIGHT_COLORS: Record<WeightShapeId, string> = {
  tri: "#C0392B",
  sq: "#2E5FA3",
  cir: "#3E9B4F",
  dia: "#B8860B",
  hex: "#2AA198",
  star: "#7B52AB",
};

const WEIGHT_NAMES: Record<WeightShapeId, string> = {
  tri: "triangle",
  sq: "square",
  cir: "circle",
  dia: "diamond",
  hex: "hexagon",
  star: "star",
};

const STROKE = "var(--ink, #1C2430)";

function shapePoints(kind: WeightShapeId, cx: number, cy: number, r: number): string {
  switch (kind) {
    case "sq": {
      const k = r * 0.9;
      return [cx - k, cy - k, cx + k, cy - k, cx + k, cy + k, cx - k, cy + k].join(" ");
    }
    case "tri":
      return [cx, cy - r, cx + r * 0.95, cy + r * 0.78, cx - r * 0.95, cy + r * 0.78].join(" ");
    case "dia":
      return [cx, cy - r, cx + r * 0.82, cy, cx, cy + r, cx - r * 0.82, cy].join(" ");
    case "hex": {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        pts.push((cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2));
      }
      return pts.join(" ");
    }
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        pts.push((cx + rr * Math.cos(a)).toFixed(2), (cy + rr * Math.sin(a)).toFixed(2));
      }
      return pts.join(" ");
    }
    default:
      return "";
  }
}

/** One colored weight shape at (cx, cy). */
export function WeightShapeGlyph({ kind, cx, cy, r = 10.5 }: { kind: WeightShapeId; cx: number; cy: number; r?: number }) {
  if (kind === "cir") {
    return <circle cx={cx} cy={cy} r={r * 0.92} fill={WEIGHT_COLORS[kind]} stroke={STROKE} strokeWidth={1.1} />;
  }
  return <polygon points={shapePoints(kind, cx, cy, r)} fill={WEIGHT_COLORS[kind]} stroke={STROKE} strokeWidth={1.1} strokeLinejoin="round" />;
}

function Pan({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g stroke={STROKE} strokeWidth={1.6} fill="none">
      <line x1={x - 3} y1={y - 26} x2={x - w / 2} y2={y - 3} strokeWidth={1} />
      <line x1={x + 3} y1={y - 26} x2={x + w / 2} y2={y - 3} strokeWidth={1} />
      <path d={"M " + (x - w / 2) + " " + (y - 3) + " q " + w / 2 + " " + 15 + " " + w + " 0"} fill="var(--paper, #fff)" />
    </g>
  );
}

function ScaleRow({ left, right, query }: { left: WeightShapeId[]; right: WeightShapeId[]; query?: boolean }) {
  const W = 320;
  const panL = 82;
  const panR = 238;
  const panY = 66;
  const gapW = 26;
  const drawPanShapes = (shapes: WeightShapeId[], x: number) => {
    const total = shapes.length * gapW;
    return shapes.map((s, i) => (
      <WeightShapeGlyph key={i} kind={s} cx={x - total / 2 + gapW / 2 + i * gapW} cy={panY - 12} />
    ));
  };
  return (
    <svg viewBox={"0 0 " + W + " 100"} width={W} role="img"
      aria-label={(query ? "scale to balance: " : "balanced scale: ") +
        left.map((s) => WEIGHT_NAMES[s]).join(", ") + " equals " + right.map((s) => WEIGHT_NAMES[s]).join(", ")}
      className="weights-scale">
      <g stroke={STROKE} strokeWidth={2} fill="none">
        <line x1={22} y1={30} x2={W - 22} y2={30} />
      </g>
      <polygon points={"160,30 148,88 172,88"} fill="var(--paper, #fff)" stroke={STROKE} strokeWidth={1.6} />
      <line x1={140} y1={88} x2={180} y2={88} stroke={STROKE} strokeWidth={2} />
      <Pan x={panL} y={panY} w={124} />
      <Pan x={panR} y={panY} w={124} />
      {drawPanShapes(left, panL)}
      {drawPanShapes(right, panR)}
      {query && (
        <g>
          <rect x={panR - 13} y={panY - 25} width={26} height={26} rx={4} fill="none" stroke={STROKE} strokeWidth={1.3} strokeDasharray="4 3" />
          <text x={panR} y={panY - 6} textAnchor="middle" fontSize={16} fontWeight={700} fill={STROKE}>?</text>
        </g>
      )}
    </svg>
  );
}

/**
 * Figure Weights stimulus: the balanced demonstration scales stacked above
 * the query scale whose right pan carries its given shapes plus the dashed
 * "?" gap the chosen option fills. Every beam is drawn level — the shapes'
 * weights are not visual (no tilt information), they are inferred from the
 * demonstrated equivalences.
 */
export function WeightsFigure({ demo, query }: { demo: [WeightShapeId[], WeightShapeId[]][]; query: { left: WeightShapeId[]; right: WeightShapeId[] } }) {
  return (
    <div className="weights-fig">
      {[...demo, null].map((row, i) =>
        row === null
          ? <ScaleRow key="q" left={query.left} right={query.right} query />
          : <ScaleRow key={i} left={row[0]} right={row[1]} />,
      )}
    </div>
  );
}

/** An answer-option cluster: the group of shapes encoded as "tri,sq". */
export function WeightGroupFigure({ group }: { group: string }) {
  const shapes = group.split(",").filter(Boolean) as WeightShapeId[];
  const gap = 24;
  const W = Math.max(shapes.length * gap, 30);
  return (
    <svg viewBox={"0 0 " + W + " 30"} width={W} role="img"
      aria-label={shapes.map((s) => WEIGHT_NAMES[s]).join(" and ")}
      className="weights-option">
      {shapes.map((s, i) => (
        <WeightShapeGlyph key={i} kind={s} cx={gap / 2 + i * gap} cy={15} r={9.5} />
      ))}
    </svg>
  );
}

/** Graph Mapping node colors: FIXED map from degree class. Machine-checked
 * (test/graphmap.test.ts asserts every node's color equals its degree), so
 * color is a redundant structural cue, never a decorative one. */
export const GRAPH_DEGREE_COLORS: Record<number, string> = {
  1: "#3E9B4F",
  2: "#2E5FA3",
  3: "#C0392B",
  4: "#B8860B",
  5: "#7B52AB",
};

function GraphSvg({ positions, edges, targets, numbered }: {
  positions: [number, number][];
  edges: [number, number][];
  targets?: [number, number];
  numbered?: boolean;
}) {
  return (
    <svg viewBox="0 0 150 130" role="img" className="graph-svg"
      aria-label={numbered ? "rearranged numbered copy of the model graph" : "model graph with two ringed nodes"}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={positions[a]![0]} y1={positions[a]![1]} x2={positions[b]![0]} y2={positions[b]![1]} stroke={STROKE} strokeWidth={1.4} />
      ))}
      {positions.map(([x, y], i) => {
        const isTarget = targets !== undefined && (targets[0] === i || targets[1] === i);
        const degree = edges.filter(([a, b]) => a === i || b === i).length;
        return (
          <g key={i}>
            {isTarget && <circle cx={x} cy={y} r={16} fill="none" stroke={STROKE} strokeWidth={2.4} />}
            <circle cx={x} cy={y} r={10.5}
              fill={numbered ? "var(--paper-sunk, #E8EAED)" : GRAPH_DEGREE_COLORS[degree] ?? "#666"}
              stroke={STROKE} strokeWidth={1.4} />
            {numbered && (
              <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={STROKE}>{i + 1}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Graph Mapping stimulus: the colored model with two ringed target nodes,
 * beside its rearranged, numbered, uncolored isomorphic copy.
 */
export function GraphFigure({ ref, scrambled }: {
  ref: { positions: [number, number][]; edges: [number, number][]; targets: [number, number] };
  scrambled: { positions: [number, number][]; edges: [number, number][] };
}) {
  return (
    <div className="graph-fig">
      <div className="graph-panel"><span className="label">Model</span><GraphSvg positions={ref.positions} edges={ref.edges} targets={ref.targets} /></div>
      <div className="graph-panel"><span className="label">Rearranged copy</span><GraphSvg positions={scrambled.positions} edges={scrambled.edges} numbered /></div>
    </div>
  );
}
