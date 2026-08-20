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
  | { kind: "pairs"; pairs: [string, string][] };

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
}
