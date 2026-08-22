import type { Subtest } from "./core/types.ts";
import { matrixReasoning } from "./items/gf-matrix.ts";
import { figureSeries } from "./items/gf-series.ts";
import { verbalAnalogies, generalInformation } from "./items/gc.ts";
import { antonyms } from "./items/gc-antonyms.ts";
import { sentenceCompletion } from "./items/gc-sentcomp.ts";
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
import { symbolSelection } from "./items/gs-symqueue.ts";
import { analyticalReasoning } from "./items/gf-analytical.ts";
import { figureWeights } from "./items/gq-weights.ts";
import { graphMapping } from "./items/gf-graphmap.ts";

/**
 * Fixed administration order alternates modalities to reduce method fatigue;
 * no two adjacent sections share a broad factor. Pre-1994 GRE/SAT lineage:
 * definitions (1926-SAT matching), quantComparison, verbalAnalogies,
 * sentenceCompletion, antonyms, and analyticalReasoning are the classic
 * formats; the 2026-08 redesign replaced WAIS-style Character Pairing with
 * the pure choice-reaction Symbol Selection task (Gs without Gwm load), and
 * the 2026-08-22 revision replaced binary Yes/No Symbol Search with the
 * locate-and-click timed Symbol Scan block (press the matching glyph or NO;
 * both Gs tests carry an explicit guess penalty). Also 2026-08-22:
 * artificialLanguage moved Gc -> Gf (grammar induction from exemplars, the
 * WJ-IV Analysis-Synthesis construct family) with per-language routing
 * blocks; the second 2026-08-22 wave added the two literature-flagged
 * fluid/quantitative formats — Figure Weights (Wechsler core FRI balance
 * scales, Gq/RQ with Gf cross-loading) and Graph Mapping (Jastrzębski et
 * al. 2022 structure mapping, Gf/I) — placed to keep adjacency
 * modality-alternating (Gq - Gf - Gv - Gf - Gs at the tail).
 */
export const BATTERY: Subtest[] = [
  matrixReasoning,
  definitions,
  digitSpan,
  numberSeries,
  paperFolding,
  verbalAnalogies,
  arithmetic,
  sentenceCompletion,
  mentalRotation,
  letterNumberSeq,
  analyticalReasoning,
  antonyms,
  figureSeries,
  symbolSearch,
  generalInformation,
  visualPuzzles,
  quantComparison,
  artificialLanguage,
  figureWeights,
  blockCounting,
  graphMapping,
  symbolSelection,
  pairedAssociates,
];
