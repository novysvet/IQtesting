import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Figure } from "./Figures.tsx";

/**
 * Renderers for the Gs (processing speed) subtests.
 *
 * Symbol Scan glyphs reuse the Figure spec string "shape:1:fill:rot", so
 * stimulus construction, key derivation, and pixels stay in one system.
 * Symbol Selection uses the nonsense glyph catalog instead
 * (NonsenseGlyphs.tsx + SymQueue.tsx).
 */

/**
 * Symbol Scan trial (Gs): two target glyphs above a clickable search row.
 *
 * The examinee presses THE row cell matching either target, or the NO SYMBOL
 * control when neither appears — there is no Yes/No shortcut; locating the
 * match IS the response. Correct presses submit instantly (speed is the
 * measure). Wrong presses flash red, increment the error tally, and hold for
 * ~450 ms before submitting: under the subtest's guess-penalty contract the
 * error must cost visible time as well as score, so rapid blind clicking is
 * strictly worse than answering NO only when sure. The key never enters this
 * component — correctness is derived from payload identity alone (a click is
 * right iff the pressed glyph equals a listed target, or NO is pressed when
 * no row glyph equals either).
 */
export function SymScanRun({ targets, row, timeLimitSec, onSubmit }: {
  targets: string[];
  row: string[];
  timeLimitSec?: number;
  onSubmit: (raw: number) => void;
}) {
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [fractionLeft, setFractionLeft] = useState(1);
  const doneRef = useRef(false);
  const wrongTimerRef = useRef<number | null>(null);
  // Trial deadline mirrors ItemScreen's authoritative timeout: this bar is
  // the visible countdown of the same window that auto-submits at expiry.
  const durationMs = useMemo(() => (timeLimitSec ?? 0) * 1000, [timeLimitSec]);
  useEffect(() => {
    if (!durationMs) return;
    const started = performance.now();
    const tick = () => {
      const left = Math.max(0, 1 - (performance.now() - started) / durationMs);
      setFractionLeft(left);
    };
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [durationMs]);

  const press = useCallback((idx: number) => {
    if (doneRef.current) return;
    const value = idx === -1 ? row.length : idx;
    const hit = idx >= 0 && (row[idx] === targets[0] || row[idx] === targets[1]);
    const correct = idx === -1
      ? !row.some((g) => g === targets[0] || g === targets[1])
      : hit;
    if (correct) {
      doneRef.current = true;
      onSubmit(value);
      return;
    }
    setErrors((n) => n + 1);
    setWrongIdx(idx);
    if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
    wrongTimerRef.current = window.setTimeout(() => {
      doneRef.current = true;
      onSubmit(value);
    }, 450);
  }, [row, targets, onSubmit]);
  useEffect(() => () => {
    if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
  }, []);

  const low = fractionLeft < 0.34 && !!durationMs;
  return (
    <div className="symscan" role="group" aria-label="symbol scan stimulus">
      <div className="symscan-targets">
        <span className="label">Targets</span>
        <div className="symscan-target-row">
          {targets.map((t, i) => <Figure key={i} spec={t} size={46} />)}
        </div>
      </div>
      <div className="symscan-search" aria-label="search group">
        {row.map((g, i) => (
          <button key={i} type="button"
            className={"symscan-cell" + (wrongIdx === i ? " is-wrong" : "")}
            aria-label={"search position " + (i + 1)}
            onClick={() => press(i)}>
            <Figure spec={g} size={44} />
          </button>
        ))}
        <button type="button"
          className={"symscan-cell symscan-no" + (wrongIdx === -1 ? " is-wrong" : "")}
          aria-label="no symbol"
          onClick={() => press(-1)}>
          NO<br />SYMBOL
        </button>
      </div>
      {!!durationMs && (
        <div className={"symscan-meter" + (low ? " is-low" : "")} aria-hidden="true">
          <i style={{ width: (fractionLeft * 100).toFixed(1) + "%" }} />
        </div>
      )}
      <p className="symscan-tally label" aria-live="polite">
        Errors: {errors}{errors > 0 ? " — each one subtracts" : " · wrong presses subtract"}
      </p>
    </div>
  );
}
