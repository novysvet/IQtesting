import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { bankVersion } from "../src/core/telemetry.ts";
import { canonicalCell } from "../src/components/figureGeometry.ts";
import { normalise } from "../src/core/session.ts";
import type { CellSpecV2, Item, Subtest } from "../src/core/types.ts";

/**
 * PRACTICE CONTRACT (2026-08-21, pre-norming hardening).
 *
 * Every adaptive subtest opens with unscored sample item(s): instruction
 * miscomprehension must never masquerade as low ability on the first scored
 * items. Practice items live OUTSIDE `subtest.items` — they are never routed,
 * scored, exported as responses, or hashed into bankVersion — but they must
 * still obey the item schema and carry machine-verifiable keys.
 */

const practiceItems: { subtest: Subtest; item: Item }[] = BATTERY.flatMap((s) =>
  (s.practice ?? []).map((item) => ({ subtest: s, item })),
);

test("every subtest opens with a small practice section", () => {
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      // Whole-page matching formats present all items at once: their practice
      // section is a tiny demonstration page through the same UI, never
      // adaptive samples.
      assert.equal(subtest.practice, undefined, subtest.id + " matching format should not carry adaptive practice");
      assert.ok(subtest.matchingPractice, subtest.id + " matching format has no demonstration page");
      assert.ok(
        (subtest.matchingPractice?.defs.length ?? 0) >= 1 && subtest.matchingPractice!.bank.length >= 2,
        subtest.id + " demonstration page is empty",
      );
      continue;
    }
    assert.ok(
      (subtest.practice?.length ?? 0) >= 2,
      subtest.id + " carries fewer than two practice items",
    );
  }
});

test("practice ids are unique across the battery and namespaced", () => {
  const ids = practiceItems.map(({ item }) => item.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate practice id");
  for (const id of ids) assert.ok(id.startsWith("prac-"), id + " must be namespaced prac-");
});

test("practice items satisfy the schema and guessing contract", () => {
  const comb = (n: number, k: number) => {
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  };
  for (const { item } of practiceItems) {
    assert.ok(item.prompt.trim().length > 0, item.id + " missing prompt");
    if (item.multi !== undefined) {
      assert.equal(item.c, 1 / comb(item.options!.length, item.multi), item.id + " c must equal 1/C(options, multi)");
      const idx = (item.answer as string).split(",").map(Number);
      assert.equal(idx.length, item.multi, item.id + " key size mismatch");
      for (const i of idx) assert.ok(i >= 0 && i < item.options!.length, item.id + " key out of range");
      // Duplicate options are checked for multi items too (this continue used
      // to skip the shared check below).
      assert.equal(new Set(item.options!).size, item.options!.length, item.id + " repeats an option");
      continue;
    }
    if (item.options) {
      assert.equal(item.c, 1 / item.options.length, item.id + " c must equal 1/nOptions");
      assert.ok((item.answer as number) >= 0 && (item.answer as number) < item.options.length, item.id + " key out of range");
      assert.equal(new Set(item.options).size, item.options.length, item.id + " repeats an option");
    } else {
      assert.equal(item.c, 0, item.id + " recall item must have c=0");
      assert.ok(String(item.answer).length > 0, item.id + " empty recall key");
    }
  }
});

// ---------------------------------------------------------------------------
// Key re-derivation machinery for the practice twins of the rule-based
// formats. Each helper re-implements the SAME rule logic its scored twin's
// dedicated test uses (gq-keys / arithmetic-keys / series-keys / analytical /
// memory-banks / artlang), independently of the bank's stored keys: the
// derivations read the prompt/render and recompute, never copy `answer`.
// ---------------------------------------------------------------------------

/** a(k) = start + (k-1) * step — same generator shape as gq-keys.test.ts. */
const constantDifference = (start: number, step: number) => (n: number) =>
  Array.from({ length: n }, (_, k) => start + k * step);

/** Practice rules for numberSeries, mirroring gq-keys' NSR_RULES entries. */
const NSR_PRACTICE_RULES: Record<string, (n: number) => number[]> = {
  "prac-nsr-01": constantDifference(2, 2), // counting by twos (format floor case)
  "prac-nsr-02": constantDifference(5, 10), // counting by tens
};

/** Parse the shown terms out of a prompt like "2, 4, 6, 8, ?". */
function shownTerms(prompt: string): number[] {
  return prompt
    .slice(0, prompt.indexOf("?"))
    .split(",")
    .filter((s) => s.trim() !== "")
    .map((s) => Number(s.trim()));
}

type QcpDir = -1 | 0 | 1; // sign of A - B

/**
 * Practice quantities for quantComparison, mirroring gq-keys' QCP encodings:
 * each entry recomputes both quantities as code and lists the prompt
 * substrings they were read from (drift guard).
 */
const QCP_PRACTICE: Record<string, { tokens: string[]; qa: () => number; qb: () => number }> = {
  "prac-qcp-01": { tokens: ["3 + 3", "5"], qa: () => 3 + 3, qb: () => 5 },
  "prac-qcp-02": { tokens: ["2 × 6", "4 + 8"], qa: () => 2 * 6, qb: () => 4 + 8 },
};

const QC_CANONICAL = [
  "Quantity A is greater",
  "Quantity B is greater",
  "The two quantities are equal",
  "Cannot be determined from the information given",
];

function qcpDirection(a: number, b: number): QcpDir {
  if (Math.abs(a - b) <= 1e-9) return 0;
  return a > b ? 1 : -1;
}

/** Direction implied by the answer index (0 = A, 1 = B, 2 = equal). */
function qcpExpectedDir(answer: number): QcpDir {
  if (answer === 0) return 1;
  if (answer === 1) return -1;
  return 0;
}

/** Practice derivations for arithmetic, mirroring arithmetic-keys' table. */
const ARM_PRACTICE: Record<string, { nums: number[]; calc: (n: number[]) => number }> = {
  "prac-arm-01": { nums: [2, 2], calc: (n) => n[0]! + n[1]! }, // apples: 2 + 2
  "prac-arm-02": { nums: [9, 4], calc: (n) => n[0]! - n[1]! }, // marbles: 9 - 4
};

/** Figure-spec parse/emit, mirroring series-keys.test.ts. */
function parseSpec(spec: string) {
  const [shape, count, fill, rot] = spec.split(":");
  return { shape: shape!, count: Number(count), fill: fill!, rot: Number(rot) };
}
function emitSpec(shape: string, count: number, fill: string, rot: number): string {
  return shape + ":" + count + ":" + fill + ":" + rot;
}

/** Practice rules for figureSeries, mirroring series-keys' RULES entries. */
const FS_PRACTICE_RULES: Record<string, (figs: string[]) => string> = {
  // Fill cycles none -> half -> solid (-> hatch); demonstrated in-stimulus.
  "prac-fs-01": (f) => {
    const fills = ["none", "half", "solid", "hatch"];
    const p = f.map(parseSpec);
    return emitSpec(p[0]!.shape, p[0]!.count, fills[(fills.indexOf(p[p.length - 1]!.fill) + 1) % fills.length]!, p[0]!.rot);
  },
  // Count increases by one each step.
  "prac-fs-02": (f) => {
    const p = f.map(parseSpec);
    return emitSpec(p[0]!.shape, p[p.length - 1]!.count + 1, p[0]!.fill, p[0]!.rot);
  },
};

/** Full permutation-space logic solver, mirroring analytical.test.ts. */
function anlPerms(xs: string[]): string[][] {
  return xs.length <= 1 ? [xs] : xs.flatMap((x, i) => anlPerms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
function anlSatisfies(order: string[], codes: string[]): boolean {
  const pos = new Map(order.map((e, i) => [e, i + 1]));
  for (const c of codes) {
    const [op, a, b] = c.split(":") as [string, string, string];
    if (op === "before" && !(pos.get(a)! < pos.get(b)!)) return false;
    if (op === "adj" && pos.get(a)! + 1 !== pos.get(b)!) return false;
    if (op === "notadj" && Math.abs(pos.get(a)! - pos.get(b)!) === 1) return false;
    if (op === "fixed" && pos.get(a)! !== Number(b)) return false;
    if (op === "notpos" && pos.get(a)! === Number(b)) return false;
  }
  return true;
}
const ANL_ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];
/** Display -> code: "A, B, C" -> "A,B,C"; "B is fourth." -> "B:4". */
function anlDecodeOption(option: string): string {
  if (option.includes(", ")) {
    const parts = option.split(", ");
    assert.ok(parts.every((p) => /^[A-Z]$/.test(p)), option + " is not a well-formed order option");
    return parts.join(",");
  }
  const m = /^([A-Z]) is (first|second|third|fourth|fifth|sixth)\.$/.exec(option);
  assert.ok(m, option + " is not a well-formed claim option");
  return m[1]! + ":" + (ANL_ORDINALS.indexOf(m[2]!) + 1);
}

test("practice keys re-derive per format", () => {
  const unhandled: string[] = [];
  const fired = new Set<string>();
  const mark = (cls: string) => fired.add(cls);
  for (const { subtest, item } of practiceItems) {
    const r = item.render;
    if (subtest.id === "numberSeries") {
      // Same derivation as the scored twins (gq-keys): the generator must
      // reproduce the full shown prefix, and the key must be its next term.
      mark("numberSeries");
      const gen = NSR_PRACTICE_RULES[item.id];
      assert.ok(gen, item.id + " has no encoded practice rule in the test");
      const shown = shownTerms(item.prompt);
      const full = gen(shown.length + 1);
      assert.deepEqual(shown, full.slice(0, shown.length), item.id + " shown terms do not match its stated rule");
      assert.equal(item.options![item.answer as number], String(full[shown.length]), item.id + " keyed option is not the rule-derived next term");
    } else if (subtest.id === "quantComparison") {
      // Same derivation as the scored twins (gq-keys): canonical option set
      // pins the A/B/C/D meaning, tokens pin prompt linkage, direction pins
      // the key.
      mark("quantComparison");
      const enc = QCP_PRACTICE[item.id];
      assert.ok(enc, item.id + " has no encoded practice quantities in the test");
      assert.deepEqual(item.options, QC_CANONICAL, item.id + " options must be the canonical QC set in A/B/C/D order");
      assert.ok(item.prompt.startsWith("Quantity A:") && item.prompt.includes("\nQuantity B:"), item.id + " prompt is not a two-quantity comparison");
      for (const token of enc.tokens) {
        assert.ok(item.prompt.includes(token), item.id + ' prompt no longer contains "' + token + '" - quantities and prompt drifted apart');
      }
      assert.equal(qcpDirection(enc.qa(), enc.qb()), qcpExpectedDir(item.answer as number), item.id + " recomputed comparison contradicts the key");
    } else if (subtest.id === "arithmetic") {
      // Same derivation as the scored twins (arithmetic-keys): recombine the
      // givens; every given must be a digit token of the prompt.
      mark("arithmetic");
      const der = ARM_PRACTICE[item.id];
      assert.ok(der, item.id + " has no practice derivation entry in the test");
      const result = der.calc(der.nums);
      assert.ok(Number.isInteger(result) && result >= 0, item.id + " derivation produced a non-whole or negative value: " + result);
      assert.equal(String(result), item.answer, item.id + " key does not match its re-derivation");
      const tokens: string[] = item.prompt.match(/\d+/g) ?? [];
      for (const num of der.nums) {
        assert.ok(tokens.includes(String(num)), item.id + ": derivation number " + num + " is not a digit token in the prompt");
      }
    } else if (subtest.id === "figureSeries") {
      // Same derivation as the scored twins (series-keys): the rule function
      // re-derives the next figure from the shown figures.
      mark("figureSeries");
      const rule = FS_PRACTICE_RULES[item.id];
      assert.ok(rule, item.id + " has no encoded practice rule in the test");
      assert.equal(r?.kind, "series", item.id + " must use a series render");
      if (r?.kind !== "series") continue;
      const derived = rule(r.figures);
      assert.equal(item.options![item.answer as number], derived, item.id + " key does not match rule derivation");
    } else if (subtest.id === "pairedAssociates") {
      // Same derivation as the scored twins (memory-banks): the prompt's cue
      // must resolve to exactly one pair whose target is the key.
      mark("pairedAssociates");
      assert.equal(r?.kind, "pairs", item.id + " is not a pairs item");
      if (r?.kind !== "pairs") continue;
      const cueMatch = /paired with (.+)\?$/.exec(item.prompt);
      assert.ok(cueMatch, item.id + " prompt does not name a cue");
      const cue = normalise(cueMatch[1]!);
      const probed = r.pairs.filter(([c]) => normalise(c) === cue);
      assert.equal(probed.length, 1, item.id + ": probed cue is missing or duplicated in the study list");
      assert.equal(normalise(item.answer as string), normalise(probed[0]![1]), item.id + " key is not the probed cue's target");
      const targets = r.pairs.filter(([, t]) => normalise(t) === normalise(item.answer as string));
      assert.equal(targets.length, 1, item.id + ": the key is also another pair's target (ambiguous probe)");
    } else if (subtest.id === "analyticalReasoning") {
      // Same derivation as the scored twins (analytical): verify against the
      // full permutation space per question form.
      mark("analyticalReasoning");
      assert.equal(r?.kind, "logic", item.id + " does not use a logic render");
      if (r?.kind !== "logic") continue;
      const allCodes = [...r.constraints, ...(r.given ?? [])];
      const sols = anlPerms(r.entities).filter((o) => anlSatisfies(o, allCodes));
      assert.ok(sols.length > 0, item.id + " has no consistent arrangement");
      const decoded = item.options!.map(anlDecodeOption);
      assert.equal(new Set(decoded).size, decoded.length, item.id + " duplicate options");
      const keyed = decoded[item.answer as number]!;
      if (keyed.includes(",")) {
        // COMPLETE form: key consistent, every distractor inconsistent.
        assert.ok(anlSatisfies(keyed.split(","), allCodes), item.id + " keyed order violates constraints");
        for (let i = 0; i < decoded.length; i++) {
          if (i === item.answer) continue;
          assert.ok(!anlSatisfies(decoded[i]!.split(","), allCodes), item.id + " distractor order also satisfies constraints");
        }
      } else {
        const truthOf = (code: string) => {
          const [ent, p] = code.split(":") as [string, string];
          const hits = sols.filter((o) => o.indexOf(ent) === Number(p) - 1).length;
          return { all: hits === sols.length, some: hits > 0 };
        };
        const keyTruth = truthOf(keyed);
        if (keyTruth.all) {
          // MUST-BE: distractors sometimes-but-not-always true.
          for (let i = 0; i < decoded.length; i++) {
            if (i === item.answer) continue;
            const t = truthOf(decoded[i]!);
            assert.ok(t.some && !t.all, item.id + " mustBe distractor " + decoded[i] + " must be sometimes-true");
          }
        } else {
          // COULD-BE: key sometimes; distractors never.
          assert.ok(keyTruth.some, item.id + " couldBe key is never true");
          for (let i = 0; i < decoded.length; i++) {
            if (i === item.answer) continue;
            assert.ok(!truthOf(decoded[i]!).some, item.id + " couldBe distractor " + decoded[i] + " is sometimes true");
          }
        }
      }
    } else if (subtest.id === "artificialLanguage") {
      // The practice prompts are self-contained: derive from the prompt's own
      // word list and worked examples, as artlang.test.ts proves for the bank.
      mark("artificialLanguage");
      const list = item.prompt.slice(item.prompt.indexOf("Language A word list:"), item.prompt.indexOf("Worked examples:"));
      assert.ok(list.length > 0, item.id + " prompt has no Language A word list");
      const gloss = new Map([...list.matchAll(/([a-z]+) = ([a-z']+)/g)].map((m) => [m[1]!, m[2]!]));
      const stemOf = (en: string): string | null => {
        const hits = [...gloss.entries()].filter(([, e]) => e === en);
        return hits.length === 1 ? hits[0]![0] : null;
      };
      const lookup = /"([a-z]+)" means:/.exec(item.prompt);
      if (lookup) {
        // AL -> EN lookup: the keyed option is the quoted token's gloss.
        const key = gloss.get(lookup[1]!);
        assert.ok(key !== undefined, item.id + ": quoted token " + lookup[1] + " is not in the prompt's word list");
        assert.equal(item.options![item.answer as number], key, item.id + " key is not the word-list gloss of the quoted token");
      } else {
        // EN -> AL inflection: "birds" -> stem of "bird" + the plural marker
        // exhibited in the worked examples (the only non-possessive plural
        // whose AL token extends its stem).
        const target = /Language A: "([a-z]+)"/.exec(item.prompt);
        assert.ok(target, item.id + " prompt names no translation target");
        const base = target[1]!.endsWith("s") ? target[1]!.slice(0, -1) : target[1]!;
        const stem = stemOf(base);
        assert.ok(stem, item.id + ": base word " + base + " is not in the prompt's word list");
        const examples = item.prompt.slice(item.prompt.indexOf("Worked examples:"));
        const suffixes = new Set<string>();
        for (const m of examples.matchAll(/"([^"]+)" = "([^"]+)"/g)) {
          const alTokens = m[1]!.split(" ");
          const enTokens = m[2]!.replace(/\./g, "").split(" ");
          for (const w of enTokens) {
            // Possessives ("woman's") carry a different marker; bare plurals
            // ("houses") are the ones that exhibit plural morphology.
            if (!/^[a-z]+s$/.test(w)) continue;
            const st = stemOf(w.slice(0, -1));
            if (!st) continue;
            const hit = alTokens.find((t) => t.startsWith(st) && t.length > st.length);
            if (hit) suffixes.add(hit.slice(st.length));
          }
        }
        assert.equal(suffixes.size, 1, item.id + ": worked examples do not exhibit exactly one plural marker (found " + [...suffixes].join(", ") + ")");
        const derived = stem + [...suffixes][0]!;
        assert.equal(item.options![item.answer as number], derived, item.id + " key is not the derived plural " + derived);
        assert.notEqual(derived, stem, item.id + ": the plural must be morphologically marked");
      }
    } else if (r?.kind === "symsearch") {
      mark("symsearch");
      // Key follows set membership exactly.
      const expected = r.targets.some((t) => r.search.includes(t)) ? 1 : 0;
      assert.equal(item.answer, expected, item.id + " symsearch key wrong");
    } else if (r?.kind === "symqueue") {
      mark("symqueue");
      // Key string re-derived from the persistent legend.
      const map = new Map(r.legend);
      const derived = r.queue.map((g) => map.get(g)).join("");
      assert.equal(item.answer, derived, item.id + " symqueue key wrong");
    } else if (r?.kind === "blocks") {
      mark("blocks");
      // Total = sum of the height map.
      const total = r.heights.reduce((a, b) => a + b, 0);
      assert.equal(item.options![item.answer as number], String(total), item.id + " blocks key wrong");
    } else if (r?.kind === "fold") {
      mark("fold");
      // Same simulation as test/fold-simulation.test.ts.
      const punches = JSON.parse(r.result) as [number, number][];
      const holes = new Set<number>();
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          let fr = row;
          let fc = col;
          let w = 4;
          let h = 4;
          for (const step of r.steps) {
            if (step === "V") {
              if (fc >= w / 2) fc = w - 1 - fc;
              w /= 2;
            } else {
              if (fr >= h / 2) fr = h - 1 - fr;
              h /= 2;
            }
          }
          if (punches.some(([pr, pc]) => pr === fr && pc === fc)) holes.add(row * 4 + col);
        }
      }
      const keyed = JSON.parse(item.options![item.answer as number] as string) as number[];
      assert.deepEqual(keyed, [...holes].sort((a, b) => a - b), item.id + " fold key wrong");
    } else if (r?.kind === "rotation") {
      mark("rotation");
      // Contract: exactly one candidate is the target figure non-mirrored.
      const [targetFig] = r.target.split(":");
      const nonMirrored = r.candidates
        .map((spec, i) => ({ spec, i }))
        .filter(({ spec }) => spec.split(":")[2] === "0" && spec.split(":")[0] === targetFig);
      assert.equal(nonMirrored.length, 1, item.id + " rotation must have exactly one non-mirrored target candidate");
      assert.equal(nonMirrored[0]!.i, item.answer, item.id + " rotation key is not the rotated target");
      // At least two mirrors, one at the key's own angle.
      const keyAngle = r.candidates[item.answer as number]!.split(":")[1];
      const mirrors = r.candidates.filter((spec) => spec.split(":")[0] === targetFig && spec.split(":")[2] === "1");
      assert.ok(mirrors.length >= 2, item.id + " needs two mirrors");
      assert.ok(mirrors.some((spec) => spec.split(":")[1] === keyAngle), item.id + " needs a mirror at the key's angle");
    } else if (r?.kind === "span") {
      mark("span");
      const seq = r.sequence.join("");
      const expected =
        r.recall === "backward"
          ? [...seq].reverse().join("")
          : r.recall === "sorted"
            ? [...r.sequence].sort((a, b) => (/\d/.test(a) === /\d/.test(b) ? a.localeCompare(b) : /\d/.test(a) ? -1 : 1)).join("")
            : seq;
      assert.equal(item.answer, expected, item.id + " span key wrong");
    } else if (r?.kind === "vpuzzle") {
      mark("vpuzzle");
      // The keyed triple tiles the target exactly.
      const cells = new Set<number>();
      for (const idx of (item.answer as string).split(",").map(Number)) {
        for (const c of r.pieces[idx]!) {
          assert.ok(!cells.has(c), item.id + " pieces overlap");
          cells.add(c);
        }
      }
      assert.deepEqual([...cells].sort((a, b) => a - b), [...r.target].sort((a, b) => a - b), item.id + " tiling does not cover the target");
    } else if (r?.kind === "matrix") {
      mark("matrix");
      assert.equal(r.cells.length, 9, item.id + " matrix needs nine cells");
      assert.equal(r.cells[8], null, item.id + " ninth matrix cell must be empty");
      if (typeof r.cells[0] === "string") {
        // Legacy rows: shape constant per row; count/fill/rot each either
        // constant across rows 1-2 or stepping by a fixed delta; extrapolate
        // row 3 from the two given cells of the target row.
        const parse = (spec: string) => {
          const [sh, ct, fl, ro] = spec.split(":");
          return { sh: sh!, ct: Number(ct), fl: fl!, ro: Number(ro) };
        };
        const c7 = parse(r.cells[6] as string);
        const c8 = parse(r.cells[7] as string);
        const p7 = parse(r.cells[3] as string);
        const p8 = parse(r.cells[4] as string);
        // Attribute carried when constant across rows 1-2, else stepped by
        // the target row's own delta.
        const carryOrStep = (refPrev: number, refFirst: number, curFirst: number, curSecond: number) =>
          refPrev === refFirst ? curSecond : curSecond + (curSecond - curFirst);
        const count = carryOrStep(p8.ct, p7.ct, c7.ct, c8.ct);
        const rot = carryOrStep(p8.ro, p7.ro, c7.ro, c8.ro);
        assert.equal(p8.fl, p7.fl, item.id + " legacy fill steps across rows; no fill ladder to extrapolate");
        const expected = c7.sh + ":" + count + ":" + c8.fl + ":" + rot;
        const hits = (item.options ?? []).map((o, i) => ({ o, i })).filter(({ o }) => o === expected);
        assert.equal(hits.length, 1, item.id + " derived key " + expected + " does not match exactly one option");
        assert.equal(hits[0]!.i, item.answer, item.id + " key is not the derived continuation " + expected);
      } else {
        // Structured cells: cell 3 keeps only positions present in BOTH cell 1
        // and cell 2 (intersection), shape from cell 1. Verify rows 1-2, then
        // derive row 3 and compare canonically against the option grids.
        // The ninth cell is the asserted-empty target slot; only the eight
        // given cells must be structured.
        const structCells = r.cells.slice(0, 8).map((c) => {
          if (c === null || typeof c === "string") throw new Error(item.id + " structured matrix needs eight given structured cells");
          return c;
        });
        const byPos = (cell: CellSpecV2) => new Set(cell.marks.map((m) => m.pos));
        const predict = (c1: CellSpecV2, c2: CellSpecV2): CellSpecV2 => ({
          v: 2 as const,
          marks: c1.marks.filter((m) => byPos(c2).has(m.pos)),
        });
        for (const row of [0, 1]) {
          const pred = predict(structCells[3 * row]!, structCells[3 * row + 1]!);
          assert.equal(canonicalCell(pred), canonicalCell(structCells[3 * row + 2]!), item.id + " row " + (row + 1) + " violates the intersection rule");
        }
        const predicted = predict(structCells[6]!, structCells[7]!);
        const oc = r.optionCells ?? [];
        const hits = oc.map((c, i) => ({ c, i })).filter(({ c }) => canonicalCell(c) === canonicalCell(predicted));
        assert.equal(hits.length, 1, item.id + " intersection prediction matches " + hits.length + " options");
        assert.equal(hits[0]!.i, item.answer, item.id + " key is not the intersection prediction");
      }
    } else if (r?.kind === "text" && item.options && typeof item.answer === "number") {
      // SEMANTIC-KNOWLEDGE MC (verbalAnalogies, sentenceCompletion, antonyms,
      // generalInformation): the key is English/world knowledge — there is no
      // rule to re-derive, the same class their scored twins fall into (the
      // scored Gc keys are schema- and frequency-checked, never re-derived).
      // These items are explicitly schema-asserted here so the dispatch has
      // no silent fall-through, plus every invariant that IS machine-check:
      mark("semantic-text-mc:" + subtest.id);
      const keyed = item.options[item.answer as number];
      assert.ok(typeof keyed === "string" && keyed.trim().length > 0, item.id + " keyed option is empty");
      assert.ok(!/\s/.test(keyed as string), item.id + " keyed option should be a single word");
      // The answer must not be given away in the prompt itself.
      const asWord = new RegExp("\\b" + (keyed as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      assert.ok(!asWord.test(item.prompt), item.id + " keyed option occurs verbatim in the prompt (giveaway)");
      if (subtest.id === "antonyms") {
        const stem = /OPPOSITE in meaning to ([A-Z]+)\./.exec(item.prompt)?.[1];
        assert.ok(stem, item.id + " prompt does not name an uppercase stem");
        assert.ok(!item.options.includes(stem.toLowerCase()), item.id + " offers the stem itself as an option");
        assert.notEqual(keyed, stem, item.id + " keys the stem as its own antonym");
      }
      if (subtest.id === "sentenceCompletion") {
        assert.ok(item.prompt.includes("______"), item.id + " sentence has no blank marker");
      }
      if (subtest.id === "verbalAnalogies") {
        assert.ok(/\bis to\b.*\bas\b.*\bis to/.test(item.prompt), item.id + " prompt is not an A:B::C:D analogy stem");
      }
    } else {
      unhandled.push(item.id);
    }
  }
  // Silent fall-through closure: every practice item must be reached by a
  // verifier (or the explicit semantic-MC whitelist above). A new practice
  // format cannot appear in the battery without this going red.
  assert.deepEqual(unhandled, [], "practice items with no key verifier: " + unhandled.join(", "));
  const expectedClasses = [
    "numberSeries", "quantComparison", "arithmetic", "figureSeries", "pairedAssociates",
    "analyticalReasoning", "artificialLanguage", "symsearch", "symqueue", "blocks", "fold",
    "rotation", "span", "vpuzzle", "matrix",
    "semantic-text-mc:verbalAnalogies", "semantic-text-mc:sentenceCompletion",
    "semantic-text-mc:antonyms", "semantic-text-mc:generalInformation",
  ];
  for (const cls of expectedClasses) {
    assert.ok(fired.has(cls), "no practice item exercised the " + cls + " verifier - dispatch rot");
  }
});

test("practice is invisible to scoring, routing pools, and bankVersion", () => {
  const poolItems = BATTERY.flatMap((s) => s.items);
  assert.equal(poolItems.filter((i) => i.id.startsWith("prac-")).length, 0, "practice leaked into scored pools");
  // Editing a practice item must NOT change the bank hash: it cannot affect
  // any score, so it must not invalidate stored sessions or norm tables.
  // The edit mutates the item's KEY (a field that IS hashed for scored
  // items), so a degenerate hash that wrongly included practice items — for
  // any reason — flips this red, not just one that also skipped prompts.
  const before = bankVersion(BATTERY);
  const withEditedPractice = BATTERY.map((s) =>
    s.practice && s.practice.length > 0
      ? {
          ...s,
          practice: [
            {
              ...s.practice[0]!,
              answer: typeof s.practice[0]!.answer === "number" ? 9999 : "zz-edited",
            },
          ],
        }
      : s,
  );
  assert.equal(bankVersion(withEditedPractice), before, "practice edits must not change bankVersion");
});
