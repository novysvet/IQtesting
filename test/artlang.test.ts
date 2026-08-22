import test from "node:test";
import assert from "node:assert/strict";
import { ARTLANG_SPECS, artificialLanguage } from "../src/items/gc-artlang.ts";
import type { ArtlangError, ArtlangItemSpec, ArtlangLangId, ArtlangNP, ArtlangReading, ArtlangSentence } from "../src/items/gc-artlang.ts";

/**
 * Machine verification for the Artificial Language bank (aln-001..aln-018),
 * in the spirit of test/matrix-rules.test.ts: the three mini-grammars are
 * re-implemented here INDEPENDENTLY of src/items/gc-artlang.ts (own lexicon
 * tables, own parsers, own renderers, own rule-error transforms), and every
 * key and every distractor is re-derived from them:
 *
 * - keys are pinned to hand-written literals AND re-derived from the item's
 *   structured reading via this file's renderers;
 * - EN->AL distractors must equal the key string with the stated rule error
 *   applied (droppedAffix(key), wrongOrder(key), ...) using lexicon-driven
 *   token transforms;
 * - AL->EN items are answered by PARSING the artificial-language string
 *   quoted in the item's own prompt (proving the prompt is self-contained),
 *   then translating with this file's grammar;
 * - the worked examples in every prompt must parse, translate, and
 *   round-trip under this file's grammar;
 * - calibration pins, key-position balance, stem-containment, and
 *   key-length anti-exploits are asserted separately.
 */

// ---------------------------------------------------------------------------
// Independent lexicons (pos: n = noun, v = verb, adj, func = function word)
// ---------------------------------------------------------------------------

interface LexEntry {
  readonly en: string;
  readonly pos: "n" | "v" | "adj" | "func";
  readonly plural?: string;
  readonly past?: string;
  readonly third?: string;
  readonly mass?: boolean;
}

const LEX_A: Record<string, LexEntry> = {
  dabor: { en: "house", pos: "n" },
  selik: { en: "bird", pos: "n" },
  nogar: { en: "fish", pos: "n" },
  mavik: { en: "tree", pos: "n" },
  tulir: { en: "bread", pos: "n" },
  tamel: { en: "man", pos: "n" },
  renuk: { en: "woman", pos: "n" },
  tikal: { en: "see", pos: "v", past: "saw", third: "sees" },
  romek: { en: "eat", pos: "v", past: "ate", third: "eats" },
  dumal: { en: "carry", pos: "v", past: "carried", third: "carries" },
  boken: { en: "big", pos: "adj" },
  limor: { en: "small", pos: "adj" },
  ganol: { en: "old", pos: "adj" },
  ka: { en: "the", pos: "func" },
  vo: { en: "and", pos: "func" },
};

const LEX_B: Record<string, LexEntry> = {
  kedan: { en: "king", pos: "n" },
  lunek: { en: "queen", pos: "n" },
  hobek: { en: "horse", pos: "n" },
  taval: { en: "river", pos: "n" },
  navek: { en: "boat", pos: "n" },
  suvak: { en: "gold", pos: "n", mass: true },
  zagil: { en: "find", pos: "v", past: "found", third: "finds" },
  hekum: { en: "make", pos: "v", past: "made", third: "makes" },
  vedal: { en: "love", pos: "v", past: "loved", third: "loves" },
  pimor: { en: "bring", pos: "v", past: "brought", third: "brings" },
  mokal: { en: "fast", pos: "adj" },
  lumek: { en: "slow", pos: "adj" },
  darik: { en: "strong", pos: "adj" },
  tal: { en: "and", pos: "func" },
};

const LEX_C: Record<string, LexEntry> = {
  tavor: { en: "dog", pos: "n" },
  galim: { en: "water", pos: "n" },
  rukol: { en: "fire", pos: "n" },
  sevam: { en: "wine", pos: "n" },
  dopel: { en: "table", pos: "n" },
  tamur: { en: "market", pos: "n" },
  bolik: { en: "child", pos: "n", plural: "children" },
  mekal: { en: "drink", pos: "v", past: "drank", third: "drinks" },
  pekot: { en: "want", pos: "v", past: "wanted", third: "wants" },
  sedal: { en: "wash", pos: "v", past: "washed", third: "washes" },
  gidel: { en: "know", pos: "v", past: "knew", third: "knows" },
  ketum: { en: "hot", pos: "adj" },
  nurev: { en: "cold", pos: "adj" },
  dolim: { en: "sweet", pos: "adj" },
  sa: { en: "the", pos: "func" },
  zu: { en: "and", pos: "func" },
};

const LEX: Record<ArtlangLangId, Record<string, LexEntry>> = { A: LEX_A, B: LEX_B, C: LEX_C };

const isNoun = (lang: ArtlangLangId, t: string) => LEX[lang][t]?.pos === "n";
const isVerb = (lang: ArtlangLangId, t: string) => LEX[lang][t]?.pos === "v";
const isAdj = (lang: ArtlangLangId, t: string) => LEX[lang][t]?.pos === "adj";

// ---------------------------------------------------------------------------
// Parsers: artificial-language string -> structured reading
// ---------------------------------------------------------------------------

interface TNp {
  noun: string;
  definite: boolean;
  plural: boolean;
  adjective?: string;
  possessor?: string;
  intensive?: boolean;
  objectCase?: boolean;
}

interface TSent {
  subjects: TNp[];
  objects: TNp[];
  verb: string;
  past: boolean;
}

// --- Language A: SOV; "ka" opens an NP; possessor takes -ur; plural -ol; past vu-.

function parseNpA(tokens: readonly string[]): TNp {
  let i = 0;
  let definite = false;
  if (tokens[i] === "ka") {
    definite = true;
    i += 1;
  }
  let possessor: string | undefined;
  const first = tokens[i];
  if (first) {
    const possStem = first.endsWith("ur") ? first.slice(0, -2) : null;
    const next = tokens[i + 1];
    const nextIsHead = next !== undefined && ((next.endsWith("ol") && isNoun("A", next.slice(0, -2))) || isNoun("A", next));
    if (possStem && isNoun("A", possStem) && nextIsHead) {
      possessor = possStem;
      i += 1;
    }
  }
  const head = tokens[i];
  let noun = "";
  let plural = false;
  if (head && head.endsWith("ol") && isNoun("A", head.slice(0, -2))) {
    noun = head.slice(0, -2);
    plural = true;
  } else if (head && isNoun("A", head)) {
    noun = head;
  } else {
    throw new Error("A NP head not found: " + tokens.join(" "));
  }
  i += 1;
  let adjective: string | undefined;
  if (tokens[i] && isAdj("A", tokens[i]!)) adjective = tokens[i];
  const np: TNp = { noun, definite, plural };
  if (possessor) np.possessor = possessor;
  if (adjective) np.adjective = adjective;
  return np;
}

function parseA(al: string): TSent {
  const tokens = al.split(" ");
  let verbIdx = -1;
  let verb = "";
  let past = false;
  tokens.forEach((t, i) => {
    if (verbIdx >= 0) return;
    if (t.startsWith("vu") && isVerb("A", t.slice(2))) {
      verbIdx = i;
      verb = t.slice(2);
      past = true;
    } else if (isVerb("A", t)) {
      verbIdx = i;
      verb = t;
    }
  });
  if (verbIdx < 0) throw new Error("A sentence lacks a verb: " + al);
  const segments: string[][] = [];
  let current: string[] = [];
  tokens.forEach((t, i) => {
    if (i === verbIdx) return;
    if (t === "vo") {
      segments.push(current);
      current = [];
      return;
    }
    if (t === "ka") {
      if (current.length > 0) segments.push(current);
      current = ["ka"];
      return;
    }
    current.push(t);
  });
  segments.push(current);
  const nps = segments.filter((s) => s.length > 0).map(parseNpA);
  if (nps.length < 2) throw new Error("A sentence needs subject and object NPs: " + al);
  return { subjects: nps.slice(0, -1), objects: [nps[nps.length - 1]!], verb, past };
}

// --- Language B: VSO; adjective precedes head; plural vi-; bo-...-um; object -ik.

interface DecodedHead {
  noun: string;
  plural: boolean;
  definite: boolean;
  objCase: boolean;
}

function decodeHeadB(t: string): DecodedHead {
  let s = t;
  let objCase = false;
  let definite = false;
  let plural = false;
  if (s.endsWith("ik")) {
    objCase = true;
    s = s.slice(0, -2);
  }
  if (s.startsWith("bo") && s.endsWith("um") && s.length > 4) {
    definite = true;
    s = s.slice(2, -2);
  }
  if (s.startsWith("vi") && isNoun("B", s.slice(2))) {
    plural = true;
    s = s.slice(2);
  }
  if (!isNoun("B", s)) throw new Error("B head decode failed: " + t);
  return { noun: s, plural, definite, objCase };
}

function encodeHeadB(d: DecodedHead): string {
  let s = d.plural ? "vi" + d.noun : d.noun;
  if (d.definite) s = "bo" + s + "um";
  if (d.objCase) s = s + "ik";
  return s;
}

const isHeadB = (t: string) => {
  try {
    decodeHeadB(t);
    return true;
  } catch {
    return false;
  }
};

function parseNpB(tokens: readonly string[]): TNp {
  let i = 0;
  let adjective: string | undefined;
  if (isAdj("B", tokens[0]!)) {
    adjective = tokens[0];
    i = 1;
  }
  const head = decodeHeadB(tokens[i]!);
  const np: TNp = { noun: head.noun, definite: head.definite, plural: head.plural };
  if (adjective) np.adjective = adjective;
  if (head.objCase) np.objectCase = true;
  return np;
}

function parseB(al: string): TSent {
  const tokens = al.split(" ");
  if (!isVerb("B", tokens[0]!)) throw new Error("B sentence must start with the verb: " + al);
  const verb = tokens[0]!;
  const nps: TNp[] = [];
  let i = 1;
  while (i < tokens.length) {
    if (tokens[i] === "tal") {
      i += 1;
      continue;
    }
    let adjective: string | undefined;
    if (isAdj("B", tokens[i]!)) {
      adjective = tokens[i];
      i += 1;
    }
    const head = decodeHeadB(tokens[i]!);
    i += 1;
    const np: TNp = { noun: head.noun, definite: head.definite, plural: head.plural };
    if (adjective) np.adjective = adjective;
    if (head.objCase) np.objectCase = true;
    nps.push(np);
  }
  const objects = nps.filter((n) => n.objectCase);
  const subjects = nps.filter((n) => !n.objectCase);
  if (objects.length !== 1) throw new Error("B sentence needs exactly one case-marked object: " + al);
  return { subjects, objects, verb, past: false };
}

// --- Language C: SVO; article "sa" after noun; plural -u; past -i; adj redup = very.

function verbStemC(t: string): string | null {
  if (isVerb("C", t)) return t;
  if (t.endsWith("i") && isVerb("C", t.slice(0, -1))) return t.slice(0, -1);
  return null;
}

function parseNpC(tokens: readonly string[]): TNp {
  const first = tokens[0]!;
  let noun = first;
  let plural = false;
  if (first.endsWith("u") && isNoun("C", first.slice(0, -1))) {
    noun = first.slice(0, -1);
    plural = true;
  } else if (!isNoun("C", first)) {
    throw new Error("C NP head not a noun: " + tokens.join(" "));
  }
  let i = 1;
  let definite = false;
  if (tokens[i] === "sa") {
    definite = true;
    i += 1;
  }
  let adjective: string | undefined;
  let intensive = false;
  const a = tokens[i];
  if (a !== undefined) {
    if (isAdj("C", a)) {
      adjective = a;
      i += 1;
    } else {
      const half = a.slice(0, a.length / 2);
      if (half + half === a && isAdj("C", half)) {
        adjective = half;
        intensive = true;
        i += 1;
      }
    }
  }
  if (i !== tokens.length) throw new Error("C NP trailing tokens: " + tokens.join(" "));
  const np: TNp = { noun, definite, plural };
  if (adjective) {
    np.adjective = adjective;
    if (intensive) np.intensive = true;
  }
  return np;
}

function parseC(al: string): TSent {
  const tokens = al.split(" ");
  let verbIdx = -1;
  let verb = "";
  let past = false;
  tokens.forEach((t, i) => {
    if (verbIdx >= 0) return;
    const v = verbStemC(t);
    if (v) {
      verbIdx = i;
      verb = v;
      past = t !== v;
    }
  });
  if (verbIdx < 0) throw new Error("C sentence lacks a verb: " + al);
  const subjectTokens: string[] = [];
  const objectTokens: string[] = [];
  let afterVerb = false;
  tokens.forEach((t, i) => {
    if (i === verbIdx) {
      afterVerb = true;
      return;
    }
    (afterVerb ? objectTokens : subjectTokens).push(t);
  });
  const splitZu = (ts: string[]) => ts.join(" ").split(" zu ").map((s) => s.split(" "));
  return { subjects: splitZu(subjectTokens).map(parseNpC), objects: splitZu(objectTokens).map(parseNpC), verb, past };
}

// ---------------------------------------------------------------------------
// Renderers (inverse direction), used for round-trips and EN->AL derivation
// ---------------------------------------------------------------------------

function renderNpA(np: TNp): string {
  const toks: string[] = [];
  if (np.definite) toks.push("ka");
  if (np.possessor) toks.push(np.possessor + "ur");
  toks.push(np.noun + (np.plural ? "ol" : ""));
  if (np.adjective) toks.push(np.adjective);
  return toks.join(" ");
}

function renderSentA(s: TSent, svo = false): string {
  const subj = s.subjects.map(renderNpA).join(" vo ");
  const obj = s.objects.map(renderNpA).join(" vo ");
  const verb = (s.past ? "vu" : "") + s.verb;
  return svo ? subj + " " + verb + " " + obj : subj + " " + obj + " " + verb;
}

function renderNpB(np: TNp): string {
  let head = np.plural ? "vi" + np.noun : np.noun;
  if (np.definite) head = "bo" + head + "um";
  if (np.objectCase) head = head + "ik";
  return np.adjective ? np.adjective + " " + head : head;
}

function renderSentB(s: TSent, svo = false): string {
  const subj = s.subjects.map(renderNpB).join(" tal ");
  const obj = s.objects.map((n) => renderNpB({ ...n, objectCase: true })).join(" tal ");
  return svo ? subj + " " + s.verb + " " + obj : s.verb + " " + subj + " " + obj;
}

function renderNpC(np: TNp): string {
  const toks: string[] = [np.noun + (np.plural ? "u" : "")];
  if (np.definite) toks.push("sa");
  if (np.adjective) toks.push(np.intensive ? np.adjective + np.adjective : np.adjective);
  return toks.join(" ");
}

function renderSentC(s: TSent, sov = false): string {
  const subj = s.subjects.map(renderNpC).join(" zu ");
  const obj = s.objects.map(renderNpC).join(" zu ");
  const verb = s.verb + (s.past ? "i" : "");
  return sov ? subj + " " + obj + " " + verb : subj + " " + verb + " " + obj;
}

function renderAlNp(lang: ArtlangLangId, np: TNp): string {
  if (lang === "A") return renderNpA(np);
  if (lang === "B") return renderNpB(np);
  return renderNpC(np);
}

function renderAlSent(lang: ArtlangLangId, s: TSent): string {
  if (lang === "A") return renderSentA(s);
  if (lang === "B") return renderSentB(s);
  return renderSentC(s);
}

// --- English renderers (sources and AL->EN keys).

function enNoun(lang: ArtlangLangId, stem: string, plural: boolean): string {
  const entry = LEX[lang][stem]!;
  return plural ? (entry.plural ?? entry.en + "s") : entry.en;
}

function renderEnNp(lang: ArtlangLangId, np: TNp): string {
  const head = (np.adjective ? (np.intensive ? "very " : "") + LEX[lang][np.adjective]!.en + " " : "") + enNoun(lang, np.noun, np.plural);
  if (np.possessor) return (np.definite ? "the " : "a ") + enNoun(lang, np.possessor, false) + "'s " + head;
  if (np.definite) return "the " + head;
  if (LEX[lang][np.noun]!.mass || np.plural) return head;
  return "a " + head;
}

function renderEnSent(lang: ArtlangLangId, s: TSent): string {
  const subj = s.subjects.map((n) => renderEnNp(lang, n)).join(" and ");
  const obj = s.objects.map((n) => renderEnNp(lang, n)).join(" and ");
  const entry = LEX[lang][s.verb]!;
  const third = s.subjects.length === 1 && !s.subjects[0]!.plural;
  const verb = s.past ? (entry.past ?? entry.en + "d") : third ? (entry.third ?? entry.en + "s") : entry.en;
  const text = subj + " " + verb + " " + obj + ".";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// --- Spec reading -> this file's structures.

function npFromSpec(np: ArtlangNP): TNp {
  const out: TNp = { noun: np.noun, definite: np.definite, plural: np.plural };
  if (np.adjective) out.adjective = np.adjective;
  if (np.possessor) out.possessor = np.possessor;
  if (np.intensive) out.intensive = true;
  if (np.objectCase) out.objectCase = true;
  return out;
}

function sentFromSpec(lang: ArtlangLangId, sentence: ArtlangSentence): TSent {
  return {
    subjects: sentence.subjects.map(npFromSpec),
    // B sentence objects carry structural -ik that authored readings leave implicit.
    objects: sentence.objects.map((n) => ({ ...npFromSpec(n), ...(lang === "B" ? { objectCase: true } : {}) })),
    verb: sentence.verb,
    past: sentence.past,
  };
}

function sentFromReading(lang: ArtlangLangId, reading: ArtlangReading): TSent {
  if (reading.kind !== "sentence") throw new Error("expected sentence reading");
  return sentFromSpec(lang, reading.sentence);
}

// ---------------------------------------------------------------------------
// Rule-error transforms: key string -> distractor string (EN->AL items)
// ---------------------------------------------------------------------------

const mapTokens = (key: string, f: (t: string) => string) => key.split(" ").map(f).join(" ");

function verbTokenA(t: string): string | null {
  if (t.startsWith("vu") && isVerb("A", t.slice(2))) return t.slice(2);
  if (isVerb("A", t)) return t;
  return null;
}

function wrongOrderA(key: string): string {
  const toks = key.split(" ");
  const vi = toks.findIndex((t) => verbTokenA(t) !== null);
  assert.ok(vi > 0, "A key needs a verb: " + key);
  let boundary = -1;
  for (let i = 0; i < vi; i += 1) if (toks[i] === "ka") boundary = i;
  assert.ok(boundary > 0, "A key needs a ka-marked object NP: " + key);
  const verb = toks[vi]!;
  const subject = toks.slice(0, boundary);
  const object = toks.slice(boundary, vi).concat(toks.slice(vi + 1));
  return [...subject, verb, ...object].join(" ");
}

function wrongOrderB(key: string): string {
  const toks = key.split(" ");
  assert.ok(isVerb("B", toks[0]!), "B key must start with the verb: " + key);
  const verb = toks[0]!;
  const rest = toks.slice(1);
  let head = -1;
  rest.forEach((t, i) => {
    if (isHeadB(t) && decodeHeadB(t).objCase) head = i;
  });
  assert.ok(head >= 1, "B key needs a case-marked object: " + key);
  let start = head;
  while (start > 0 && isAdj("B", rest[start - 1]!)) start -= 1;
  return [...rest.slice(0, start), verb, ...rest.slice(start)].join(" ");
}

function wrongOrderC(key: string): string {
  const toks = key.split(" ");
  const vi = toks.findIndex((t) => verbStemC(t) !== null);
  assert.ok(vi >= 0, "C key needs a verb: " + key);
  const verb = toks[vi]!;
  return toks.filter((_, i) => i !== vi).concat([verb]).join(" ");
}

function stemSwapFrom(spec: ArtlangItemSpec, err: Extract<ArtlangError, { error: "stemSwap" }>): string {
  assert.ok(spec.reading.kind === "sentence", spec.id + " stemSwap needs a sentence");
  const sentence = spec.reading.sentence;
  if (err.slot === "verb") return sentence.verb;
  if (err.slot === "subject") return sentence.subjects[0]!.noun;
  return sentence.objects[0]!.noun;
}

const replaceToken = (key: string, from: string, to: string) => key.split(" ").map((t) => (t === from ? to : t)).join(" ");

function bareStemA(key: string): string {
  let stem = key;
  if (stem.startsWith("ka ")) stem = stem.slice(3);
  if (stem.endsWith("ol")) stem = stem.slice(0, -2);
  return stem;
}

function bareStemB(key: string): string {
  const toks = key.split(" ");
  const head = toks.find((t) => isHeadB(t));
  assert.ok(head, "B key needs a head: " + key);
  return decodeHeadB(head).noun;
}

function bareStemC(key: string): string {
  let stem = key.split(" ")[0]!;
  if (stem.endsWith(" sa")) stem = stem.slice(0, -3);
  if (stem.endsWith("u") && isNoun("C", stem.slice(0, -1))) stem = stem.slice(0, -1);
  return stem;
}

function alErrorA(key: string, spec: ArtlangItemSpec, err: ArtlangError): string {
  switch (err.error) {
    case "drop":
      if (err.what === "article") return key.split(" ").filter((t) => t !== "ka").join(" ");
      if (err.what === "plural") return mapTokens(key, (t) => (t.endsWith("ol") && isNoun("A", t.slice(0, -2)) ? t.slice(0, -2) : t));
      if (err.what === "past") return mapTokens(key, (t) => (t.startsWith("vu") && isVerb("A", t.slice(2)) ? t.slice(2) : t));
      if (err.what === "possessive") return mapTokens(key, (t) => (t.endsWith("ur") && isNoun("A", t.slice(0, -2)) ? t.slice(0, -2) : t));
      throw new Error("A cannot drop " + err.what);
    case "wrongOrder":
      return wrongOrderA(key);
    case "wrongTense":
      return mapTokens(key, (t) => {
        if (t.startsWith("vu") && isVerb("A", t.slice(2))) return t.slice(2);
        if (isVerb("A", t)) return "vu" + t;
        return t;
      });
    case "stemSwap":
      return replaceToken(key, stemSwapFrom(spec, err), err.with);
    case "moveAffix": {
      // possessive -ur moved onto the possessed noun (after the plural)
      assert.equal(err.what, "possessive", spec.id + " A moveAffix");
      const toks = key.split(" ");
      const pi = toks.findIndex((t) => t.endsWith("ur") && isNoun("A", t.slice(0, -2)));
      assert.ok(pi >= 0, "A key lacks a possessor: " + key);
      const ni = toks.findIndex((t, i) => i > pi && (isNoun("A", t) || (t.endsWith("ol") && isNoun("A", t.slice(0, -2)))));
      assert.ok(ni > pi, "A key lacks a possessed noun: " + key);
      return toks.map((t, i) => (i === pi ? t.slice(0, -2) : i === ni ? t + "ur" : t)).join(" ");
    }
    case "wrongAffix": {
      const stem = bareStemA(key);
      return err.use === "past" ? "vu" + stem : stem + "ur";
    }
    case "add":
      assert.equal(err.what, "article", spec.id + " A add");
      return "ka " + key;
    default:
      throw new Error("unsupported A error " + JSON.stringify(err));
  }
}

function alErrorB(key: string, spec: ArtlangItemSpec, err: ArtlangError): string {
  switch (err.error) {
    case "drop": {
      if (err.what === "article") return mapTokens(key, (t) => (isHeadB(t) ? encodeHeadB({ ...decodeHeadB(t), definite: false }) : t));
      if (err.what === "case") return mapTokens(key, (t) => (isHeadB(t) ? encodeHeadB({ ...decodeHeadB(t), objCase: false }) : t));
      if (err.what === "plural") {
        let done = false;
        return mapTokens(key, (t) => {
          if (!done && isHeadB(t) && decodeHeadB(t).plural) {
            done = true;
            return encodeHeadB({ ...decodeHeadB(t), plural: false });
          }
          return t;
        });
      }
      throw new Error("B cannot drop " + err.what);
    }
    case "wrongOrder":
      return wrongOrderB(key);
    case "stemSwap":
      return replaceToken(key, stemSwapFrom(spec, err), err.with);
    case "adjSwap": {
      const toks = key.split(" ");
      const adjs = toks.filter((t) => isAdj("B", t));
      assert.equal(adjs.length, 2, "B adjSwap needs exactly two adjectives: " + key);
      return toks.map((t) => (t === adjs[0] ? adjs[1]! : t === adjs[1] ? adjs[0]! : t)).join(" ");
    }
    case "moveAffix": {
      assert.equal(err.what, "plural", spec.id + " B moveAffix");
      const toks = key.split(" ");
      const hi = toks.findIndex((t) => isHeadB(t) && decodeHeadB(t).plural);
      assert.ok(hi >= 0, "B key lacks a plural head: " + key);
      assert.ok(hi > 0 && isAdj("B", toks[hi - 1]!), "B moveAffix needs adjective before head: " + key);
      return toks.map((t, i) => (i === hi - 1 ? "vi" + t : i === hi ? encodeHeadB({ ...decodeHeadB(t), plural: false }) : t)).join(" ");
    }
    case "wrongAffix": {
      const stem = bareStemB(key);
      if (err.use === "case") return stem + "ik";
      if (err.use === "article") return "bo" + stem + "um";
      throw new Error("B cannot use affix " + err.use);
    }
    case "add":
      assert.equal(err.what, "case", spec.id + " B add");
      return key + "ik";
    default:
      throw new Error("unsupported B error " + JSON.stringify(err));
  }
}

function alErrorC(key: string, spec: ArtlangItemSpec, err: ArtlangError): string {
  switch (err.error) {
    case "drop":
      if (err.what === "article") return key.split(" ").filter((t) => t !== "sa").join(" ");
      if (err.what === "plural") return mapTokens(key, (t) => (t.endsWith("u") && isNoun("C", t.slice(0, -1)) ? t.slice(0, -1) : t));
      if (err.what === "past") return mapTokens(key, (t) => (t.endsWith("i") && isVerb("C", t.slice(0, -1)) ? t.slice(0, -1) : t));
      if (err.what === "intensive")
        return mapTokens(key, (t) => {
          const half = t.slice(0, t.length / 2);
          return half + half === t && isAdj("C", half) ? half : t;
        });
      throw new Error("C cannot drop " + err.what);
    case "wrongOrder":
      return wrongOrderC(key);
    case "wrongTense":
      return mapTokens(key, (t) => {
        if (isVerb("C", t)) return t + "i";
        if (t.endsWith("i") && isVerb("C", t.slice(0, -1))) return t.slice(0, -1);
        return t;
      });
    case "stemSwap":
      return replaceToken(key, stemSwapFrom(spec, err), err.with);
    case "moveAffix": {
      const toks = key.split(" ");
      const redupIdx = toks.findIndex((t) => {
        const half = t.slice(0, t.length / 2);
        return half + half === t && isAdj("C", half);
      });
      const nounIdx = toks.findIndex((t) => isNoun("C", t) || (t.endsWith("u") && isNoun("C", t.slice(0, -1))));
      if (err.what === "intensive") {
        assert.ok(redupIdx >= 0 && nounIdx >= 0, "C key lacks redup/noun: " + key);
        return toks
          .map((t, i) => {
            if (i === redupIdx) return t.slice(0, t.length / 2);
            if (i === nounIdx) return t.endsWith("u") ? t.slice(0, -1) + t.slice(0, -1) : t + t;
            return t;
          })
          .join(" ");
      }
      assert.equal(err.what, "plural", spec.id + " C moveAffix");
      assert.ok(nounIdx >= 0 && redupIdx >= 0, "C key lacks redup/noun: " + key);
      return toks
        .map((t, i) => {
          if (i === nounIdx) return t.endsWith("u") ? t.slice(0, -1) : t;
          if (i === redupIdx) return t.slice(0, t.length / 2) + "u";
          return t;
        })
        .join(" ");
    }
    case "wrongAffix": {
      const stem = bareStemC(key);
      if (err.use === "past") return stem + "i";
      if (err.use === "reduplication") return stem + stem;
      throw new Error("C cannot use affix " + err.use);
    }
    case "add":
      assert.equal(err.what, "article", spec.id + " C add");
      return key + " sa";
    default:
      throw new Error("unsupported C error " + JSON.stringify(err));
  }
}

function alDistractor(lang: ArtlangLangId, key: string, spec: ArtlangItemSpec, err: ArtlangError): string {
  if (err.error === "wrongStem") return LEX[lang][err.as]!.en;
  if (lang === "A") return alErrorA(key, spec, err);
  if (lang === "B") return alErrorB(key, spec, err);
  return alErrorC(key, spec, err);
}

// --- English-side mutations (AL->EN sentence items).

function mutateEn(parsed: TSent, err: ArtlangError): TSent {
  const s: TSent = {
    subjects: parsed.subjects.map((n) => ({ ...n })),
    objects: parsed.objects.map((n) => ({ ...n })),
    verb: parsed.verb,
    past: parsed.past,
  };
  const nps = [...s.subjects, ...s.objects];
  switch (err.error) {
    case "wrongOrder":
      return { subjects: s.objects, objects: s.subjects, verb: s.verb, past: s.past };
    case "wrongTense":
      s.past = !s.past;
      return s;
    case "numberSwap": {
      const np = nps.find((n) => n.plural);
      if (np) np.plural = false;
      return s;
    }
    case "adjMisattach": {
      const from = s.objects[0]!;
      const to = s.subjects[0]!;
      if (from.adjective) to.adjective = from.adjective;
      if (from.intensive) to.intensive = true;
      from.adjective = undefined;
      from.intensive = false;
      return s;
    }
    case "stemSwap":
      s.verb = err.with;
      return s;
    case "drop":
      assert.equal(err.what, "intensive");
      nps.forEach((n) => (n.intensive = false));
      return s;
    default:
      throw new Error("unsupported English-side error " + JSON.stringify(err));
  }
}

// ---------------------------------------------------------------------------
// Fixtures: golden keys, expected materials blocks, examples
// ---------------------------------------------------------------------------

const GOLDEN_KEYS: Record<string, string> = {
  "aln-001": "fish",
  "aln-002": "daborol",
  "aln-003": "ka renuk ka dabor tikal",
  "aln-004": "The man and the fish carried the big birds.",
  "aln-005": "ka tamelur daborol",
  "aln-006": "ka renukur selikol ka tulir ganol vuromek",
  "aln-007": "gold",
  "aln-008": "vihobek",
  "aln-009": "zagil hobek botavalumik",
  "aln-010": "The horses love the slow river.",
  "aln-011": "lumek bovinavekumik",
  "aln-012": "pimor darik bovihobekum lumek bovilunekumik",
  "aln-013": "fire",
  "aln-014": "tavoru",
  "aln-015": "bolik sa mekal sevam sa",
  "aln-016": "The children washed the very cold table.",
  "aln-017": "tavoru sa nurevnurev",
  "aln-018": "tavoru sa mekali galim sa dolimdolim zu sevam sa nurev",
};

const EXAMPLES: Record<ArtlangLangId, readonly (readonly [string, string])[]> = {
  A: [
    ["ka tamel ka tulir romek", "The man eats the bread."],
    ["ka renukur selik ka daborol vutikal", "The woman's bird saw the houses."],
    ["ka tamel vo ka nogar ka mavik limor dumal", "The man and the fish carry the small tree."],
  ],
  B: [
    ["zagil hobek suvakik", "A horse finds gold."],
    ["vedal bolunekum mokal bonavekumik", "The queen loves the fast boat."],
    ["pimor bovihobekum tal bolunekum bokedanumik", "The horses and the queen bring the king."],
  ],
  C: [
    ["tavor sa mekal galim sa", "The dog drinks the water."],
    ["bolik sa zu tavor sa mekali galim sa dolim", "The child and the dog drank the sweet water."],
    ["boliku sa pekot galim sa ketumketum", "The children want the very hot water."],
  ],
};

const LEXICON_LINES: Record<ArtlangLangId, readonly string[]> = {
  A: [
    "dabor = house, selik = bird, nogar = fish, mavik = tree, tulir = bread, tamel = man, renuk = woman",
    "tikal = see, romek = eat, dumal = carry, boken = big, limor = small, ganol = old",
    "ka = the, vo = and",
  ],
  B: [
    "kedan = king, lunek = queen, hobek = horse, taval = river, navek = boat, suvak = gold",
    "zagil = find, hekum = make, vedal = love, pimor = bring, mokal = fast, lumek = slow, darik = strong",
    "tal = and",
  ],
  C: [
    "tavor = dog, galim = water, rukol = fire, sevam = wine, dopel = table, tamur = market, bolik = child",
    "mekal = drink, pekot = want, sedal = wash, gidel = know, ketum = hot, nurev = cold, dolim = sweet",
    "sa = the, zu = and",
  ],
};

function expectedMaterials(lang: ArtlangLangId): string {
  const name = lang === "A" ? "Language A" : lang === "B" ? "Language B" : "Language C";
  const lines = [name + " word list:", ...LEXICON_LINES[lang], "Worked examples:"];
  for (const [al, en] of EXAMPLES[lang]) lines.push('"' + al + '" = "' + en + '"');
  lines.push("");
  return lines.join("\n");
}

const parseAlSent = (lang: ArtlangLangId, al: string): TSent =>
  lang === "A" ? parseA(al) : lang === "B" ? parseB(al) : parseC(al);

const parseAlNp = (lang: ArtlangLangId, al: string): TNp => {
  const toks = al.split(" ");
  if (lang === "A") return parseNpA(toks);
  if (lang === "B") return parseNpB(toks);
  return parseNpC(toks);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const items = artificialLanguage.items;
const itemsById = new Map(items.map((i) => [i.id, i]));

test("subtest metadata and bank shape are exact", () => {
  assert.equal(artificialLanguage.id, "artificialLanguage");
  assert.equal(artificialLanguage.name, "Artificial Language");
  // 2026-08-22 relabel: grammar induction from exemplars is Gf/I (the WJ-IV
  // Analysis-Synthesis construct family), not Gc/LD — the lexicons are
  // nonsense by construction, so nothing crystallized applies.
  assert.equal(artificialLanguage.broad, "Gf");
  assert.deepEqual(artificialLanguage.narrow, ["I"]);
  assert.equal(
    artificialLanguage.instructions,
    "A constructed language is presented with its vocabulary and worked examples. Infer its grammar and translate.",
  );
  assert.equal(artificialLanguage.budgetMin, 12);
  assert.deepEqual(artificialLanguage.routing, { maxItems: 14, minItems: 7, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 });
  assert.equal(items.length, 18);
  assert.deepEqual(items.map((i) => i.id), Array.from({ length: 18 }, (_, i) => "aln-" + String(i + 1).padStart(3, "0")));
  for (const item of items) {
    assert.equal(item.subtest, "artificialLanguage");
    assert.equal(item.broad, "Gf");
    assert.equal(item.narrow, "I");
    // Language blocking: every item names its grammar, so routing can keep
    // one language open until exhausted.
    assert.ok(item.block === "A" || item.block === "B" || item.block === "C", item.id + " missing language block tag");
    assert.deepEqual(item.render, { kind: "text" });
    assert.equal(item.options!.length, 5, item.id + " needs five options");
    assert.equal(item.c, 0.2, item.id + " c must be 1/5");
    assert.equal(typeof item.answer, "number", item.id + " key must be numeric");
    const answer = item.answer as number;
    assert.ok(answer >= 0 && answer < 5, item.id + " key out of range");
    assert.ok(item.prompt.trim().length > 0, item.id + " empty prompt");
  }
  assert.equal(ARTLANG_SPECS.length, 18);
  for (const spec of ARTLANG_SPECS) {
    assert.equal(itemsById.get(spec.id)!.answer, spec.answer, spec.id + " key position differs from spec");
  }
});

test("calibration pins: authored a/b table, anchors, and per-type difficulty bands", () => {
  const pinned: readonly [string, number, number][] = [
    ["aln-001", -2.0, 1.0], ["aln-002", -1.0, 1.1], ["aln-003", 0.0, 1.2],
    ["aln-004", 0.8, 1.2], ["aln-005", 1.2, 1.3], ["aln-006", 2.4, 1.4],
    ["aln-007", -1.7, 1.0], ["aln-008", -0.9, 1.1], ["aln-009", 0.3, 1.2],
    ["aln-010", 1.0, 1.2], ["aln-011", 1.5, 1.3], ["aln-012", 2.4, 1.4],
    ["aln-013", -1.4, 1.0], ["aln-014", -0.7, 1.1], ["aln-015", 0.5, 1.2],
    ["aln-016", 1.1, 1.2], ["aln-017", 1.8, 1.3], ["aln-018", 2.4, 1.4],
  ];
  const specById = new Map(ARTLANG_SPECS.map((s) => [s.id, s]));
  for (const [id, b, a] of pinned) {
    const item = itemsById.get(id)!;
    assert.equal(item.b, b, id + " b drifted");
    assert.equal(item.a, a, id + " a drifted");
    assert.equal(specById.get(id)!.a, a);
    assert.equal(specById.get(id)!.b, b);
    assert.ok(item.a >= 1.0 && item.a <= 1.4, id + " a outside 1.0..1.4");
  }
  const bs = items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.0, "floor must reach -2.0");
  assert.ok(Math.max(...bs) >= 2.4, "ceiling must reach +2.4");
  assert.equal(Math.min(...bs), -2.0);
  assert.equal(Math.max(...bs), 2.4);
  const bands: Record<string, readonly [number, number]> = {
    lookup: [-2.6, -1.3],
    word: [-1.1, -0.5],
    "sentence-en": [0.0, 1.2],
    "sentence-al": [0.0, 1.2],
    derived: [1.2, 1.9],
    combined: [2.3, 2.6],
  };
  for (const spec of ARTLANG_SPECS) {
    const [lo, hi] = bands[spec.type]!;
    assert.ok(spec.b >= lo && spec.b <= hi, spec.id + " (" + spec.type + ") b " + spec.b + " outside band [" + lo + "," + hi + "]");
  }
  // Each language contributes exactly one item of each of the six types.
  for (const lang of ["A", "B", "C"] as const) {
    const types = new Set(ARTLANG_SPECS.filter((s) => s.lang === lang).map((s) => s.type));
    assert.equal(types.size, 6, "Language " + lang + " must cover all six item types");
  }
});

test("key positions are balanced and never cycle or run in threes", () => {
  const counts = [0, 0, 0, 0, 0];
  for (const item of items) {
    const idx = item.answer as number;
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  for (const [position, count] of counts.entries()) {
    assert.ok(count >= 2 && count <= 5, "key position " + position + " used " + count + " times (must be 2..5)");
  }
  const positions = items.map((i) => i.answer as number);
  for (let i = 2; i < positions.length; i += 1) {
    assert.ok(!(positions[i] === positions[i - 1] && positions[i] === positions[i - 2]), "run of three at item " + i);
  }
});

test("every prompt carries the complete materials block for its language", () => {
  for (const spec of ARTLANG_SPECS) {
    const item = itemsById.get(spec.id)!;
    const materials = expectedMaterials(spec.lang);
    assert.ok(item.prompt.startsWith(materials), spec.id + " prompt lacks the full Language " + spec.lang + " materials block");
    for (const pair of LEXICON_LINES[spec.lang]) {
      assert.ok(item.prompt.includes(pair), spec.id + " prompt missing lexicon line: " + pair);
    }
    for (const [al, en] of EXAMPLES[spec.lang]) {
      assert.ok(item.prompt.includes('"' + al + '" = "' + en + '"'), spec.id + " prompt missing example: " + al);
    }
  }
});

test("worked examples parse, translate, and round-trip under the independent grammar", () => {
  for (const lang of ["A", "B", "C"] as const) {
    for (const [al, en] of EXAMPLES[lang]) {
      const parsed = parseAlSent(lang, al);
      assert.equal(renderEnSent(lang, parsed), en, "Language " + lang + " example mistranslates: " + al);
      assert.equal(renderAlSent(lang, parsed), al, "Language " + lang + " example does not round-trip: " + al);
    }
  }
});

test("every key equals its golden literal and the independent translation", () => {
  for (const spec of ARTLANG_SPECS) {
    const item = itemsById.get(spec.id)!;
    const options = item.options!;
    const key = options[item.answer as number]!;
    assert.equal(key, GOLDEN_KEYS[spec.id], spec.id + " key differs from golden literal");
    const questionLine = item.prompt.trim().split("\n").at(-1)!;
    const quoted = questionLine.match(/"([^"]*)"/)![1]!;
    if (spec.type === "lookup") {
      assert.ok(LEX[spec.lang][quoted], spec.id + " quoted word is not a lexeme: " + quoted);
      assert.equal(key, LEX[spec.lang][quoted]!.en);
    } else if (spec.type === "sentence-al") {
      const parsed = parseAlSent(spec.lang, quoted);
      assert.equal(renderEnSent(spec.lang, parsed), key, spec.id + " key is not the independent AL->EN translation");
      assert.equal(renderAlSent(spec.lang, parsed), quoted, spec.id + " quoted sentence does not round-trip");
    } else {
      // EN->AL: the prompt must quote exactly the reading's English rendering.
      const expectedSource =
        spec.reading.kind === "word" ? renderEnNp(spec.lang, npFromSpec(spec.reading.np)) : renderEnSent(spec.lang, sentFromReading(spec.lang, spec.reading));
      assert.equal(quoted, expectedSource, spec.id + " prompt does not quote the reading's source English");
      const derived =
        spec.reading.kind === "word" ? renderAlNp(spec.lang, npFromSpec(spec.reading.np)) : renderAlSent(spec.lang, sentFromReading(spec.lang, spec.reading));
      assert.equal(derived, key, spec.id + " key is not the independent EN->AL rendering");
      // Round-trip through the parser reproduces the authored reading.
      if (spec.reading.kind === "word") {
        assert.deepEqual(parseAlNp(spec.lang, key), npFromSpec(spec.reading.np), spec.id + " key does not parse back to the reading");
      } else {
        assert.deepEqual(parseAlSent(spec.lang, key), sentFromReading(spec.lang, spec.reading), spec.id + " key does not parse back to the reading");
      }
    }
  }
});

test("every distractor equals the key with its stated rule error applied", () => {
  for (const spec of ARTLANG_SPECS) {
    const item = itemsById.get(spec.id)!;
    const options = item.options!;
    const key = options[item.answer as number]!;
    const questionLine = item.prompt.trim().split("\n").at(-1)!;
    const quoted = questionLine.match(/"([^"]*)"/)![1]!;
    spec.errors.forEach((err, k) => {
      const index = k < spec.answer ? k : k + 1;
      const distractor = options[index]!;
      assert.notEqual(distractor, key, spec.id + " distractor " + index + " duplicates the key");
      let expected: string;
      if (spec.type === "lookup") {
        assert.equal(err.error, "wrongStem", spec.id + " lookup distractors must be wrongStem");
        expected = LEX[spec.lang][err.as]!.en;
      } else if (spec.type === "sentence-al") {
        expected = renderEnSent(spec.lang, mutateEn(parseAlSent(spec.lang, quoted), err));
      } else {
        expected = alDistractor(spec.lang, key, spec, err);
      }
      assert.equal(distractor, expected, spec.id + " distractor " + index + " is not key-with-" + err.error + "-applied");
    });
  }
});

test("anti-exploit: stem sharing, no odd-one-out by length, shared phonology", () => {
  // EN->AL options must each contain at least one stem of the item's source words.
  const stemsOf = (spec: ArtlangItemSpec): string[] => {
    const nps: ArtlangNP[] =
      spec.reading.kind === "word" ? [spec.reading.np] : [...spec.reading.sentence.subjects, ...spec.reading.sentence.objects];
    const stems = nps.flatMap((np) => [np.noun, ...(np.adjective ? [np.adjective] : []), ...(np.possessor ? [np.possessor] : [])]);
    if (spec.reading.kind === "sentence") stems.push(spec.reading.sentence.verb);
    return stems;
  };
  let keyLongest = 0;
  for (const spec of ARTLANG_SPECS) {
    const item = itemsById.get(spec.id)!;
    const options = item.options!;
    const key = options[item.answer as number]!;
    if (spec.direction === "en-al") {
      const stems = stemsOf(spec);
      for (const option of options) {
        assert.ok(stems.some((s) => option.includes(s)), spec.id + " option shares no stem with the source: " + option);
      }
    }
    const others = options.filter((_, i) => i !== item.answer).map((o) => o.length);
    if (key.length > Math.max(...others)) keyLongest += 1;
  }
  assert.ok(keyLongest <= 8, "the key is the strictly longest option in " + keyLongest + " items (max 8)");

  // No artificial-language surface may contain a common English trigram.
  // (Only AL-side text is checked: AL->EN options are English by design.)
  const alTokens = new Set<string>();
  for (const lang of ["A", "B", "C"] as const) {
    for (const lexeme of Object.keys(LEX[lang])) alTokens.add(lexeme);
    for (const [al] of EXAMPLES[lang]) for (const t of al.split(" ")) alTokens.add(t);
  }
  for (const spec of ARTLANG_SPECS) {
    if (spec.direction !== "en-al") continue;
    for (const option of itemsById.get(spec.id)!.options!) {
      for (const t of option.split(" ")) alTokens.add(t);
    }
  }
  // "dab"/"run" are excluded: the spec's own exemplars ("dabor", "mirun")
  // accept incidental syllable-boundary collisions; the guard targets
  // recognizable content words instead.
  const englishTrigraphs = (
    "act add age ago aid aim air ale all and ant any ape apt arc are arm art ash ask ate awe axe " +
    "bad bag ban bar bat bay bed bee beg bet bid big bin bit boa bob bog boo bow box boy bra bud bug bun bus but buy " +
    "cab can cap car cat cob cod cog con coo cop cot cow coy cry cub cue cup cur cut " +
    "dad dam day den dew did die dig dim din dip doe dog dot dry dub dud due dug duo dye " +
    "ear eat ebb eel egg ego elf elk elm end era err eve ewe eye " +
    "fad fan far fat fax fed fee few fig fin fit fix flu fly foe fog for fox fry fun fur " +
    "gag gap gas gel gem get gig gin god got gum gun gut guy gym " +
    "had hag ham has hat hay hem hen her hew hex hey hid him hip his hit hoe hog hop hot how hub hue hug hum hut " +
    "ice icy ilk ill imp ink inn ion ire irk its ivy " +
    "jab jam jar jaw jay jet jig job jog jot joy jug " +
    "keg key kid kin kit " +
    "lab lad lag lap law lax lay let lid lie lip lit lob log lot low lug " +
    "mad man map mar mat maw may men met mew mid mix mob mop mud mug mum " +
    "nab nag nap net new nib nil nip nit nod nor not now nub nun nut " +
    "oak oar oat odd ode off oft ohm oil old one opt orb ore our out owe owl own " +
    "pad pal pan par pat paw pay pea peg pen pep per pet pew pie pig pin pit ply pod pop pot pro pry pub pug pun pup pus put " +
    "rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rue rug rum rut rye " +
    "sad sag sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sty sub sue sum sun " +
    "tab tad tag tan tap tar tax tea ten the tho thy tie tin tip toe ton too top tot tow toy try tub tug two " +
    "urn use van vat vet vex via vie vow " +
    "wad wag war was wax way web wed wee wet who why wig win wit woe wok won woo wow " +
    "yak yam yap yaw yes yet yew you " +
    "zap zip zoo"
  )
    .split(/\s+/)
    .filter((w) => w !== "dab" && w !== "run");
  for (const token of alTokens) {
    for (const word of englishTrigraphs) {
      assert.ok(!token.includes(word), "artificial token '" + token + "' contains the English word '" + word + "'");
    }
  }
});

test("lexicon size and affix inventory per language match the design", () => {
  for (const lang of ["A", "B", "C"] as const) {
    const entries = Object.values(LEX[lang]).filter((e) => e.pos !== "func");
    assert.ok(entries.length >= 10 && entries.length <= 14, "Language " + lang + " has " + entries.length + " content words (need 10..14)");
    const nouns = entries.filter((e) => e.pos === "n").length;
    const verbs = entries.filter((e) => e.pos === "v").length;
    const adjectives = entries.filter((e) => e.pos === "adj").length;
    assert.ok(nouns >= 5 && verbs >= 3 && adjectives >= 3, "Language " + lang + " lacks category coverage");
  }
  // The three grammars use pairwise-distinct affix systems:
  // A = suffix plural -ol + past PREFIX ru- (+ possessive -ur),
  // B = plural prefix vi- + definite CIRCUMFIX bo-..-um + case suffix -ik,
  // C = vowel suffixes -u/-i + reduplication.
  assert.equal(parseA("ka tamel ka tulir romek").past, false);
  assert.equal(parseA("ka renukur selik ka daborol vutikal").past, true);
  assert.deepEqual(decodeHeadB("bovilunekumik"), { noun: "lunek", plural: true, definite: true, objCase: true });
  const reduplicated = parseNpC(["tavoru", "sa", "nurevnurev"]);
  assert.equal(reduplicated.adjective, "nurev");
  assert.equal(reduplicated.intensive, true);
});
