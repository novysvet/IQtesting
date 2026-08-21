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
  | "K0" // General verbal information
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
   * Symbol Search (Gs): decide whether either target glyph occurs in the
   * search row. Glyphs reuse the Figure spec "shape:count:fill:rot" with
   * count 1. Options are ["No","Yes"]; the key follows from set membership.
   */
  | { kind: "symsearch"; targets: string[]; search: string[] }
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
  | { kind: "vpuzzle"; cols: number; rows: number; target: number[]; pieces: number[][] };

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
  /** Auto-captured device class (desktop / tablet / phone). */
  device?: string;
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
