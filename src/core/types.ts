/**
 * Core item + ability model types for the CHC battery.
 *
 * CALIBRATION STATUS: all item parameters (a, b) in this project are
 * THEORETICAL ESTIMATES authored by inspection, not values fitted to
 * response data from a real sample. They produce an internally consistent,
 * correctly ORDERED scale. Absolute IQ-equivalent scores are provisional
 * until real response data exists and parameters are re-estimated.
 */

/** CHC broad abilities sampled by this battery. */
export type BroadAbility =
  | "Gf" // Fluid reasoning
  | "Gc" // Comprehension-knowledge
  | "Gv" // Visual processing
  | "Gwm" // Short-term working memory
  | "Gq" // Quantitative knowledge/reasoning
  | "Gs" // Processing speed
  | "Glr"; // Long-term storage and retrieval

/** Narrow abilities, using standard CHC codes. */
export type NarrowAbility =
  // Gf
  | "I" // Induction
  | "RG" // General sequential (deductive) reasoning
  | "RQ" // Quantitative reasoning
  // Gc
  | "VL" // Lexical knowledge
  | "KO" // General verbal information (General Knowledge)
  | "LD" // Language development
  // Gv
  | "Vz" // Visualization
  | "SR" // Spatial relations
  // Gwm
  | "MS" // Memory span
  | "WM" // Working memory capacity
  // Gq
  | "KM" // Mathematical knowledge
  | "A3" // Mathematical achievement
  // Gs
  | "P" // Perceptual speed (scanning; symbol/digit pairing under time pressure)
  | "R9" // Reaction speed (simple/choice reaction; psychomotor speed)
  // Glr
  | "MA" // Associative memory
  | "M6"; // Free recall memory

/** A single scored item. */
export interface Item {
  id: string;
  subtest: string;
  broad: BroadAbility;
  narrow: NarrowAbility;
  /**
   * IRT 3PL discrimination. Higher = sharper distinction between ability
   * levels near b. Practical range here: 0.6 (weak) to 2.2 (strong).
   */
  a: number;
  /**
   * IRT 3PL difficulty on the theta scale (0 = population mean, 1 = +1 SD).
   * Range here spans roughly -3.0 to +4.0 to support tail measurement.
   */
  b: number;
  /** Lower asymptote: guessing probability. 1/nOptions for MC, 0 for recall. */
  c: number;
  prompt: string;
  /** Present for multiple-choice items; absent for constructed-response. */
  options?: string[];
  /**
   * Multi-select choice count. When set (e.g. 3 for visual puzzles), exactly
   * this many options must be chosen; `answer` is the chosen option indices
   * joined ascending with commas ("0,3,4") and c is 1/C(options, multi).
   */
  multi?: number;
  /** Index into options, or the exact expected string for recall items. */
  answer: number | string;
  /** Optional per-item time cap in seconds (used by speeded subtests). */
  timeLimitSec?: number;
  /**
   * CONTENT BLOCK tag. When several bank items share a stimulus grammar
   * (e.g. one artificial language), adaptive selection normally interleaves
   * blocks; mid-run block switching contaminates measurement because
   * learnability transfers across blocks while IRT assumes stationarity.
   * Routing constrains selection to the open block until it is exhausted
   * (see routing.ts). Absent on all unblocked banks.
   */
  block?: string;
  /** Renderer hint for non-text items. */
  render?: ItemRender;
}

/** Nine named placements inside a structured matrix cell. */
export type MatrixPosition = "NW" | "N" | "NE" | "W" | "C" | "E" | "SW" | "S" | "SE";
export type MatrixShape = "tri" | "sq" | "cir" | "dia" | "hex" | "arw" | "cross" | "star";
export type MatrixFill = "none" | "half" | "solid" | "hatch";

export interface MatrixMark {
  shape: MatrixShape;
  fill: MatrixFill;
  /** Clockwise degrees; any finite integer. */
  rot: number;
  pos: MatrixPosition;
}

/** A structured cell: several independently placed marks in one cell. */
export interface CellSpecV2 {
  v: 2;
  marks: MatrixMark[];
}

/** Legacy homogeneous spec string or a structured cell. */
export type FigureSpec = string | CellSpecV2;

/** Shape kinds used by Figure Weights (color is fixed per kind in the renderer). */
export type WeightShapeId = "tri" | "sq" | "cir" | "dia" | "hex" | "star";

/** Structured payloads for visually-rendered items. */
export type ItemRender =
  | { kind: "text" }
  | { kind: "matrix"; cells: (FigureSpec | null)[]; rows: number; cols: number; optionCells?: CellSpecV2[] }
  | { kind: "series"; figures: string[] }
  | { kind: "fold"; steps: string[]; result: string }
  | { kind: "rotation"; target: string; candidates: string[] }
  | { kind: "span"; sequence: string[]; recall: "forward" | "backward" | "sorted" }
  | { kind: "pairs"; pairs: [string, string][] }
  /**
   * Symbol Scan (Gs): a locate-and-click processing-speed block. Two target
   * glyphs sit above a search row; the examinee presses THE row cell that
   * matches either target, or the dedicated NO-symbol control when neither
   * appears. There is no Yes/No shortcut: identifying WHICH cell matches is
   * the response, so blind guessing succeeds ~1/(row+1) of the time while
   * errors are penalised (see Subtest.guessPenalty). Glyphs reuse the Figure
   * spec "shape:1:fill:rot". `answer` is the 0-based row index of the
   * embedded target, or row.length (one past the row) for NO-match trials;
   * the timeout path submits -1, which can never equal a key.
   */
  | { kind: "symscan"; targets: string[]; row: string[] }
  /**
   * Symbol Selection (Gs): a persistent glyph->home-row-key legend shown on
   * every item and a queue of nonsense glyphs. The examinee presses the key
   * matching the CURRENT (highlighted) glyph; a correct press advances the
   * queue, a wrong press is recorded as an error and the queue waits. The
   * answer is the full sequence of pressed keys in order — any error breaks
   * the exact match. Pure perceptual-motor speed: nothing is held in memory
   * (the queue stays visible), unlike WAIS-style digit transcription which
   * confounds Gs with Gwm.
   */
  | { kind: "symqueue"; legend: [string, string][]; queue: string[] }
  /**
   * Block Counting (Gv): an isometric pile of unit cubes given as a
   * row-major height map over a cols x rows footprint (grounded, so every
   * cube is supported). Key = sum of heights; hidden cubes come from
   * interior stacking.
   */
  | { kind: "blocks"; cols: number; rows: number; heights: number[] }
  /**
   * Analytical Reasoning (Gf/RG): a linear-ordering logic game. Entities are
   * placed in positions 1..n under machine-readable constraint codes:
   * `before:A:B`, `adj:A:B` (A immediately before B), `notadj:A:B`,
   * `fixed:A:n` (1-based), `notpos:A:n`. `given` holds extra codes applied
   * only to this question's condition ("If R is first..."). The human prompt
   * duplicates the constraints as prose; the test suite solves the codes and
   * verifies the keyed option against the full solution space.
   */
  | { kind: "logic"; entities: string[]; constraints: string[]; given?: string[] }
  /**
   * Visual Puzzles (Gv): a target silhouette on a cols x rows grid, plus
   * six candidate pieces as cell-index sets in TARGET orientation (pieces
   * translate but never rotate or mirror). Exactly three pieces tile the
   * target; `answer` is their option indices ascending, comma-joined.
   */
  | { kind: "vpuzzle"; cols: number; rows: number; target: number[]; pieces: number[][] }
  /**
   * Figure Weights (Gq/RQ with a Gf cross-loading): balance-scale
   * quantitative equivalence, the WAIS-IV/WISC-V core FRI format. `weights`
   * is the hidden ground-truth unit weight of every shape kind (integer
   * >= 1). `demo` holds balanced demonstration scales ([left pan, right
   * pan]); `query` is the final scale whose right pan carries some shapes
   * (possibly none) plus the implicit "?" gap the chosen option must fill.
   * The demo system must determine every shape weight up to one global
   * scale factor (rank = nShapes - 1), so the balancing option is provably
   * unique — test/weights.test.ts re-derives this by exact rational
   * elimination. Options are groups encoded as comma-joined shape ids
   * ("tri,sq"); the answer is the option index. Shape colors are FIXED
   * globally per shape id (see ReasoningFigures.tsx) and always redundant
   * with geometry, so color vision is never required.
   */
  | { kind: "fweights"; weights: [WeightShapeId, number][]; demo: [WeightShapeId[], WeightShapeId[]][]; query: { left: WeightShapeId[]; right: WeightShapeId[] } }
  /**
   * Graph Mapping (Gf/I): structure-mapping after Jastrzębski, Ociepka &
   * Chuderski (2022). `ref` is the model graph (authored positions, edges,
   * and the two ringed target nodes); `scrambled` is an isomorphic copy in
   * a different layout whose nodes display the numbers index+1. The
   * examinee types the two numbers whose nodes occupy the target nodes'
   * structural roles — ascending, comma-joined ("3,7"), constructed
   * response (c = 0). The key is only shippable because the image of the
   * target pair is identical under EVERY isomorphism (verified by
   * brute-force enumeration in test/graphmap.test.ts). Reference nodes are
   * colored by degree class (renderer-derived, machine-checkable), the
   * scrambled copy stays uncolored.
   */
  | { kind: "graphmap"; ref: { positions: [number, number][]; edges: [number, number][]; targets: [number, number] }; scrambled: { positions: [number, number][]; edges: [number, number][] } };

export interface Subtest {
  id: string;
  name: string;
  broad: BroadAbility;
  narrow: NarrowAbility[];
  instructions: string;
  /** Budgeted wall-clock minutes including instructions. */
  budgetMin: number;
  /** Adaptive routing configuration. */
  routing: RoutingConfig;
  items: Item[];
  /** Practice items shown before scoring begins; never scored. */
  practice?: Item[];
  /**
   * GUESS-PENALTY CONTRACT (speeded selection formats). When set, wrong
   * responses cost the examinee on three levels, and the instructions MUST
   * say so explicitly:
   *   1. Inferential — the bank ships c = 0 even though blind guessing could
   *      succeed by chance, so an error is counted as evidence AGAINST
   *      ability rather than discounted as guessing noise;
   *   2. Behavioural — the UI charges for errors in kind (lost time, forced
   *      correction) instead of letting rapid clicking ride for free;
   *   3. Reported — the results dashboard shows these subtests' raw tallies
   *      net of their error count.
   * The design goal is to make "answer everything, odds be damned" strictly
   * worse than skipping: expected-value guessing must not pay.
   */
  guessPenalty?: boolean;
  /**
   * When present, the subtest is administered as ONE whole page instead of
   * an adaptive item run: every item is presented simultaneously (1926-SAT
   * definitions-matching format). The examinee types a definition number
   * next to each bank word; `bank` lists all words (keys + distractors) in
   * display order. Each item's `answer` is its key word; a response is
   * correct when the number typed next to that word equals the item's
   * 1-based position in `items`. Routing config is unused for stopping.
   */
  matching?: { bank: string[] };
  /**
   * Unscored demonstration page for a whole-page matching subtest: a tiny
   * defs/bank pair (e.g. three definitions, six words) administered through
   * the same matching UI before the scored page. Never routed, scored,
   * exported, or hashed into bankVersion. The section clock starts only
   * when the real page opens.
   */
  matchingPractice?: { defs: string[]; bank: string[] };
}

export interface RoutingConfig {
  /** Max scored items to administer (adaptive stop may end earlier). */
  maxItems: number;
  /** Min scored items before any stop rule can fire. */
  minItems: number;
  /**
   * Ceiling rule: stop after this many consecutive misses.
   * Mirrors SB5-style discontinue rules.
   */
  ceilingMisses: number;
  /** Stop when posterior SE(theta) drops below this. */
  targetSe: number;
  /** Theta at which routing starts before any evidence. */
  entryTheta: number;
  /**
   * FIXED-FORM administration (calibration mode): a precomputed item order.
   * When present, routing serves this exact sequence and disables the
   * precision and ceiling stop rules — every examinee sees the same items in
   * the same order, which is what IRT calibration and DIF analysis require.
   * Adaptive mode leaves this undefined.
   */
  fixedOrder?: string[];
}

/** One routing decision, recorded for exposure/DIF analysis post hoc. */
export interface RoutingDecision {
  /** Battery-wide ordinal of the decision (1-based across all responses so far). */
  step: number;
  theta: number;
  se: number;
  /** Item offered, or null when routing stopped. */
  itemId: string | null;
  stopReason: string | null;
}

/**
 * Self-reported demographics collected under consent before administration.
 * Only ageBand is required; everything else is optional and may be blank.
 * Travels inside the export record for stratification and DIF analysis.
 */
export interface Demographics {
  /**
   * Participation floor is 13: below that, COPPA's verifiable-consent
   * machinery applies to any data collection from a child, and this
   * instrument has no parental-consent flow. 13-17-year-olds may take the
   * battery because the record is fully anonymous (no names, contacts, or
   * accounts); the consent screen asks them to confirm guardian permission.
   */
  ageBand: "13-17" | "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+";
  sex?: string;
  education?: string;
  nativeLanguage?: string;
  country?: string;
  /** Familiarity with timed ability tests (self-report). */
  testFamiliarity?: string;
}

/** Consent to use response data for norming research. */
export interface ConsentRecord {
  acceptedAt: number;
  /** Version of the consent text shown. */
  version: string;
}

/** Administration mode. Calibration = fixed linear forms per subtest. */
export type BatteryForm = "adaptive" | "calibration";

export interface Response {
  itemId: string;
  correct: boolean;
  /** Milliseconds from item presentation to submission. */
  latencyMs: number;
  /** True when the response was auto-submitted by a timeout. */
  timedOut: boolean;
  /**
   * NORMING TELEMETRY — populated by the session layer for every real
   * response (optional so synthetic test responses can omit them):
   */
  /** Subtest the item belongs to. */
  subtestId?: string;
  /** 1-based position within this subtest's administered run. */
  positionInSubtest?: number;
  /** 1-based position across the whole battery. */
  positionInBattery?: number;
  /** Raw submitted answer: option index for MC, typed string for recall. */
  rawAnswer?: number | string | null;
  /** Keyed option index for MC (null for recall) — enables position-bias audit. */
  answerIndex?: number | null;
  /**
   * Display position where the KEYED option appeared (1-based), when options
   * are permuted per session. With unpermuted/binary formats this equals
   * answerIndex + 1; null for recall items.
   */
  keyedPosition?: number | null;
  /**
   * CENSORING FLAG — the item was never answered: the section clock expired
   * with it on screen. Scored neither correct nor folded into ability
   * estimation; recorded so informative censoring is visible in calibration
   * data instead of silently vanishing.
   */
  omitted?: boolean;
  /**
   * CENSORING FLAG — a memory-presentation interruption (tab hidden during
   * exposure). Counts as incorrect for the record but is excluded from
   * ability estimation, person fit, and the discontinue miss streak:
   * the censoring is ability-uncorrelated.
   */
  interrupted?: boolean;
  /** Milliseconds the item was NOT visible while it was open (tab away). */
  awayMs?: number;
}
