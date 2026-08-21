import test from "node:test";
import assert from "node:assert/strict";
import type { Item, ItemRender } from "../src/core/types.ts";
import { analyticalReasoning, constraintBullet, orderOptionText, claimOptionText, ordinal } from "../src/items/gf-analytical.ts";

/**
 * Analytical Reasoning (anl-001..012): every key is verified against the
 * FULL permutation space by an independent re-implementation of the solver
 * (not imported from the bank). Prose cannot drift: each prompt must contain
 * the exact sentences the render codes render to.
 */

type LogicRender = Extract<ItemRender, { kind: "logic" }>;

function requireLogic(item: Item): LogicRender {
  const r = item.render;
  if (!r || r.kind !== "logic") throw new Error(item.id + " does not use a logic render");
  return r;
}

function perms(xs: string[]): string[][] {
  return xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Independent constraint semantics (kept deliberately separate from the bank). */
function satisfies(order: string[], codes: string[]): boolean {
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

const isOrderCode = (code: string) => code.includes(",");
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];
const decodeOption = (_item: Item, option: string): string => {
  // Display -> code: order options are comma-separated names; claims read
  // "<X> is <ordinal>."
  if (option.includes(", ")) {
    const parts = option.split(", ");
    assert.ok(parts.every((p) => /^[A-Z]$/.test(p)), option + " is not a well-formed order option");
    return parts.join(",");
  }
  const m = /^([A-Z]) is (first|second|third|fourth|fifth|sixth)\.$/.exec(option);
  assert.ok(m, option + " is not a well-formed claim option");
  return m[1]! + ":" + (ORDINALS.indexOf(m[2]!) + 1);
};

test("subtest metadata and routing match the frozen spec", () => {
  assert.equal(analyticalReasoning.id, "analyticalReasoning");
  assert.equal(analyticalReasoning.name, "Analytical Reasoning");
  assert.equal(analyticalReasoning.broad, "Gf");
  assert.deepEqual(analyticalReasoning.narrow, ["RG"]);
  assert.equal(analyticalReasoning.budgetMin, 14);
  assert.deepEqual(analyticalReasoning.routing, {
    maxItems: 10, minItems: 5, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0,
  });
});

test("ids are exactly anl-001..anl-012 plus two practice items", () => {
  assert.deepEqual(
    analyticalReasoning.items.map((i) => i.id),
    Array.from({ length: 12 }, (_, k) => "anl-" + String(k + 1).padStart(3, "0")),
  );
});

test("every prompt embeds its codes as prose; question wording matches form and givens", () => {
  for (const item of [...analyticalReasoning.items, ...(analyticalReasoning.practice ?? [])]) {
    const r = requireLogic(item);
    for (const code of r.constraints) {
      assert.ok(
        item.prompt.includes(constraintBullet(code)),
        item.id + " prompt omits its own constraint: " + code,
      );
    }
    for (const code of r.given ?? []) {
      const [, a, b] = code.split(":") as [string, string, string];
      assert.ok(
        item.prompt.includes(`If ${a} is ${ordinal(Number(b))}`),
        item.id + " prompt omits its conditional stem",
      );
    }
  }
});

test("keys verify against the full solution space per question form", () => {
  for (const item of analyticalReasoning.items) {
    const r = requireLogic(item);
    const allCodes = [...r.constraints, ...(r.given ?? [])];
    const sols = perms(r.entities).filter((o) => satisfies(o, allCodes));
    assert.ok(sols.length > 0, item.id + " has no consistent arrangement");
    const decoded = item.options!.map((o) => decodeOption(item, o));
    assert.equal(new Set(decoded).size, decoded.length, item.id + " duplicate options");
    const keyed = decoded[item.answer as number]!;
    if (isOrderCode(keyed)) {
      // COMPLETE form: key consistent, distractors inconsistent.
      assert.ok(satisfies(keyed.split(","), allCodes), item.id + " keyed order violates constraints");
      let violators = 0;
      for (let i = 0; i < decoded.length; i++) {
        if (i === item.answer) continue;
        assert.ok(!satisfies(decoded[i]!.split(","), allCodes), item.id + " distractor order also satisfies constraints");
        violators++;
      }
      assert.equal(violators, 4, item.id + " complete-order items must have four violating distractors");
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
  }
});

test("difficulty architecture: honest span -1.5..+2.5, a band, c fixed at 1/5", () => {
  const bs = analyticalReasoning.items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -1.5, "floor must reach -1.5");
  assert.ok(Math.max(...bs) >= 2.5, "ceiling must reach +2.5");
  for (const item of analyticalReasoning.items) {
    assert.equal(item.c, 0.2, item.id + " c must equal 1/5");
    assert.ok(item.a >= 1.1 && item.a <= 1.5, item.id + " a outside the authored band");
    assert.equal(item.subtest, "analyticalReasoning");
    assert.equal(item.narrow, "RG");
    assert.equal(item.render && (item.render as LogicRender).kind, "logic");
  }
  assert.equal(new Set(analyticalReasoning.items.map((i) => i.prompt)).size, 12, "duplicate prompts");
});

test("helpers round-trip and match their display contracts", () => {
  assert.equal(orderOptionText("P,Q,R,S,T"), "P, Q, R, S, T");
  assert.equal(claimOptionText("R:3"), "R is third.");
  assert.equal(constraintBullet("before:A:B"), "A is placed somewhere before B.");
  assert.equal(constraintBullet("adj:A:B"), "A is placed immediately before B.");
  assert.equal(constraintBullet("fixed:A:1"), "A is first.");
  assert.equal(constraintBullet("notpos:A:5"), "A is not fifth.");
  assert.equal(constraintBullet("notadj:A:B"), "A and B are not consecutive.");
  assert.equal(ordinal(6), "sixth");
});
