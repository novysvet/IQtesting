import type { Subtest } from "./core/types.ts";
import { matrixReasoning } from "./items/gf-matrix.ts";
import { figureSeries } from "./items/gf-series.ts";
import { verbalAnalogies, generalInformation } from "./items/gc.ts";
import { definitions } from "./items/gc-definitions.ts";
import { artificialLanguage } from "./items/gc-artlang.ts";
import { paperFolding } from "./items/gv-fold.ts";
import { mentalRotation } from "./items/gv-rotation.ts";
import { visualPuzzles } from "./items/gv-puzzle.ts";
import { blockCounting } from "./items/gv-blocks.ts";
import { digitSpan, letterNumberSeq, pairedAssociates } from "./items/memory.ts";
import { numberSeries, quantComparison } from "./items/gq.ts";
import { arithmetic } from "./items/gq-arithmetic.ts";
import { symbolSearch } from "./items/gs-symsearch.ts";
import { charPairing } from "./items/gs-charpair.ts";

/**
 * Fixed administration order alternates modalities to reduce method fatigue.
 * The Definitions matching page (1926-SAT format) replaces the retired
 * multiple-choice Precision Lexicon (bank preserved in gc.ts for provenance).
 */
export const BATTERY: Subtest[] = [
  matrixReasoning,
  definitions,
  digitSpan,
  numberSeries,
  paperFolding,
  verbalAnalogies,
  arithmetic,
  mentalRotation,
  letterNumberSeq,
  figureSeries,
  symbolSearch,
  generalInformation,
  visualPuzzles,
  quantComparison,
  artificialLanguage,
  blockCounting,
  charPairing,
  pairedAssociates,
];
