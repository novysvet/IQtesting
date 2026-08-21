import type { Item, Subtest } from "../core/types.ts";

/**
 * Gf - Analytical Reasoning (anl-001..012), narrow ability RG (general
 * sequential / deductive reasoning).
 *
 * FORMAT LINEAGE: the Analytical Ability section of the pre-1994 GRE
 * ("logic games") — the battery's declared-but-unsampled RG narrow ability,
 * made concrete. Each item is a self-contained linear-ordering game:
 * entities placed in positions 1..n under explicit constraints, then one
 * question. Three question forms, all machine-solvable over the full
 * permutation space (test/analytical.test.ts re-implements the solver):
 *
 *   COMPLETE  "Which could be the complete order?"   key order satisfies
 *             every constraint; every distractor violates >= 1.
 *   MUST-BE   "Which must be true?"                  key claim holds in ALL
 *             solutions; distractors hold in some but not all.
 *   COULD-BE  "Which could be true?"                 key claim holds in some
 *             but not all; distractors hold in NONE.
 *
 * Constraint codes live on the render so tests solve codes, never prose;
 * `constraintBullet` renders each code to the exact sentence embedded in the
 * prompt, and the test asserts containment — prose cannot drift from codes.
 * `given` codes are the conditional stem ("If R is first ...").
 *
 * CALIBRATION STATUS: a/b are AUTHORED ESTIMATES anchored to game size and
 * question form, not fitted values:
 *   b = clamp(-1.5 + 0.30*(len-4) + 0.55*cons + 0.55*(form!=complete)
 *             + 0.35*(given?1:0), -1.5, +2.5)   (cons = base constraints)
 * with hand adjustments where a game solves unusually open/closed (noted per
 * item). Floor -1.5 (four entities, two constraints, complete-order),
 * ceiling +2.5 (six entities, five constraints incl. non-adjacency, under a
 * condition). a rises 1.1 -> 1.5 with constraint count. c = 1/5.
 */

export function constraintBullet(code: string): string {
  const [op, a, b] = code.split(":") as [string, string, string];
  switch (op) {
    case "before": return `${a} is placed somewhere before ${b}.`;
    case "adj": return `${a} is placed immediately before ${b}.`;
    case "notadj": return `${a} and ${b} are not consecutive.`;
    case "fixed": return `${a} is ${ordinal(Number(b))}.`;
    case "notpos": return `${a} is not ${ordinal(Number(b))}.`;
    default: throw new Error("unknown constraint code " + code);
  }
}

export function ordinal(n: number): string {
  return ["first", "second", "third", "fourth", "fifth", "sixth"][n - 1] ?? n + "th";
}

/** "P,Q,R,S,T" -> "P, Q, R, S, T" (complete-order option display). */
export function orderOptionText(code: string): string {
  return code.split(",").join(", ");
}

/** "R:3" -> "R is third." (claim option display). */
export function claimOptionText(code: string): string {
  const [a, b] = code.split(":") as [string, string];
  return `${a} is ${ordinal(Number(b))}.`;
}

interface GameSpec {
  id: string;
  intro: string;
  entities: string[];
  constraints: string[];
  given?: string[];
  form: "complete" | "mustBe" | "couldBe";
  /** Order codes ("P,Q,R,S,T") or claim codes ("R:3"). */
  optionCodes: string[];
  answer: number;
  a: number;
  b: number;
}

function buildGameItem(spec: GameSpec, practiceIndex?: number): Item {
  if (!spec.intro.trim().endsWith(".")) throw new Error(spec.id + " intro must end with a period");
  for (const code of [...spec.constraints, ...(spec.given ?? [])]) constraintBullet(code);
  const options = spec.optionCodes.map((code) =>
    spec.form === "complete" ? orderOptionText(code) : claimOptionText(code),
  );
  if (new Set(options).size !== options.length) throw new Error(spec.id + " duplicate option");
  const bullets = spec.constraints.map((c) => "• " + constraintBullet(c)).join("\n");
  let question: string;
  if (spec.form === "complete") {
    question = "Which of the following could be the complete order, first to last?";
  } else if (spec.given && spec.given.length > 0) {
    const givenLine = spec.given.map((c) => {
      const [op, a, b] = c.split(":") as [string, string, string];
      if (op !== "fixed") throw new Error(spec.id + " only fixed givens are supported");
      return `If ${a} is ${ordinal(Number(b))}`;
    }).join(" and ");
    question = `${givenLine}, which one of the following ${spec.form === "mustBe" ? "must" : "cannot"} be true?`;
    // COULD-BE under a condition asks "could be true"; fix wording below.
    if (spec.form === "couldBe") {
      return finalize(spec, practiceIndex, bullets, `${givenLine}, which one of the following could be true?`, options);
    }
    return finalize(spec, practiceIndex, bullets, question, options);
  } else {
    question = spec.form === "mustBe"
      ? "Which one of the following must be true?"
      : "Which one of the following could be true?";
  }
  return finalize(spec, practiceIndex, bullets, question, options);
}

function finalize(spec: GameSpec, practiceIndex: number | undefined, bullets: string, question: string, options: string[]): Item {
  const header = practiceIndex === undefined ? "" : `Unscored sample ${practiceIndex} of 2.\n`;
  return {
    id: spec.id, subtest: "analyticalReasoning", broad: "Gf", narrow: "RG",
    a: spec.a, b: spec.b, c: 0.2,
    prompt: `${header}${spec.intro}\n${bullets}\n${question}`,
    options,
    answer: spec.answer,
    render: { kind: "logic", entities: spec.entities, constraints: spec.constraints, given: spec.given },
  };
}

const PRACTICE: GameSpec[] = [
  {
    id: "prac-anl-01", intro: "Four packages are delivered one at a time: A, B, C, and D.",
    entities: ["A", "B", "C", "D"],
    constraints: ["fixed:A:1"], form: "complete",
    optionCodes: ["A,B,C,D", "B,A,C,D", "C,A,B,D", "B,C,A,D", "D,A,B,C"], answer: 0,
    a: 1.0, b: -3,
  },
  {
    id: "prac-anl-02", intro: "Four hikers reach a bridge one after another: A, B, C, and D.",
    entities: ["A", "B", "C", "D"],
    constraints: ["fixed:B:4", "before:A:C"], form: "mustBe",
    optionCodes: ["B:4", "A:1", "C:3", "D:2", "C:2"], answer: 0,
    a: 1.0, b: -3,
  },
];

const GAMES: GameSpec[] = [
  {
    id: "anl-001",
    intro: "Four runners finish a race with no ties: R, S, T, and U.",
    entities: ["R", "S", "T", "U"],
    constraints: ["before:T:U", "adj:R:S"], form: "complete",
    optionCodes: ["R,S,T,U", "R,S,U,T", "T,R,U,S", "S,R,T,U", "R,T,S,U"],
    answer: 0, a: 1.1, b: -1.5,
  },
  {
    id: "anl-002",
    intro: "Four books sit on a shelf, left to right: V, W, X, and Y.",
    entities: ["V", "W", "X", "Y"],
    constraints: ["fixed:Y:4", "notadj:V:W"], form: "complete",
    optionCodes: ["V,X,W,Y", "V,W,X,Y", "W,V,Y,X", "X,V,Y,W", "W,Y,V,X"],
    answer: 0, a: 1.15, b: -1.2,
  },
  {
    id: "anl-003",
    intro: "Four coins are flipped in sequence: V, W, X, and Y.",
    entities: ["V", "W", "X", "Y"],
    constraints: ["fixed:Y:4", "before:W:X"], form: "mustBe",
    optionCodes: ["Y:4", "V:1", "W:1", "X:2", "W:2"],
    answer: 0, a: 1.2, b: -1.0,
  },
  {
    id: "anl-004",
    intro: "Five speakers address a council across five slots: P, Q, R, S, and T.",
    entities: ["P", "Q", "R", "S", "T"],
    constraints: ["adj:P:Q", "before:R:T", "notpos:S:3"], form: "complete",
    optionCodes: ["P,Q,R,S,T", "P,Q,S,R,T", "P,R,Q,S,T", "P,Q,T,R,S", "P,S,Q,R,T"],
    answer: 0, a: 1.2, b: -0.6,
  },
  {
    id: "anl-005",
    intro: "Five paintings are hung on a wall in numbered positions: F, G, H, J, and K.",
    entities: ["F", "G", "H", "J", "K"],
    constraints: ["before:F:K", "notadj:G:H", "fixed:J:1"], form: "couldBe",
    optionCodes: ["K:4", "F:4", "G:1", "J:2", "K:1"],
    answer: 0, a: 1.25, b: -0.2,
  },
  {
    id: "anl-006",
    intro: "Five machines are repaired one after another: M, N, O, P, and Q.",
    entities: ["M", "N", "O", "P", "Q"],
    constraints: ["adj:M:N", "before:N:O", "fixed:Q:5"], form: "mustBe",
    optionCodes: ["Q:5", "M:1", "N:2", "O:3", "P:3"],
    answer: 0, a: 1.3, b: 0.5,
  },
  {
    id: "anl-007",
    intro: "Five speakers address a council across five slots: P, Q, R, S, and T.",
    entities: ["P", "Q", "R", "S", "T"],
    constraints: ["before:P:S", "notadj:Q:R", "adj:S:T"], given: ["fixed:R:1"], form: "mustBe",
    // Under R first, the ST block cannot start at slot 2 (P must precede S)
    // and Q cannot take slot 2, so P is pinned to second in every solution.
    optionCodes: ["P:2", "S:4", "Q:5", "S:3", "T:5"],
    answer: 0, a: 1.35, b: 0.9,
  },
  {
    id: "anl-008",
    intro: "Six acts audition in six numbered slots: A, B, C, D, E, and F.",
    entities: ["A", "B", "C", "D", "E", "F"],
    constraints: ["before:A:D", "adj:C:D", "notadj:B:F"], form: "complete",
    optionCodes: ["A,B,C,D,E,F", "A,B,C,E,D,F", "A,B,D,C,E,F", "A,B,C,F,D,E", "A,B,E,C,F,D"],
    answer: 0, a: 1.4, b: 1.2,
  },
  {
    id: "anl-009",
    intro: "Six acts audition in six numbered slots: A, B, C, D, E, and F.",
    entities: ["A", "B", "C", "D", "E", "F"],
    constraints: ["before:A:B", "before:C:F", "notpos:D:6", "fixed:E:2"], form: "mustBe",
    optionCodes: ["E:2", "A:1", "B:4", "C:3", "D:1"],
    answer: 0, a: 1.4, b: 1.5,
  },
  {
    id: "anl-010",
    intro: "Five paintings are hung on a wall in numbered positions: F, G, H, J, and K.",
    entities: ["F", "G", "H", "J", "K"],
    constraints: ["before:F:H", "adj:J:K"], given: ["fixed:G:5"], form: "couldBe",
    optionCodes: ["J:1", "F:2", "H:1", "K:5", "F:4"],
    answer: 0, a: 1.45, b: 1.8,
  },
  {
    id: "anl-011",
    intro: "Six plots in a garden row receive one plant each: P, Q, R, S, T, and U.",
    entities: ["P", "Q", "R", "S", "T", "U"],
    constraints: ["adj:Q:R", "before:S:U", "notadj:P:T", "before:R:U", "notpos:Q:6", "fixed:U:6"],
    given: ["fixed:P:1"], form: "mustBe",
    // Under P first, U is pinned to the sixth plot by its own constraint.
    optionCodes: ["U:6", "Q:2", "R:3", "S:2", "T:5"],
    answer: 0, a: 1.5, b: 2.2,
  },
  {
    id: "anl-012",
    intro: "Six acts audition in six numbered slots: A, B, C, D, E, and F.",
    entities: ["A", "B", "C", "D", "E", "F"],
    constraints: ["notadj:A:B", "before:D:F", "fixed:C:3"], given: ["fixed:A:2"], form: "couldBe",
    optionCodes: ["E:4", "A:4", "B:2", "C:1", "F:1"],
    answer: 0, a: 1.5, b: 2.5,
  },
];

// Bank-construction guard: keys/distractors must satisfy their contracts
// against the full permutation space. Throws at import time on drift.
function perms(xs: string[]): string[][] {
  return xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
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
for (const spec of [...GAMES, ...PRACTICE]) {
  const sols = perms(spec.entities).filter((o) => satisfies(o, [...spec.constraints, ...(spec.given ?? [])]));
  if (sols.length === 0) throw new Error(spec.id + " has no consistent arrangement");
  const keyed = spec.optionCodes[spec.answer]!;
  if (spec.form === "complete") {
    if (!satisfies(keyed.split(","), [...spec.constraints, ...(spec.given ?? [])])) {
      throw new Error(spec.id + " keyed order violates its own constraints");
    }
    for (let i = 0; i < spec.optionCodes.length; i++) {
      if (i === spec.answer) continue;
      if (satisfies(spec.optionCodes[i]!.split(","), [...spec.constraints, ...(spec.given ?? [])])) {
        throw new Error(spec.id + " distractor order " + spec.optionCodes[i] + " also satisfies the constraints");
      }
    }
  } else {
    const truthOf = (code: string) => {
      const [ent, p] = code.split(":") as [string, string];
      const hits = sols.filter((o) => o.indexOf(ent) === Number(p) - 1).length;
      return { all: hits === sols.length, some: hits > 0 };
    };
    const keyTruth = truthOf(keyed);
    if (spec.form === "mustBe") {
      if (!keyTruth.all) throw new Error(spec.id + " keyed claim is not always true");
      for (let i = 0; i < spec.optionCodes.length; i++) {
        if (i === spec.answer) continue;
        const t = truthOf(spec.optionCodes[i]!);
        if (!t.some || t.all) throw new Error(spec.id + " mustBe distractor must be sometimes-true, got " + spec.optionCodes[i]);
      }
    } else {
      if (!keyTruth.some || keyTruth.all) throw new Error(spec.id + " keyed claim must be sometimes-true");
      for (let i = 0; i < spec.optionCodes.length; i++) {
        if (i === spec.answer) continue;
        if (truthOf(spec.optionCodes[i]!).some) throw new Error(spec.id + " couldBe distractor must be never-true, got " + spec.optionCodes[i]);
      }
    }
  }
}

export const analyticalReasoning: Subtest = {
  id: "analyticalReasoning",
  name: "Analytical Reasoning",
  broad: "Gf",
  narrow: ["RG"],
  instructions:
    "Each problem describes several entities placed into an order under a set of conditions. Read the conditions, take them as true, and answer the question. Exactly one choice satisfies the question.",
  budgetMin: 14,
  routing: { maxItems: 10, minItems: 5, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  practice: [
    buildGameItem(PRACTICE[0]!, 1),
    buildGameItem(PRACTICE[1]!, 2),
  ],
  items: GAMES.map((g) => buildGameItem(g)),
};
