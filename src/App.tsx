import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BATTERY } from "./battery.ts";
import { answerItem, answerMatching, answerMatchingDemo, answerPractice, beginBattery, expireSubtest, initSession, remainingMs, resumeSavedSession, sectionRemainingMs, startSubtest, elapsedMs, BATTERY_BUDGET_MIN } from "./core/session.ts";
import type { AnswerMeta } from "./core/session.ts";
import type { ConsentRecord, Demographics, Item, ItemRender, Subtest } from "./core/types.ts";
import { scoreComposite } from "./core/scoring.ts";
import { screenSession, validitySummary } from "./core/validity.ts";
import type { ValidityReport } from "./core/validity.ts";
import { bankVersion, downloadJson, exportSession, submitExport } from "./core/telemetry.ts";
import { clearSession, defaultStorage, loadSession, saveSession } from "./core/persistence.ts";
import { optionPermutation } from "./core/presentation.ts";
import { fetchNorms, normedBand } from "./core/norms.ts";
import type { NormTable } from "./core/norms.ts";
import { Figure, FoldDiagram, HoleGrid, MatrixFigure, RotationFigure, SeriesFigure, StructuredCell } from "./components/Figures.tsx";
import { SymSearchFigure } from "./components/SpeedFigures.tsx";
import { SymQueueRun } from "./components/SymQueue.tsx";
import { BlocksFigure, PuzzleTargetFigure, PuzzlePieceFigure } from "./components/SpatialFigures.tsx";
import { MatchingScreen } from "./components/Matching.tsx";
import { spanDurationMs, spanFrame } from "./core/memoryTiming.ts";

/** Vite env access kept stringly-typed so plain tsc builds need no vite/client types. */
function envVar(name: string): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string> }).env?.[name];
}
const SUBMIT_ENDPOINT = envVar("VITE_SUBMIT_URL");
const BASE_URL = envVar("BASE_URL") ?? "/";
const PARTICIPANT_KEY = "iqtesting.participant.v1";
const CONSENT_VERSION = "2026-08-21";

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

function ItemScreen({ item, sectionName, itemNumber, sessionId, practice, onAnswer }: {
  item: Item;
  sectionName: string;
  itemNumber: number;
  sessionId: string;
  practice?: boolean;
  onAnswer: (value: number | string, timedOut?: boolean, meta?: AnswerMeta) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [text, setText] = useState("");
  const isMemory = item.render?.kind === "span" || item.render?.kind === "pairs";
  const [memoryReady, setMemoryReady] = useState(!isMemory);
  const promptRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (memoryReady) promptRef.current?.focus(); }, [item.id, memoryReady]);
  // Away-time tracking: accumulate how long the item was not visible while
  // open. Segments under a second are jitter (focus flicker, dev tools) and
  // are ignored; the total feeds the response's awayMs so validity screening
  // can judge ACTIVE latency instead of wall-clock latency.
  const awayRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  useEffect(() => {
    awayRef.current = 0;
    hiddenAtRef.current = null;
    const onVisibility = () => {
      if (document.hidden) hiddenAtRef.current = Date.now();
      else if (hiddenAtRef.current !== null) {
        const segment = Date.now() - hiddenAtRef.current;
        if (segment > 1000) awayRef.current += segment;
        hiddenAtRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [item.id]);
  // Speeded items cap per-item time: an unanswered item expires as an
  // incorrect, flagged response rather than blocking the section clock.
  useEffect(() => {
    if (!item.timeLimitSec || !memoryReady) return;
    const id = window.setTimeout(() => onAnswer(item.multi ? "" : -1, true), item.timeLimitSec * 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, memoryReady]);
  // Per-session display permutation. Selections are made in DISPLAY space
  // and mapped back to ORIGINAL option indices before grading; the session
  // layer records where the key was displayed for position-bias audit.
  const perm = useMemo(
    () => optionPermutation(sessionId, item.id, item.options?.length ?? 0),
    [sessionId, item.id, item.options],
  );
  const originalOf = (displayIndex: number) => (perm ? perm[displayIndex]! : displayIndex);
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
    const meta: AnswerMeta = { awayMs: awayRef.current || undefined };
    if (constructed && text.trim()) { onAnswer(text, false, meta); return; }
    if (multi > 0) {
      if (picked.size === multi) onAnswer([...picked].sort((a, b) => a - b).map(originalOf).join(","), false, meta);
      return;
    }
    if (!constructed && selected !== null) onAnswer(originalOf(selected), false, meta);
  };
  const optionGridClass = "options" + (multi > 0 ? " options--six" : item.options?.length === 2 ? " options--pair" : item.options?.length === 6 ? " options--six" : "");
  const displayOptions = item.options ? (perm ? perm.map((i) => item.options![i]!) : item.options) : null;
  // Symbol Selection owns its input: the queue submits itself on completion,
  // so no answer UI and no record button are rendered for it.
  const symqueue = item.render?.kind === "symqueue" ? item.render : null;
  return <section className="item-screen" key={item.id}>
    <div className="item-meta"><span className="label">{sectionName}</span><span className="num">{practice ? "SAMPLE" : "Item " + String(itemNumber).padStart(2, "0")}</span></div>
    <div className="item-work">
      <ItemVisual item={item} onMemoryReady={setMemoryReady} onMemoryInvalid={() => onAnswer("", true, { interrupted: true })} />
      {memoryReady && <h1 className="item-prompt" ref={promptRef} tabIndex={-1}>{item.prompt}</h1>}
      {memoryReady && symqueue && <SymQueueRun legend={symqueue.legend} queue={symqueue.queue} onSubmit={(raw) => onAnswer(raw, false, { awayMs: awayRef.current || undefined })} />}
      {!symqueue && memoryReady && displayOptions && <div className={optionGridClass} role="group" aria-label="Answer choices">
        {displayOptions.map((option, i) => <button key={i} type="button"
          aria-pressed={multi > 0 ? picked.has(i) : selected === i}
          className={"option " + (multi > 0 ? picked.has(i) ? "is-selected" : "" : selected === i ? "is-selected" : "")}
          onClick={() => (multi > 0 ? toggle(i) : setSelected(i))}>
          <span className="option-key num">{String.fromCharCode(65 + i)}</span><OptionContent item={item} option={option} index={perm ? perm[i]! : i} />
        </button>)}
      </div>}
      {!symqueue && memoryReady && !displayOptions && <label className="recall-field"><span className="label">Your response</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} autoComplete="off" spellCheck={false} /></label>}
    </div>
    <div className="item-actions"><span>{practice ? "This sample is not scored or recorded. " : ""}{multi > 0 ? "Select exactly " + multi + " pieces. " : ""}{symqueue ? "The queue submits itself when complete. " : practice ? "Continue" : "Answer once. You cannot return to this item."}</span>{!symqueue && <button className="primary" onClick={submit} disabled={!memoryReady || (constructed ? !text.trim() : multi > 0 ? picked.size !== multi : selected === null)}>{practice ? "Continue" : <>Record answer <span aria-hidden="true">→</span></>}</button>}</div>
  </section>;
}

function Consent({ onAccept }: { onAccept: (record: ConsentRecord) => void }) {
  const [agreed, setAgreed] = useState(false);
  const [adult, setAdult] = useState(false);
  return <section className="intro">
    <div className="intro-index label">INFORMED CONSENT · RESEARCH USE</div>
    <div className="intro-grid">
      <div><h1><span>Before you</span><br />begin.</h1><p className="lede">This battery is a research instrument. With your consent, your anonymous response data — answers, timings, and device context — is used to calibrate items and build norm tables. There are no names, no emails, and no accounts.</p>
        <label className="consent-row"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> I am 18 years of age or older.</label>
        <label className="consent-row"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I consent to my anonymous response data being used for psychometric research, and I understand scores are provisional research estimates, not diagnoses.</label>
        <button className="primary primary-large" disabled={!agreed || !adult} onClick={() => onAccept({ acceptedAt: Date.now(), version: CONSENT_VERSION })}>Continue <span aria-hidden="true">→</span></button>
      </div>
      <dl className="specimen">
        <div><dt>Data collected</dt><dd>Answers · timing · device class</dd></div>
        <div><dt>Personal data</dt><dd>None required</dd></div>
        <div><dt>Withdrawal</dt><dd>Close the tab any time; nothing is submitted without this consent</dd></div>
        <div><dt>Intended use</dt><dd>Research only — not diagnosis or placement</dd></div>
      </dl>
    </div>
  </section>;
}

const AGE_BANDS: Demographics["ageBand"][] = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function Demographics({ onContinue }: { onContinue: (demo: Demographics, participantId: string | null) => void }) {
  const [ageBand, setAgeBand] = useState<Demographics["ageBand"] | "">("");
  const [sex, setSex] = useState("");
  const [education, setEducation] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [country, setCountry] = useState("");
  const [testFamiliarity, setTestFamiliarity] = useState("");
  const [participantId, setParticipantId] = useState(() => {
    try {
      return globalThis.localStorage?.getItem(PARTICIPANT_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const field = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label className="demo-field"><span className="label">{label}</span><input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} autoComplete="off" /></label>
  );
  return <section className="intro">
    <div className="intro-index label">BACKGROUND · OPTIONAL EXCEPT AGE</div>
    <div className="intro-grid">
      <div><h1><span>About</span><br />the sample.</h1><p className="lede">Norm tables must describe a population. These questions let scores be stratified and checked for bias; only the age band is required, and every field travels anonymously inside your response record.</p>
        <div className="demo-grid">
          <label className="demo-field"><span className="label">Age band *</span>
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as Demographics["ageBand"])}>
              <option value="" disabled>Select…</option>
              {AGE_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select></label>
          {field("Sex", sex, setSex, "optional")}
          {field("Education", education, setEducation, "e.g. bachelor's")}
          {field("Native language", nativeLanguage, setNativeLanguage, "e.g. English")}
          {field("Country", country, setCountry, "optional")}
          <label className="demo-field"><span className="label">Familiarity with timed tests</span>
            <select value={testFamiliarity} onChange={(e) => setTestFamiliarity(e.target.value)}>
              <option value="">Optional…</option>
              <option value="none">None</option>
              <option value="some">Some</option>
              <option value="high">High (frequently practised)</option>
            </select></label>
          {field("Participant code", participantId, setParticipantId, "optional — enables retest comparison")}
        </div>
        <button className="primary primary-large" disabled={!ageBand} onClick={() => {
          try {
            if (participantId.trim()) globalThis.localStorage?.setItem(PARTICIPANT_KEY, participantId.trim());
          } catch { /* storage unavailable */ }
          onContinue(
            { ageBand: ageBand as Demographics["ageBand"], sex: sex || undefined, education: education || undefined, nativeLanguage: nativeLanguage || undefined, country: country || undefined, testFamiliarity: testFamiliarity || undefined },
            participantId.trim() || null,
          );
        }}>Continue to the battery <span aria-hidden="true">→</span></button>
      </div>
      <dl className="specimen">
        <div><dt>Required</dt><dd>Age band only</dd></div>
        <div><dt>Purpose</dt><dd>Stratification · fairness analysis</dd></div>
        <div><dt>Participant code</dt><dd>Any self-chosen string; lets you link retests</dd></div>
        <div><dt>Privacy</dt><dd>Stored with your responses, never with identity</dd></div>
      </dl>
    </div>
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
    <div className="intro-note"><span className="label">Before you begin</span><p>Use a quiet room and a full-size screen. Do not use a calculator, dictionary, search engine, or outside help. Every section ends at a checkpoint showing your standing so far — you may stop there and take the next section in another sitting; the clock only runs while a section is open. The route adapts after every answer; seeing fewer questions is expected. Several spatial sections are inherently visual and this form does not provide a psychometrically equivalent nonvisual version.</p></div>
  </section>;
}

const COMPREHENSION_QUESTION = "Before you begin: after you record an answer, can you go back and change it?";
const COMPREHENSION_OPTIONS = ["Yes", "No"];
const COMPREHENSION_CORRECT = 1;

function Instructions({ subtest, index, attempts, onStart, onComprehensionFail }: {
  subtest: Subtest;
  index: number;
  attempts: number;
  onStart: () => void;
  onComprehensionFail: () => void;
}) {
  // The FIRST scored section is gated by a comprehension check: failing it
  // returns to the instructions and increments a counter that travels in the
  // export (instruction miscomprehension is data, not ability).
  const [checking, setChecking] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const showCheck = index === 0;
  const begin = () => {
    if (!showCheck) { onStart(); return; }
    setChecking(true);
    setWrongPick(null);
  };
  return <section className="interstitial">
    <div className="section-code num">{String(index + 1).padStart(2, "0")}</div>
    <div className="interstitial-copy"><span className="label">{subtest.broad} · {ABILITY_NAMES[subtest.broad]}</span><h1>{subtest.name}</h1><p>{subtest.instructions}</p>
      {subtest.practice && subtest.practice.length > 0 && <p className="practice-note">{subtest.practice.length === 1 ? "One unscored sample item" : subtest.practice.length + " unscored samples"} come{subtest.practice.length === 1 ? "s" : ""} first so you can see the format working.</p>}
      {subtest.matchingPractice && <p className="practice-note">A short unscored demonstration page opens before the scored page — the clock starts only when that one does.</p>}
      <div className="instruction-rule">{subtest.matching
        ? <><span className="num">{subtest.items.length}</span><span>Definitions, one page</span><span className="num">{subtest.budgetMin}:00</span><span>Enforced section limit</span></>
        : <><span className="num">≤ {subtest.routing.maxItems}</span><span>Adaptive item maximum</span><span className="num">{subtest.budgetMin}:00</span><span>Enforced section limit</span></>}</div>
      {checking
        ? <div className="comprehension">
            <p>{COMPREHENSION_QUESTION}</p>
            <div className="options options--pair">
              {COMPREHENSION_OPTIONS.map((option, i) => <button key={i} type="button"
                className={"option" + (wrongPick === i ? " is-wrong" : "")}
                onClick={() => { if (i === COMPREHENSION_CORRECT) onStart(); else { setWrongPick(i); onComprehensionFail(); } }}>
                <span className="option-key num">{String.fromCharCode(65 + i)}</span><span>{option}</span>
              </button>)}
            </div>
            {wrongPick !== null && <p className="comprehension-hint">Re-read the instructions above — the correct choice matters for every section.</p>}
          </div>
        : <button className="primary" onClick={begin}>Start section <span aria-hidden="true">→</span></button>}
      {attempts > 0 && !checking && <p className="comprehension-count label">Instruction check retried {attempts} time{attempts === 1 ? "" : "s"}.</p>}
    </div>
  </section>;
}

/**
 * Section checkpoint. Every completed section lands here: the examinee sees
 * their standing so far — each finished section's band plus the provisional
 * composite over everything administered — and chooses to continue now or
 * stop and take the next section in a later sitting. The battery clock is
 * frozen at checkpoints, so stopping never costs budget.
 */
function CheckpointScreen({ session, onContinue }: {
  session: ReturnType<typeof initSession>;
  onContinue: () => void;
}) {
  const [stopping, setStopping] = useState(false);
  const phase = session.phase;
  const index = phase.kind === "checkpoint" ? phase.subtestIndex : 0;
  const score = useMemo(() => scoreComposite(session.subtests, session.responses), [session]);
  const done = score.subtests.length;
  return <section className="interstitial checkpoint-screen">
    <div className="checkpoint-standings">
      <span className="label">Sections complete</span>
      <div className="checkpoint-count num">{done}<small> / {BATTERY.length}</small></div>
      <dl className="specimen">
        <div><dt>Provisional FSIQ</dt><dd className="num">{score.g.score}</dd></div>
        <div><dt>95% CI</dt><dd className="num">{score.g.ci95[0]}–{score.g.ci95[1]}</dd></div>
        <div><dt>Percentile</dt><dd className="num">{score.g.percentile}</dd></div>
        <div><dt>Battery clock</dt><dd className="num">{clock(remainingMs(session, Date.now()))} left</dd></div>
      </dl>
    </div>
    <div className="interstitial-copy">
      <span className="label">Checkpoint · {ABILITY_NAMES[session.subtests[index]!.broad]}</span>
      <h1>{session.subtests[index]!.name} complete.</h1>
      {stopping
        ? <><p>Your progress is saved in this browser. Close the tab and return any time — the clock only runs while a section is open, and you will pick up at the next section.</p><button className="secondary" onClick={() => { try { window.close(); } catch { /* blocked */ } }}>Close the tab</button></>
        : <>
            <p>The section scores so far:</p>
            <div className="checkpoint-grid">
              {score.subtests.map((s) => <article key={s.subtestId}>
                <div><strong className="num">{s.band.score}</strong><span>{s.name}</span></div>
                <small className="num">CI {s.band.ci95[0]}–{s.band.ci95[1]} · P{s.band.percentile}</small>
              </article>)}
            </div>
            <p className="checkpoint-note label">Provisional research estimates — authored item parameters, not yet normed.</p>
            <div className="checkpoint-actions">
              <button className="primary" onClick={onContinue}>Next section <span aria-hidden="true">→</span></button>
              <button className="secondary" onClick={() => setStopping(true)}>Save &amp; finish later</button>
            </div>
          </>}
    </div>
  </section>;
}

function Results({ session, onReset }: { session: ReturnType<typeof initSession>; onReset: () => void }) {
  const score = useMemo(() => scoreComposite(session.subtests, session.responses), [session]);
  const validity: ValidityReport | null = useMemo(
    () => session.responses.length > 0 ? screenSession(session.subtests, session.responses) : null,
    [session],
  );
  // Sample-referenced norms: when a valid table for THIS bank+form ships with
  // the app, percentiles and the IQ-equivalent come from the collected sample
  // instead of the assumed N(0,1) model. Anything else falls back to the
  // provisional band — silently, and labelled as provisional.
  const [norms, setNorms] = useState<NormTable | null>(null);
  useEffect(() => {
    let live = true;
    fetchNorms(session.bankVersion, BASE_URL).then((t) => { if (live) setNorms(t); });
    return () => { live = false; };
  }, [session.bankVersion]);
  const normed = useMemo(
    () => (norms ? normedBand(score.theta, score.se, norms, session.bankVersion) : null),
    [norms, score.theta, score.se, session.bankVersion],
  );
  const invalidScore = validity !== null && (validity.verdict === "invalid" || validity.verdict === "insufficient");
  const incomplete = session.stopReasons.some((reason) => reason === null);
  const timeLimited = session.stopReasons.filter((reason) => reason === "time-limit").length;
  const omittedCount = session.responses.filter((r) => r.omitted).length;
  const interruptedCount = session.responses.filter((r) => r.interrupted).length;
  const exportData = () => {
    const doc = exportSession(session);
    downloadJson("iqtesting-" + session.sessionId.slice(0, 8) + ".json", doc);
  };
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "ok" | "fail">("idle");
  const submitData = async () => {
    if (!SUBMIT_ENDPOINT || submitState === "sending") return;
    setSubmitState("sending");
    const result = await submitExport(exportSession(session), SUBMIT_ENDPOINT);
    setSubmitState(result?.ok ? "ok" : "fail");
  };
  const displayScore = normed ? normed.normedScore : score.g.score;
  const displayPercentile = normed ? normed.percentile : score.g.percentile;
  return <section className="results">
    <div className="result-hero"><div><span className="label">{invalidScore ? "Uninterpretable composite" : normed ? "Sample-referenced composite" : incomplete ? "Incomplete provisional composite" : "Provisional composite"}</span><div className={"score num" + (invalidScore ? " score-invalid" : "")}>{invalidScore ? "—" : displayScore}</div><p className="num">95% CI {(normed && !invalidScore ? normed.ci95 : score.g.ci95)[0]}–{(normed && !invalidScore ? normed.ci95 : score.g.ci95)[1]} · percentile {displayPercentile}{normed && !invalidScore ? " · N=" + norms!.sampleN + " sample" : ""}</p></div><div className="result-copy"><h1>Cognitive profile</h1><p>{session.responses.length} items administered across {score.subtests.length} attempted sections.{incomplete ? " The battery ended before all sections were completed." : ""}{omittedCount > 0 ? " " + omittedCount + " item" + (omittedCount === 1 ? "" : "s") + " expired unanswered and entered the record as omitted." : ""}{interruptedCount > 0 ? " " + interruptedCount + " memor" + (interruptedCount === 1 ? "y was" : "ies were") + " interrupted by a tab switch and excluded from scoring." : ""}</p></div></div>
    {validity && validity.verdict !== "valid" && <div className={invalidScore ? "invalid-warning" : "incomplete-warning"}><span className="label">Response-validity screening · {validity.verdict}</span><p>{invalidScore
      ? "The response pattern is inconsistent with engaged test-taking (" + validitySummary(validity) + "). This composite must not be interpreted as an ability estimate — a random or disengaged administration lands near the scale floor (IQ ~50) and does not reflect measured reasoning."
      : "Screening flagged this administration as " + validity.verdict + " (" + validitySummary(validity) + "). Interpret the composite with caution."}</p></div>}
    <div className="factor-grid">{score.broad.map((b) => <article key={b.broad}><div><span className="factor-code">{b.broad}</span><span>{ABILITY_NAMES[b.broad]}</span></div><strong className="num">{b.band.score}</strong><div className="factor-track"><i style={{ width: Math.max(2, Math.min(100, ((b.band.score - 55) / 90) * 100)) + "%" }} /></div><small className="num">CI {b.band.ci95[0]}–{b.band.ci95[1]} · P{b.band.percentile}</small></article>)}</div>
    <div className="section-dashboard">
      <span className="label">Section dashboard · every administered test</span>
      <div className="dashboard-grid">
        {BATTERY.map((subtest) => {
          const s = score.subtests.find((x) => x.subtestId === subtest.id);
          if (!s) return <article key={subtest.id} className="is-pending"><div><strong className="num">—</strong><span>{subtest.name}</span></div><small>not administered</small></article>;
          return <article key={subtest.id}>
            <div><strong className="num">{s.band.score}</strong><span>{s.name}</span></div>
            <div className="factor-track"><i style={{ width: Math.max(2, Math.min(100, ((s.band.score - 55) / 90) * 100)) + "%" }} /></div>
            <small className="num">{s.raw}/{s.itemsAdministered} correct · CI {s.band.ci95[0]}–{s.band.ci95[1]} · P{s.band.percentile}</small>
          </article>;
        })}
      </div>
    </div>
    {incomplete && <div className="incomplete-warning"><span className="label">Incomplete administration</span><p>The {Math.round(session.budgetMs / 60_000)}-minute limit was reached before the battery finished. The composite omits unadministered sections and must not be compared with a complete administration.</p></div>}
    {timeLimited > 0 && <div className="incomplete-warning"><span className="label">Section time limits reached</span><p>{timeLimited} section{timeLimited === 1 ? "" : "s"} ended at the authored limit. Items on screen at expiry were recorded as omitted and excluded from scoring.</p></div>}
    <div className="calibration"><span className="label">Calibration status · read before interpreting</span><p>{normed
      ? "Percentiles reference the collected norming sample (N=" + norms!.sampleN + ", bank " + norms!.bankVersion.slice(0, 8) + "). Item parameters remain calibrated only to that sample's evidence; treat the result as research-grade."
      : "Item parameters are authored estimates, not values fitted to a representative norming sample. Scores are internally ordered but absolute IQ-equivalent numbers and percentiles are provisional. Precision thins at the extremes of the scale: estimates beyond roughly the 99th percentile rest on few items and shrink toward the population mean. Do not use this result for diagnosis, placement, or high-stakes decisions."}</p></div>
    <div className="data-export"><span className="label">Response data</span><p>A machine-readable record of this administration (every item, your raw answer, timings, and the routing decisions) supports calibration research.{SUBMIT_ENDPOINT ? " Submitting takes one click; nothing identifying is included." : ""}</p>
      {SUBMIT_ENDPOINT && <button className="primary" onClick={submitData} disabled={submitState === "sending" || submitState === "ok"}>{submitState === "ok" ? "Submitted — thank you" : submitState === "sending" ? "Submitting…" : submitState === "fail" ? "Submit failed — try the download" : "Submit response data"}</button>}
      {" "}
      <button className="secondary" onClick={exportData}>Download response data (JSON)</button>
    </div>
    <button className="secondary" onClick={onReset}>Start a new administration</button>
  </section>;
}

const POOL_SIZE = BATTERY.reduce((n, s) => n + s.items.length, 0);

/** Restore an autosaved session: any administration in progress or awaiting
 * export. The battery clock is frozen between sections, so a save from days
 * ago resumes exactly where it stopped; an abandoned IN-FLIGHT section,
 * however, finds its own section clock long expired and closes with
 * omissions — stopping is only supported at checkpoints. */
function restoredSession() {
  const storage = defaultStorage();
  if (storage) {
    const saved = loadSession(storage, bankVersion(BATTERY));
    if (saved && saved.state.startedAt !== null && saved.state.phase.kind !== "intro") {
      // Re-base the multi-sitting clock: bank only work time through the
      // last autosave, re-open any segment at now (see resumeSavedSession).
      return resumeSavedSession(saved.state, saved.savedAt, Date.now());
    }
  }
  return null;
}

/** Calibration forms are entered explicitly via ?form=calibration — the
 * fixed linear administration used for norming data collection. */
function requestedForm(): "adaptive" | "calibration" {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get("form") === "calibration"
      ? "calibration"
      : "adaptive";
  } catch {
    return "adaptive";
  }
}

type PreStage = "consent" | "demographics" | "battery";

export function App() {
  const restored = useMemo(restoredSession, []);
  // A restored session implies prior consent; a fresh visit starts at it.
  const [pre, setPre] = useState<PreStage>(restored ? "battery" : "consent");
  const [consent, setConsent] = useState<ConsentRecord | null>(restored?.consent ?? null);
  const [session, setSession] = useState(
    () => restored ?? initSession(BATTERY, { form: requestedForm() }),
  );
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
  const startBattery = useCallback((demo: Demographics, participantId: string | null) => {
    setSession(initSession(BATTERY, {
      participantId,
      consent,
      demographics: demo,
      form: requestedForm(),
    }));
    setPre("battery");
  }, [consent]);
  const phase = session.phase;
  const phaseKey = phase.kind === "item"
    ? phase.item.id
    : phase.kind === "practice"
      ? session.subtests[phase.subtestIndex]?.practice?.[phase.practiceIndex]?.id ?? "practice"
      : phase.kind + ("subtestIndex" in phase ? phase.subtestIndex : "");
  useEffect(() => { viewportRef.current?.focus(); }, [phaseKey]);
  const active = pre === "battery" && phase.kind !== "intro";
  const showChrome = pre === "battery" && phase.kind !== "intro";
  return <main className={"app " + (active ? "is-active" : "is-intro")}>
    {showChrome && <InstrumentHeader session={session} now={now} />}
    <div className="viewport" ref={viewportRef} tabIndex={-1}>
      {pre === "consent" && <Consent onAccept={(record) => { setConsent(record); setPre("demographics"); }} />}
      {pre === "demographics" && <Demographics onContinue={startBattery} />}
      {pre === "battery" && phase.kind === "intro" && <Intro onBegin={() => setSession((s) => beginBattery(s, Date.now()))} />}
      {phase.kind === "instructions" && <Instructions subtest={session.subtests[phase.subtestIndex]!} index={phase.subtestIndex} attempts={session.comprehensionAttempts} onStart={() => setSession((s) => startSubtest(s, phase.subtestIndex, Date.now()))} onComprehensionFail={() => setSession((s) => ({ ...s, comprehensionAttempts: s.comprehensionAttempts + 1 }))} />}
      {phase.kind === "practice" && (() => {
        const item = session.subtests[phase.subtestIndex]?.practice?.[phase.practiceIndex];
        if (!item) return null;
        return <ItemScreen key={item.id} item={item} sectionName={session.subtests[phase.subtestIndex]!.name} itemNumber={phase.practiceIndex + 1} sessionId={session.sessionId} practice onAnswer={() => setSession((s) => answerPractice(s, Date.now()))} />;
      })()}
      {phase.kind === "item" && <ItemScreen key={phase.item.id} item={phase.item} sectionName={session.subtests[phase.subtestIndex]!.name} itemNumber={session.routing[phase.subtestIndex]!.administered.length + 1} sessionId={session.sessionId} onAnswer={(value, timedOut, meta) => setSession((s) => answerItem(s, value, Date.now(), timedOut, meta))} />}
      {phase.kind === "matchingDemo" && (() => {
        const subtest = session.subtests[phase.subtestIndex]!;
        const demo = subtest.matchingPractice;
        if (!demo) return null;
        return <MatchingScreen key={subtest.id + "-demo"} title={subtest.name + " · demonstration"} meta={demo.defs.length + " definitions · " + demo.bank.length + " words"} defs={demo.defs} bank={demo.bank} remainingMs={1} practice onAnswer={() => setSession((s) => answerMatchingDemo(s, Date.now()))} />;
      })()}
      {phase.kind === "matching" && (() => {
        const subtest = session.subtests[phase.subtestIndex]!;
        return <MatchingScreen title={subtest.name} meta={subtest.items.length + " definitions · " + (subtest.matching?.bank.length ?? 0) + " words"} defs={subtest.items.map((i) => i.prompt)} bank={subtest.matching?.bank ?? []} remainingMs={sectionRemainingMs(session, now) ?? 0} onAnswer={(assignments, timedOut) => setSession((s) => answerMatching(s, assignments, Date.now(), timedOut))} />;
      })()}
      {phase.kind === "checkpoint" && <CheckpointScreen session={session} onContinue={() => setSession((s) => ({ ...s, phase: { kind: "instructions", subtestIndex: (s.phase.kind === "checkpoint" ? s.phase.subtestIndex : 0) + 1 } }))} />}
      {phase.kind === "results" && <Results session={session} onReset={() => { const storage = defaultStorage(); if (storage) clearSession(storage); setConsent(null); setPre("consent"); setSession(initSession(BATTERY, { form: requestedForm() })); }} />}
    </div>
    {showChrome && session.phase.kind === "results" && <Staircase session={session} />}
  </main>;
}
