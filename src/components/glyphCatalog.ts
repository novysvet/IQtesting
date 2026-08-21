/**
 * Nonsense glyph catalog for the Symbol Selection subtest (Gs).
 *
 * DATA ONLY — no JSX — so node tests can import it directly. The renderer
 * lives in NonsenseGlyphs.tsx; this file is the single source of truth for
 * what glyph ids exist and which pairs are visually confusable.
 *
 * Each glyph is an angular, nonsensical mark drawn in a 24x24 box as one or
 * more SVG path subpaths (stroke only). Confusable twins share their stroke
 * skeleton and differ in exactly one feature:
 *
 *   g01/g05  chevron on the spine points down (V) vs up (^)
 *   g02/g06  zigzag leans left vs right (horizontal mirror)
 *   g03/g07  mid tick inside the box is horizontal vs vertical
 *
 * The Symbol Selection legend binds all eight glyphs to the home row. Twins
 * are always assigned to opposite hands (A/H, S/J, D/K) so visual confusion
 * never compounds with finger confusion:
 *
 *   A=g01  S=g02  D=g03  F=g04
 *   H=g05  J=g06  K=g07  L=g08
 */

export interface GlyphDef {
  /** SVG path data in the 24x24 box (stroke rendered by the component). */
  d: string;
}

export const GLYPHS: Record<string, GlyphDef> = {
  g01: { d: "M12 3 L12 21 M6 6 L12 11 L18 6 M7 21 L17 21" },
  g02: { d: "M5 4 L12 8 L5 12 L12 16 L5 20 M17 4 L17 20 M13 12 L21 12" },
  g03: { d: "M6 20 L6 6 L14 6 M18 10 L18 20 L6 20 M9 13 L15 13" },
  g04: { d: "M6 4 L18 4 L12 11 L18 18 L6 18 L12 11 M12 18 L12 22" },
  g05: { d: "M12 3 L12 21 M6 18 L12 13 L18 18 M7 21 L17 21" },
  g06: { d: "M19 4 L12 8 L19 12 L12 16 L19 20 M7 4 L7 20 M11 12 L3 12" },
  g07: { d: "M6 20 L6 6 L14 6 M18 10 L18 20 L6 20 M12 10 L12 16" },
  g08: { d: "M5 4 L19 20 M19 4 L5 20 M12 8.5 L15.5 12 L12 15.5 L8.5 12 Z" },
};

/** Pairs of glyph ids that are deliberately hard to tell apart. */
export const CONFUSION_CLASSES: [string, string][] = [
  ["g01", "g05"],
  ["g02", "g06"],
  ["g03", "g07"],
];

/** True when the two glyph ids form a declared confusable pair. */
export function areTwins(a: string, b: string): boolean {
  return CONFUSION_CLASSES.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}
