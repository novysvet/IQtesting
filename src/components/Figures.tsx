import { memo, useId } from "react";
import type { CellSpecV2, FigureSpec, MatrixMark, MatrixPosition } from "../core/types.ts";
import {
  FIGURE_CELL,
  FIGURE_INSET,
  MAX_FIGURE_COUNT,
  OVERLAY_OFFSETS,
  POSITION_CENTER,
  ROTATION_PATHS,
  figureLayout,
  validateCellSpec,
} from "./figureGeometry.ts";

/**
 * Figure rendering for non-verbal items.
 *
 * Item banks encode figures as compact spec strings rather than SVG markup so
 * that an answer key can be derived from a stated rule and audited. This
 * module is the single place those specs become pixels.
 *
 *   shape spec:  shape:count:fill:rot      e.g. "tri:3:half:45"
 *   rotation:    figId:degrees:mirrored    e.g. "P:135:1"
 *   fold holes:  JSON array of 4x4 indices e.g. "[0,3,12,15]"
 */

const STROKE = 1.9;

type Fill = "none" | "half" | "solid" | "hatch";

function fillProps(fill: Fill, id: string) {
  switch (fill) {
    case "solid": return { fill: "var(--figure)", stroke: "var(--figure)" };
    case "half": return { fill: "url(#half-" + id + ")", stroke: "var(--figure)" };
    case "hatch": return { fill: "url(#hatch-" + id + ")", stroke: "var(--figure)" };
    default: return { fill: "none", stroke: "var(--figure)" };
  }
}

interface Geom { el: "polygon" | "circle"; pts?: string; r?: number }

/** Unit shapes drawn in a 24x24 box centred on (12,12). */
function shapePath(shape: string): Geom {
  switch (shape) {
    case "tri":   return { el: "polygon", pts: "12,2 22,21 2,21" };
    case "sq":    return { el: "polygon", pts: "3,3 21,3 21,21 3,21" };
    case "cir":   return { el: "circle", r: 9.5 };
    case "dia":   return { el: "polygon", pts: "12,1.5 22.5,12 12,22.5 1.5,12" };
    case "hex":   return { el: "polygon", pts: "12,2 21,7 21,17 12,22 3,17 3,7" };
    case "arw":   return { el: "polygon", pts: "12,2 20,13 14,13 14,22 10,22 10,13 4,13" };
    case "cross": return { el: "polygon", pts: "9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9" };
    case "star":  return { el: "polygon", pts: "12,1.5 14.6,9 22.5,9 16.1,13.8 18.5,21.5 12,16.7 5.5,21.5 7.9,13.8 1.5,9 9.4,9" };
    default:      return { el: "polygon", pts: "3,3 21,3 21,21 3,21" };
  }
}

/** One encoded figure: possibly several copies of a shape in a row. */
export const Figure = memo(function Figure({ spec, size = 74 }: { spec: string; size?: number }) {
  const bits = spec.split(":");
  const shape = bits[0] ?? "sq";
  const count = Math.max(1, Math.min(MAX_FIGURE_COUNT, Number(bits[1]) || 1));
  const fill = (bits[2] ?? "none") as Fill;
  const rot = Number(bits[3]) || 0;
  const uid = shape + "-" + fill + "-" + count + "-" + rot;
  const layout = figureLayout(count);
  const geom = shapePath(shape);
  const props = fillProps(fill, uid);

  const copies = Array.from({ length: count }, (_, i) => {
    const column = i % layout.columns;
    const row = Math.floor(i / layout.columns);
    const x = FIGURE_INSET + column * FIGURE_CELL;
    const y = FIGURE_INSET + row * FIGURE_CELL;
    const transform = "translate(" + x + " " + y + ") rotate(" + rot + " 12 12)";
    if (geom.el === "circle") {
      return <circle key={i} cx={12} cy={12} r={geom.r} strokeWidth={STROKE} {...props} transform={transform} />;
    }
    return <polygon key={i} points={geom.pts} strokeWidth={STROKE} strokeLinejoin="round" {...props} transform={transform} />;
  });

  return (
    <svg
      viewBox={"0 0 " + layout.width + " " + layout.height}
      width={size}
      height={size * (layout.height / layout.width)}
      role="img"
      aria-label="visual reasoning figure"
    >
      <defs>
        <pattern id={"half-" + uid} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="2" height="4" fill="var(--figure)" />
        </pattern>
        <pattern id={"hatch-" + uid} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="var(--figure)" strokeWidth="1.1" />
        </pattern>
      </defs>
      {copies}
    </svg>
  );
});

/**
 * Structured (v2) matrix cell: up to 8 marks independently placed on a
 * 3x3 interior grid. Mark shapes reuse the 24x24 unit geometry, drawn at
 * 0.8 scale so neighbouring marks never collide.
 */
export function StructuredCell({ spec, size = 62 }: { spec: CellSpecV2; size?: number }) {
  validateCellSpec(spec);
  // Unique per instance: several structured cells share one page, and their
  // pattern ids must not collide in the document.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const groups = new Map<MatrixPosition, MatrixMark[]>();
  for (const mark of spec.marks) {
    const list = groups.get(mark.pos) ?? [];
    list.push(mark);
    groups.set(mark.pos, list);
  }
  const scale = 0.8;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="matrix cell">
      <defs>
        {spec.marks.map((mark, i) => {
          if (mark.fill !== "half" && mark.fill !== "hatch") return null;
          return (
            <pattern key={i} id={mark.fill + "-" + uid + i} width="4" height="4" patternUnits="userSpaceOnUse"
              patternTransform={mark.fill === "hatch" ? "rotate(45)" : undefined}>
              {mark.fill === "half"
                ? <rect width="2" height="4" fill="var(--figure)" />
                : <line x1="0" y1="0" x2="0" y2="3" stroke="var(--figure)" strokeWidth="1.1" />}
            </pattern>
          );
        })}
      </defs>
      {[...groups.entries()].flatMap(([pos, marksAtPos]) => {
        const [cx, cy] = POSITION_CENTER[pos];
        // 4+ marks on one position reuse the 3-slot overlay layout.
        const offsets = OVERLAY_OFFSETS[marksAtPos.length] ?? OVERLAY_OFFSETS[3]!;
        return marksAtPos.map((mark, i) => {
          const [dx, dy] = offsets[i % offsets.length]!;
          const geom = shapePath(mark.shape);
          const props = fillProps(mark.fill, uid + spec.marks.indexOf(mark));
          const transform =
            "translate(" + (cx + dx - 12 * scale) + " " + (cy + dy - 12 * scale) + ") scale(" + scale + ") rotate(" + mark.rot + " 12 12)";
          return geom.el === "circle"
            ? <circle key={pos + i} cx={12} cy={12} r={geom.r} strokeWidth={STROKE} {...props} transform={transform} />
            : <polygon key={pos + i} points={geom.pts} strokeWidth={STROKE} strokeLinejoin="round" {...props} transform={transform} />;
        });
      })}
    </svg>
  );
}

/** 3x3 matrix with a marked empty cell. Cells are legacy specs or structured cells. */
export function MatrixFigure({ cells }: { cells: (FigureSpec | null)[] }) {
  return (
    <div className="mx-grid" role="group" aria-label="visual matrix stimulus">
      {cells.map((cell, i) => (
        <div key={i} className={cell === null ? "mx-cell mx-cell--empty" : "mx-cell"}>
          {cell === null
            ? <span className="mx-qmark" aria-label="missing cell">?</span>
            : typeof cell === "string"
              ? <Figure spec={cell} size={62} />
              : <StructuredCell spec={cell} size={62} />}
        </div>
      ))}
    </div>
  );
}

/** Series of figures followed by an unknown slot. */
export function SeriesFigure({ figures }: { figures: string[] }) {
  return (
    <div className="series-row" role="group" aria-label="visual figure series">
      {figures.map((f, i) => (
        <div key={i} className="series-cell"><Figure spec={f} size={64} /></div>
      ))}
      <div className="series-cell series-cell--empty"><span className="mx-qmark">?</span></div>
    </div>
  );
}

/** 4x4 punched-hole grid used by paper folding options. */
export function HoleGrid({ indices, size = 78 }: { indices: number[]; size?: number }) {
  const set = new Set(indices);
  const cell = size / 4;
  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} role="img"
      aria-label="visual hole pattern">
      <rect x="0.5" y="0.5" width={size - 1} height={size - 1} fill="none" stroke="var(--rule)" />
      {Array.from({ length: 3 }, (_, i) => (
        <g key={i} stroke="var(--rule)" strokeDasharray="2 3">
          <line x1={cell * (i + 1)} y1={0} x2={cell * (i + 1)} y2={size} />
          <line x1={0} y1={cell * (i + 1)} x2={size} y2={cell * (i + 1)} />
        </g>
      ))}
      {Array.from({ length: 16 }, (_, i) => {
        if (!set.has(i)) return null;
        const r = Math.floor(i / 4);
        const c = i % 4;
        return <circle key={i} cx={c * cell + cell / 2} cy={r * cell + cell / 2} r={cell * 0.26} fill="var(--figure)" />;
      })}
    </svg>
  );
}

/** Fold-sequence diagram: the sheet halving, then the punch. */
export function FoldDiagram({ steps, punches }: { steps: string[]; punches: [number, number][] }) {
  let w = 4;
  let h = 4;
  const frames: { w: number; h: number; crease: string | null }[] = [
    { w, h, crease: steps[0] ?? null },
  ];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i] === "V") w /= 2; else h /= 2;
    frames.push({ w, h, crease: steps[i + 1] ?? null });
  }
  const unit = 17;
  return (
    <div className="fold-strip" role="group" aria-label="visual folding sequence">
      {frames.map((f, i) => {
        const last = i === frames.length - 1;
        const fw = f.w * unit;
        const fh = f.h * unit;
        return (
          <div key={i} className="fold-frame">
            <svg width={fw} height={fh} viewBox={"0 0 " + fw + " " + fh} aria-label={f.crease === "V" ? "fold right half over to the left" : f.crease === "H" ? "fold bottom half upward" : last ? "folded sheet with punches" : "folded sheet"}>
              <defs>
                <marker id={"fold-arrowhead-" + i} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--signal)" />
                </marker>
              </defs>
              <rect x="0.5" y="0.5" width={fw - 1} height={fh - 1}
                fill="var(--paper-sunk)" stroke="var(--figure)" strokeWidth="1.3" />
              {f.crease === "V" && (
                <>
                  <line x1={fw / 2} y1={0} x2={fw / 2} y2={fh}
                    stroke="var(--signal)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <path d={"M " + (fw * 0.76) + " " + (fh * 0.30) + " Q " + (fw * 0.62) + " " + (fh * 0.14) + " " + (fw * 0.38) + " " + (fh * 0.30)}
                    fill="none" stroke="var(--signal)" strokeWidth="1.4" markerEnd={"url(#fold-arrowhead-" + i + ")"} />
                </>
              )}
              {f.crease === "H" && (
                <>
                  <line x1={0} y1={fh / 2} x2={fw} y2={fh / 2}
                    stroke="var(--signal)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <path d={"M " + (fw * 0.70) + " " + (fh * 0.76) + " Q " + (fw * 0.86) + " " + (fh * 0.62) + " " + (fw * 0.70) + " " + (fh * 0.38)}
                    fill="none" stroke="var(--signal)" strokeWidth="1.4" markerEnd={"url(#fold-arrowhead-" + i + ")"} />
                </>
              )}
              {last && punches.map((p, j) => (
                <circle key={j} cx={p[1] * unit + unit / 2} cy={p[0] * unit + unit / 2}
                  r={unit * 0.26} fill="var(--figure)" />
              ))}
            </svg>
            {!last && <span className="fold-arrow" aria-hidden="true">&rarr;</span>}
          </div>
        );
      })}
    </div>
  );
}

export function RotationFigure({ spec, size = 78 }: { spec: string; size?: number }) {
  const bits = spec.split(":");
  const figId = bits[0] ?? "L";
  const deg = Number(bits[1]) || 0;
  const mirrored = bits[2] === "1";
  const path = ROTATION_PATHS[figId] ?? ROTATION_PATHS.L;
  // Mirror across the vertical centre line first, then rotate. Order matters:
  // SVG applies transforms right-to-left, so the mirror is listed last.
  const transform = "rotate(" + deg + " 12 12)" + (mirrored ? " translate(24 0) scale(-1 1)" : "");
  // Do not expose rotation or mirror metadata: those properties are the task.
  const label = "abstract rotation figure";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label}>
      <path d={path} fill="none" stroke="var(--figure)" strokeWidth={2.3}
        strokeLinecap="round" strokeLinejoin="round" transform={transform} />
    </svg>
  );
}
