export interface FigureLayout {
  columns: number;
  rows: number;
  width: number;
  height: number;
}

export const FIGURE_CELL = 30;
export const FIGURE_INSET = 3;
export const MAX_FIGURE_COUNT = 9;

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
