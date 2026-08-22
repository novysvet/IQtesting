import type { Item, Subtest } from "../core/types.ts";

/**
 * Gf / I — Graph Mapping: structure mapping on graphs.
 *
 * Computerized fluid-reasoning format after Jastrzębski, Ociepka & Chuderski
 * (2022), "Graph Mapping: A novel and simple test to validly assess fluid
 * reasoning", Behavior Research Methods 54: their version matched the two
 * highlighted nodes of a model graph inside an isomorphic copy and measured
 * RAPM-equivalent validity (Cronbach's alpha .86, one-week test-retest .76,
 * CFA Gf loading .75 — statistically indistinguishable from Raven matrices;
 * correlations with RAPM/figural analogies/CFT-3 near .60). The task is
 * constructed-response with no options to eliminate — Arendasy & Sommer's
 * (2013) response-elimination critique of matrix formats cannot apply — and
 * its difficulty dials (edge count, direct vs indirect targets, crossed
 * drawings) are experimentally validated in the source paper.
 *
 * Item model: the reference graph is authored (positions, edges, and the
 * two ringed target nodes); `perm` scrambles it (reference node i becomes
 * numbered node perm[i]+1 in a different authored layout). The builder
 * derives the scrambled edge list and the answer string from perm — the
 * shipped render payload carries ONLY the two structures, never the
 * mapping. test/graphmap.test.ts then re-derives the key independently by
 * brute-force enumeration of EVERY isomorphism and asserts:
 *   1. the two graphs are isomorphic;
 *   2. the image of the target pair is the SAME pair under every
 *      isomorphism (automorphism-rigidity of the key — no defensible
 *      alternative answer exists), and equals the shipped answer;
 *   3. reference node colors (renderer derives them from degree) encode
 *      degree classes faithfully;
 *   4. direct/indirect and layout-crossing difficulty anchors hold.
 *
 * Difficulty ladder (content-authored): path/star basals with
 * degree-identifiable targets (b -2.2) -> three-leaf and hub structures
 * requiring neighbour tracing (b -1.x) -> crowded degree classes and
 * distance reasoning (b 0.x) -> chorded cycles, bridged squares, and dense
 * crossed drawings where targets sit in the middle of large same-degree
 * crowds (b 1.0-2.2). Working-memory overlap with the source paper's
 * finding (Gf-WM correlation .87) is expected; the battery measures Gwm
 * separately, which is the right control.
 *
 * CALIBRATION STATUS: authored estimates, not fitted to response data.
 */

interface GraphItemSpec {
  id: string;
  a: number;
  b: number;
  note: string;
  /** Reference layout (viewBox 150x130) and undirected edges. */
  refPos: [number, number][];
  refEdges: [number, number][];
  /** The two ringed reference nodes (0-based). */
  targets: [number, number];
  /** refNode -> scrambledNode (0-based); scrambled nodes display index+1. */
  perm: number[];
  /** Scrambled layout — a genuinely different arrangement. */
  scrPos: [number, number][];
}

const PROMPT = "The first diagram is the model; two of its nodes are ringed. The second diagram is the same network rearranged, with numbered nodes. Type the numbers of the two nodes that occupy the same positions in the structure as the two ringed nodes in the model — in increasing order, separated by a comma.";

const GM_SPECS: GraphItemSpec[] = [
  {
    id: "gm-001", a: 0.9, b: -2.2,
    note: "basal: path endpoints (the two degree-1 nodes); path reversal fixes the pair",
    refPos: [[20, 100], [45, 72], [70, 50], [95, 42], [120, 58], [132, 92]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    targets: [0, 5],
    perm: [3, 0, 4, 1, 5, 2],
    scrPos: [[75, 20], [20, 60], [130, 50], [45, 105], [100, 95], [75, 62]],
  },
  {
    id: "gm-002", a: 0.9, b: -2.0,
    note: "star + one extension: the hub and the degree-2 node (both degree-unique)",
    refPos: [[75, 40], [35, 20], [40, 70], [115, 55], [135, 95]],
    refEdges: [[0, 1], [0, 2], [0, 3], [3, 4]],
    targets: [0, 3],
    perm: [4, 1, 3, 0, 2],
    scrPos: [[30, 30], [80, 15], [125, 40], [55, 70], [100, 90]],
  },
  {
    id: "gm-003", a: 0.95, b: -1.9,
    note: "star + tail: the hub and the first node of the tail",
    refPos: [[75, 40], [35, 20], [40, 70], [115, 55], [120, 95], [90, 115]],
    refEdges: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5]],
    targets: [0, 3],
    perm: [5, 2, 0, 4, 1, 3],
    scrPos: [[30, 40], [110, 30], [70, 70], [125, 95], [25, 100], [85, 110]],
  },
  {
    id: "gm-004", a: 1.0, b: -1.6,
    note: "two hubs, three leaves: leaf-on-hub vs leaf-on-deg-2",
    refPos: [[45, 35], [105, 30], [80, 70], [20, 60], [125, 15], [130, 55], [85, 105]],
    refEdges: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6]],
    targets: [3, 6],
    perm: [6, 2, 4, 0, 5, 1, 3],
    scrPos: [[25, 25], [120, 45], [60, 55], [30, 100], [100, 100], [70, 20], [130, 90]],
  },
  {
    id: "gm-005", a: 1.0, b: -1.35,
    note: "Y with a deep arm: the deg-3 hub and the two-step leaf",
    refPos: [[20, 55], [55, 85], [45, 30], [80, 15], [100, 60], [130, 35], [125, 95]],
    refEdges: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [4, 6]],
    targets: [3, 4],
    perm: [4, 0, 6, 2, 5, 3, 1],
    scrPos: [[60, 20], [25, 75], [110, 80], [95, 30], [40, 45], [130, 60], [15, 20]],
  },
  {
    id: "gm-006", a: 1.05, b: -1.15,
    note: "path with pendant: the two path-end leaves (not the pendant); path reversal fixes the pair",
    refPos: [[15, 40], [45, 25], [75, 50], [105, 30], [135, 55], [70, 95]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]],
    targets: [0, 4],
    perm: [1, 3, 2, 5, 4, 0],
    scrPos: [[60, 25], [25, 55], [100, 60], [130, 30], [45, 100], [90, 105]],
  },
  {
    id: "gm-007", a: 1.0, b: -0.9,
    note: "hexagon with a leaf on one vertex: the two cycle neighbours of the loaded vertex (reflection fixes the pair)",
    refPos: [[75, 15], [120, 38], [114, 90], [75, 112], [36, 90], [30, 38], [100, 15]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6]],
    targets: [1, 5],
    perm: [6, 3, 0, 5, 1, 4, 2],
    scrPos: [[30, 30], [90, 15], [130, 70], [100, 110], [45, 105], [20, 65], [60, 60]],
  },
  {
    id: "gm-008", a: 1.05, b: -0.65,
    note: "two triangles joined by a bridge: the two bridge (degree-3) nodes",
    refPos: [[30, 30], [70, 20], [55, 65], [100, 70], [125, 35], [130, 95]],
    refEdges: [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [3, 5], [4, 5]],
    targets: [2, 3],
    perm: [0, 1, 3, 5, 2, 4],
    scrPos: [[40, 25], [20, 80], [95, 95], [125, 55], [70, 60], [115, 15]],
  },
  {
    id: "gm-009", a: 1.1, b: -0.4,
    note: "lopsided binary tree: the lone leaf on the weak branch and the leaf under the internal node",
    refPos: [[45, 30], [25, 65], [85, 55], [10, 100], [45, 100], [100, 25], [115, 80], [140, 110]],
    refEdges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [6, 7]],
    targets: [5, 7],
    perm: [7, 3, 0, 5, 1, 6, 2, 4],
    scrPos: [[70, 15], [25, 40], [110, 45], [15, 85], [55, 75], [95, 90], [135, 70], [35, 110]],
  },
  {
    id: "gm-010", a: 1.1, b: -0.15,
    note: "figure-eight (two squares sharing a vertex): the two far corners; square swap fixes the pair",
    refPos: [[75, 65], [45, 35], [20, 70], [55, 100], [110, 35], [135, 70], [105, 100]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 0]],
    targets: [2, 5],
    perm: [3, 6, 1, 4, 0, 5, 2],
    scrPos: [[60, 20], [20, 55], [95, 40], [45, 80], [125, 30], [135, 90], [85, 110]],
  },
  {
    id: "gm-011", a: 1.15, b: 0.15,
    note: "square with two tails: the two mid-tail nodes (neighbours of the hub); tail swap and square reflection both fix the pair",
    refPos: [[75, 60], [100, 40], [130, 25], [45, 30], [35, 80], [105, 75], [110, 105], [135, 115]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [2, 6], [6, 7]],
    targets: [1, 6],
    perm: [5, 6, 7, 0, 4, 1, 3, 2],
    scrPos: [[30, 25], [75, 15], [120, 45], [20, 60], [60, 85], [100, 110], [140, 85], [25, 105]],
  },
  {
    id: "gm-012", a: 1.1, b: 0.45,
    note: "three leaves in three roles: deep leaf vs leaf-on-deg-2",
    refPos: [[35, 30], [30, 70], [80, 45], [10, 100], [65, 95], [95, 110], [125, 30]],
    refEdges: [[0, 1], [0, 2], [1, 3], [1, 4], [4, 5], [2, 6]],
    targets: [5, 6],
    perm: [6, 0, 4, 2, 5, 1, 3],
    scrPos: [[50, 20], [15, 55], [95, 35], [35, 90], [90, 80], [120, 110], [130, 55]],
  },
  {
    id: "gm-013", a: 1.15, b: 0.75,
    note: "hub with arms of lengths 2/2/3: the two short-arm leaves; the arm swap fixes the pair",
    refPos: [[15, 35], [35, 70], [70, 50], [60, 95], [90, 110], [105, 40], [130, 65], [135, 105]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7]],
    targets: [0, 4],
    perm: [2, 4, 1, 6, 7, 3, 5, 0],
    scrPos: [[25, 20], [70, 15], [40, 55], [110, 40], [15, 80], [90, 85], [135, 75], [65, 110]],
  },
  {
    id: "gm-014", a: 1.2, b: 1.05,
    note: "octagon with an off-centre chord: the two degree-2 nodes flanking the hubs on the long arc (the chord's endpoint-swapping reflection fixes the pair)",
    refPos: [[75, 10], [112, 25], [127, 62], [112, 99], [75, 114], [38, 99], [23, 62], [38, 25]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [1, 4]],
    targets: [0, 5],
    perm: [1, 3, 0, 5, 7, 6, 4, 2],
    scrPos: [[40, 15], [90, 20], [25, 50], [70, 55], [115, 45], [30, 95], [85, 100], [130, 85]],
  },
  {
    id: "gm-015", a: 1.2, b: 1.35,
    note: "two squares, bridge, and a diagonal tie at non-corresponding corners: A's hubs sit opposite, B's adjacent — the two non-hub corners of B; the lone reflection (of A) fixes the pair",
    refPos: [[20, 30], [22, 85], [58, 85], [60, 35], [95, 35], [95, 95], [130, 95], [130, 35]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6], [6, 7], [7, 4], [1, 5]],
    targets: [6, 7],
    perm: [0, 2, 5, 1, 6, 4, 3, 7],
    scrPos: [[35, 20], [15, 60], [60, 30], [100, 15], [130, 55], [85, 70], [45, 100], [115, 105]],
  },
  {
    id: "gm-016", a: 1.25, b: 1.65,
    note: "K(2,3) core with asymmetric tails: the tail node under one hub and the bare leaf on the other; crossed scrambled drawing",
    refPos: [[35, 65], [115, 65], [75, 25], [75, 65], [75, 105], [30, 105], [12, 118], [130, 100]],
    refEdges: [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [0, 5], [5, 6], [1, 7]],
    targets: [5, 7],
    perm: [3, 6, 0, 5, 2, 7, 1, 4],
    scrPos: [[60, 15], [25, 45], [100, 40], [135, 70], [70, 75], [40, 105], [110, 110], [15, 85]],
  },
  {
    id: "gm-017", a: 1.25, b: 1.9,
    note: "spine with a closing triangle and a forked pendant: spine-end leaf and the centre hub's pendant — three leaves in three distinct roles; crossed scrambled drawing",
    refPos: [[20, 40], [50, 45], [85, 50], [115, 45], [133, 30], [32, 82], [88, 95], [12, 105]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [0, 5], [5, 7], [2, 6]],
    targets: [4, 6],
    perm: [5, 0, 3, 2, 1, 6, 7, 4],
    scrPos: [[30, 25], [70, 15], [110, 30], [45, 60], [135, 55], [15, 70], [95, 80], [55, 105]],
  },
  {
    id: "gm-018", a: 1.3, b: 2.2,
    note: "ceiling: square + pentagon sharing the degree-4 node, chorded: the two pentagon-side nodes not adjacent to any hub; crossed scrambled drawing",
    refPos: [[75, 40], [38, 25], [22, 90], [50, 75], [112, 25], [128, 60], [108, 95], [92, 55]],
    refEdges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 7], [7, 0], [2, 6]],
    targets: [4, 5],
    perm: [6, 3, 5, 7, 0, 1, 2, 4],
    scrPos: [[70, 15], [25, 35], [115, 40], [45, 55], [100, 70], [30, 90], [135, 100], [75, 110]],
  },
];

function buildGraphItem(spec: GraphItemSpec): Item {
  const scrambledEdges = spec.refEdges.map(
    ([u, v]) => [spec.perm[u]!, spec.perm[v]!] as [number, number],
  );
  const answerPair = [spec.perm[spec.targets[0]]!, spec.perm[spec.targets[1]]!]
    .sort((x, y) => x - y)
    .map((n) => n + 1)
    .join(",");
  return {
    id: spec.id,
    subtest: "graphMapping",
    broad: "Gf",
    narrow: "I",
    a: spec.a,
    b: spec.b,
    c: 0,
    prompt: PROMPT,
    answer: answerPair,
    render: {
      kind: "graphmap",
      ref: { positions: spec.refPos, edges: spec.refEdges, targets: spec.targets },
      scrambled: { positions: spec.scrPos, edges: scrambledEdges },
    },
  };
}

export const graphMapping: Subtest = {
  id: "graphMapping",
  name: "Graph Mapping",
  broad: "Gf",
  narrow: ["I"],
  instructions:
    "Each problem shows a small network of nodes and lines (the model), with two of its nodes ringed, plus the same network rearranged so every node carries a number instead of its colour. Nodes with more connections wear warmer colours in the model, but only the structure matters: lines join exactly the same pairs. Work out which numbered nodes sit where the ringed nodes sit in the model's structure, then type those two numbers in increasing order, separated by a comma (for example: 3,7). Check the numbering carefully — one wrong node makes the answer wrong. This section is untimed.",
  budgetMin: 12,
  routing: { maxItems: 13, minItems: 6, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 },
  practice: [
    {
      id: "prac-gm-01", subtest: "graphMapping", broad: "Gf", narrow: "I",
      a: 0.9, b: -3, c: 0,
      // tiny: the hub and the two-step leaf; perm [3,0,4,1,2] -> nodes 1,3
      prompt: PROMPT,
      answer: "1,3",
      render: {
        kind: "graphmap",
        ref: {
          positions: [[75, 45], [35, 25], [115, 25], [75, 90], [110, 105]],
          edges: [[0, 1], [1, 2], [1, 3], [3, 4]],
          targets: [1, 4],
        },
        scrambled: {
          positions: [[30, 30], [90, 20], [50, 70], [130, 60], [85, 105]],
          edges: [[3, 0], [0, 4], [0, 1], [1, 2]],
        },
      },
    },
    {
      id: "prac-gm-02", subtest: "graphMapping", broad: "Gf", narrow: "I",
      a: 0.9, b: -3, c: 0,
      // the two hubs of a double star; perm [1,4,2,0,5,3] -> nodes 1,5
      prompt: PROMPT,
      answer: "1,5",
      render: {
        kind: "graphmap",
        ref: {
          positions: [[45, 45], [20, 15], [30, 80], [105, 45], [125, 15], [130, 80]],
          edges: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5]],
          targets: [1, 3],
        },
        scrambled: {
          positions: [[70, 15], [25, 45], [115, 30], [85, 70], [35, 100], [125, 95]],
          edges: [[1, 4], [4, 2], [4, 0], [0, 5], [0, 3]],
        },
      },
    },
  ],
  items: GM_SPECS.map(buildGraphItem),
};
