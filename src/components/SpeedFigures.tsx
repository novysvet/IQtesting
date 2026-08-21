import { Figure } from "./Figures.tsx";

/**
 * Renderers for the Gs (processing speed) subtests.
 *
 * Symbol Search glyphs reuse the Figure spec string "shape:count:fill:rot"
 * with count 1, so stimulus construction, key derivation, and pixels stay in
 * one system. Symbol Selection uses the nonsense glyph catalog instead
 * (NonsenseGlyphs.tsx + SymQueue.tsx).
 */

/** Symbol Search: a two-glyph target group above a longer search row. */
export function SymSearchFigure({ targets, search }: { targets: string[]; search: string[] }) {
  return (
    <div className="symsearch" role="group" aria-label="symbol search stimulus">
      <div className="symsearch-group">
        <span className="label">Target</span>
        <div className="symsearch-glyphs">
          {targets.map((t, i) => <Figure key={i} spec={t} size={44} />)}
        </div>
      </div>
      <div className="symsearch-group">
        <span className="label">Search group</span>
        <div className="symsearch-glyphs">
          {search.map((t, i) => <Figure key={i} spec={t} size={44} />)}
        </div>
      </div>
    </div>
  );
}
