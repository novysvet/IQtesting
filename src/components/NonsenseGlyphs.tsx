import { memo } from "react";
import { GLYPHS } from "./glyphCatalog.ts";

/**
 * Renderer for the nonsense glyph catalog (Symbol Selection, Gs).
 * The single place glyph ids become pixels; the catalog data itself lives
 * in glyphCatalog.ts so tests can audit it without a JSX runtime.
 */
export const NonsenseGlyph = memo(function NonsenseGlyph({ id, size = 44 }: { id: string; size?: number }) {
  const def = GLYPHS[id];
  if (!def) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="unknown glyph">
        <rect x="3" y="3" width="18" height="18" fill="none" stroke="var(--figure)" strokeWidth="1.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="nonsense symbol">
      <path d={def.d} fill="none" stroke="var(--figure)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});
