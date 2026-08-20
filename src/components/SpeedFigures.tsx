import { Figure } from "./Figures.tsx";

/**
 * Renderers for the Gs (processing speed) subtests.
 *
 * Glyphs reuse the Figure spec string "shape:count:fill:rot" with count 1,
 * so stimulus construction, key derivation, and pixels stay in one system.
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

/**
 * Character Pairing: the glyph-to-digit key shown above every item (like
 * the printed key at the top of a coding sheet), then the glyph row to
 * transcribe into digits.
 */
export function CodingFigure({ keyPairs, sequence }: { keyPairs: [string, string][]; sequence: string[] }) {
  return (
    <div className="coding" role="group" aria-label="character pairing stimulus">
      <div className="coding-key" aria-label="pairing key">
        {keyPairs.map(([glyph, digit], i) => (
          <div key={i} className="coding-key-pair">
            <Figure spec={glyph} size={34} />
            <span className="num">{digit}</span>
          </div>
        ))}
      </div>
      <div className="coding-row" aria-label="characters to transcribe">
        {sequence.map((glyph, i) => <Figure key={i} spec={glyph} size={44} />)}
      </div>
    </div>
  );
}
