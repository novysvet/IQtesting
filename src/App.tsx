import { useEffect, useMemo, useRef, useState } from "react";
import { BATTERY } from "./battery.ts";
import { answerItem, beginBattery, expireSubtest, initSession, remainingMs, sectionRemainingMs, startSubtest } from "./core/session.ts";
import type { Item, ItemRender, Subtest } from "./core/types.ts";
import { scoreComposite } from "./core/scoring.ts";
import { Figure, FoldDiagram, HoleGrid, MatrixFigure, RotationFigure, SeriesFigure, StructuredCell } from "./components/Figures.tsx";
import { spanDurationMs, spanFrame } from "./core/memoryTiming.ts";

const ABILITY_NAMES: Record<string, string> = {
  Gf: "Fluid reasoning", Gc: "Comprehension–knowledge", Gv: "Visual processing",
  Gwm: "Working memory", Gq: "Quantitative reasoning", Glr: "Long-term retrieval",
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
  return <span>{option}</span>;
}

function ItemScreen({ item, sectionName, itemNumber, onAnswer }: { item: Item; sectionName: string; itemNumber: number; onAnswer: (value: number | string, timedOut?: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const isMemory = item.render?.kind === "span" || item.render?.kind === "pairs";
  const [memoryReady, setMemoryReady] = useState(!isMemory);
  const promptRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (memoryReady) promptRef.current?.focus(); }, [item.id, memoryReady]);
  const constructed = !item.options;
  const submit = () => {
    if (constructed && text.trim()) onAnswer(text);
    if (!constructed && selected !== null) onAnswer(selected);
  };
  return <section className="item-screen" key={item.id}>
    <div className="item-meta"><span className="label">{sectionName}</span><span className="num">Item {String(itemNumber).padStart(2, "0")}</span></div>
    <div className="item-work">
      <ItemVisual item={item} onMemoryReady={setMemoryReady} onMemoryInvalid={() => onAnswer("", true)} />
      {memoryReady && <h1 className="item-prompt" ref={promptRef} tabIndex={-1}>{item.prompt}</h1>}
      {memoryReady && (item.options ? <div className="options" role="group" aria-label="Answer choices">
        {item.options.map((option, i) => <button key={i} type="button" aria-pressed={selected === i}
          className={"option " + (selected === i ? "is-selected" : "")} onClick={() => setSelected(i)}>
          <span className="option-key num">{String.fromCharCode(65 + i)}</span><OptionContent item={item} option={option} index={i} />
        </button>)}
      </div> : <label className="recall-field"><span className="label">Your response</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} autoComplete="off" spellCheck={false} /></label>)}
    </div>
    <div className="item-actions"><span>Answer once. You cannot return to this item.</span><button className="primary" onClick={submit} disabled={!memoryReady || (constructed ? !text.trim() : selected === null)}>Record answer <span aria-hidden="true">→</span></button></div>
  </section>;
}

function Intro({ onBegin }: { onBegin: () => void }) {
  return <section className="intro">
    <div className="intro-index label">FORM CHC–A · ADAPTIVE ADMINISTRATION</div>
    <div className="intro-grid">
      <div><h1><span>Measure</span><br />the structure<br />of reasoning.</h1><p className="lede">A broad cognitive battery built around the Cattell–Horn–Carroll model. Twelve adaptive sections measure six broad abilities without mistaking speed for intelligence.</p><button className="primary primary-large" onClick={onBegin}>Begin administration <span aria-hidden="true">→</span></button></div>
      <dl className="specimen">
        <div><dt>Maximum time</dt><dd className="num">180:00</dd></div>
        <div><dt>Sections</dt><dd className="num">12</dd></div>
        <div><dt>Item pool</dt><dd className="num">257</dd></div>
        <div><dt>Factors</dt><dd>Gf · Gc · Gv<br />Gwm · Gq · Glr</dd></div>
      </dl>
    </div>
    <div className="intro-note"><span className="label">Before you begin</span><p>Use a quiet room and a full-size screen. Do not use a calculator, dictionary, search engine, or outside help. The route adapts after every answer; seeing fewer questions is expected. Several spatial sections are inherently visual and this form does not provide a psychometrically equivalent nonvisual version.</p></div>
  </section>;
}

function Instructions({ subtest, index, onStart }: { subtest: Subtest; index: number; onStart: () => void }) {
  return <section className="interstitial">
    <div className="section-code num">{String(index + 1).padStart(2, "0")}</div>
    <div className="interstitial-copy"><span className="label">{subtest.broad} · {ABILITY_NAMES[subtest.broad]}</span><h1>{subtest.name}</h1><p>{subtest.instructions}</p>
      <div className="instruction-rule"><span className="num">≤ {subtest.routing.maxItems}</span><span>Adaptive item maximum</span><span className="num">{subtest.budgetMin}:00</span><span>Enforced section limit</span></div>
      <button className="primary" onClick={onStart}>Start section <span aria-hidden="true">→</span></button>
    </div>
  </section>;
}

function BreakScreen({ completed, onContinue }: { completed: number; onContinue: () => void }) {
  return <section className="interstitial break-screen"><div className="section-code">Ⅱ</div><div className="interstitial-copy"><span className="label">Scheduled pause</span><h1>Set the instrument down.</h1><p>You have completed {completed} of {BATTERY.length} sections. Rest your eyes and hands. The battery clock continues during this pause.</p><button className="primary" onClick={onContinue}>Continue battery <span aria-hidden="true">→</span></button></div></section>;
}

function Results({ session, onReset }: { session: ReturnType<typeof initSession>; onReset: () => void }) {
  const score = useMemo(() => scoreComposite(session.subtests, session.responses), [session]);
  const incomplete = session.stopReasons.some((reason) => reason === null);
  const timeLimited = session.stopReasons.filter((reason) => reason === "time-limit").length;
  return <section className="results">
    <div className="result-hero"><div><span className="label">{incomplete ? "Incomplete provisional composite" : "Provisional composite"}</span><div className="score num">{score.g.score}</div><p className="num">95% CI {score.g.ci95[0]}–{score.g.ci95[1]} · percentile {score.g.percentile}</p></div><div className="result-copy"><h1>Cognitive profile</h1><p>{session.responses.length} items administered across {score.subtests.length} attempted sections.{incomplete ? " The battery ended before all sections were completed." : ""}</p></div></div>
    <div className="factor-grid">{score.broad.map((b) => <article key={b.broad}><div><span className="factor-code">{b.broad}</span><span>{ABILITY_NAMES[b.broad]}</span></div><strong className="num">{b.band.score}</strong><div className="factor-track"><i style={{ width: Math.max(2, Math.min(100, ((b.band.score - 55) / 90) * 100)) + "%" }} /></div><small className="num">CI {b.band.ci95[0]}–{b.band.ci95[1]} · P{b.band.percentile}</small></article>)}</div>
    {incomplete && <div className="incomplete-warning"><span className="label">Incomplete administration</span><p>The 180-minute limit was reached before the battery finished. The composite omits unadministered sections and must not be compared with a complete administration.</p></div>}
    {timeLimited > 0 && <div className="incomplete-warning"><span className="label">Section time limits reached</span><p>{timeLimited} section{timeLimited === 1 ? "" : "s"} ended at the authored limit. Unanswered items were omitted rather than scored as incorrect.</p></div>}
    <div className="calibration"><span className="label">Calibration status · read before interpreting</span><p>Item parameters are authored estimates, not values fitted to a representative norming sample. Scores are internally ordered but absolute IQ-equivalent numbers and percentiles are provisional. Do not use this result for diagnosis, placement, or high-stakes decisions.</p></div>
    <button className="secondary" onClick={onReset}>Start a new administration</button>
  </section>;
}

export function App() {
  const [session, setSession] = useState(() => initSession(BATTERY));
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
      {phase.kind === "break" && <BreakScreen completed={phase.subtestIndex + 1} onContinue={() => setSession((s) => ({ ...s, phase: { kind: "instructions", subtestIndex: phase.subtestIndex + 1 } }))} />}
      {phase.kind === "results" && <Results session={session} onReset={() => setSession(initSession(BATTERY))} />}
    </div>
    {session.phase.kind === "results" && <Staircase session={session} />}
  </main>;
}
