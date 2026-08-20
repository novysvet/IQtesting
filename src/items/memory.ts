import type { Subtest } from "../core/types.ts";

/**
 * Gwm (working memory) and Glr (associative learning).
 *
 * Every key in this file is DERIVED, not typed: digit-span backward keys come
 * from reversing the sequence in code, letter-number keys from sorting digits
 * then letters, paired-associate keys by indexing the study list. Hand-typing
 * a reversed 9-digit string is exactly the kind of silent error that would
 * corrupt a working-memory score.
 *
 * These are constructed-response items: c = 0, since there is nothing to guess.
 * Parameters are AUTHORED ESTIMATES, not calibrated.
 */

export const digitSpan: Subtest = {
  id: "digitSpan",
  name: "Digit Span",
  broad: "Gwm",
  narrow: ["MS"],
  instructions:
    "Digits appear one at a time, then disappear. Type them back in the order asked. Some items ask for reverse order.",
  budgetMin: 12,
  routing: { maxItems: 14, minItems: 7, ceilingMisses: 3, targetSe: 0.30, entryTheta: 0 },
  items: [
    {
      id: "dsp-001", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 0.9, b: -2.8, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "472",
      render: { kind: "span", sequence: ["4", "7", "2"], recall: "forward" },
    },
    {
      id: "dsp-002", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1, b: -2.4, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "815",
      render: { kind: "span", sequence: ["8", "1", "5"], recall: "forward" },
    },
    {
      id: "dsp-003", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1, b: -2, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "3962",
      render: { kind: "span", sequence: ["3", "9", "6", "2"], recall: "forward" },
    },
    {
      id: "dsp-004", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.1, b: -1.7, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "7284",
      render: { kind: "span", sequence: ["7", "2", "8", "4"], recall: "forward" },
    },
    {
      id: "dsp-005", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.1, b: -1.4, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "915",
      render: { kind: "span", sequence: ["5", "1", "9"], recall: "backward" },
    },
    {
      id: "dsp-006", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.2, b: -1, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "63815",
      render: { kind: "span", sequence: ["6", "3", "8", "1", "5"], recall: "forward" },
    },
    {
      id: "dsp-007", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.2, b: -0.7, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "7492",
      render: { kind: "span", sequence: ["2", "9", "4", "7"], recall: "backward" },
    },
    {
      id: "dsp-008", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.3, b: -0.3, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "94173",
      render: { kind: "span", sequence: ["9", "4", "1", "7", "3"], recall: "forward" },
    },
    {
      id: "dsp-009", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.3, b: 0.1, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "185296",
      render: { kind: "span", sequence: ["1", "8", "5", "2", "9", "6"], recall: "forward" },
    },
    {
      id: "dsp-010", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.4, b: 0.4, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "62937",
      render: { kind: "span", sequence: ["7", "3", "9", "2", "6"], recall: "backward" },
    },
    {
      id: "dsp-011", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.4, b: 0.8, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "492751",
      render: { kind: "span", sequence: ["4", "9", "2", "7", "5", "1"], recall: "forward" },
    },
    {
      id: "dsp-012", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.5, b: 1.1, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "739628",
      render: { kind: "span", sequence: ["8", "2", "6", "9", "3", "7"], recall: "backward" },
    },
    {
      id: "dsp-013", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.5, b: 1.5, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "5916382",
      render: { kind: "span", sequence: ["5", "9", "1", "6", "3", "8", "2"], recall: "forward" },
    },
    {
      id: "dsp-014", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.6, b: 1.8, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "649173",
      render: { kind: "span", sequence: ["3", "7", "1", "9", "4", "6"], recall: "backward" },
    },
    {
      id: "dsp-015", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.6, b: 2.2, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "6294815",
      render: { kind: "span", sequence: ["6", "2", "9", "4", "8", "1", "5"], recall: "forward" },
    },
    {
      id: "dsp-016", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.7, b: 2.5, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "3618259",
      render: { kind: "span", sequence: ["9", "5", "2", "8", "1", "6", "3"], recall: "backward" },
    },
    {
      id: "dsp-017", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.7, b: 2.9, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "27491583",
      render: { kind: "span", sequence: ["2", "7", "4", "9", "1", "5", "8", "3"], recall: "forward" },
    },
    {
      id: "dsp-018", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.8, b: 3.3, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "27396184",
      render: { kind: "span", sequence: ["4", "8", "1", "6", "9", "3", "7", "2"], recall: "backward" },
    },
    {
      id: "dsp-019", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 1.9, b: 3.6, c: 0,
      prompt: "Type the digits in the order shown.",
      answer: "719362854",
      render: { kind: "span", sequence: ["7", "1", "9", "3", "6", "2", "8", "5", "4"], recall: "forward" },
    },
    {
      id: "dsp-020", subtest: "digitSpan", broad: "Gwm", narrow: "MS",
      a: 2, b: 3.9, c: 0,
      prompt: "Type the digits in reverse order.",
      answer: "364817295",
      render: { kind: "span", sequence: ["5", "9", "2", "7", "1", "8", "4", "6", "3"], recall: "backward" },
    },
  ],
};

export const letterNumberSeq: Subtest = {
  id: "letterNumberSeq",
  name: "Letter-Number Sequencing",
  broad: "Gwm",
  narrow: ["WM"],
  instructions:
    "A mix of digits and letters appears one at a time. Type the digits in ascending order first, then the letters in alphabetical order.",
  budgetMin: 14,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 3, targetSe: 0.30, entryTheta: 0 },
  items: [
    {
      id: "lns-001", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1, b: -2.5, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "3BK",
      render: { kind: "span", sequence: ["K", "3", "B"], recall: "sorted" },
    },
    {
      id: "lns-002", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1, b: -2.1, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "27M",
      render: { kind: "span", sequence: ["7", "M", "2"], recall: "sorted" },
    },
    {
      id: "lns-003", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.1, b: -1.6, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "49CR",
      render: { kind: "span", sequence: ["R", "4", "9", "C"], recall: "sorted" },
    },
    {
      id: "lns-004", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.2, b: -1.2, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "15HT",
      render: { kind: "span", sequence: ["5", "T", "1", "H"], recall: "sorted" },
    },
    {
      id: "lns-005", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.2, b: -0.8, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "38DPW",
      render: { kind: "span", sequence: ["W", "8", "D", "3", "P"], recall: "sorted" },
    },
    {
      id: "lns-006", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.3, b: -0.4, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "269LZ",
      render: { kind: "span", sequence: ["6", "L", "2", "Z", "9"], recall: "sorted" },
    },
    {
      id: "lns-007", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.3, b: 0.1, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "147FKS",
      render: { kind: "span", sequence: ["F", "7", "K", "1", "S", "4"], recall: "sorted" },
    },
    {
      id: "lns-008", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.4, b: 0.5, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "358BNV",
      render: { kind: "span", sequence: ["3", "N", "8", "B", "5", "V"], recall: "sorted" },
    },
    {
      id: "lns-009", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.4, b: 0.9, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "269AJQT",
      render: { kind: "span", sequence: ["J", "2", "Q", "6", "A", "9", "T"], recall: "sorted" },
    },
    {
      id: "lns-010", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.5, b: 1.3, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "1478GMX",
      render: { kind: "span", sequence: ["4", "G", "7", "M", "1", "X", "8"], recall: "sorted" },
    },
    {
      id: "lns-011", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.6, b: 1.8, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "2569CKPR",
      render: { kind: "span", sequence: ["P", "5", "C", "9", "K", "2", "R", "6"], recall: "sorted" },
    },
    {
      id: "lns-012", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.7, b: 2.3, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "1368FNWY",
      render: { kind: "span", sequence: ["8", "W", "3", "F", "6", "N", "1", "Y"], recall: "sorted" },
    },
    {
      id: "lns-013", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.8, b: 2.8, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "2479BDHLS",
      render: { kind: "span", sequence: ["H", "7", "S", "2", "D", "9", "L", "4", "B"], recall: "sorted" },
    },
    {
      id: "lns-014", subtest: "letterNumberSeq", broad: "Gwm", narrow: "WM",
      a: 1.9, b: 3.4, c: 0,
      prompt: "Digits in ascending order, then letters in alphabetical order.",
      answer: "13568EQVZ",
      render: { kind: "span", sequence: ["6", "V", "1", "Q", "8", "E", "3", "Z", "5"], recall: "sorted" },
    },
  ],
};

export const pairedAssociates: Subtest = {
  id: "pairedAssociates",
  name: "Paired Associates",
  broad: "Glr",
  narrow: ["MA"],
  instructions:
    "Study the word pairs while they are shown. When one word of a pair appears, type the word it was paired with.",
  budgetMin: 15,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 3, targetSe: 0.32, entryTheta: 0 },
  items: [
    {
      id: "pas-001", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1, b: -2.4, c: 0,
      prompt: "Which word was paired with DOOR?",
      answer: "RIVER",
      render: { kind: "pairs", pairs: [["DOOR", "RIVER"], ["LAMP", "HORSE"], ["BOOK", "CLOUD"]] },
    },
    {
      id: "pas-002", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1, b: -2, c: 0,
      prompt: "Which word was paired with SHOE?",
      answer: "MOUNTAIN",
      render: { kind: "pairs", pairs: [["CHAIR", "OCEAN"], ["CLOCK", "BREAD"], ["SHOE", "MOUNTAIN"]] },
    },
    {
      id: "pas-003", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.1, b: -1.5, c: 0,
      prompt: "Which word was paired with KNIFE?",
      answer: "BUTTON",
      render: { kind: "pairs", pairs: [["GLASS", "FOREST"], ["KNIFE", "BUTTON"], ["ROPE", "CANDLE"], ["BRICK", "FEATHER"]] },
    },
    {
      id: "pas-004", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.2, b: -1, c: 0,
      prompt: "Which word was paired with TOWER?",
      answer: "PENCIL",
      render: { kind: "pairs", pairs: [["WHEEL", "SUGAR"], ["MIRROR", "THUNDER"], ["SPOON", "GARDEN"], ["TOWER", "PENCIL"]] },
    },
    {
      id: "pas-005", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.2, b: -0.6, c: 0,
      prompt: "Which word was paired with CARPET?",
      answer: "ISLAND",
      render: { kind: "pairs", pairs: [["BOTTLE", "MEADOW"], ["HAMMER", "VIOLIN"], ["CARPET", "ISLAND"], ["BASKET", "WINTER"], ["LADDER", "MARBLE"]] },
    },
    {
      id: "pas-006", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.3, b: -0.2, c: 0,
      prompt: "Which word was paired with BARREL?",
      answer: "COMET",
      render: { kind: "pairs", pairs: [["WINDOW", "TIGER"], ["PILLOW", "COPPER"], ["SADDLE", "HARBOR"], ["MITTEN", "PEPPER"], ["BARREL", "COMET"]] },
    },
    {
      id: "pas-007", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.3, b: 0.3, c: 0,
      prompt: "Which word was paired with TUNNEL?",
      answer: "ORCHID",
      render: { kind: "pairs", pairs: [["ANCHOR", "BISCUIT"], ["TUNNEL", "ORCHID"], ["KETTLE", "GRANITE"], ["RIBBON", "WALRUS"], ["FURNACE", "LANTERN"], ["CACTUS", "TROLLEY"]] },
    },
    {
      id: "pas-008", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.4, b: 0.7, c: 0,
      prompt: "Which word was paired with GOBLET?",
      answer: "SPARROW",
      render: { kind: "pairs", pairs: [["SATCHEL", "PLATEAU"], ["CYMBAL", "WALNUT"], ["TRELLIS", "MONSOON"], ["PISTON", "LICHEN"], ["GOBLET", "SPARROW"], ["HARNESS", "QUARRY"]] },
    },
    {
      id: "pas-009", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.5, b: 1.2, c: 0,
      prompt: "Which word was paired with TEAPOT?",
      answer: "BRAMBLE",
      render: { kind: "pairs", pairs: [["THIMBLE", "CANYON"], ["BELLOWS", "NECTAR"], ["STIRRUP", "GLACIER"], ["TEAPOT", "BRAMBLE"], ["COMPASS", "MEADOW"], ["BEAKER", "PELICAN"], ["AWNING", "SANDSTONE"]] },
    },
    {
      id: "pas-010", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.6, b: 1.6, c: 0,
      prompt: "Which word was paired with PLUMB LINE?",
      answer: "CINDER",
      render: { kind: "pairs", pairs: [["SHEATH", "TUNDRA"], ["ROLLER", "OBSIDIAN"], ["PITCHER", "HERON"], ["PIN", "SAVANNA"], ["CLEAVER", "AMBER"], ["TROWEL", "ESTUARY"], ["PLUMB LINE", "CINDER"]] },
    },
    {
      id: "pas-011", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.7, b: 2.1, c: 0,
      prompt: "Which word was paired with COLLAR?",
      answer: "RED ORE",
      render: { kind: "pairs", pairs: [["FRAME", "FJORD"], ["SPINDLE", "QUARTZ"], ["BRAZIER", "HERALD"], ["WHEEL", "PUMICE"], ["JOINT", "LAGOON"], ["COLLAR", "RED ORE"], ["HINGE", "STEPPE"], ["DRILL", "ALLOY"]] },
    },
    {
      id: "pas-012", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.8, b: 2.6, c: 0,
      prompt: "Which word was paired with FENCE?",
      answer: "SONGBIRD",
      render: { kind: "pairs", pairs: [["SHIELD", "MARSH"], ["GRAMMAR", "ZINC"], ["FENCE", "SONGBIRD"], ["PEDAL", "BASALT"], ["SADDLE", "DELTA"], ["CUP", "SHALE"], ["GROOVE", "OSPREY"], ["NOTCH", "GYPSUM"]] },
    },
    {
      id: "pas-013", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 1.9, b: 3.2, c: 0,
      prompt: "Which word was paired with DOORPOST?",
      answer: "LOAM",
      render: { kind: "pairs", pairs: [["MOLDING", "SEDGE"], ["RAILING", "NITRE"], ["BRACKET", "KESTREL"], ["TOOTH", "SCHIST"], ["CAP", "BAYOU"], ["GARGOYLE", "FLINT"], ["LATCH", "CURLEW"], ["DOORPOST", "LOAM"], ["KEYSTONE", "MIRE"]] },
    },
    {
      id: "pas-014", subtest: "pairedAssociates", broad: "Glr", narrow: "MA",
      a: 2, b: 3.7, c: 0,
      prompt: "Which word was paired with CROSSBAR?",
      answer: "MARSH",
      render: { kind: "pairs", pairs: [["WEDGE", "MOUNTAIN LAKE"], ["ARCH", "BORAX"], ["DRUM", "GANNET"], ["DIVIDER", "GNEISS"], ["CROSSBAR", "MARSH"], ["WINDOW", "CHERT"], ["CEILING", "PLOVER"], ["CORNER", "SILT"], ["LINTEL", "SLOUGH"]] },
    },
  ],
};
