import type { Subtest } from "./core/types.ts";
import { matrixReasoning } from "./items/gf-matrix.ts";
import { figureSeries } from "./items/gf-series.ts";
import { precisionLexicon, verbalAnalogies, generalInformation } from "./items/gc.ts";
import { paperFolding } from "./items/gv-fold.ts";
import { mentalRotation } from "./items/gv-rotation.ts";
import { digitSpan, letterNumberSeq, pairedAssociates } from "./items/memory.ts";
import { numberSeries, quantComparison } from "./items/gq.ts";

/** Fixed administration order alternates modalities to reduce method fatigue. */
export const BATTERY: Subtest[] = [
  matrixReasoning,
  precisionLexicon,
  digitSpan,
  numberSeries,
  paperFolding,
  verbalAnalogies,
  letterNumberSeq,
  quantComparison,
  mentalRotation,
  generalInformation,
  figureSeries,
  pairedAssociates,
];
