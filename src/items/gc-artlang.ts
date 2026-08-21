import type { Item, Subtest } from "../core/types.ts";

/**
 * Artificial Language (Gc / LD): three constructed mini-languages, each
 * presented as a word list plus worked example sentences that fully determine
 * its lexicon, morphology, and syntax. Items ask for translations of novel
 * words, phrases, and sentences in both directions. Every item prompt is
 * self-contained (the full materials block repeats per item because items are
 * administered independently, as in the paper original).
 *
 * CALIBRATION STATUS: all a/b parameters are authored estimates, not fitted
 * to response data. Format lineage: the Artificial Language subtest of the
 * 1926 SAT, historically among the most g-loaded verbal formats. Difficulty
 * ladder (authored anchors): lexicon lookup -2.0; single affix -1.0;
 * sentence order 0.0-1.0; double affix + function words +1.2; combined
 * order + two affixes +2.4. a rises 1.0 -> 1.4 with the number of rules an
 * item exercises.
 *
 * Grammar sketch (stated only through the worked examples in each prompt):
 * - Language A: SOV; article "ka" before the noun phrase; adjective after
 *   its noun; plural suffix -ol; possessive suffix -ur on the possessor,
 *   which precedes the possessed noun; past-tense prefix vu- on the verb;
 *   "vo" = and.
 * - Language B: VSO; adjective before its noun; plural prefix vi-; definite
 *   circumfix bo-...-um around the noun; object-case suffix -ik (outermost);
 *   verbs unmarked for tense; "tal" = and.
 * - Language C: SVO; article "sa" immediately after its noun; adjective
 *   after the article; plural suffix -u; past suffix -i; a reduplicated
 *   adjective means "very"; "zu" = and.
 *
 * Every distractor is a machine-derivable rule-error transform of the key
 * (dropped affix, wrong affix, wrong word order, wrong stem, singular/plural
 * swap); test/artlang.test.ts re-derives all 90 options from an independent
 * re-implementation of the three grammars.
 */

// ---------------------------------------------------------------------------
// Public data types (the test re-states the lexicons and rules independently)
// ---------------------------------------------------------------------------

export type ArtlangLangId = "A" | "B" | "C";

interface ArtlangLexeme {
  readonly al: string;
  readonly en: string;
  /** Irregular English forms used to phrase sources and keys. */
  readonly enPlural?: string;
  readonly enPast?: string;
  readonly enThird?: string;
  readonly mass?: boolean;
  readonly functionWord?: boolean;
}

export interface ArtlangNP {
  readonly noun: string;
  readonly definite: boolean;
  readonly plural: boolean;
  readonly adjective?: string;
  /** Language A: possessor stem, rendered with -ur before the possessed noun. */
  readonly possessor?: string;
  /** Language C: reduplicated adjective = "very". */
  readonly intensive?: boolean;
  /** Language B: object-case -ik (authored only on object phrases). */
  readonly objectCase?: boolean;
}

export interface ArtlangSentence {
  readonly subjects: readonly ArtlangNP[];
  readonly objects: readonly ArtlangNP[];
  readonly verb: string;
  readonly past: boolean;
}

export type ArtlangReading =
  | { readonly kind: "word"; readonly np: ArtlangNP }
  | { readonly kind: "sentence"; readonly sentence: ArtlangSentence };

/** One describable rule error; each distractor is the key with one applied. */
export type ArtlangError =
  | { readonly error: "wrongStem"; readonly as: string }
  | { readonly error: "drop"; readonly what: "article" | "plural" | "past" | "possessive" | "case" | "intensive" }
  | { readonly error: "wrongAffix"; readonly use: "past" | "possessive" | "case" | "article" | "reduplication" }
  | { readonly error: "add"; readonly what: "article" | "case" }
  | { readonly error: "wrongOrder" }
  | { readonly error: "wrongTense" }
  | { readonly error: "numberSwap" }
  | { readonly error: "adjMisattach" }
  | { readonly error: "adjSwap" }
  | { readonly error: "stemSwap"; readonly slot: "verb" | "subject" | "object"; readonly with: string }
  | { readonly error: "moveAffix"; readonly what: "plural" | "intensive" | "possessive" };

type ArtlangItemType = "lookup" | "word" | "sentence-en" | "sentence-al" | "derived" | "combined";

export interface ArtlangItemSpec {
  readonly id: string;
  readonly lang: ArtlangLangId;
  readonly type: ArtlangItemType;
  readonly direction: "en-al" | "al-en";
  readonly a: number;
  readonly b: number;
  readonly answer: number;
  /** Optional clause appended to the question line (e.g. B object case note). */
  readonly note?: string;
  readonly reading: ArtlangReading;
  readonly errors: readonly [ArtlangError, ArtlangError, ArtlangError, ArtlangError];
}

// ---------------------------------------------------------------------------
// Language data
// ---------------------------------------------------------------------------

const ARTLANG_LANGUAGES: Record<
  ArtlangLangId,
  { readonly name: string; readonly lines: readonly (readonly ArtlangLexeme[])[]; readonly examples: readonly ArtlangSentence[] }
> = {
  A: {
    name: "Language A",
    lines: [
      [
        { al: "dabor", en: "house" },
        { al: "selik", en: "bird" },
        { al: "nogar", en: "fish" },
        { al: "mavik", en: "tree" },
        { al: "tulir", en: "bread" },
        { al: "tamel", en: "man" },
        { al: "renuk", en: "woman" },
      ],
      [
        { al: "tikal", en: "see", enPast: "saw", enThird: "sees" },
        { al: "romek", en: "eat", enPast: "ate", enThird: "eats" },
        { al: "dumal", en: "carry", enPast: "carried", enThird: "carries" },
        { al: "boken", en: "big" },
        { al: "limor", en: "small" },
        { al: "ganol", en: "old" },
      ],
      [
        { al: "ka", en: "the", functionWord: true },
        { al: "vo", en: "and", functionWord: true },
      ],
    ],
    examples: [
      { subjects: [{ noun: "tamel", definite: true, plural: false }], objects: [{ noun: "tulir", definite: true, plural: false }], verb: "romek", past: false },
      { subjects: [{ noun: "selik", definite: true, plural: false, possessor: "renuk" }], objects: [{ noun: "dabor", definite: true, plural: true }], verb: "tikal", past: true },
      { subjects: [{ noun: "tamel", definite: true, plural: false }, { noun: "nogar", definite: true, plural: false }], objects: [{ noun: "mavik", definite: true, plural: false, adjective: "limor" }], verb: "dumal", past: false },
    ],
  },
  B: {
    name: "Language B",
    lines: [
      [
        { al: "kedan", en: "king" },
        { al: "lunek", en: "queen" },
        { al: "hobek", en: "horse" },
        { al: "taval", en: "river" },
        { al: "navek", en: "boat" },
        { al: "suvak", en: "gold", mass: true },
      ],
      [
        { al: "zagil", en: "find", enPast: "found", enThird: "finds" },
        { al: "hekum", en: "make", enPast: "made", enThird: "makes" },
        { al: "vedal", en: "love", enPast: "loved", enThird: "loves" },
        { al: "pimor", en: "bring", enPast: "brought", enThird: "brings" },
        { al: "mokal", en: "fast" },
        { al: "lumek", en: "slow" },
        { al: "darik", en: "strong" },
      ],
      [
        { al: "tal", en: "and", functionWord: true },
      ],
    ],
    examples: [
      { subjects: [{ noun: "hobek", definite: false, plural: false }], objects: [{ noun: "suvak", definite: false, plural: false }], verb: "zagil", past: false },
      { subjects: [{ noun: "lunek", definite: true, plural: false }], objects: [{ noun: "navek", definite: true, plural: false, adjective: "mokal" }], verb: "vedal", past: false },
      { subjects: [{ noun: "hobek", definite: true, plural: true }, { noun: "lunek", definite: true, plural: false }], objects: [{ noun: "kedan", definite: true, plural: false }], verb: "pimor", past: false },
    ],
  },
  C: {
    name: "Language C",
    lines: [
      [
        { al: "tavor", en: "dog" },
        { al: "galim", en: "water" },
        { al: "rukol", en: "fire" },
        { al: "sevam", en: "wine" },
        { al: "dopel", en: "table" },
        { al: "tamur", en: "market" },
        { al: "bolik", en: "child", enPlural: "children" },
      ],
      [
        { al: "mekal", en: "drink", enPast: "drank", enThird: "drinks" },
        { al: "pekot", en: "want", enPast: "wanted", enThird: "wants" },
        { al: "sedal", en: "wash", enPast: "washed", enThird: "washes" },
        { al: "gidel", en: "know", enPast: "knew", enThird: "knows" },
        { al: "ketum", en: "hot" },
        { al: "nurev", en: "cold" },
        { al: "dolim", en: "sweet" },
      ],
      [
        { al: "sa", en: "the", functionWord: true },
        { al: "zu", en: "and", functionWord: true },
      ],
    ],
    examples: [
      { subjects: [{ noun: "tavor", definite: true, plural: false }], objects: [{ noun: "galim", definite: true, plural: false }], verb: "mekal", past: false },
      { subjects: [{ noun: "bolik", definite: true, plural: false }, { noun: "tavor", definite: true, plural: false }], objects: [{ noun: "galim", definite: true, plural: false, adjective: "dolim" }], verb: "mekal", past: true },
      { subjects: [{ noun: "bolik", definite: true, plural: true }], objects: [{ noun: "galim", definite: true, plural: false, adjective: "ketum", intensive: true }], verb: "pekot", past: false },
    ],
  },
};

function lexemeFor(lang: ArtlangLangId, al: string): ArtlangLexeme {
  for (const line of ARTLANG_LANGUAGES[lang].lines) {
    for (const word of line) if (word.al === al) return word;
  }
  throw new Error("unknown Language " + lang + " lexeme: " + al);
}

// ---------------------------------------------------------------------------
// Rendering engine: structured reading -> artificial language / English
// ---------------------------------------------------------------------------

interface WorkNP {
  noun: string;
  definite: boolean;
  plural: boolean;
  adjective?: string;
  possessor?: string;
  intensive?: boolean;
  objectCase?: boolean;
  // Error-rendering modifiers; never present in authored readings.
  bareAffix?: "past" | "possessive" | "case" | "article" | "reduplication";
  possessorBare?: boolean;
  possessiveOnNoun?: boolean;
  movePluralToAdjective?: boolean;
  moveIntensiveToNoun?: boolean;
}

interface WorkSentence {
  subjects: WorkNP[];
  objects: WorkNP[];
  verb: string;
  past: boolean;
}

type WorkReading = { kind: "word"; np: WorkNP } | { kind: "sentence"; sentence: WorkSentence };

function toWorkNp(np: ArtlangNP): WorkNP {
  return { ...np };
}

function toWorkSentence(s: ArtlangSentence): WorkSentence {
  return { subjects: s.subjects.map(toWorkNp), objects: s.objects.map(toWorkNp), verb: s.verb, past: s.past };
}

function toWorkReading(r: ArtlangReading): WorkReading {
  return r.kind === "word" ? { kind: "word", np: toWorkNp(r.np) } : { kind: "sentence", sentence: toWorkSentence(r.sentence) };
}

// --- Language A: SOV; ka=the; plural -ol; possessive -ur; past vu-; adj after noun.

function renderNpA(np: WorkNP): string {
  if (np.bareAffix === "past") return "vu" + np.noun;
  if (np.bareAffix === "possessive") return np.noun + "ur";
  const parts: string[] = [];
  if (np.definite) parts.push("ka");
  if (np.possessor) parts.push(np.possessor + (np.possessorBare ? "" : "ur"));
  let noun = np.noun;
  if (np.possessiveOnNoun) noun = noun + (np.plural ? "ol" : "") + "ur";
  else if (np.plural) noun = noun + "ol";
  parts.push(noun);
  if (np.adjective) parts.push(np.adjective);
  return parts.join(" ");
}

function renderSentenceA(s: WorkSentence, swapped: boolean): string {
  const subj = s.subjects.map(renderNpA).join(" vo ");
  const obj = s.objects.map(renderNpA).join(" vo ");
  const verb = (s.past ? "vu" : "") + s.verb;
  return swapped ? subj + " " + verb + " " + obj : subj + " " + obj + " " + verb;
}

// --- Language B: VSO; adj before noun; plural vi-; definite bo-...-um; object -ik.

function renderNpB(np: WorkNP): string {
  if (np.bareAffix === "case") return np.noun + "ik";
  if (np.bareAffix === "article") return "bo" + np.noun + "um";
  let noun = np.plural ? "vi" + np.noun : np.noun;
  let adjective = np.adjective;
  if (np.movePluralToAdjective && np.adjective) {
    noun = np.noun;
    adjective = "vi" + np.adjective;
  }
  if (np.definite) noun = "bo" + noun + "um";
  if (np.objectCase) noun = noun + "ik";
  return adjective ? adjective + " " + noun : noun;
}

function renderSentenceB(s: WorkSentence, swapped: boolean): string {
  const subj = s.subjects.map(renderNpB).join(" tal ");
  const obj = s.objects.map((o) => renderNpB({ ...o, objectCase: o.objectCase === false ? false : true })).join(" tal ");
  return swapped ? subj + " " + s.verb + " " + obj : s.verb + " " + subj + " " + obj;
}

// --- Language C: SVO; article "sa" after noun; plural -u; past -i; adj redup = very.

function renderNpC(np: WorkNP): string {
  if (np.bareAffix === "past") return np.noun + "i";
  if (np.bareAffix === "reduplication") return np.noun + np.noun;
  const parts: string[] = [];
  if (np.moveIntensiveToNoun) parts.push(np.noun + np.noun);
  else parts.push(np.noun + (np.plural ? "u" : ""));
  if (np.definite) parts.push("sa");
  if (np.adjective) {
    if (np.movePluralToAdjective) parts.push(np.adjective + "u");
    else if (np.intensive) parts.push(np.adjective + np.adjective);
    else parts.push(np.adjective);
  }
  return parts.join(" ");
}

function renderSentenceC(s: WorkSentence, swapped: boolean): string {
  const subj = s.subjects.map(renderNpC).join(" zu ");
  const obj = s.objects.map(renderNpC).join(" zu ");
  const verb = s.verb + (s.past ? "i" : "");
  return swapped ? subj + " " + obj + " " + verb : subj + " " + verb + " " + obj;
}

function renderAl(lang: ArtlangLangId, reading: WorkReading, swapped: boolean): string {
  if (reading.kind === "word") {
    if (lang === "A") return renderNpA(reading.np);
    if (lang === "B") return renderNpB(reading.np);
    return renderNpC(reading.np);
  }
  if (lang === "A") return renderSentenceA(reading.sentence, swapped);
  if (lang === "B") return renderSentenceB(reading.sentence, swapped);
  return renderSentenceC(reading.sentence, swapped);
}

// --- English side (sources for EN->AL items; keys for AL->EN items).

function enNounForm(lang: ArtlangLangId, stem: string, plural: boolean): string {
  const lex = lexemeFor(lang, stem);
  return plural ? (lex.enPlural ?? lex.en + "s") : lex.en;
}

function renderNpEn(lang: ArtlangLangId, np: WorkNP): string {
  const adjective = np.adjective ? (np.intensive ? "very " : "") + lexemeFor(lang, np.adjective).en + " " : "";
  const head = adjective + enNounForm(lang, np.noun, np.plural);
  if (np.possessor) return (np.definite ? "the" : "a") + " " + enNounForm(lang, np.possessor, false) + "'s " + head;
  if (np.definite) return "the " + head;
  if (lexemeFor(lang, np.noun).mass || np.plural) return head;
  return "a " + head;
}

function renderSentenceEn(lang: ArtlangLangId, s: WorkSentence): string {
  const subj = s.subjects.map((np) => renderNpEn(lang, np)).join(" and ");
  const obj = s.objects.map((np) => renderNpEn(lang, np)).join(" and ");
  const lex = lexemeFor(lang, s.verb);
  const onlySubject = s.subjects.length === 1 ? s.subjects[0] : undefined;
  const third = onlySubject !== undefined && !onlySubject.plural;
  const verb = s.past ? (lex.enPast ?? lex.en + "d") : third ? (lex.enThird ?? lex.en + "s") : lex.en;
  const text = subj + " " + verb + " " + obj + ".";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Rule-error application (bank side; the test re-implements independently)
// ---------------------------------------------------------------------------

/** Singularize the first plural NP (the shared transform of `drop plural`
 *  and `numberSwap`; the error names stay distinct for semantics). */
function depluralize(nps: WorkNP[]): void {
  const np = nps.find((n) => n.plural);
  if (np) np.plural = false;
}

function applyArtlangError(spec: ArtlangItemSpec, err: ArtlangError): { work: WorkReading; swapped: boolean } {
  const work = toWorkReading(spec.reading);
  const sentence = work.kind === "sentence" ? work.sentence : undefined;
  const nps: WorkNP[] = work.kind === "word" ? [work.np] : [...work.sentence.subjects, ...work.sentence.objects];
  let swapped = false;
  switch (err.error) {
    case "drop":
      if (err.what === "article") {
        for (const np of nps) np.definite = false;
      } else if (err.what === "plural") {
        depluralize(nps);
      } else if (err.what === "past") {
        if (sentence) sentence.past = false;
      } else if (err.what === "possessive") {
        for (const np of nps) if (np.possessor) np.possessorBare = true;
      } else if (err.what === "case") {
        if (work.kind === "word") work.np.objectCase = false;
        else if (sentence) for (const o of sentence.objects) o.objectCase = false;
      } else if (err.what === "intensive") {
        for (const np of nps) np.intensive = false;
      }
      break;
    case "add":
      if (work.kind === "word") {
        if (err.what === "article") work.np.definite = true;
        else work.np.objectCase = true;
      }
      break;
    case "wrongAffix":
      if (work.kind === "word") {
        work.np.bareAffix = err.use;
        work.np.definite = false;
        work.np.plural = false;
      }
      break;
    case "wrongOrder":
      if (spec.direction === "al-en" && sentence) {
        const swappedSentence: WorkSentence = { ...sentence, subjects: sentence.objects, objects: sentence.subjects };
        if (work.kind === "sentence") work.sentence = swappedSentence;
      } else {
        swapped = true;
      }
      break;
    case "wrongTense":
      if (sentence) sentence.past = !sentence.past;
      break;
    case "numberSwap":
      depluralize(nps);
      break;
    case "adjMisattach":
      if (sentence && sentence.subjects[0] && sentence.objects[0]) {
        const to = sentence.subjects[0];
        const from = sentence.objects[0];
        to.adjective = from.adjective;
        to.intensive = from.intensive;
        from.adjective = undefined;
        from.intensive = false;
      }
      break;
    case "adjSwap":
      if (sentence && sentence.subjects[0] && sentence.objects[0]) {
        const tmp = sentence.subjects[0].adjective;
        sentence.subjects[0].adjective = sentence.objects[0].adjective;
        sentence.objects[0].adjective = tmp;
      }
      break;
    case "stemSwap":
      if (sentence) {
        if (err.slot === "verb") sentence.verb = err.with;
        else if (err.slot === "subject" && sentence.subjects[0]) sentence.subjects[0].noun = err.with;
        else if (err.slot === "object" && sentence.objects[0]) sentence.objects[0].noun = err.with;
      }
      break;
    case "moveAffix":
      if (err.what === "possessive" && work.kind === "word") {
        work.np.possessorBare = true;
        work.np.possessiveOnNoun = true;
      } else if (err.what === "plural") {
        const np = nps.find((n) => n.plural && n.adjective);
        if (np) {
          np.plural = false;
          np.movePluralToAdjective = true;
        }
      } else if (err.what === "intensive") {
        const np = nps.find((n) => n.intensive);
        if (np) {
          np.intensive = false;
          np.moveIntensiveToNoun = true;
        }
      }
      break;
    case "wrongStem":
      break; // handled by the caller (lookup items only)
  }
  return { work, swapped };
}

// ---------------------------------------------------------------------------
// Item specs
// ---------------------------------------------------------------------------

export const ARTLANG_SPECS: readonly ArtlangItemSpec[] = [
  // ----- Language A -----
  {
    id: "aln-001", lang: "A", type: "lookup", direction: "al-en", a: 1.0, b: -2.0, answer: 2,
    reading: { kind: "word", np: { noun: "nogar", definite: false, plural: false } },
    errors: [
      { error: "wrongStem", as: "selik" },
      { error: "wrongStem", as: "mavik" },
      { error: "wrongStem", as: "tulir" },
      { error: "wrongStem", as: "dabor" },
    ],
  },
  {
    id: "aln-002", lang: "A", type: "word", direction: "en-al", a: 1.1, b: -1.0, answer: 0,
    reading: { kind: "word", np: { noun: "dabor", definite: false, plural: true } },
    errors: [
      { error: "drop", what: "plural" },
      { error: "wrongAffix", use: "past" },
      { error: "wrongAffix", use: "possessive" },
      { error: "add", what: "article" },
    ],
  },
  {
    id: "aln-003", lang: "A", type: "sentence-en", direction: "en-al", a: 1.2, b: 0.0, answer: 4,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "renuk", definite: true, plural: false }],
        objects: [{ noun: "dabor", definite: true, plural: false }],
        verb: "tikal", past: false,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "drop", what: "article" },
      { error: "wrongTense" },
      { error: "stemSwap", slot: "subject", with: "tamel" },
    ],
  },
  {
    id: "aln-004", lang: "A", type: "sentence-al", direction: "al-en", a: 1.2, b: 0.8, answer: 2,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [
          { noun: "tamel", definite: true, plural: false },
          { noun: "nogar", definite: true, plural: false },
        ],
        objects: [{ noun: "selik", definite: true, plural: true, adjective: "boken" }],
        verb: "dumal", past: true,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "wrongTense" },
      { error: "numberSwap" },
      { error: "adjMisattach" },
    ],
  },
  {
    id: "aln-005", lang: "A", type: "derived", direction: "en-al", a: 1.3, b: 1.2, answer: 0,
    reading: { kind: "word", np: { noun: "dabor", definite: true, plural: true, possessor: "tamel" } },
    errors: [
      { error: "drop", what: "possessive" },
      { error: "drop", what: "plural" },
      { error: "drop", what: "article" },
      { error: "moveAffix", what: "possessive" },
    ],
  },
  {
    id: "aln-006", lang: "A", type: "combined", direction: "en-al", a: 1.4, b: 2.4, answer: 3,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "selik", definite: true, plural: true, possessor: "renuk" }],
        objects: [{ noun: "tulir", definite: true, plural: false, adjective: "ganol" }],
        verb: "romek", past: true,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "drop", what: "past" },
      { error: "drop", what: "plural" },
      { error: "drop", what: "possessive" },
    ],
  },
  // ----- Language B -----
  {
    id: "aln-007", lang: "B", type: "lookup", direction: "al-en", a: 1.0, b: -1.7, answer: 1,
    reading: { kind: "word", np: { noun: "suvak", definite: false, plural: false } },
    errors: [
      { error: "wrongStem", as: "hobek" },
      { error: "wrongStem", as: "taval" },
      { error: "wrongStem", as: "kedan" },
      { error: "wrongStem", as: "navek" },
    ],
  },
  {
    id: "aln-008", lang: "B", type: "word", direction: "en-al", a: 1.1, b: -0.9, answer: 4,
    reading: { kind: "word", np: { noun: "hobek", definite: false, plural: true } },
    errors: [
      { error: "drop", what: "plural" },
      { error: "wrongAffix", use: "case" },
      { error: "wrongAffix", use: "article" },
      { error: "add", what: "case" },
    ],
  },
  {
    id: "aln-009", lang: "B", type: "sentence-en", direction: "en-al", a: 1.2, b: 0.3, answer: 0,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "hobek", definite: false, plural: false }],
        objects: [{ noun: "taval", definite: true, plural: false }],
        verb: "zagil", past: false,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "drop", what: "article" },
      { error: "drop", what: "case" },
      { error: "stemSwap", slot: "verb", with: "hekum" },
    ],
  },
  {
    id: "aln-010", lang: "B", type: "sentence-al", direction: "al-en", a: 1.2, b: 1.0, answer: 2,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "hobek", definite: true, plural: true }],
        objects: [{ noun: "taval", definite: true, plural: false, adjective: "lumek" }],
        verb: "vedal", past: false,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "numberSwap" },
      { error: "adjMisattach" },
      { error: "stemSwap", slot: "verb", with: "pimor" },
    ],
  },
  {
    id: "aln-011", lang: "B", type: "derived", direction: "en-al", a: 1.3, b: 1.5, answer: 3,
    note: ", spoken as the object of a verb",
    reading: { kind: "word", np: { noun: "navek", definite: true, plural: true, adjective: "lumek", objectCase: true } },
    errors: [
      { error: "drop", what: "plural" },
      { error: "drop", what: "article" },
      { error: "drop", what: "case" },
      { error: "moveAffix", what: "plural" },
    ],
  },
  {
    id: "aln-012", lang: "B", type: "combined", direction: "en-al", a: 1.4, b: 2.4, answer: 1,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "hobek", definite: true, plural: true, adjective: "darik" }],
        objects: [{ noun: "lunek", definite: true, plural: true, adjective: "lumek" }],
        verb: "pimor", past: false,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "drop", what: "plural" },
      { error: "drop", what: "case" },
      { error: "adjSwap" },
    ],
  },
  // ----- Language C -----
  {
    id: "aln-013", lang: "C", type: "lookup", direction: "al-en", a: 1.0, b: -1.4, answer: 4,
    reading: { kind: "word", np: { noun: "rukol", definite: false, plural: false } },
    errors: [
      { error: "wrongStem", as: "galim" },
      { error: "wrongStem", as: "sevam" },
      { error: "wrongStem", as: "dopel" },
      { error: "wrongStem", as: "tavor" },
    ],
  },
  {
    id: "aln-014", lang: "C", type: "word", direction: "en-al", a: 1.1, b: -0.7, answer: 0,
    reading: { kind: "word", np: { noun: "tavor", definite: false, plural: true } },
    errors: [
      { error: "drop", what: "plural" },
      { error: "wrongAffix", use: "past" },
      { error: "wrongAffix", use: "reduplication" },
      { error: "add", what: "article" },
    ],
  },
  {
    id: "aln-015", lang: "C", type: "sentence-en", direction: "en-al", a: 1.2, b: 0.5, answer: 1,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "bolik", definite: true, plural: false }],
        objects: [{ noun: "sevam", definite: true, plural: false }],
        verb: "mekal", past: false,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "wrongTense" },
      { error: "drop", what: "article" },
      { error: "stemSwap", slot: "object", with: "galim" },
    ],
  },
  {
    id: "aln-016", lang: "C", type: "sentence-al", direction: "al-en", a: 1.2, b: 1.1, answer: 3,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "bolik", definite: true, plural: true }],
        objects: [{ noun: "dopel", definite: true, plural: false, adjective: "nurev", intensive: true }],
        verb: "sedal", past: true,
      },
    },
    errors: [
      { error: "wrongTense" },
      { error: "numberSwap" },
      { error: "drop", what: "intensive" },
      { error: "stemSwap", slot: "verb", with: "mekal" },
    ],
  },
  {
    id: "aln-017", lang: "C", type: "derived", direction: "en-al", a: 1.3, b: 1.8, answer: 2,
    reading: { kind: "word", np: { noun: "tavor", definite: true, plural: true, adjective: "nurev", intensive: true } },
    errors: [
      { error: "drop", what: "intensive" },
      { error: "drop", what: "plural" },
      { error: "moveAffix", what: "intensive" },
      { error: "moveAffix", what: "plural" },
    ],
  },
  {
    id: "aln-018", lang: "C", type: "combined", direction: "en-al", a: 1.4, b: 2.4, answer: 1,
    reading: {
      kind: "sentence",
      sentence: {
        subjects: [{ noun: "tavor", definite: true, plural: true }],
        objects: [
          { noun: "galim", definite: true, plural: false, adjective: "dolim", intensive: true },
          { noun: "sevam", definite: true, plural: false, adjective: "nurev" },
        ],
        verb: "mekal", past: true,
      },
    },
    errors: [
      { error: "wrongOrder" },
      { error: "drop", what: "past" },
      { error: "drop", what: "intensive" },
      { error: "drop", what: "plural" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function questionLine(spec: ArtlangItemSpec): string {
  const name = ARTLANG_LANGUAGES[spec.lang].name;
  const work = toWorkReading(spec.reading);
  const english =
    work.kind === "word" ? renderNpEn(spec.lang, work.np) : renderSentenceEn(spec.lang, work.sentence);
  const artificial = renderAl(spec.lang, work, false);
  switch (spec.type) {
    case "lookup":
      return 'From the ' + name + ' material above, "' + artificial + '" means:';
    case "word":
      return 'Translate this word into ' + name + ': "' + english + '"';
    case "derived":
      return 'Translate this phrase into ' + name + ': "' + english + '"' + (spec.note ?? "");
    case "sentence-al":
      return 'What does this ' + name + ' sentence mean: "' + artificial + '"?';
    case "sentence-en":
    case "combined":
      return 'Translate this sentence into ' + name + ': "' + english + '"';
  }
}

function promptFor(spec: ArtlangItemSpec): string {
  const lang = ARTLANG_LANGUAGES[spec.lang];
  const lines: string[] = [lang.name + " word list:"];
  for (const line of lang.lines) lines.push(line.map((w) => w.al + " = " + w.en).join(", "));
  lines.push("Worked examples:");
  for (const example of lang.examples) {
    const work = toWorkSentence(example);
    lines.push('"' + renderAl(spec.lang, { kind: "sentence", sentence: work }, false) + '" = "' + renderSentenceEn(spec.lang, work) + '"');
  }
  lines.push("");
  lines.push(questionLine(spec));
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Key and distractor derivation
// ---------------------------------------------------------------------------

function keyFor(spec: ArtlangItemSpec): string {
  if (spec.direction === "al-en") {
    if (spec.type === "lookup") {
      if (spec.reading.kind !== "word") throw new Error(spec.id + " lookup must carry a word reading");
      return lexemeFor(spec.lang, spec.reading.np.noun).en;
    }
    if (spec.reading.kind !== "sentence") throw new Error(spec.id + " al-en item must carry a sentence reading");
    return renderSentenceEn(spec.lang, toWorkSentence(spec.reading.sentence));
  }
  return renderAl(spec.lang, toWorkReading(spec.reading), false);
}

function distractorFor(spec: ArtlangItemSpec, err: ArtlangError): string {
  if (err.error === "wrongStem") return lexemeFor(spec.lang, err.as).en;
  const { work, swapped } = applyArtlangError(spec, err);
  if (spec.direction === "al-en") {
    if (work.kind !== "sentence") throw new Error(spec.id + " al-en error needs a sentence");
    return renderSentenceEn(spec.lang, work.sentence);
  }
  return renderAl(spec.lang, work, swapped);
}

function buildArtlangItems(): Item[] {
  return ARTLANG_SPECS.map((spec) => {
    const distractors = spec.errors.map((err) => distractorFor(spec, err));
    const options: string[] = [];
    let next = 0;
    for (let position = 0; position < 5; position += 1) {
      options.push(position === spec.answer ? keyFor(spec) : distractors[next++]!);
    }
    if (new Set(options).size !== 5) throw new Error(spec.id + " options are not unique");
    return {
      id: spec.id,
      subtest: "artificialLanguage",
      broad: "Gc",
      narrow: "LD",
      a: spec.a,
      b: spec.b,
      c: 0.2,
      prompt: promptFor(spec),
      options,
      answer: spec.answer,
      render: { kind: "text" },
    };
  });
}

/** Unscored practice items: a Language A lexicon lookup and one plural word. */
function buildArtlangPractice(): Item[] {
  const lookup: ArtlangItemSpec = {
    id: "prac-aln-01", lang: "A", type: "lookup", direction: "al-en", a: 1.0, b: -3, answer: 3,
    reading: { kind: "word", np: { noun: "selik", definite: false, plural: false } },
    errors: [
      { error: "wrongStem", as: "dabor" },
      { error: "wrongStem", as: "nogar" },
      { error: "wrongStem", as: "mavik" },
      { error: "wrongStem", as: "tulir" },
    ],
  };
  const plural: ArtlangItemSpec = {
    id: "prac-aln-02", lang: "A", type: "word", direction: "en-al", a: 1.0, b: -3, answer: 2,
    reading: { kind: "word", np: { noun: "selik", definite: false, plural: true } },
    errors: [
      { error: "drop", what: "plural" },
      { error: "wrongAffix", use: "past" },
      { error: "wrongAffix", use: "possessive" },
      { error: "add", what: "article" },
    ],
  };
  return [lookup, plural].map((spec, i) => {
    const distractors = spec.errors.map((err) => distractorFor(spec, err));
    const options: string[] = [];
    let next = 0;
    for (let position = 0; position < 5; position += 1) {
      options.push(position === spec.answer ? keyFor(spec) : distractors[next++]!);
    }
    return {
      id: spec.id,
      subtest: "artificialLanguage",
      broad: "Gc",
      narrow: "LD",
      a: spec.a,
      b: spec.b,
      c: 0.2,
      prompt: "Unscored sample " + (i + 1) + " of 2.\n" + promptFor(spec),
      options,
      answer: spec.answer,
      render: { kind: "text" },
    };
  });
}

/**
 * The Artificial Language subtest. 18 items across three mini-languages;
 * adaptive routing samples the pool with a floor at pure lexicon lookup and
 * a ceiling at combined order + double-affix sentences.
 */
export const artificialLanguage: Subtest = {
  id: "artificialLanguage",
  name: "Artificial Language",
  broad: "Gc",
  narrow: ["LD"],
  instructions:
    "A constructed language is presented with its vocabulary and worked examples. Infer its grammar and translate.",
  budgetMin: 12,
  routing: { maxItems: 14, minItems: 7, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  // Unscored sample: a pure lexicon lookup in Language A (selik = bird),
  // built through the same prompt/key/distractor machinery as the bank so it
  // demonstrates the material layout exactly.
  practice: buildArtlangPractice(),
  items: buildArtlangItems(),
};
