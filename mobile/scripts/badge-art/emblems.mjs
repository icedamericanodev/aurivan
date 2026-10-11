// The 22 emblems. Each is a list of element descriptors in a 100×100 box:
//   [tag, attrs, children?]   colours are ROLES resolved per set and state:
//   E1 main (lightest on dark fields), E2 second, E3 accent (honey or clay), K knock-out (= field colour).
// One source renders the master SVGs and ships to react-native-svg as JSON (parts/emblems.json).
// Rules of thumb so they hold at 32pt (emblem ≈ 16px): one bold silhouette, ≤ 3 tones,
// fine detail (≤ 3 units) only as knock-outs that can disappear without changing the read.
import { wobbleRing, pathOf } from './geometry.mjs';

const P = (d, fill, extra = {}) => ['path', { d, fill, ...extra }];
const S = (d, stroke, w, extra = {}) => ['path', { d, fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra }];
const Ci = (cx, cy, r, fill, extra = {}) => ['circle', { cx, cy, r, fill, ...extra }];
const El = (cx, cy, rx, ry, fill, extra = {}) => ['ellipse', { cx, cy, rx, ry, fill, ...extra }];
const R = (x, y, w, h, rx, fill, extra = {}) => ['rect', { x, y, width: w, height: h, rx, fill, ...extra }];
const G = (transform, children, extra = {}) => ['g', { transform, ...extra }, children];
/** A lens leaf, base at (0,0) pointing up; place it with G(`translate(x y) rotate(a)`). */
const leafD = (l, w) => `M0 0C${w * 0.95} ${-l * 0.2} ${w * 0.72} ${-l * 0.8} 0 ${-l}C${-w * 0.72} ${-l * 0.8} ${-w * 0.95} ${-l * 0.2} 0 0Z`;
const leaf = (x, y, l, w, a, fill, extra = {}) => G(`translate(${x} ${y}) rotate(${a})`, [P(leafD(l, w), fill, extra)]);
const pts = (arr) => arr.map((p) => p.join(' ')).join('L');

// ── Trail (round seal) ─────────────────────────────────────────────────
const firstFoothold = () => [
  G('rotate(-14 50 54)', [
    P('M50 10C67 10 73 25 71 41C69.5 54 63 62 57 64.5L43 64.5C36 62 30 54 29.5 41C28.5 25 33 10 50 10Z', 'E1'),
    P('M37 70.5L63 70.5C65 70.5 66 72 65.8 74L64.6 86C63.8 93 58 96.5 50 96.5C42 96.5 36.2 93 35.4 86L34.2 74C34 72 35 70.5 37 70.5Z', 'E1'),
    R(35, 22, 30, 5, 2.5, 'K'), R(33.5, 33.5, 33, 5, 2.5, 'K'), R(34, 45, 32, 5, 2.5, 'K'),
    R(39, 80, 22, 5, 2.5, 'K'),
  ]),
  // the first sprout beside the step
  S('M80 92Q80 84 81 78', 'E2', 3.2),
  leaf(81, 80, 13, 11, 50, 'E3'),
  leaf(80.5, 81, 11, 10, -48, 'E2'),
];

const topicClear = () => [
  // page block (the book's thickness)
  P('M6 31L12 31L12 74Q32 70 50 82Q68 70 88 74L88 31L94 31L94 79Q72 75 50 89Q28 75 6 79Z', 'E2'),
  P('M50 33Q32 21 12 25L12 73Q32 69 50 81Z', 'E1'),
  P('M50 33Q68 21 88 25L88 73Q68 69 50 81Z', 'E1'),
  S('M50 34L50 80', 'K', 2.4, { opacity: 0.5 }),
  S('M20 40Q30 37.5 41 42', 'K', 3, { opacity: 0.4 }),
  S('M20 50Q30 47.5 41 52', 'K', 3, { opacity: 0.4 }),
  S('M20 60Q28 58 36 61', 'K', 3, { opacity: 0.4 }),
  S('M57 52L65.5 60.5L80 41', 'K', 7),
  // ribbon bookmark
  P('M53 78L61 75L61 97L57 93L53 97Z', 'E3'),
];

const tenTopics = () => [
  G('rotate(-2 50 80)', [R(10, 70, 80, 20, 4, 'E1'), R(10, 76, 80, 3, 1.5, 'K', { opacity: 0.35 }), R(19, 70, 4, 20, 0, 'K', { opacity: 0.55 }), R(77, 70, 4, 20, 0, 'K', { opacity: 0.55 })]),
  G('rotate(3 50 60)', [R(17, 51, 68, 19, 4, 'E2'), R(25, 51, 4, 19, 0, 'K', { opacity: 0.5 }), R(73, 51, 4, 19, 0, 'K', { opacity: 0.5 }), R(36, 57.5, 28, 6, 3, 'K', { opacity: 0.35 })]),
  G('rotate(-3 50 40)', [R(22, 32, 58, 19, 4, 'E3'), R(30, 32, 4, 19, 0, 'K', { opacity: 0.45 }), R(68, 32, 4, 19, 0, 'K', { opacity: 0.45 })]),
  // a leaf bookmark slipped in the top book
  leaf(58, 33, 22, 16, 28, 'E2'),
];

const firmFooting = () => {
  const ring = (r) => pathOf(wobbleRing(50, 52, r, 120), 0.08);
  return [
    P(ring(41), 'E2'),
    P(ring(35), 'E1'),
    S(ring(27.5), 'K', 3),
    S(pathOf(wobbleRing(48.5, 53.5, 20, 120), 0.08), 'K', 3),
    S(pathOf(wobbleRing(47.5, 54.5, 12.5, 120), 0.08), 'K', 3),
    Ci(47, 55, 4.4, 'K'),
    // a small seasoning check from the bark, so it reads as wood, not a target
    S('M84 40L74 44', 'K', 2.6),
  ];
};

const wholeMap = () => {
  const point = (rot, L, w, a, b) => G(`rotate(${rot} 50 50)`, [P(`M50 ${50 - L}L${50 - w} ${50 - w}L50 50Z`, a), P(`M50 ${50 - L}L${50 + w} ${50 - w}L50 50Z`, b)]);
  return [
    Ci(50, 50, 33, 'none', { stroke: 'E2', 'stroke-width': 2.6, opacity: 0.6 }),
    point(45, 27, 7, 'E2', 'D2'), point(135, 27, 7, 'E2', 'D2'), point(225, 27, 7, 'E2', 'D2'), point(315, 27, 7, 'E2', 'D2'),
    point(90, 44, 9.5, 'E1', 'E2'), point(180, 44, 9.5, 'E1', 'E2'), point(270, 44, 9.5, 'E1', 'E2'),
    point(0, 46, 9.5, 'E3', 'D3'),
    Ci(50, 50, 6.5, 'K'), Ci(50, 50, 2.8, 'E1'),
  ];
};

/** Rooted grows with its tier: a sprout (10 days), a sapling (30), a tree (60). Roots deepen too. */
const rooted = (tier = 3) => {
  const ground = R(10, 55, 80, 6.5, 3.25, 'E3');
  const roots = {
    1: ['M50 62L50 76', 'M50 62Q44 66 40 73', 'M50 62Q56 66 60 73'],
    2: ['M50 62L50 84', 'M50 62Q42 66 34 76', 'M50 62Q58 66 66 76', 'M44 67Q38 74 38 83', 'M56 67Q62 74 62 83'],
    3: ['M50 62L50 93', 'M50 62Q40 65 28 72', 'M50 62Q60 65 72 72', 'M47 64Q36 74 32 88', 'M53 64Q64 74 68 88', 'M40 70Q30 76 22 80', 'M60 70Q70 76 78 80', 'M50 78L44 88'],
  }[tier];
  const rootEls = roots.map((d, i) => S(d, 'E1', i === 0 ? 4.6 : 3.4));
  if (tier === 1) {
    return [S('M50 57L50 36', 'E1', 4.4), leaf(50, 38, 20, 16, -58, 'E2'), leaf(50, 38, 20, 16, 58, 'E2'), ground, ...rootEls];
  }
  if (tier === 2) {
    return [
      S('M50 57L50 18', 'E1', 4.6),
      leaf(50, 44, 19, 14, -62, 'E2'), leaf(50, 44, 19, 14, 62, 'E2'),
      leaf(50, 31, 17, 13, -56, 'E2'), leaf(50, 31, 17, 13, 56, 'E2'),
      leaf(50, 20, 15, 12, 0, 'E2'),
      ground, ...rootEls,
    ];
  }
  return [
    P('M44 57L46.5 30L53.5 30L56 57Z', 'E1'),
    Ci(36, 27, 14, 'E2'), Ci(64, 27, 14, 'E2'), Ci(50, 18, 15.5, 'E2'), Ci(50, 31, 13, 'E2'),
    Ci(44, 16, 5, 'E1', { opacity: 0.35 }),
    ground, ...rootEls,
  ];
};

// ── Memory (hex) ───────────────────────────────────────────────────────
const loopClosed = () => {
  const marks = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.2;
    if (a > 1.2 && a < 1.95) continue; // leave the knot clear
    const x1 = 50 + 25 * Math.cos(a), y1 = 48 + 25 * Math.sin(a), x2 = 50 + 35 * Math.cos(a + 0.2), y2 = 48 + 35 * Math.sin(a + 0.2);
    marks.push(S(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`, 'K', 2.4));
  }
  return [
    Ci(50, 48, 30, 'none', { stroke: 'E1', 'stroke-width': 11 }),
    ...marks,
    leaf(50, 80, 20, 15, -128, 'E2'), leaf(50, 80, 20, 15, 128, 'E2'),
    Ci(50, 79, 7.5, 'E3'), Ci(50, 79, 3, 'K', { opacity: 0.5 }),
  ];
};

const slipSpotter = () => [
  S('M60 60L83 83', 'E3', 13),
  S('M58.5 58.5L65 65', 'E1', 15, { 'stroke-linecap': 'butt' }),
  Ci(40, 40, 27, 'E2', { opacity: 0.22 }),
  // the web the dew hangs on
  S('M40 15L40 65M18.5 27.5L61.5 52.5M18.5 52.5L61.5 27.5', 'E1', 1.6, { opacity: 0.55 }),
  Ci(40, 40, 12, 'none', { stroke: 'E1', 'stroke-width': 1.6, opacity: 0.55 }),
  P('M40 27C46 35 49 40 49 45A9 9 0 0 1 31 45C31 40 34 35 40 27Z', 'E3'),
  Ci(37, 44, 2.4, 'E1', { opacity: 0.85 }),
  Ci(40, 40, 27, 'none', { stroke: 'E1', 'stroke-width': 9 }),
  S('M24 30A19 19 0 0 1 32 22', 'E1', 3.2, { opacity: 0.8 }),
];

const longMemory = () => [
  // the oak leaf of the tree it came from
  leaf(56, 44, 44, 30, 52, 'E2'),
  S('M57 43L89 23', 'K', 2, { opacity: 0.5 }),
  P('M30 57L70 57C72 75 64 89 50 94C36 89 28 75 30 57Z', 'E3'),
  P('M36 62C34 72 37 81 44 87', 'none', { stroke: 'E1', 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0.45 }),
  P('M24 57C24 41 35 33 50 33C65 33 76 41 76 57C76 60.5 74 62 71 62L29 62C26 62 24 60.5 24 57Z', 'E1'),
  ...[[43, 41], [50, 39.5], [57, 41], [36, 49], [44, 48], [52, 47.5], [60, 48], [67, 49.5], [31, 56], [39, 55.5], [47, 55], [55, 55], [63, 55.5], [70, 56]].map(([x, y]) => Ci(x, y, 2.1, 'K', { opacity: 0.7 })),
  S('M50 34Q50 25 57 20', 'E1', 4.6),
];

const graduate = () => [
  // the feather leaving: fledged out of review
  G('rotate(28 56 32) translate(56 32) scale(1.12) translate(-56 -32)', [
    P('M56 4C66 12 68 30 64 46C62 54 58 60 56 62C54 60 50 54 48 46C44 30 46 12 56 4Z', 'E1'),
    S('M56 10L56 70', 'K', 2.2, { opacity: 0.55 }),
    S('M56 30L64 24M56 42L50 37', 'K', 2.4),
  ]),
  // the nest, empty now
  P('M10 58C10 80 28 93 50 93C72 93 90 80 90 58Z', 'E3'),
  El(50, 58.5, 40, 8, 'D3'),
  El(50, 58, 32, 5, 'K'),
  S('M15 68Q36 78 62 72Q76 69 86 64', 'D3', 3),
  S('M18 78Q44 86 70 80Q78 78 83 74', 'D3', 3),
  S('M14 70Q30 66 44 72M50 84Q64 80 78 84', 'L3', 2.2, { opacity: 0.7 }),
];

const knowWhatYouKnow = () => [
  leaf(50, 55, 52, 44, 0, 'E1'),
  S('M50 53L50 12', 'K', 2.8, { opacity: 0.6 }),
  S('M50 44L38 32M50 44L62 32M50 31L42 22M50 31L58 22', 'K', 2.4, { opacity: 0.6 }),
  R(10, 58, 80, 5, 2.5, 'E2'),
  // its reflection, foreshortened and broken by ripples
  G('translate(50 66) scale(1 -0.72)', [P(leafD(44, 40), 'E2', { opacity: 0.6 })]),
  R(24, 74, 52, 3.2, 1.6, 'K'),
  R(30, 83, 40, 3.2, 1.6, 'K'),
  S('M6 70L16 70M84 70L94 70', 'E2', 2.6, { opacity: 0.6 }),
];

// ── Steady (shield) ────────────────────────────────────────────────────
const dressRehearsal = () => [
  Ci(50, 56, 42, 'E3', { opacity: 0.16 }),
  Ci(50, 11, 6.5, 'none', { stroke: 'E1', 'stroke-width': 4 }),
  P('M33 30Q33 17.5 50 17.5Q67 17.5 67 30Z', 'E1'),
  R(30, 27.5, 40, 7, 3.5, 'E1'),
  // the glass: a hurricane bulb, lit
  P('M36 34C26 46 26 66 35 78L65 78C74 66 74 46 64 34Z', 'E3'),
  S('M44 35C39.5 50 39.5 63 44 77M56 35C60.5 50 60.5 63 56 77', 'K', 2.6, { opacity: 0.5 }),
  P('M50 45C56 53 58 58 58 62A8 8 0 0 1 42 62C42 58 44 53 50 45Z', 'E1'),
  R(29, 76.5, 42, 7.5, 3.5, 'E1'),
  P('M35 83L65 83L61 91L39 91Z', 'E1'),
];

const onPace = () => {
  const ticks = [];
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    ticks.push(S(`M${(50 + 27 * Math.cos(a)).toFixed(1)} ${(68 + 27 * Math.sin(a)).toFixed(1)}L${(50 + 33 * Math.cos(a)).toFixed(1)} ${(68 + 33 * Math.sin(a)).toFixed(1)}`, 'K', k % 4 === 0 ? 3.6 : 2.6));
  }
  return [
    P('M10 68A40 40 0 0 1 90 68Z', 'E1'),
    ...ticks,
    // the shadow lands on the pace mark
    S('M50 68L31 45', 'K', 4.6),
    P('M50 68L50 26L72 68Z', 'E3'),
    P('M50 68L50 26L56 37.5L56 68Z', 'D3'),
    R(12, 69, 76, 9, 3, 'E2'),
    R(26, 78, 48, 9, 2.5, 'E2', { opacity: 0.8 }),
  ];
};

const mindsetShift = () => [
  // the wind has turned: a quiet arc over the vane
  S('M22 16Q50 0 76 13', 'E2', 3.2, { opacity: 0.85 }),
  P('M80 15L71 7.5L72.5 18Z', 'E2', { opacity: 0.85 }),
  R(47.5, 34, 5, 52, 2, 'E1'),
  El(50, 88, 17, 4.5, 'E2'),
  S('M33 62L67 62', 'E2', 3.6), Ci(31, 62, 4, 'E2'), Ci(69, 62, 4, 'E2'),
  S('M20 35L76 35', 'E1', 5),
  P('M92 35L73 23L73 47Z', 'E3'),
  P('M8 24L22 24L29 35L22 46L8 46L15 35Z', 'E1'),
  Ci(50, 35, 6, 'E1'),
];

const freshStart = () => [
  // the way back, a dotted flight line
  S('M10 90C8 64 24 48 46 54', 'E2', 3.6, { 'stroke-dasharray': '0.1 8' }),
  G('translate(60 42) rotate(38) scale(1.25)', [
    P('M0 -22C3.6 -22 5.5 -17 5.5 -11Q20 -10 38 3Q22 1.5 6 6L7 13L12.5 30L2 18.5L-2 18.5L-12.5 30L-7 13L-6 6Q-22 1.5 -38 3Q-20 -10 -5.5 -11C-5.5 -17 -3.6 -22 0 -22Z', 'E1'),
    Ci(0, -14.5, 3.2, 'E3'),
  ]),
];

// ── Field skills (leaf-mark; paper field, forest/clay inks) ────────────
const snareWise = () => [
  P('M16 14L37 32Q50 27 63 32L84 14L80 46Q76 66 50 88Q24 66 20 46Z', 'E3'),
  P('M24 25L35 35L27 43Z', 'E1'), P('M76 25L65 35L73 43Z', 'E1'),
  P('M23 52Q37 55 50 62Q63 55 77 52Q70 70 50 88Q30 70 23 52Z', 'L3'),
  G('rotate(18 39 50)', [El(39, 50, 4.6, 2.6, 'E1')]),
  G('rotate(-18 61 50)', [El(61, 50, 4.6, 2.6, 'E1')]),
  P('M44 78L56 78L50 87Z', 'E1', { 'stroke-linejoin': 'round', stroke: 'E1', 'stroke-width': 2 }),
];

const evenKeel = () => [
  R(12, 88, 76, 4.5, 2.25, 'E2', { opacity: 0.6 }),
  G('rotate(-3 50 76)', [El(50, 76, 33, 11.5, 'E1', { stroke: 'K', 'stroke-width': 2.4 })]),
  G('rotate(4 48 59)', [El(48, 59.5, 25, 9.5, 'E2', { stroke: 'K', 'stroke-width': 2.4 })]),
  G('rotate(-5 52 44)', [El(52, 44.5, 18, 8, 'E1', { stroke: 'K', 'stroke-width': 2.4 })]),
  G('rotate(3 50 31)', [El(50, 32, 11.5, 6.5, 'E2', { stroke: 'K', 'stroke-width': 2.4 })]),
  El(51, 21, 6.5, 4.5, 'E3', { stroke: 'K', 'stroke-width': 2.2 }),
  S('M30 72Q36 68 44 68', 'K', 2.4, { opacity: 0.45 }),
];

const signpostReader = () => [
  R(45.5, 14, 9, 78, 2, 'E1'),
  P('M43.5 15L50 8L56.5 15Z', 'E1'),
  P('M26 20L74 20L86 31L74 42L26 42Z', 'E3', { stroke: 'E3', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
  P('M74 48L26 48L14 59L26 70L74 70Z', 'E2', { stroke: 'E2', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
  S('M33 31L56 31', 'K', 4), S('M62 31L68 31', 'K', 4, { opacity: 0.55 }),
  S('M31 59L42 59', 'K', 4, { opacity: 0.55 }), S('M48 59L66 59', 'K', 4, { opacity: 0.55 }),
  leaf(44, 92, 12, 9, -40, 'E2'), leaf(56, 92, 12, 9, 40, 'E2'),
];

const mythClearer = () => {
  const rays = [-160, -128, -96, -64, -32].map((a) => {
    const r = (a * Math.PI) / 180;
    return S(`M${(50 + 30 * Math.cos(r)).toFixed(1)} ${(60 + 30 * Math.sin(r)).toFixed(1)}L${(50 + 39 * Math.cos(r)).toFixed(1)} ${(60 + 39 * Math.sin(r)).toFixed(1)}`, 'E3', 4.4);
  });
  return [
    ...rays,
    Ci(50, 60, 24, 'E3'),
    R(10, 61, 80, 5, 2.5, 'K'), R(10, 71, 80, 5, 2.5, 'K'),
    // mist still hanging at the edges, thinning
    S('M8 63.5L22 63.5M78 63.5L92 63.5', 'E2', 2.6, { opacity: 0.7 }),
    S('M14 73.5L22 73.5M78 73.5L86 73.5', 'E2', 2.6, { opacity: 0.45 }),
    S('M10 86L90 86', 'E1', 4.6),
  ];
};

const sureFootedPace = () => [
  S('M41 30L37 9M38 17L30 12M39.5 23L33 22', 'E2', 4.2),
  S('M59 30L63 9M62 17L70 12M60.5 23L67 22', 'E2', 4.2),
  leaf(37, 38, 22, 15, -64, 'E1'), leaf(63, 38, 22, 15, 64, 'E1'),
  leaf(36.5, 38, 13, 7, -64, 'E3'), leaf(63.5, 38, 13, 7, 64, 'E3'),
  P('M35 31Q50 24 65 31Q68 47 61 63Q57 81 50 86Q43 81 39 63Q32 47 35 31Z', 'E1'),
  Ci(43.5, 47, 2.9, 'K'), Ci(56.5, 47, 2.9, 'K'),
  El(50, 72, 7.5, 6, 'K'), El(50, 69.5, 4.6, 3.2, 'E1'),
];

const wholeGrove = () => [
  R(8, 84, 84, 5, 2.5, 'E3'),
  R(22.5, 62, 5, 23, 1.5, 'E1'), Ci(25, 54, 14, 'E2'), Ci(21, 50, 4.5, 'K', { opacity: 0.3 }),
  R(72.5, 64, 5, 21, 1.5, 'E1'), Ci(75, 57, 12.5, 'E2'), Ci(71.5, 53.5, 4, 'K', { opacity: 0.3 }),
  P(`M${pts([[50, 10], [65, 36], [58, 36], [71, 58], [56, 58], [56, 85], [44, 85], [44, 58], [29, 58], [42, 36], [35, 36]])}Z`, 'E1', { stroke: 'K', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }),
];

const backOnPath = () => [
  S('M8 34L92 34', 'E2', 2.6, { opacity: 0.6 }),
  // the path runs away from you to the horizon: wide, then narrow
  P('M10 95C26 76 60 64 46.5 35L53.5 35C70 62 58 78 90 95Z', 'E3'),
  El(46, 86, 9, 3.6, 'K'), El(56.5, 70, 6.6, 2.7, 'K'), El(55, 56, 4.6, 2, 'K'), El(52, 45, 3, 1.4, 'K'),
  // a waymark post with its blaze: the way is marked
  R(77, 40, 6, 38, 2, 'E1'), R(73.5, 39, 13, 14, 2.5, 'E1'), R(76.5, 42, 7, 8, 1.5, 'E3', { stroke: 'K', 'stroke-width': 1.2 }),
  leaf(18, 70, 17, 12, -24, 'E2'), leaf(19, 70, 13, 10, 36, 'E2'),
];

export const EMBLEMS = {
  'first-foothold': firstFoothold,
  'topic-clear': topicClear,
  'ten-topics': tenTopics,
  'firm-footing': firmFooting,
  'whole-map': wholeMap,
  rooted,
  'loop-closed': loopClosed,
  'slip-spotter': slipSpotter,
  'long-memory': longMemory,
  graduate,
  'know-what-you-know': knowWhatYouKnow,
  'dress-rehearsal': dressRehearsal,
  'on-pace': onPace,
  'mindset-shift': mindsetShift,
  'fresh-start': freshStart,
  'snare-wise': snareWise,
  'even-keel': evenKeel,
  'signpost-reader': signpostReader,
  'myth-clearer': mythClearer,
  'sure-footed-pace': sureFootedPace,
  'whole-grove': wholeGrove,
  'back-on-path': backOnPath,
};

/** Serialise descriptors to SVG with a role → colour map. */
export function toSVG(els, pal) {
  const col = (v) => (typeof v === 'string' && pal[v] !== undefined ? pal[v] : v);
  const one = ([tag, attrs, kids]) => {
    const a = Object.entries(attrs)
      .map(([k, v]) => `${k}="${['fill', 'stroke'].includes(k) ? col(v) : v}"`)
      .join(' ');
    return kids ? `<${tag} ${a}>${kids.map(one).join('')}</${tag}>` : `<${tag} ${a}/>`;
  };
  return els.map(one).join('');
}
