import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NonsenseGlyph } from "./NonsenseGlyphs.tsx";

/**
 * Symbol Selection run (Gs): renders the persistent legend, the key caps,
 * and the live queue. The examinee presses the home-row key matching the
 * CURRENT (enlarged) glyph; a correct press advances instantly, a wrong
 * press flashes an error and the queue waits (forced correction). Every
 * mapped press is recorded in order; on completion the full press string
 * is submitted — any error therefore breaks the exact match (c = 0).
 *
 * Keyboard-first: a window-level listener catches asdf/hjkl without any
 * element needing focus. On-screen key caps mirror every press for touch
 * and mouse users. Non-mapped keys are ignored entirely.
 */
export function SymQueueRun({ legend, queue, onSubmit }: {
  legend: [string, string][];
  queue: string[];
  onSubmit: (raw: string) => void;
}) {
  const [pos, setPos] = useState(0);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const pressesRef = useRef<string[]>([]);
  const doneRef = useRef(false);
  const wrongTimerRef = useRef<number | null>(null);
  // The legend is a bank constant for the item: build the lookup Maps once
  // per legend instead of per render, so `press` keeps its identity across
  // parent re-renders (the battery ticker re-renders the tree every 250 ms).
  const keyFor = useMemo(() => new Map(legend), [legend]);
  const glyphFor = useMemo(() => new Map(legend.map(([g, k]) => [k, g])), [legend]);
  const expected = pos < queue.length ? keyFor.get(queue[pos]!) ?? "" : "";

  const press = useCallback((key: string) => {
    if (doneRef.current) return;
    if (!glyphFor.has(key)) return;
    pressesRef.current.push(key);
    if (key === expected) {
      const next = pos + 1;
      setPos(next);
      if (next >= queue.length) {
        doneRef.current = true;
        onSubmit(pressesRef.current.join(""));
      }
    } else {
      setWrongKey(key);
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = window.setTimeout(() => setWrongKey(null), 260);
    }
  // expected/pos track the queue cursor; legend and queue are stable per item.
  }, [expected, pos, queue.length, onSubmit, glyphFor]);

  // Latest-ref: the window listener is attached once and always calls the
  // current press. Re-attaching on every press-identity change also used to
  // cancel the pending wrong-key flash timer mid-flight, sticking the flash.
  const pressRef = useRef(press);
  useEffect(() => { pressRef.current = press; }, [press]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      pressRef.current(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
    };
  }, []);

  return (
    <div className="symqueue" role="group" aria-label="symbol selection stimulus">
      <div className="symqueue-legend" aria-label="symbol to key legend">
        {legend.map(([glyph, key]) => (
          <div key={glyph} className="symqueue-legend-pair">
            <NonsenseGlyph id={glyph} size={30} />
            <span className="num">{key}</span>
          </div>
        ))}
      </div>
      <div className="symqueue-strip" aria-label="symbol queue">
        {queue.map((glyph, i) => (
          <div key={i} className={
            "symqueue-cell" + (i < pos ? " is-done" : i === pos ? " is-current" : "")
          }>
            <NonsenseGlyph id={glyph} size={i === pos ? 84 : 52} />
          </div>
        ))}
      </div>
      <p className="symqueue-progress label" aria-live="polite">
        Symbol {Math.min(pos + 1, queue.length)} of {queue.length}
      </p>
      <KeyCaps legend={legend} wrongKey={wrongKey} onPress={press} />
    </div>
  );
}

function KeyCaps({ legend, wrongKey, onPress }: {
  legend: [string, string][];
  wrongKey: string | null;
  onPress: (key: string) => void;
}) {
  return (
    <div className="symqueue-caps" aria-label="response keys">
      {legend.map(([, key]) => (
        <button key={key} type="button"
          className={"symqueue-cap num" + (wrongKey === key ? " is-wrong" : "")}
          aria-label={"key " + key}
          onClick={() => onPress(key)}>
          {key}
        </button>
      ))}
    </div>
  );
}
