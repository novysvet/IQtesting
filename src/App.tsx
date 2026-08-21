import { useEffect, useMemo, useRef, useState } from "react";
import { BATTERY } from "./battery.ts";
import { answerItem, answerMatching, beginBattery, expireSubtest, initSession, remainingMs, sectionRemainingMs, startSubtest, elapsedMs, BATTERY_BUDGET_MIN } from "./core/session.ts";
import type { Item, ItemRender, Subtest } from "./core/types.ts";
import { scoreComposite } from "./core/scoring.ts";
import { screenSession, validitySummary } from "./core/validity.ts";
import type { ValidityReport } from "./core/validity.ts";
import { bankVersion, downloadJson, exportSession } from "./core/telemetry.ts";
import { clearSession, defaultStorage, loadSession, saveSession } from "./core/persistence.ts";
import { Figure, FoldDiagram, HoleGrid, MatrixFigure, RotationFigure, SeriesFigure, StructuredCell } from "./components/Figures.tsx";
import { SymSearchFigure, CodingFigure } from "./components/SpeedFigures.tsx";
import { BlocksFigure, PuzzleTargetFigure, PuzzlePieceFigure } from "./components/SpatialFigures.tsx";
import { MatchingScreen } from "./components/Matching.tsx";
import { spanDurationMs, spanFrame } from "./core/memoryTiming.ts";

const ABILITY_NAMES: Record<string, string> = {
  Gf: "Fluid reasoning", Gc: "Comprehension–knowledge", Gv: "Visual processing",
  Gwm: "Working memory", Gq: "Quantitative reasoning", Gs: "Processing speed", Glr: "Long-term retrieval",
};

function clock(ms: number) {
  const total = Math.ceil(ms / 1000);
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function Staircase({ session }: { session: ReturnType<typeof initSession> }) {
  const points = session.routing.flatMap((route) => route.administered.map((item, i) => ({
    b: item.b, correct: route.responses[i]?.correct ?? false,
  })));
  const width = 1000;
  const height = 78;
  const coords = points.map((p, i) => ({
    ...p,
    x: points.length < 2 ? 16 : 16 + i * ((width - 32) / (points.length - 1)),
    y: 10 + ((4 - Math.max(-3, Math.min(4, p.b))) / 7) * 48,
  }));
  const path = coords.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
  const showOutcome = session.phase.kind === "results";
  return <aside className="trace" aria-label="Adaptive difficulty trace">
    <div className="trace-label"><span>ADAPTIVE STAIRCASE</span><span className="num">−3 · DIFFICULTY · +4</span></div>
    <span className="sr-only">{points.length === 0 ? "No items administered yet." : points.length + " items administered; latest difficulty " + points.at(-1)!.b.toFixed(1) + "."}</span>
    <svg viewBox={"0 0 " + width + " " + height} preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="58" x2={width} y2="58" className="trace-axis" />
      {path && <path d={path} className="trace-path" />}
      {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4.5" className={showOutcome && p.correct ? "trace-dot is-correct" : "trace-dot"} />)}
    </svg>
  </aside>;
}

function InstrumentHeader({ session, now }: { session: ReturnType<typeof initSession>; now: number }) {
  const phase = session.phase;
  const index = phase.kind === "results" ? BATTERY.length - 1 : "subtestIndex" in phase ? phase.subtestIndex : 0;
  const sectionMs = sectionRemainingMs(session, now);
  return <header className="instrument-head">
    <div className="wordmark"><span className="mark">CHC</span><span>Cognitive Battery</span></div>
    <div className="readouts">
      <div><span className="label">Section</span><strong className="num">{Math.min(index + 1, BATTERY.length).toString().padStart(2, "0")} / {BATTERY.length}</strong></div>
      {sectionMs !== null && <div><span className="label">Section</span><strong className={"num " + (sectionMs < 60_000 ? "time-low" : "")}>{clock(sectionMs)}</strong></div>}
      <div><span className="label">Battery</span><strong className={"num " + (remainingMs(session, now) < 10 * 60_000 ? "time-low" : "")}>{clock(remainingMs(session, now))}</strong></div>
    </div>
  </header>;
}

function MemoryPresentation({ render, onReady, onInvalid }: { render: Extract<ItemRender, { kind: "span" | "pairs" }>; onReady: (ready: boolean) => void; onInvalid: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const duration = render.kind === "pairs" ? Math.max(6000, render.pairs.length * 1400) : spanDurationMs(render.sequence.length);
    let finished = false;
    setElapsed(0);
    onReady(false);
    const update = () => {
      if (finished) return;
      const nextElapsed = performance.now() - started;
      setElapsed(nextElapsed);
      if (nextElapsed >= duration) { finished = true; onReady(true); }
    };
    const visibility = () => {
      if (document.hidden && !finished) { finished = true; onInvalid(); }
    };
    const id = window.setInterval(update, 40);
    document.addEventListener("visibilitychange", visibility);
    update();
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", visibility); };
  // The item render object is stable; timer-driven parent renders must not restart exposure.
  }, [render]);
  if (render.kind === "pairs") {
    const duration = Math.max(6000, render.pairs.length * 1400);
    return elapsed < duration
      ? <div className="pair-study">{render.pairs.map(([a, b]) => <div key={a}><strong>{a}</strong><span>{b}</span></div>)}</div>
      : <div className="memory-closed"><span>STUDY INTERVAL COMPLETE</span>Enter the requested associate.</div>;
  }
  const frame = spanFrame(elapsed, render.sequence.length);
  if (frame.kind === "ready") return <div className="span-stage span-ready"><span>READY</span><small>Watch the center. The first character will appear shortly.</small></div>;
  if (frame.kind === "symbol") return <div className="span-stage num">{render.sequence[frame.index]}</div>;
  if (frame.kind === "gap") return <div className="span-stage span-gap" aria-label="brief interval">•</div>;
  return <div className="memory-closed"><span>SEQUENCE COMPLETE</span>{render.recall === "backward" ? "Enter in reverse order." : render.recall === "sorted" ? "Enter numbers first, then letters." : "Enter in the same order."}</div>;
}

function ItemVisual({ item, onMemoryReady, onMemoryInvalid }: { item: Item; onMemoryReady: (ready: boolean) => void; onMemoryInvalid: () => void }) {
  const r = item.render;
  if (!r || r.kind === "text") return null;
  if (r.kind === "matrix") return <MatrixFigure cells={r.cells} />;
  if (r.kind === "series") return <SeriesFigure figures={r.figures} />;
  if (r.kind === "fold") return <FoldDiagram steps={r.steps} punches={JSON.parse(r.result) as [number, number][]} />;
  if (r.kind === "rotation") return <div className="rotation-target"><span className="label">Target</span><RotationFigure spec={r.target} size={112} /></div>;
  if (r.kind === "symsearch") return <SymSearchFigure targets={r.targets} search={r.search} />;
  if (r.kind === "coding") return <CodingFigure keyPairs={r.key} sequence={r.sequence} />;
  if (r.kind === "blocks") return <BlocksFigure cols={r.cols} rows={r.rows} heights={r.heights} />;
  if (r.kind === "vpuzzle") return <div className="puzzle-wrap"><span className="label">Target</span><PuzzleTargetFigure cols={r.cols} rows={r.rows} cells={r.target} /></div>;
  if (r.kind === "span" || r.kind === "pairs") return <MemoryPresentation render={r} onReady={onMemoryReady} onInvalid={onMemoryInvalid} />;
  return null;
}

function OptionContent({ item, option, index }: { item: Item; option: string; index: number }) {
  const r = item.render;
  if (r?.kind === "matrix") {
    const structured = r.optionCells?.[index];
    if (structured) return <StructuredCell spec={structured} size={70} />;
    return <Figure spec={option} size={70} />;
  }
  if (r?.kind === "series") return <Figure spec={option} size={70} />;
  if (r?.kind === "fold") return <HoleGrid indices={JSON.parse(option) as number[]} size={72} />;
  if (r?.kind === "rotation") return <RotationFigure spec={r.candidates[index] ?? option} size={72} />;
  if (r?.kind === "vpuzzle") return <PuzzlePieceFigure cells={r.pieces[index] ?? []} cols={r.cols} />;
  return <span>{option}</span>;
}

function ItemScreen({ item, sectionName, itemNumber, onAnswer }: { item: Item; sectionName: string; itemNumber: number; onAnswer: (value: number | string, timedOut?: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [text, setText] = useState("");
  const isMemory = item.render?.kind === "span" || item.render?.kind === "pairs";
  const [memoryReady, setMemoryReady] = useState(!isMemory);
  const promptRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (memoryReady) promptRef.current?.focus(); }, [item.id, memoryReady]);
  // Speeded items cap per-item time: an unanswered item expires as an
  // incorrect, flagged response rather than blocking the section clock.
  useEffect(() => {
    if (!item.timeLimitSec || !memoryReady) return;
    const id = window.setTimeout(() => onAnswer(item.multi ? "" : -1, true), item.timeLimitSec * 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, memoryReady]);
  const constructed = !item.options;
  const multi = item.multi ?? 0;
  const toggle = (i: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < multi) next.add(i);
      return next;
    });
  };
  const submit = () => {
    if (constructed && text.trim()) onAnswer(text);
    if (multi > 0) { if (picked.size === multi) onAnswer([...picked].sort((a, b) => a - b).join(",")); return; }
    if (!constructed && selected !== null) onAnswer(selected);
  };
  const optionGridClass = "options" + (multi > 0 ? " options--six" : item.options?.length === 2 ? " options--pair" : item.options?.length === 6 ? " options--six" : "");
  return <section className="item-screen" key={item.id}>
    <div className="item-meta"><span className="label">{sectionName}</span><span className="num">Item {String(itemNumber).padStart(2, "0")}</span></div>
    <div className="item-work">
      <ItemVisual item={item} onMemoryReady={setMemoryReady} onMemoryInvalid={() => onAnswer("", true)} />
      {memoryReady && <h1 className="item-prompt" ref={promptRef} tabIndex={-1}>{item.prompt}</h1>}
      {memoryReady && (item.options ? <div className={optionGridClass} role="group" aria-label="Answer choices">
        {item.options.map((option, i) => <button key={i} type="button"
          aria-pressed={multi > 0 ? picked.has(i) : selected === i}
          className={"option " + (multi > 0 ? picked.has(i) ? "is-selected" : "" : selected === i ? "is-selected" : "")}
          onClick={() => (multi > 0 ? toggle(i) : setSelected(i))}>
          <span className="option-key num">{String.fromCharCode(65 + i)}</span><OptionContent item={item} option={option} index={i} />
        </button>)}
      </div> : <label className="recall-field"><span className="label">Your response</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} autoComplete="off" spellCheck={false} /></label>)}
    </div>
    <div className="item-actions"><span>{multi > 0 ? "Select exactly " + multi + " pieces. " : ""}Answer once. You cannot return to this item.</span><button className="primary" onClick={submit} disabled={!memoryReady || (constructed ? !text.trim() : multi > 0 ? picked.size !== multi : selected === null)}>Record answer <span aria-hidden="true">→</span></button></div>
  </section>;
}

function Intro({ onBegin }: { onBegin: () => void }) {
  const broadCount = new Set(BATTERY.map((s) => s.broad)).size;
  const factors = [...new Set(BATTERY.map((s) => s.broad))].join(" · ").replace(/ · (G[^ ·]+)$/, "\n$1");
  const maxClock = clock(BATTERY_BUDGET_MIN * 60_000);
  return <section className="intro">
    <div className="intro-index label">FORM CHC–A · BANK {bankVersion(BATTERY).slice(0, 8).toUpperCase()} · ADAPTIVE ADMINISTRATION</div>
    <div className="intro-grid">
      <div><h1><span>Measure</span><br />the structure<br />of reasoning.</h1><p className="lede">A broad cognitive battery built around the Cattell–Horn–Carroll model. {BATTERY.length} sections measure {broadCount} broad abilities without mistaking speed for intelligence — while measuring speed on its own terms.</p><button className="primary primary-large" onClick={onBegin}>Begin administration <span aria-hidden="true">→</span></button></div>
      <dl className="specimen">
        <div><dt>Maximum time</dt><dd className="num">{maxClock}</dd></div>
        <div><dt>Sections</dt><dd className="num">{BATTERY.length}</dd></div>
        <div><dt>Item pool</dt><dd className="num">{POOL_SIZE}</dd></div>
        <div><dt>Factors</dt><dd>{factors}</dd></div>
      </dl>
    </div>
    <div className="intro-note"><span className="label">Before you begin</span><p>Use a quiet room and a full-size screen. Do not use a calculator, dictionary, search engine, or outside help. The route adapts after every answer; seeing fewer questions is expected. Several spatial sections are inherently visual and this form does not provide a psychometrically equivalent nonvisual version.</p></div>
  </section>;
}

function Instructions({ subtest, index, onStart }: { subtest: Subtest; index: number; onStart: () => void }) {
  return <section className="interstitial">
    <div className="section-code num">{String(index + 1).padStart(2, "0")}</div>
    <div className="interstitial-copy"><span className="label">{subtest.broad} · {ABILITY_NAMES[subtest.broad]}</span><h1>{subtest.name}</h1><p>{subtest.instructions}</p>
      <div className="instruction-rule">{subtest.matching
        ? <><span className="num">{subtest.items.length}</span><span>Definitions, one page</span><span className="num">{subtest.budgetMin}:00</span><span>Enforced section limit</span></>
        : <><span className="num">≤ {subtest.routing.maxItems}</span><span>Adaptive item maximum</span><span className="num">{subtest.budgetMin}:00</span><span>Enforced section limit</span></>}</div>
      <button className="primary" onClick={onStart}>Start section <span aria-hidden="true">→</span></button>
    </div>
  </section>;
}

function BreakScreen({ completed, onContinue }: { completed: number; onContinue: () => void }) {
  return <section className="interstitial break-screen"><div className="section-code">Ⅱ</div><div className="interstitial-copy"><span className="label">Scheduled pause</span><h1>Set the instrument down.</h1><p>You have completed {completed} of {BATTERY.length} sections. Rest your eyes and hands. The battery clock continues during this pause.</p><button className="primary" onClick={onContinue}>Continue battery <span aria-hidden="true">→</span></button></div></section>;
}

function Results({ session, onReset }: { session: ReturnType<typeof initSession>; onReset: () => void }) {
  const score = useMemo(() => scoreComposite(session.subtests, session.responses), [session]);
  const validity: ValidityReport | null = useMemo(
    () => session.responses.length > 0 ? screenSession(session.subtests, session.responses) : null,
    [session],
  );
  const invalidScore = validity !== null && (validity.verdict === "invalid" || validity.verdict === "insufficient");
  const incomplete = session.stopReasons.some((reason) => reason === null);
  const timeLimited = session.stopReasons.filter((reason) => reason === "time-limit").length;
  const exportData = () => {
    const doc = exportSession(session);
    downloadJson("iqtesting-" + session.sessionId.slice(0, 8) + ".json", doc);
  };
  return <section className="results">
    <div className="result-hero"><div><span className="label">{incomplete ? "Incomplete provisional composite" : "Provisional composite"}</span><div className={"score num" + (invalidScore ? " score-invalid" : "")}>{score.g.score}</div><p className="num">95% CI {score.g.ci95[0]}–{score.g.ci95[1]} · percentile {score.g.percentile}</p></div><div className="result-copy"><h1>Cognitive profile</h1><p>{session.responses.length} items administered across {score.subtests.length} attempted sections.{incomplete ? " The battery ended before all sections were completed." : ""}</p></div></div>
    {validity && validity.verdict !== "valid" && <div className={invalidScore ? "invalid-warning" : "incomplete-warning"}><span className="label">Response-validity screening · {validity.verdict}</span><p>{invalidScore
      ? "The response pattern is inconsistent with engaged test-taking (" + validitySummary(validity) + "). This composite must not be interpreted as an ability estimate — a random or disengaged administration lands near the scale floor (IQ ~50) and does not reflect measured reasoning."
      : "Screening flagged this administration as " + validity.verdict + " (" + validitySummary(validity) + "). Interpret the composite with caution."}</p></div>}
    <div className="factor-grid">{score.broad.map((b) => <article key={b.broad}><div><span className="factor-code">{b.broad}</span><span>{ABILITY_NAMES[b.broad]}</span></div><strong className="num">{b.band.score}</strong><div className="factor-track"><i style={{ width: Math.max(2, Math.min(100, ((b.band.score - 55) / 90) * 100)) + "%" }} /></div><small className="num">CI {b.band.ci95[0]}–{b.band.ci95[1]} · P{b.band.percentile}</small></article>)}</div>
    {incomplete && <div className="incomplete-warning"><span className="label">Incomplete administration</span><p>The {Math.round(session.budgetMs / 60_000)}-minute limit was reached before the battery finished. The composite omits unadministered sections and must not be compared with a complete administration.</p></div>}
    {timeLimited > 0 && <div className="incomplete-warning"><span className="label">Section time limits reached</span><p>{timeLimited} section{timeLimited === 1 ? "" : "s"} ended at the authored limit. Unanswered items were omitted rather than scored as incorrect.</p></div>}
    <div className="calibration"><span className="label">Calibration status · read before interpreting</span><p>Item parameters are authored estimates, not values fitted to a representative norming sample. Scores are internally ordered but absolute IQ-equivalent numbers and percentiles are provisional. Precision thins at the extremes of the scale: estimates beyond roughly the 99th percentile rest on few items and shrink toward the population mean. Do not use this result for diagnosis, placement, or high-stakes decisions.</p></div>
    <div className="data-export"><span className="label">Response data</span><p>A machine-readable record of this administration (every item, your raw answer, timings, and the routing decisions) can be downloaded for calibration research.</p><button className="secondary" onClick={exportData}>Download response data (JSON)</button></div>
    <button className="secondary" onClick={onReset}>Start a new administration</button>
  </section>;
}

const POOL_SIZE = BATTERY.reduce((n, s) => n + s.items.length, 0);

/** Restore an autosaved session: only one already running and still inside
 * its wall-clock budget (an expired save would insta-finish on reload). */
function initialSession() {
  const storage = defaultStorage();
  if (storage) {
    const saved = loadSession(storage, bankVersion(BATTERY));
    if (saved && saved.state.startedAt !== null && saved.state.phase.kind !== "intro"
      && saved.savedAt + saved.state.budgetMs > Date.now()) {
      return saved.state;
    }
  }
  return initSession(BATTERY);
}

export function App() {
  const [session, setSession] = useState(initialSession);
  const [now, setNow] = useState(Date.now());
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (session.startedAt !== null && session.phase.kind !== "results" && remainingMs(session, now) === 0) {
      setSession((s) => ({ ...s, phase: { kind: "results" } }));
    } else if (sectionRemainingMs(session, now) === 0) {
      setSession((s) => expireSubtest(s, now));
    }
  }, [now, session]);
  // Autosave every administration transition once the battery has begun.
  useEffect(() => {
    const storage = defaultStorage();
    if (storage && session.startedAt !== null) saveSession(session, storage);
  }, [session]);
  // A restored session whose wall clock ran out while the page was closed.
  useEffect(() => {
    if (session.startedAt !== null && session.phase.kind !== "results"
      && elapsedMs(session, Date.now()) >= session.budgetMs) {
      setSession((s) => ({ ...s, phase: { kind: "results" } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const phase = session.phase;
  const phaseKey = phase.kind === "item" ? phase.item.id : phase.kind + ("subtestIndex" in phase ? phase.subtestIndex : "");
  useEffect(() => { viewportRef.current?.focus(); }, [phaseKey]);
  const active = phase.kind !== "intro";
  return <main className={"app " + (active ? "is-active" : "is-intro")}>
    {active && <InstrumentHeader session={session} now={now} />}
    <div className="viewport" ref={viewportRef} tabIndex={-1}>
      {phase.kind === "intro" && <Intro onBegin={() => setSession((s) => beginBattery(s, Date.now()))} />}
      {phase.kind === "instructions" && <Instructions subtest={session.subtests[phase.subtestIndex]!} index={phase.subtestIndex} onStart={() => setSession((s) => startSubtest(s, phase.subtestIndex, Date.now()))} />}
      {phase.kind === "item" && <ItemScreen key={phase.item.id} item={phase.item} sectionName={session.subtests[phase.subtestIndex]!.name} itemNumber={session.routing[phase.subtestIndex]!.administered.length + 1} onAnswer={(value, timedOut) => setSession((s) => answerItem(s, value, Date.now(), timedOut))} />}
      {phase.kind === "matching" && <MatchingScreen subtest={session.subtests[phase.subtestIndex]!} remainingMs={sectionRemainingMs(session, now) ?? 0} onAnswer={(assignments, timedOut) => setSession((s) => answerMatching(s, assignments, Date.now(), timedOut))} />}
      {phase.kind === "break" && <BreakScreen completed={phase.subtestIndex + 1} onContinue={() => setSession((s) => ({ ...s, phase: { kind: "instructions", subtestIndex: phase.subtestIndex + 1 } }))} />}
      {phase.kind === "results" && <Results session={session} onReset={() => { const storage = defaultStorage(); if (storage) clearSession(storage); setSession(initSession(BATTERY)); }} />}
    </div>
    {session.phase.kind === "results" && <Staircase session={session} />}
  </main>;
}
