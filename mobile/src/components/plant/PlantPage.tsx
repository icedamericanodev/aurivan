/**
 * Grove Phase 4b: the parts of the "Your plant" page on paper (design-notes/grove/phase4b/PHASE4B.md
 * section 4.1, "B. Paper garden, merged").
 *
 * Plain English for the founder:
 * - `plantArtSize`: how big the plant is drawn. It steps up with growth (180, 240, 300pt), one
 *   step smaller with large text, never wider than the page and never taller than 40% of the screen.
 * - `SoilBed`: the plant drawn on the page (no card, no disc), standing on a soil line that runs
 *   the full width of the screen. The line is decoration: words carry every state.
 * - `StateTag`: a small, static word beside the art's foot ("Plan cleared", "Resting", "Exam day").
 * - `GrowthStem`: "How it has grown". One line down the left; each growth is a leaf on it. A reached
 *   leaf is filled, the growth it is at now is filled inside a ring, the ones to come are dashed
 *   outlines (shape as well as colour). The reached part of the line is the accent colour, the part
 *   still to come is dashed. A growth reached on this visit fills its leaf once (300 ms, opacity and
 *   scale), or at once under Reduce Motion.
 * - `NextPanel`: "What grows it next", the page's one forest panel, with a row per gate.
 * Every colour is a theme token (no hex here). Screen readers hear the stem as a list, one stop
 * per row, and the decorative drawings not at all.
 */
import { useEffect, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { GrowthLevel, PlantSpecies } from '../../engine/plant';
import type { StemRow } from '../../lib/plantStem';
import { groveRadius } from '../../theme/grove';
import { LARGE_TEXT, motion, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { FieldText } from '../fieldguide';
import { HeroCard } from '../groveToday';
import { useMotion } from '../motion';
import { BigNum, groveTile, T, useFontScale } from '../ui';
import { buildPlant, lodFor, type ArtLook } from './art';
import { Plant } from './Plant';

// ── The art's size ─────────────────────────────────────────────────────
/** The art's height by growth (PHASE4B 4.1 item 2): Seed and Sprout 180, Shoot 240, Bough on 300. */
const ART_STEPS = [180, 240, 300] as const;
const stepOf = (growth: GrowthLevel) => (growth <= 2 ? 0 : growth === 3 ? 1 : 2);

/**
 * How big Your plant's art is drawn: its growth's step, one step lower from text scale 1.3,
 * capped by the page's width and by 40% of the screen's height.
 */
export function plantArtSize(growth: GrowthLevel, fontScale: number, width: number, screenHeight: number): number {
  const step = Math.max(0, stepOf(growth) - (fontScale >= LARGE_TEXT ? 1 : 0));
  return Math.max(96, Math.floor(Math.min(ART_STEPS[step], width, screenHeight * 0.4)));
}

/**
 * Where the plant's base sits on its 200-unit stage, in points at `size` (the soil line goes
 * there). Read from the art's own anchors (cached builds), so a planter or ground that lifts the
 * plant moves the line with it.
 */
export function soilYFor(species: PlantSpecies, growth: GrowthLevel, look: ArtLook | undefined, size: number, theme: 'light' | 'dark'): number {
  const built = buildPlant({ species, stage: growth, quietLook: true, lod: lodFor(size), theme, look, px: size, fit: false });
  return (built.anchors.base.y * size) / 200;
}

// ── The plant on the page ──────────────────────────────────────────────
/**
 * The art centred on a soil line that runs the full width of the screen (`bleed`: the page's
 * gutter, so the line reaches both edges). `foot`: what stands beside the art's foot (the tag).
 */
export function SoilBed({ size, soilY, bleed, children, foot, testID }: { size: number; soilY: number; bleed: number; children: ReactNode; foot?: ReactNode; testID?: string }) {
  const { g } = useTheme();
  return (
    <View testID={testID} style={{ alignItems: 'center' }}>
      <View
        testID={testID ? `${testID}-soil` : undefined}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: -bleed, right: -bleed, top: soilY - 1, height: 2, borderRadius: 1, backgroundColor: g.soil }}
      />
      <View style={{ width: size, height: size }}>{children}</View>
      {foot ? <View style={{ alignSelf: 'flex-end', marginTop: -space.lg }}>{foot}</View> : null}
    </View>
  );
}

/** A static state word ("Resting"): `caption` on the soft fill, not a control and with no edge. */
export function StateTag({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View testID="plant-state-tag" style={{ backgroundColor: c.soft, borderRadius: groveRadius.step, paddingHorizontal: space.sm, paddingVertical: 2 }}>
      <T v="caption" color={c.ink2}>
        {label}
      </T>
    </View>
  );
}

// ── The stem ───────────────────────────────────────────────────────────
/** The stem's left column: wide enough for the "now" ring (32pt) with room either side. */
const STEM_COL = 40;
const LEAF = 20;
const RING = 32;
/** A leaf on the stem (20 × 20). */
const LEAF_PATH = 'M10 1.5C15.6 5 17.4 11.4 10 18.5 2.6 11.4 4.4 5 10 1.5Z';

/**
 * One leaf mark: reached = filled accent; now = filled inside a 2pt accent ring; later = a dashed
 * outline in leafLine. `fill`: this leaf was reached on this visit, so it fills once (opacity 0 to 1,
 * scale 0.85 to 1, 300 ms, no overshoot), or is filled at once under Reduce Motion. `wait`: it waits
 * (unfilled) until the Turning's name lands.
 */
export function StemLeaf({ state, fill = false, wait = false, testID }: { state: 'reached' | 'now' | 'later' | 'keepsake'; fill?: boolean; wait?: boolean; testID?: string }) {
  const { c, g } = useTheme();
  const { reduced } = useMotion();
  const filled = state !== 'later';
  // Under Reduce Motion the leaf is filled from the first frame; otherwise a fill starts empty.
  const p = useSharedValue(filled && (wait || fill) && !reduced ? 0 : 1);
  useEffect(() => {
    if (!filled || wait) return;
    if (reduced) {
      p.set(1);
      return;
    }
    if (fill) p.set(withTiming(1, { duration: motion.dur.fill, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
  }, [filled, wait, fill, reduced, p]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.85 + 0.15 * p.value }] }));
  const small = state === 'keepsake';
  return (
    <View testID={testID} style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center', borderRadius: RING / 2, backgroundColor: state === 'now' || state === 'later' ? c.bg : undefined }}>
      {state === 'now' ? <View style={{ position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2, borderColor: c.accent }} /> : null}
      {/* The empty outline under a leaf that fills (and the later leaves' dashed mark). */}
      {!filled || wait || fill ? (
        <Svg width={LEAF} height={LEAF} viewBox="0 0 20 20" style={{ position: 'absolute' }}>
          <Path d={LEAF_PATH} fill="none" stroke={g.leafLine} strokeWidth={1.5} strokeDasharray={filled ? undefined : '3 2.5'} />
        </Svg>
      ) : null}
      {filled ? (
        <Animated.View testID={testID ? `${testID}-fill` : undefined} style={[{ width: small ? 14 : LEAF, height: small ? 14 : LEAF }, anim]}>
          <Svg width={small ? 14 : LEAF} height={small ? 14 : LEAF} viewBox="0 0 20 20">
            <Path d={LEAF_PATH} fill={c.accent} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One piece of the stem line: solid accent (reached) or dashed leafLine (still to come). */
function StemLine({ solid, style }: { solid: boolean; style: StyleProp<ViewStyle> }) {
  const { c, g } = useTheme();
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: STEM_COL / 2 - 1, width: 2 }, style]}>
      {solid ? (
        <View style={{ flex: 1, backgroundColor: c.accent }} />
      ) : (
        <Svg width={2} height="100%">
          <Line x1={1} y1={0} x2={1} y2="100%" stroke={g.leafLine} strokeWidth={2} strokeDasharray="4 4" />
        </Svg>
      )}
    </View>
  );
}

/**
 * A row on the stem: the line through its left column (above and below the leaf), the leaf, then
 * the row's words. `above` / `below`: is that part of the line solid (reached)?
 */
export function StemRowView({
  leaf,
  above,
  below,
  first,
  last,
  children,
  spoken,
  testID,
  leafTop = 2,
}: {
  leaf: ReactNode;
  above: boolean;
  below: boolean;
  first?: boolean;
  last?: boolean;
  children: ReactNode;
  spoken?: string;
  testID?: string;
  leafTop?: number;
}) {
  return (
    <View testID={testID} accessible={Boolean(spoken)} accessibilityLabel={spoken} style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ width: STEM_COL, alignItems: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {first ? null : <StemLine solid={above} style={{ top: 0, height: leafTop + RING / 2 }} />}
        {last ? null : <StemLine solid={below} style={{ top: leafTop + RING / 2, bottom: 0 }} />}
        <View style={{ marginTop: leafTop }}>{leaf}</View>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : space.lg, paddingTop: leafTop + 4 }}>{children}</View>
    </View>
  );
}

/** A 56pt tile with the form's own drawing, on rows that brought a form. Decorative. */
export function FormTile({ species, growth, look, theme }: { species: PlantSpecies; growth: GrowthLevel; look?: ArtLook; theme: 'light' | 'dark' }) {
  const { c } = useTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[groveTile(c), { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
      <Plant species={species} stage={growth} size={52} theme={theme} quietLook look={look} />
    </View>
  );
}

/** The words of one stem row: label over meta, then the fact (small, secondary ink). */
export function StemWords({ row, trailing }: { row: StemRow; trailing?: ReactNode }) {
  const { c } = useTheme();
  const large = useFontScaleLarge();
  const words = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <T v="label" color={row.kind === 'growth' && row.state === 'later' ? c.ink2 : c.ink}>
        {row.name}
      </T>
      {row.meta ? <T v="meta">{row.meta}</T> : null}
      {row.kind === 'growth' && row.fact ? (
        <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
          {row.fact}
        </T>
      ) : null}
      {row.kind === 'keepsake' ? (
        <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
          {row.line}
        </T>
      ) : null}
    </View>
  );
  if (!trailing) return words;
  return (
    <View style={{ flexDirection: large ? 'column' : 'row', gap: space.md, alignItems: 'flex-start' }}>
      {words}
      {trailing}
    </View>
  );
}

const useFontScaleLarge = () => useFontScale() >= LARGE_TEXT;

// ── What grows it next ─────────────────────────────────────────────────
/** One gate on the forest panel, its words and how far along it is (0 to 1). */
export interface NextGate {
  label: string;
  progress: number;
}

/**
 * The page's one forest panel (PHASE4B 4.1 item 7): "Next", the next growth's name, one row per
 * gate (its words, its value, a 6pt bar), then the two footnotes.
 */
export function NextPanel({ growthName, formLine, gates, notes }: { growthName: string; /** The form the next growth brings ("Grows into the Standard Oak at Bough."), as built. */ formLine?: string; gates: readonly NextGate[]; notes: readonly string[] }) {
  const { c } = useTheme();
  const large = useFontScaleLarge();
  return (
    <HeroCard testID="plant-next">
      <View accessible accessibilityRole="header" accessibilityLabel={`What grows it next: ${growthName}`}>
        <FieldText v="head" color={c.onForest2}>
          Next
        </FieldText>
        <T v="title" color={c.onForest}>
          {growthName}
        </T>
      </View>
      {formLine ? (
        <T v="meta" color={c.onForest2} style={{ marginTop: -space.sm }}>
          {formLine}
        </T>
      ) : null}
      {gates.map((st) => {
        const pc = Math.round(Math.max(0, Math.min(1, st.progress)) * 100);
        const said = st.progress >= 1 ? 'Done' : st.progress <= 0 ? 'Not yet' : `${pc} percent there`;
        return (
          <View key={st.label} accessible accessibilityLabel={`${st.label}. ${said}.`} testID="plant-next-gate">
            <View style={large ? { gap: 2 } : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md }}>
              <T v="small" color={c.onForest} style={large ? undefined : { flex: 1 }}>
                {st.label}
              </T>
              {/* Polish round 1: a met gate says "Done" (as the website does), never "100%" beside its own
                  target ("…reaches 65%"), which read as a second, different number. */}
              {st.progress <= 0 || st.progress >= 1 ? (
                <T v="meta" color={st.progress >= 1 ? c.onForest : c.onForest2}>
                  {st.progress >= 1 ? 'Done' : 'Not yet'}
                </T>
              ) : (
                <BigNum value={String(pc)} pct size={20} color={c.onForest} />
              )}
            </View>
            <View style={{ marginTop: space.xs, height: 6, borderRadius: 3, backgroundColor: c.forestTrack, overflow: 'hidden' }}>
              <View style={{ width: `${pc}%`, height: 6, borderRadius: 3, backgroundColor: c.sap }} />
            </View>
          </View>
        );
      })}
      {notes.map((n) => (
        <T key={n} v="meta" color={c.onForest2}>
          {n}
        </T>
      ))}
    </HeroCard>
  );
}

/** For tests: the leaf's box sizes. */
export const STEM_SIZES = { col: STEM_COL, leaf: LEAF, ring: RING } as const;

/** A small wren beside the visitor line (decorative: the words say who came by). */
export function WrenGlyph({ size = 18 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M3 12.5C4 8 7.6 6 11.4 6.6l2.4-2.1.2 2.6c1.6 1 2 3.4.6 5.3-1.1 1.5-3 2.1-5 2.1H6.2L3 16l1.1-3.3z" fill="none" stroke={c.accentText} strokeWidth={1.5} strokeLinejoin="round" />
        <Circle cx={13.2} cy={8.6} r={0.9} fill={c.accentText} />
      </Svg>
    </View>
  );
}
