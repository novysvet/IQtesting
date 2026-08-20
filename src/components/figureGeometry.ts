export interface FigureLayout {
  columns: number;
  rows: number;
  width: number;
  height: number;
}

import type { CellSpecV2, FigureSpec, MatrixFill, MatrixPosition, MatrixShape } from "../core/types.ts";

export const FIGURE_CELL = 30;
export const FIGURE_INSET = 3;
export const MAX_FIGURE_COUNT = 9;

export const MATRIX_POSITIONS = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"] as const;
export const MATRIX_SHAPES = ["tri", "sq", "cir", "dia", "hex", "arw", "cross", "star"] as const;
export const MATRIX_FILLS = ["none", "half", "solid", "hatch"] as const;

/** Mark centres inside the 100x100 structured-cell view box. */
export const POSITION_CENTER: Record<MatrixPosition, [number, number]> = {
  NW: [18, 18], N: [50, 18], NE: [82, 18],
  W: [18, 50], C: [50, 50], E: [82, 50],
  SW: [18, 82], S: [50, 82], SE: [82, 82],
};

/** Offsets for marks sharing one position; 0 means no sharing. */
export const OVERLAY_OFFSETS: Record<number, [number, number][]> = {
  0: [],
  1: [[0, 0]],
  2: [[-9, 0], [9, 0]],
  3: [[0, -9], [-9, 6], [9, 6]],
};

/** Order-independent identity for a structured cell, for key comparisons. */
export function canonicalCell(spec: FigureSpec): string {
  if (typeof spec === "string") return "legacy:" + spec;
  return spec.marks
    .map((m) => [m.pos, m.shape, m.fill, String((((m.rot % 360) + 360) % 360))].join("|"))
    .sort()
    .join(";;");
}

/** Throw on any malformed structured cell. Used by tests and the renderer. */
export function validateCellSpec(spec: FigureSpec): void {
  if (typeof spec === "string") {
    const bits = spec.split(":");
    if (bits.length !== 4) throw new Error("malformed legacy figure spec: " + spec);
    return;
  }
  if (spec.v !== 2) throw new Error("unknown structured cell version");
  if (!Array.isArray(spec.marks) || spec.marks.length === 0 || spec.marks.length > 8) {
    throw new Error("structured cell must carry 1..8 marks");
  }
  for (const mark of spec.marks) {
    if (!(MATRIX_SHAPES as readonly string[]).includes(mark.shape)) throw new Error("unknown shape " + mark.shape);
    if (!(MATRIX_FILLS as readonly string[]).includes(mark.fill)) throw new Error("unknown fill " + mark.fill);
    if (!(MATRIX_POSITIONS as readonly string[]).includes(mark.pos)) throw new Error("unknown position " + mark.pos);
    if (!Number.isFinite(mark.rot)) throw new Error("non-finite rotation");
  }
  const seen = new Set<string>();
  for (const mark of spec.marks) {
    const key = mark.pos + "|" + mark.shape + "|" + mark.fill + "|" + mark.rot;
    if (seen.has(key)) throw new Error("duplicate identical mark in one cell");
    seen.add(key);
  }
}

export type { CellSpecV2, MatrixFill, MatrixPosition, MatrixShape };

/** Keep repeated symbols legible by arranging them in a compact grid. */
export function figureLayout(count: number): FigureLayout {
  const safeCount = Math.max(1, Math.min(MAX_FIGURE_COUNT, Math.trunc(count) || 1));
  const columns = Math.ceil(Math.sqrt(safeCount));
  const rows = Math.ceil(safeCount / columns);
  return { columns, rows, width: columns * FIGURE_CELL, height: rows * FIGURE_CELL };
}

/** Separate branches prevent doubled strokes where a polyline retraces itself. */
export const ROTATION_PATHS: Record<string, string> = {
  L: "M6 4 V20 H18",
  Z: "M5 5 H15 L9 14 H19",
  T: "M5 5 H19 M12 5 V20 M12 14 H18",
  F: "M7 20 V4 H18 M7 11 H15",
  P: "M6 21 V4 H16 V11 H6 M6 14 H13",
};
