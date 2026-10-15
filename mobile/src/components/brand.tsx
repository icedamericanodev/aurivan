/**
 * The KaiSip brand: the "Kasama" mark, the lockup (mark + wordmark) and the
 * four pillar glyphs. See docs/mobile/DESIGN_SYSTEM.md, "Brand". The owner's
 * masters live in design-notes/brand-kaisip/.
 *
 * Kasama = a K built from three leaves: the upright leaf is you, the pair
 * growing toward it is your companion (kasama).
 *
 * Plain-English notes for whoever edits this next:
 * - Every path here is copied from the master SVGs (Fraunces 600 wordmark,
 *   already outlined into paths), so no font has to load to draw the logo.
 * - The vein in the upright leaf is an SVG mask: white in a mask = "keep",
 *   black = "cut away". That keeps it see-through on any background (paper,
 *   forest, a photo) instead of painting a fake colour.
 * - Mask ids must be unique on the page (web draws every SVG into one DOM),
 *   so each instance gets its own id from React's useId().
 * - Colours come from theme/tokens.ts (`kaisip`, `pillarGlyph`); no hex here.
 */
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { PILLARS, type PillarGlyphKind } from '../content/brand';
import { kaisip, pillarGlyph, space, type KaisipTone } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Card, IconCircle, Row, T } from './ui';

/** A safe SVG id from useId() (React's ids contain characters url(#…) dislikes). */
function useSvgId(): string {
  return 'kg' + useId().replace(/[^a-zA-Z0-9]/g, '');
}

// ── KaiSip "Kasama" mark and lockup (design-notes/brand-kaisip/) ───────
/**
 * The KaiSip mark: a K built from three leaves. The upright leaf (with its
 * vein) is you; the pair growing toward it is your kasama (companion).
 * Paths are copied from the master SVGs (icon.svg, lockup_*.svg; the
 * wordmark is Fraunces 600 already outlined), so no font has to load.
 * Colours come from `kaisip` in theme/tokens.ts and follow the theme.
 * The vein is an SVG mask (black = cut away), so it is see-through on any
 * background; its id is unique per instance (the web draws every SVG into
 * one DOM).
 */
const KAI_LEAF = 'M72 168 C90 129.92 90 78.24 72 32 C54 78.24 54 129.92 72 168Z';
const KAI_PAIR_UP = 'M94 100 C120.2 93.85 140.92 69.43 150 34 C113.47 46.14 92.75 70.56 94 100Z';
const KAI_PAIR_DOWN = 'M94 100 C93.48 129.7 114.94 154.12 152 166 C141.98 130.36 120.52 105.94 94 100Z';
const KAI_VEIN = 'M72 146 V66';
/** The dot of the i: the wordmark's own small leaf (accent / sap). */
const KAI_WORD_LEAF = 'M2434.38 -1156.95 C2687.94 -1066.66 2872.54 -1185.23 2895.88 -1453.38 C2600.11 -1609.38 2415.51 -1490.81 2434.38 -1156.95Z';
/** "kaisip" in Fraunces 600, outlined (font units, 1000 per em, y up is negative). */
const KAI_WORD = 'M130 0Q101 0 90.0 -11.0Q79 -22 79 -41Q79 -56 87.5 -66.5Q96 -77 116 -84L155 -94Q173 -101 181.5 -115.0Q190 -129 190 -160V-1255Q190 -1280 182.5 -1291.0Q175 -1302 158 -1305L105 -1309Q87 -1314 79.0 -1323.0Q71 -1332 71 -1346Q71 -1362 80.5 -1372.0Q90 -1382 117 -1392L303 -1460Q341 -1474 364.0 -1480.5Q387 -1487 408 -1487Q439 -1487 455.0 -1469.5Q471 -1452 471 -1423V-160Q471 -129 480.0 -115.0Q489 -101 507 -94L543 -84Q575 -71 575 -44Q575 0 519 0ZM387 -434 797 -768Q832 -796 828.5 -820.5Q825 -845 786 -857L751 -866Q732 -872 725.0 -881.0Q718 -890 718 -905Q718 -925 732.0 -936.0Q746 -947 771 -947H1121Q1145 -947 1159.5 -936.0Q1174 -925 1174 -907Q1174 -888 1162.0 -876.0Q1150 -864 1112 -855Q1061 -844 1021.5 -822.0Q982 -800 922 -752L418 -349ZM734 -673 1090 -159Q1114 -126 1132.0 -112.5Q1150 -99 1183 -88Q1204 -78 1214.5 -66.0Q1225 -54 1225 -39Q1225 -21 1210.5 -10.5Q1196 0 1172 0H764Q742 0 729.0 -11.0Q716 -22 716 -41Q716 -54 723.0 -63.0Q730 -72 746 -78L778 -87Q806 -95 808.0 -111.5Q810 -128 782 -167L546 -508Z M1905 -127V-148L1886 -152V-749Q1886 -819 1850.5 -857.5Q1815 -896 1750 -896Q1691 -896 1659.0 -871.0Q1627 -846 1627 -809V-721Q1627 -661 1587.0 -628.5Q1547 -596 1474 -596Q1412 -596 1380.0 -625.5Q1348 -655 1348 -706Q1348 -769 1400.0 -829.5Q1452 -890 1553.0 -929.5Q1654 -969 1802 -969Q1986 -969 2075.5 -894.5Q2165 -820 2165 -693V-173Q2165 -145 2176.5 -131.0Q2188 -117 2209 -117Q2231 -117 2242.0 -127.5Q2253 -138 2261 -149Q2266 -156 2272.0 -160.5Q2278 -165 2287 -165Q2299 -165 2305.0 -156.0Q2311 -147 2311 -132Q2311 -98 2287.5 -62.0Q2264 -26 2217.5 -0.5Q2171 25 2101 25Q2012 25 1958.5 -15.5Q1905 -56 1905 -127ZM1306 -209Q1306 -334 1417.5 -411.0Q1529 -488 1729 -488Q1794 -488 1846.5 -477.0Q1899 -466 1937 -447L1915 -383Q1881 -399 1845.5 -408.0Q1810 -417 1769 -417Q1686 -417 1639.5 -374.5Q1593 -332 1593 -257Q1593 -182 1632.5 -142.0Q1672 -102 1735 -102Q1789 -102 1838.5 -126.5Q1888 -151 1922 -195L1944 -138Q1889 -60 1796.5 -17.5Q1704 25 1600 25Q1469 25 1387.5 -40.0Q1306 -105 1306 -209Z M2797.0 -916V-160Q2797.0 -130 2806.5 -115.5Q2816.0 -101 2833.0 -94L2870.0 -84Q2887.0 -78 2896.5 -67.5Q2906.0 -57 2906.0 -41Q2906.0 -22 2892.0 -11.0Q2878.0 0 2853.0 0H2462.0Q2438.0 0 2424.0 -11.0Q2410.0 -22 2410.0 -41Q2410.0 -56 2419.0 -66.5Q2428.0 -77 2445.0 -84L2484.0 -94Q2501.0 -102 2510.0 -115.5Q2519.0 -129 2519.0 -160V-737Q2519.0 -763 2511.0 -773.5Q2503.0 -784 2487.0 -788L2434.0 -791Q2417.0 -796 2408.5 -804.5Q2400.0 -813 2400.0 -827Q2400.0 -843 2411.0 -853.5Q2422.0 -864 2446.0 -873L2657.0 -944Q2690.0 -955 2709.5 -959.5Q2729.0 -964 2749.0 -964Q2771.0 -964 2784.0 -951.0Q2797.0 -938 2797.0 -916Z M3460.0 -66Q3529.0 -66 3566.5 -100.5Q3604.0 -135 3604.0 -187Q3604.0 -220 3589.5 -247.0Q3575.0 -274 3533.5 -296.0Q3492.0 -318 3413.0 -337Q3259.0 -368 3174.5 -416.0Q3090.0 -464 3057.5 -527.5Q3025.0 -591 3025.0 -667Q3025.0 -806 3123.5 -888.0Q3222.0 -970 3408.0 -970Q3475.0 -970 3517.5 -959.0Q3560.0 -948 3587.0 -936.5Q3614.0 -925 3635.0 -925Q3657.0 -925 3668.5 -936.5Q3680.0 -948 3691.5 -959.0Q3703.0 -970 3724.0 -970Q3739.0 -970 3751.0 -960.5Q3763.0 -951 3771.0 -924L3837.0 -723Q3849.0 -688 3844.5 -666.0Q3840.0 -644 3817.0 -635Q3794.0 -626 3777.5 -634.5Q3761.0 -643 3745.0 -666Q3701.0 -745 3649.5 -791.5Q3598.0 -838 3541.5 -858.5Q3485.0 -879 3424.0 -879Q3339.0 -879 3296.0 -844.5Q3253.0 -810 3253.0 -751Q3253.0 -716 3271.0 -688.0Q3289.0 -660 3338.5 -636.5Q3388.0 -613 3480.0 -591Q3611.0 -563 3687.0 -518.5Q3763.0 -474 3796.5 -411.5Q3830.0 -349 3830.0 -265Q3830.0 -179 3785.5 -113.5Q3741.0 -48 3661.5 -11.5Q3582.0 25 3478.0 25Q3412.0 25 3372.5 12.0Q3333.0 -1 3307.5 -13.5Q3282.0 -26 3258.0 -26Q3236.0 -26 3221.5 -13.5Q3207.0 -1 3194.0 12.0Q3181.0 25 3162.0 25Q3147.0 25 3136.5 14.0Q3126.0 3 3121.0 -23L3082.0 -214Q3075.0 -254 3079.5 -273.5Q3084.0 -293 3105.0 -301Q3127.0 -310 3144.0 -299.5Q3161.0 -289 3178.0 -261Q3240.0 -156 3312.5 -111.0Q3385.0 -66 3460.0 -66Z M4387.0 -902V-160Q4387.0 -129 4395.5 -114.5Q4404.0 -100 4422.0 -94L4460.0 -84Q4479.0 -78 4488.0 -67.5Q4497.0 -57 4497.0 -41Q4497.0 -22 4484.0 -11.0Q4471.0 0 4442.0 0H4048.0Q4020.0 0 4007.0 -11.0Q3994.0 -22 3994.0 -41Q3994.0 -56 4003.0 -66.5Q4012.0 -77 4031.0 -84L4070.0 -94Q4088.0 -101 4096.5 -115.0Q4105.0 -129 4105.0 -160V-733Q4105.0 -759 4097.5 -770.0Q4090.0 -781 4073.0 -784L4020.0 -788Q4002.0 -792 3994.0 -801.0Q3986.0 -810 3986.0 -824Q3986.0 -841 3995.5 -851.0Q4005.0 -861 4032.0 -871L4218.0 -939Q4257.0 -953 4280.5 -959.0Q4304.0 -965 4320.0 -965Q4354.0 -965 4370.5 -947.5Q4387.0 -930 4387.0 -902ZM4224.0 -1118Q4144.0 -1118 4095.5 -1159.5Q4047.0 -1201 4047.0 -1268Q4047.0 -1335 4095.5 -1375.5Q4144.0 -1416 4224.0 -1416Q4305.0 -1416 4353.5 -1375.5Q4402.0 -1335 4402.0 -1268Q4402.0 -1201 4353.5 -1159.5Q4305.0 -1118 4224.0 -1118Z M4985.0 -902V-790L4997.0 -766V306Q4997.0 337 5005.5 351.5Q5014.0 366 5032.0 371L5085.0 382Q5105.0 388 5114.0 398.5Q5123.0 409 5123.0 425Q5123.0 444 5109.5 455.0Q5096.0 466 5067.0 466H4658.0Q4630.0 466 4617.0 455.0Q4604.0 444 4604.0 425Q4604.0 410 4613.0 399.5Q4622.0 389 4641.0 382L4680.0 372Q4698.0 366 4706.5 351.5Q4715.0 337 4715.0 306V-734Q4715.0 -759 4707.5 -770.0Q4700.0 -781 4683.0 -784L4630.0 -788Q4612.0 -792 4604.0 -801.0Q4596.0 -810 4596.0 -824Q4596.0 -841 4605.5 -850.0Q4615.0 -859 4642.0 -870L4817.0 -939Q4853.0 -954 4876.5 -959.5Q4900.0 -965 4918.0 -965Q4952.0 -965 4968.5 -947.5Q4985.0 -930 4985.0 -902ZM4939.0 -651 4895.0 -708Q4974.0 -832 5077.0 -901.0Q5180.0 -970 5306.0 -970Q5424.0 -970 5517.0 -910.0Q5610.0 -850 5663.5 -743.5Q5717.0 -637 5717.0 -498Q5717.0 -339 5653.5 -221.5Q5590.0 -104 5481.0 -39.5Q5372.0 25 5237.0 25Q5118.0 25 5026.0 -31.0Q4934.0 -87 4874.0 -193L4943.0 -251Q4992.0 -169 5053.5 -129.0Q5115.0 -89 5186.0 -89Q5255.0 -89 5308.5 -129.0Q5362.0 -169 5393.0 -253.5Q5424.0 -338 5424.0 -468Q5424.0 -590 5394.0 -670.0Q5364.0 -750 5311.5 -789.5Q5259.0 -829 5192.0 -829Q5120.0 -829 5056.5 -785.5Q4993.0 -742 4939.0 -651Z';

/** The mark's paths in the master's own coordinates (the leaf spans x 54–152, y 32–168). */
function KaisipPaths({ tone, id }: { tone: KaisipTone; id: string }) {
  return (
    <>
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" x={-100} y={-100} width={400} height={400}>
          <Rect x={-100} y={-100} width={400} height={400} fill="white" />
          <Path d={KAI_VEIN} stroke="black" strokeWidth={4} strokeLinecap="round" />
        </Mask>
      </Defs>
      <Path d={KAI_LEAF} fill={tone.leaf} mask={`url(#${id})`} />
      <Path d={KAI_PAIR_UP} fill={tone.pair} />
      <Path d={KAI_PAIR_DOWN} fill={tone.pair} />
    </>
  );
}

/** Light = on paper, dark = on the dark theme or a forest panel; `auto` (default) follows the app theme. */
type KaisipToneName = 'light' | 'dark' | 'auto';
function useKaisipTone(tone: KaisipToneName): KaisipTone {
  const { isDark } = useTheme();
  return kaisip[tone === 'auto' ? (isDark ? 'dark' : 'light') : tone];
}

/** The KaiSip mark on its own (no background). Read as one image called "KaiSip". */
export function KaisipMark({ size = 48, tone = 'auto', decorative = false }: { size?: number; tone?: KaisipToneName; decorative?: boolean }) {
  const id = useSvgId();
  const t = useKaisipTone(tone);
  // The leaves span 98 × 136 units, centred on (103, 100): a 102 × 140 box leaves a hair of room.
  const w = (size * 102) / 140;
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : 'KaiSip'}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={{ width: w, height: size }}
    >
      <Svg width={w} height={size} viewBox="52 30 102 140">
        <KaisipPaths tone={t} id={id} />
      </Svg>
    </View>
  );
}

/** The lockup's own box (from lockup_*.svg): 460.33 × 140 units. */
const KAI_LOCKUP_W = 460.33;
const KAI_LOCKUP_H = 140;
/** Width ÷ height, so callers can size a fixed box. */
export const KAISIP_LOCKUP_RATIO = KAI_LOCKUP_W / KAI_LOCKUP_H;

/**
 * Mark + lowercase "kaisip" wordmark, side by side (Today's header).
 * - `height` in points; the width follows (about 3.3 × height).
 * - Read as one image called "KaiSip"; pass `decorative` when a parent
 *   already speaks the name.
 */
export function KaisipLockup({ tone = 'auto', height = 32, decorative = false }: { tone?: KaisipToneName; height?: number; decorative?: boolean }) {
  const id = useSvgId();
  const t = useKaisipTone(tone);
  const width = height * KAISIP_LOCKUP_RATIO;
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : 'KaiSip'}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={{ width, height }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${KAI_LOCKUP_W} ${KAI_LOCKUP_H}`}>
        <G transform="translate(70 70) scale(0.90228) translate(-102.999 -100.123)">
          <KaisipPaths tone={t} id={id} />
        </G>
        <G transform="translate(149.21 96.94) scale(0.05272)">
          <Path d={KAI_WORD} fill={t.word} />
          <Path d={KAI_WORD_LEAF} fill={t.pair} />
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
 * - `rows` (the welcome screen and Settings → About, mobile 1.21): plain rows
 *   on the paper. The pillars are not choices, so they are never cards
 *   (spec §5: raised cards only for things you choose between).
 * - `cards`: kept for compatibility; nothing uses it any more.
 * Each pillar is read as one sentence ("See the path. Know what to study next…").
 */
export function PillarList({ look = 'rows' }: { look?: 'cards' | 'rows' }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ gap: look === 'cards' ? space.sm : space.lg }}>
      {PILLARS.map((p) => {
        const inner = (
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <IconCircle>
              <PillarGlyph kind={p.glyph} isDark={isDark} />
            </IconCircle>
            <View style={{ flex: 1 }}>
              <T v="label">{p.title}</T>
              <T v="meta" color={c.ink2} style={{ marginTop: space.xs }}>{p.body}</T>
            </View>
          </Row>
        );
        return (
          <View key={p.glyph} accessible accessibilityRole="text" accessibilityLabel={`${p.title}. ${p.body}`}>
            {look === 'cards' ? <Card style={{ paddingVertical: space.md }}>{inner}</Card> : inner}
          </View>
        );
      })}
    </View>
  );
}
