/**
 * The Aurivan brand: the "True North" mark, the lockup (mark + wordmark) and
 * the four pillar glyphs. See docs/mobile/DESIGN_SYSTEM.md, "Brand".
 *
 * True North = a compass needle rising from an open book, under one
 * growth-ring arc, with a honey north tip. "Your direction comes from the study."
 *
 * Plain-English notes for whoever edits this next:
 * - Every path here is copied from the master SVGs (Fraunces 600 wordmark,
 *   already outlined into paths), so no font has to load to draw the logo.
 * - The small gaps between needle, ring and book are SVG masks: white in a
 *   mask = "keep", black = "cut away". That keeps the gaps see-through on any
 *   background (paper, forest, a photo) instead of painting a fake gap colour.
 * - Mask ids must be unique on the page (web draws every SVG into one DOM),
 *   so each instance gets its own id from React's useId().
 * - Colours come from theme/tokens.ts (`brand`, `pillarGlyph`); no hex here.
 */
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { PILLARS, type PillarGlyphKind } from '../content/brand';
import { brand, pillarGlyph, space, type BrandTone } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Card, IconCircle, Row, T } from './ui';

// ── Mark geometry (a 200-unit grid; see the master SVGs) ───────────────
const BOOK_L = 'M100 136 C78 118 50 114 20 121 L20 155 C50 148 78 152 100 170 Z';
const BOOK_R = 'M100 136 C122 118 150 114 180 121 L180 155 C150 148 122 152 100 170 Z';
const NEEDLE = 'M100 16 L76 84 L100 118 L124 84 Z';
const NEEDLE_W = 'M100 16 L76 84 L100 118 Z'; // west half: the honey tip
const NEEDLE_E = 'M100 16 L124 84 L100 118 Z';
const RING = 'M30 112 A72 72 0 0 1 170 112';
const BOOK_TOP = 'M100 136 C78 118 50 114 20 121 V160 H180 V121 C150 114 122 118 100 136Z';
/** Centres the mark optically in its 200-unit box (from the master files). */
const MARK_FIT = 'translate(100 100) scale(0.9277278918313615) translate(-100 -90.09419546117995)';

/** A safe SVG id from useId() (React's ids contain characters url(#…) dislikes). */
function useSvgId(): string {
  return 'tn' + useId().replace(/[^a-zA-Z0-9]/g, '');
}

/** The mark itself, drawn in the 200-unit grid. Put it inside an <Svg>. */
function MarkPaths({ tone, id }: { tone: BrandTone; id: string }) {
  // Each mask: a white square (keep everything), then black shapes (cut).
  const keep = <Rect x={-60} y={-60} width={320} height={320} fill="white" />;
  return (
    <G transform={MARK_FIT}>
      <Defs>
        {/* Cut a 6-unit gap around the book, so the needle floats above it. */}
        <Mask id={`${id}b`} maskUnits="userSpaceOnUse" x={-60} y={-60} width={320} height={320}>
          {keep}
          <Path d={`${BOOK_L} ${BOOK_R}`} fill="black" stroke="black" strokeWidth={12} strokeLinejoin="round" />
        </Mask>
        {/* Cut the book's spine: two pages. */}
        <Mask id={`${id}s`} maskUnits="userSpaceOnUse" x={-60} y={-60} width={320} height={320}>
          {keep}
          <Path d="M100 128 V180" stroke="black" strokeWidth={5} />
        </Mask>
        {/* Cut the ring where the needle and book cross it. */}
        <Mask id={`${id}n`} maskUnits="userSpaceOnUse" x={-60} y={-60} width={320} height={320}>
          {keep}
          <Path d={NEEDLE} fill="black" stroke="black" strokeWidth={12} strokeLinejoin="round" />
          <Path d={BOOK_TOP} fill="black" stroke="black" strokeWidth={12} />
        </Mask>
      </Defs>
      <Path d={RING} fill="none" stroke={tone.ring} strokeWidth={7} strokeLinecap="round" mask={`url(#${id}n)`} />
      <G mask={`url(#${id}s)`}>
        <Path d={BOOK_L} fill={tone.ring} />
        <Path d={BOOK_R} fill={tone.ring} />
      </G>
      <G mask={`url(#${id}b)`}>
        <Path d={NEEDLE_W} fill={tone.honey} />
        <Path d={NEEDLE_E} fill={tone.needle} />
      </G>
    </G>
  );
}

type Tone = 'light' | 'dark';

/**
 * The True North mark on its own (no background).
 * `tone="light"` sits on paper; `tone="dark"` on forest or the dark theme.
 */
export function BrandMark({ size = 48, tone = 'light' }: { size?: number; tone?: Tone }) {
  const id = useSvgId();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Aurivan" style={{ width: size, height: size }}>
      {/* The viewBox crops the 200 grid to the mark's own square. */}
      <Svg width={size} height={size} viewBox="24 24 152 152">
        <MarkPaths tone={brand[tone]} id={id} />
      </Svg>
    </View>
  );
}

// ── Lockup: mark + "aurivan" wordmark (Fraunces 600, outlined) ─────────
/** The lockup's own box (from lockup_*.svg): 503 × 140 units. */
const LOCKUP_W = 503;
const LOCKUP_H = 140;
/** Width ÷ height, so callers can size a fixed box (e.g. the share card). */
export const LOCKUP_RATIO = LOCKUP_W / LOCKUP_H;

/**
 * Mark + wordmark, side by side.
 * - `tone="light"`: on paper. `tone="dark"`: on forest (welcome panel, share card).
 * - `height` in points; the width follows (≈ 3.6 × height).
 * - Read as one image called "Aurivan"; pass `decorative` when a parent
 *   already speaks the name (it is then hidden from screen readers).
 */
export function BrandLockup({ tone = 'light', height = 32, decorative = false }: { tone?: Tone; height?: number; decorative?: boolean }) {
  const id = useSvgId();
  const t = brand[tone];
  const width = height * LOCKUP_RATIO;
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : 'Aurivan'}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={{ width, height }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${LOCKUP_W} ${LOCKUP_H}`}>
        <G transform="scale(0.7)">
          <MarkPaths tone={t} id={id} />
        </G>
        <G transform="translate(162 98) scale(0.046)">
          <G fill={t.word}>
            {WORDMARK.map(([x, d]) => (
              <Path key={x} transform={`translate(${x} 0)`} d={d} />
            ))}
          </G>
          {/* The leaf over the i: the "dot" of the wordmark. */}
          <Path fill={t.leaf} d={WORDMARK_LEAF} />
        </G>
      </Svg>
    </View>
  );
}

// ── Pillar glyphs (welcome + Settings → About), 24-unit grid ───────────
/**
 * One small drawing per brand pillar: See the path (compass leaf), Grow deep
 * roots, Grow with the seasons (two turning arcs), Stand tall (a tree).
 * Decorative: the pillar's title next to it says the same thing.
 */
export function PillarGlyph({ kind, size = 24, isDark }: { kind: PillarGlyphKind; size?: number; isDark: boolean }) {
  const { c } = useTheme();
  const stroke = c.accentText; // same green as row icons and links, so the two can't drift
  const { fill } = isDark ? pillarGlyph.dark : pillarGlyph.light;
  const line = { fill: 'none', stroke, strokeWidth: 1.75, strokeLinecap: 'round' } as const;
  const leaf = { fill, stroke, strokeWidth: 1.5, strokeLinejoin: 'round' } as const;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {kind === 'path' && (
          <>
            <Circle cx={12} cy={12} r={8.75} fill="none" stroke={stroke} strokeWidth={1.75} />
            <Path d="M15.6 8.4 C14.6 11.6 12.9 13.2 9.4 15.6 C10.1 12.2 11.9 10 15.6 8.4Z" {...leaf} />
          </>
        )}
        {kind === 'roots' && (
          <>
            <Path d="M12 14.5 V7.5" {...line} />
            <Path d="M12 9.8 C12.3 6.6 14.4 4.8 17.8 4.6 C17.6 7.9 15.6 9.7 12 9.8Z" {...leaf} />
            <Path d="M12 11.6 C11.6 8.9 9.8 7.5 6.6 7.4 C6.8 10.2 8.6 11.6 12 11.6Z" {...leaf} />
            <Path d="M7.5 14.5 H16.5 M12 14.5 V20.5 M12 17.2 L9.4 19.6 M12 17.2 L14.6 19.6" {...line} />
          </>
        )}
        {kind === 'seasons' && (
          <>
            <Path d="M4.8 13.6 A7.4 7.4 0 0 1 16.6 6.6 M19.2 10.4 A7.4 7.4 0 0 1 7.4 17.4" {...line} />
            <Path d="M16.6,6.6 C15.74,9.51 18.24,10.89 20.86,10.23 C21.1,7.54 19.34,5.29 16.6,6.6Z" {...leaf} strokeWidth={1.4} />
            <Path d="M7.4,17.4 C8.26,14.49 5.76,13.11 3.14,13.77 C2.9,16.46 4.66,18.71 7.4,17.4Z" {...leaf} strokeWidth={1.4} />
          </>
        )}
        {kind === 'tall' && (
          <>
            <Path d="M12 21 V12.5" {...line} />
            <Path
              d="M12 3 C15.6 6.2 17.6 9.6 17.6 12.2 C17.6 14.6 15.4 16 12 16 C8.6 16 6.4 14.6 6.4 12.2 C6.4 9.6 8.4 6.2 12 3Z"
              {...leaf}
              strokeWidth={1.75}
            />
            <Path d="M12 12.5 L14.6 10.4 M12 14.6 L9.6 12.6" {...line} strokeWidth={1.5} />
            <Path d="M8.5 21 H15.5" {...line} />
          </>
        )}
      </Svg>
    </View>
  );
}

// ── The four pillars as a list ─────────────────────────────────────────
/**
 * The brand pillars, each with its glyph in a soft circle.
 * - `cards` (welcome screen): each pillar is a raised card.
 * - `rows` (Settings → About): plain rows, matching the hairline sections there.
 * Each pillar is read as one sentence ("See the path. Know what to study next…").
 */
export function PillarList({ look = 'cards' }: { look?: 'cards' | 'rows' }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ gap: look === 'cards' ? 10 : space.md }}>
      {PILLARS.map((p) => {
        const inner = (
          <Row gap={14} style={{ alignItems: 'flex-start' }}>
            <IconCircle>
              <PillarGlyph kind={p.glyph} isDark={isDark} />
            </IconCircle>
            <View style={{ flex: 1 }}>
              <T v="label">{p.title}</T>
              <T v="meta" color={c.ink2} style={{ marginTop: 2 }}>{p.body}</T>
            </View>
          </Row>
        );
        return (
          <View key={p.glyph} accessible accessibilityRole="text" accessibilityLabel={`${p.title}. ${p.body}`}>
            {look === 'cards' ? <Card style={{ paddingVertical: 14 }}>{inner}</Card> : inner}
          </View>
        );
      })}
    </View>
  );
}

// ── Wordmark outlines: "aurivan" in Fraunces 600 (font units, 1000/em) ──
// [x offset, path]. Generated from brand2/wordmark_light.svg; do not hand-edit.
const WORDMARK: readonly (readonly [number, string])[] = [
  [0, 'M685 -127V-148L666 -152V-749Q666 -819 630.5 -857.5Q595 -896 530 -896Q471 -896 439.0 -871.0Q407 -846 407 -809V-721Q407 -661 367.0 -628.5Q327 -596 254 -596Q192 -596 160.0 -625.5Q128 -655 128 -706Q128 -769 180.0 -829.5Q232 -890 333.0 -929.5Q434 -969 582 -969Q766 -969 855.5 -894.5Q945 -820 945 -693V-173Q945 -145 956.5 -131.0Q968 -117 989 -117Q1011 -117 1022.0 -127.5Q1033 -138 1041 -149Q1046 -156 1052.0 -160.5Q1058 -165 1067 -165Q1079 -165 1085.0 -156.0Q1091 -147 1091 -132Q1091 -98 1067.5 -62.0Q1044 -26 997.5 -0.5Q951 25 881 25Q792 25 738.5 -15.5Q685 -56 685 -127ZM86 -209Q86 -334 197.5 -411.0Q309 -488 509 -488Q574 -488 626.5 -477.0Q679 -466 717 -447L695 -383Q661 -399 625.5 -408.0Q590 -417 549 -417Q466 -417 419.5 -374.5Q373 -332 373 -257Q373 -182 412.5 -142.0Q452 -102 515 -102Q569 -102 618.5 -126.5Q668 -151 702 -195L724 -138Q669 -60 576.5 -17.5Q484 25 380 25Q249 25 167.5 -40.0Q86 -105 86 -209Z'],
  [1097, 'M804 -144V-193L795 -197V-733Q795 -758 787.5 -769.5Q780 -781 763 -784L710 -788Q692 -792 684.0 -801.0Q676 -810 676 -824Q676 -840 685.5 -850.5Q695 -861 722 -870L908 -938Q946 -952 969.5 -958.5Q993 -965 1013 -965Q1044 -965 1060.5 -947.5Q1077 -930 1077 -901V-160Q1077 -129 1085.5 -114.5Q1094 -100 1112 -94L1150 -84Q1169 -78 1178.0 -67.5Q1187 -57 1187 -41Q1187 -22 1174.0 -11.0Q1161 0 1132 0H931Q877 0 840.5 -40.5Q804 -81 804 -144ZM165 -278V-733Q165 -758 157.0 -769.5Q149 -781 132 -784L79 -788Q61 -792 53.0 -801.0Q45 -810 45 -824Q45 -840 55.0 -850.5Q65 -861 91 -870L278 -938Q317 -953 340.0 -959.0Q363 -965 380 -965Q413 -965 429.5 -947.5Q446 -930 446 -901V-319Q446 -231 488.0 -187.5Q530 -144 602 -144Q646 -144 696.0 -165.5Q746 -187 799 -232L839 -267L885 -220L846 -185Q720 -69 626.0 -22.0Q532 25 449 25Q321 25 243.0 -57.5Q165 -140 165 -278Z'],
  [2330, 'M436 -530Q436 -675 477.0 -773.0Q518 -871 585.0 -920.5Q652 -970 729 -970Q824 -970 876.0 -916.0Q928 -862 928 -761Q928 -671 891.0 -627.0Q854 -583 795 -583Q735 -583 704.0 -615.0Q673 -647 673 -704V-740Q672 -772 658.0 -787.5Q644 -803 612 -803Q577 -803 544.5 -774.0Q512 -745 491.5 -686.0Q471 -627 471 -535ZM455 -901 471 -674V-161Q471 -132 482.5 -118.5Q494 -105 524 -100L610 -87Q633 -83 644.5 -72.0Q656 -61 656 -42Q656 -22 641.5 -11.0Q627 0 600 0H133Q105 0 92.0 -11.0Q79 -22 79 -41Q79 -56 88.0 -66.5Q97 -77 116 -84L155 -94Q173 -100 181.5 -114.5Q190 -129 190 -160V-731Q190 -757 182.5 -768.0Q175 -779 158 -782L105 -786Q87 -790 79.0 -799.0Q71 -808 71 -822Q71 -839 81.0 -849.0Q91 -859 117 -869L299 -935Q348 -954 371.0 -959.5Q394 -965 407 -965Q429 -965 440.0 -950.5Q451 -936 455 -901Z'],
  [3263, 'M468 -916V-160Q468 -130 477.5 -115.5Q487 -101 504 -94L541 -84Q558 -78 567.5 -67.5Q577 -57 577 -41Q577 -22 563.0 -11.0Q549 0 524 0H133Q109 0 95.0 -11.0Q81 -22 81 -41Q81 -56 90.0 -66.5Q99 -77 116 -84L155 -94Q172 -102 181.0 -115.5Q190 -129 190 -160V-737Q190 -763 182.0 -773.5Q174 -784 158 -788L105 -791Q88 -796 79.5 -804.5Q71 -813 71 -827Q71 -843 82.0 -853.5Q93 -864 117 -873L328 -944Q361 -955 380.5 -959.5Q400 -964 420 -964Q442 -964 455.0 -951.0Q468 -938 468 -916Z'],
  [3874, 'M610 8H508Q477 8 455.5 -8.0Q434 -24 420 -57L126 -786Q110 -824 99.5 -837.0Q89 -850 74 -854L42 -863Q23 -869 15.0 -879.0Q7 -889 7 -905Q7 -925 21.5 -936.0Q36 -947 60 -947H508Q561 -947 561 -905Q561 -889 552.0 -879.0Q543 -869 520 -864L483 -857Q437 -847 428.0 -823.0Q419 -799 442 -739L677 -133L614 -98L857 -739Q880 -799 870.5 -823.0Q861 -847 816 -857L778 -864Q757 -869 747.5 -879.0Q738 -889 738 -905Q738 -925 752.0 -936.0Q766 -947 790 -947H1062Q1087 -947 1101.0 -936.0Q1115 -925 1115 -905Q1115 -891 1107.0 -880.5Q1099 -870 1077 -864L1046 -857Q1027 -852 1011.5 -828.0Q996 -804 973 -746L697 -51Q684 -16 661.0 -4.0Q638 8 610 8Z'],
  [4950, 'M685 -127V-148L666 -152V-749Q666 -819 630.5 -857.5Q595 -896 530 -896Q471 -896 439.0 -871.0Q407 -846 407 -809V-721Q407 -661 367.0 -628.5Q327 -596 254 -596Q192 -596 160.0 -625.5Q128 -655 128 -706Q128 -769 180.0 -829.5Q232 -890 333.0 -929.5Q434 -969 582 -969Q766 -969 855.5 -894.5Q945 -820 945 -693V-173Q945 -145 956.5 -131.0Q968 -117 989 -117Q1011 -117 1022.0 -127.5Q1033 -138 1041 -149Q1046 -156 1052.0 -160.5Q1058 -165 1067 -165Q1079 -165 1085.0 -156.0Q1091 -147 1091 -132Q1091 -98 1067.5 -62.0Q1044 -26 997.5 -0.5Q951 25 881 25Q792 25 738.5 -15.5Q685 -56 685 -127ZM86 -209Q86 -334 197.5 -411.0Q309 -488 509 -488Q574 -488 626.5 -477.0Q679 -466 717 -447L695 -383Q661 -399 625.5 -408.0Q590 -417 549 -417Q466 -417 419.5 -374.5Q373 -332 373 -257Q373 -182 412.5 -142.0Q452 -102 515 -102Q569 -102 618.5 -126.5Q668 -151 702 -195L724 -138Q669 -60 576.5 -17.5Q484 25 380 25Q249 25 167.5 -40.0Q86 -105 86 -209Z'],
  [6047, 'M471 -902V-160Q471 -129 480.0 -115.0Q489 -101 507 -94L543 -84Q575 -71 575 -44Q575 0 519 0H133Q105 0 92.0 -11.0Q79 -22 79 -41Q79 -56 87.5 -66.5Q96 -77 115 -84L155 -94Q173 -101 181.5 -115.0Q190 -129 190 -160V-733Q190 -759 182.5 -770.0Q175 -781 158 -784L105 -788Q87 -792 79.0 -801.0Q71 -810 71 -824Q71 -841 80.5 -851.0Q90 -861 117 -871L303 -939Q341 -953 364.0 -959.0Q387 -965 408 -965Q439 -965 455.0 -947.5Q471 -930 471 -902ZM441 -679 395 -726 434 -761Q560 -874 650.0 -922.0Q740 -970 821 -970Q944 -970 1012.0 -887.5Q1080 -805 1095 -668L1151 -163Q1154 -130 1162.0 -115.0Q1170 -100 1189 -94L1224 -84Q1243 -77 1252.0 -66.5Q1261 -56 1261 -41Q1261 -22 1248.0 -11.0Q1235 0 1206 0H816Q761 0 761 -44Q761 -71 792 -84L830 -94Q849 -101 859.5 -116.0Q870 -131 866 -163L814 -627Q804 -714 769.5 -758.0Q735 -802 668 -802Q626 -802 579.5 -780.0Q533 -758 481 -714Z'],
];
const WORDMARK_LEAF = 'M3444.4,-1089.26 C3618.64,-1089.56 3729.17,-1294.13 3712.6,-1464.74 C3545.84,-1425.08 3388.17,-1254.17 3444.4,-1089.26Z';
