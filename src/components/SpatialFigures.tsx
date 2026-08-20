/**
 * Renderers for the new Gv (visual-spatial) subtests: isometric block
 * piles and visual-puzzle silhouettes. Pure SVG derived from the same
 * structured specs the answer keys are machine-verified against.
 */

/**
 * Block Counting. Grounded height-map piles drawn in textbook isometric
 * projection: screen x = (x − y), screen depth = (x + y), height = z.
 * Painter's order (far-to-near) is (x + y) ascending, then z ascending —
 * for grounded piles this order is provably occlusion-correct because a
 * cube can only be occluded by cubes with larger x, larger y, or larger z.
 */
export function BlocksFigure({ cols, rows, heights }: { cols: number; rows: number; heights: number[] }) {
  const dx = 15; // half-width of the top diamond
  const dy = 8.5; // half-depth of the top diamond
  const ch = 17; // cube side height in screen units
  const maxZ = Math.max(...heights, 1);

  // Project a pile corner (x, y, z) into the viewBox.
  // Shift keeps all x within [0, (cols + rows) * dx].
  const px = (x: number, y: number) => (x - y + rows) * dx;
  const py = (x: number, y: number, z: number) => (x + y) * dy + (maxZ - z) * ch;

  const cubes: { x: number; y: number; z: number }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const h = heights[y * cols + x] ?? 0;
      for (let z = 0; z < h; z++) cubes.push({ x, y, z });
    }
  }
  cubes.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.z - b.z);

  const width = (cols + rows) * dx + dx;
  const height = (cols + rows - 2) * dy + maxZ * ch + ch;

  const top = (c: { x: number; y: number; z: number }) =>
    [px(c.x, c.y), py(c.x, c.y, c.z + 1), px(c.x + 1, c.y), py(c.x + 1, c.y, c.z + 1),
     px(c.x + 1, c.y + 1), py(c.x + 1, c.y + 1, c.z + 1), px(c.x, c.y + 1), py(c.x, c.y + 1, c.z + 1)]
      .join(" ");
  // Face toward +x (screen right): constant x = c.x + 1.
  const right = (c: { x: number; y: number; z: number }) =>
    [px(c.x + 1, c.y), py(c.x + 1, c.y, c.z + 1), px(c.x + 1, c.y + 1), py(c.x + 1, c.y + 1, c.z + 1),
     px(c.x + 1, c.y + 1), py(c.x + 1, c.y + 1, c.z), px(c.x + 1, c.y), py(c.x + 1, c.y, c.z)]
      .join(" ");
  // Face toward +y (screen left): constant y = c.y + 1.
  const left = (c: { x: number; y: number; z: number }) =>
    [px(c.x, c.y + 1), py(c.x, c.y + 1, c.z + 1), px(c.x + 1, c.y + 1), py(c.x + 1, c.y + 1, c.z + 1),
     px(c.x + 1, c.y + 1), py(c.x + 1, c.y + 1, c.z), px(c.x, c.y + 1), py(c.x, c.y + 1, c.z)]
      .join(" ");

  return (
    <svg viewBox={"0 0 " + width + " " + height} width={width * 2.6} role="img"
      aria-label="isometric pile of blocks" className="blocks-fig">
      {cubes.map((c, i) => (
        <g key={i} stroke="var(--figure)" strokeWidth={0.9} strokeLinejoin="round">
          <polygon points={top(c)} fill="var(--paper)" />
          <polygon points={left(c)} fill="var(--paper-sunk)" />
          <polygon points={right(c)} fill="var(--blk-side, #D4D9E0)" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Visual Puzzle target silhouette: filled cells on a cols x rows grid.
 */
export function PuzzleTargetFigure({ cols, rows, cells }: { cols: number; rows: number; cells: number[] }) {
  const unit = 22;
  return (
    <svg width={cols * unit} height={rows * unit} viewBox={"0 0 " + cols * unit + " " + rows * unit}
      role="img" aria-label="target silhouette" className="puzzle-target">
      {Array.from({ length: cols + rows }, (_, i) => i < cols ? (
        <line key={"v" + i} x1={i * unit} y1={0} x2={i * unit} y2={rows * unit} stroke="var(--rule)" />
      ) : (
        <line key={"h" + i} x1={0} y1={(i - cols) * unit} x2={cols * unit} y2={(i - cols) * unit} stroke="var(--rule)" />
      ))}
      {cells.map((c) => (
        <rect key={c} x={(c % cols) * unit + 1} y={Math.floor(c / cols) * unit + 1}
          width={unit - 2} height={unit - 2} fill="var(--figure)" />
      ))}
    </svg>
  );
}

/**
 * One candidate puzzle piece. `cells` are indices into the SAME cols-wide
 * target grid, normalised here to the piece's own bounding box so the piece
 * shows detached. Pieces are always drawn in TARGET orientation.
 */
export function PuzzlePieceFigure({ cells, cols }: { cells: number[]; cols: number }) {
  if (cells.length === 0) return null;
  const pts = cells.map((c) => ({ x: c % cols, y: Math.floor(c / cols) }));
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const w = Math.max(...pts.map((p) => p.x)) - minX + 1;
  const h = Math.max(...pts.map((p) => p.y)) - minY + 1;
  const unit = 20;
  return (
    <svg width={w * unit} height={h * unit} viewBox={"0 0 " + w * unit + " " + h * unit}
      role="img" aria-label="puzzle piece" className="puzzle-piece">
      {pts.map((p) => (
        <rect key={p.x + ":" + p.y} x={(p.x - minX) * unit + 1.5} y={(p.y - minY) * unit + 1.5}
          width={unit - 3} height={unit - 3} fill="var(--paper-sunk)" stroke="var(--figure)" strokeWidth={1.1} />
      ))}
    </svg>
  );
}
