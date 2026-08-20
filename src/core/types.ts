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
   * Character Pairing / coding (Gs): a persistent glyph->digit key shown on
   * every item, and a glyph row to transcribe. Recall answer = the digit
   * string in row order.
   */
  | { kind: "coding"; key: [string, string][]; sequence: string[] }
  /**
   * Block Counting (Gv): an isometric pile of unit cubes given as a
   * row-major height map over a cols x rows footprint (grounded, so every
   * cube is supported). Key = sum of heights; hidden cubes come from
   * interior stacking.
   */
  | { kind: "blocks"; cols: number; rows: number; heights: number[] }
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
}

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
}
