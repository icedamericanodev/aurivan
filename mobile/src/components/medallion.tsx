/**
 * The badge medallion (mobile 1.10, badge art spec 2026-10-11): a struck
 * medallion from the Grove, drawn with react-native-svg from the art data
 * (content/badgeArt.json, built by scripts/badge-art/build.mjs).
 *
 * Plain English for the founder:
 * - The FRAME SHAPE and the ENAMEL tell the set (SET_LOOK): each counted set
 *   has its own shape + enamel pair, so no two sets differ by colour alone.
 *   Field notes are leaf-marks (pressed leaves); Moments are a stamp (the
 *   round seal with a dashed postmark ring, like a park passport).
 * - The rim METAL tells the tier (Clay, Lichen, Gold leaf), three ways:
 *   metal, pip count and, at Gold leaf, a laurel. The tier's name is always
 *   printed beside it. A badge with one mark has no tier: it is struck in a
 *   calm sage (badgeStruck) with a plain rim, so Gold leaf always means the
 *   top of a ladder.
 * - The EMBLEM is the badge's meaning, and later its keepsake on the plant.
 *   Firm Footing wears its domain's own (mobile 1.11): a balance for IS
 *   Audit, a helm for IT Governance, a staked sapling for IS Acquisition, a
 *   windmill for IS Operations, a chestnut in its burr for Info Protection.
 * - Earned: enamel, metal rim, ribbon. Not yet: a stitched dashed outline,
 *   a flat field, a one-tone emblem and a green progress trace from the top
 *   (theme tokens, so it follows light and dark). Gated (it opens later): a
 *   dotted outline and no trace. Never a padlock, a "?" or a silhouette.
 *   On the forest panel (`surface="forest"`) the not-yet badge uses the
 *   on-forest inks (onForest2 outline and emblem, forestTrack field, sap
 *   trace), so it keeps 3:1 there too.
 * - At 64pt and under, the light cut: no growth rings and no cast emblem
 *   shadow (a case of 30 medallions draws far fewer nodes).
 * - At 47pt and under, the compact cut: no ribbon, laurel, beads, pips or rings.
 * - `strike`: the unlock moment. The rim catches the light once (a glint
 *   runs round it) and the emblem fills from its outline. Static under
 *   Reduce Motion, or once the moment is settled.
 *
 * Decorative to screen readers: the button or row around it carries the
 * label (name, state, rule, progress, set).
 */
import { memo, useEffect, useId, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import ART from '../content/badgeArt.json';
import type { SetId } from '../engine/badgeCatalog';
import { badgeEnamel, badgeGlaze, badgeLeafPip, badgeMetal, badgeStruck, motion, type BadgeEnamel, type BadgeEnamelId, type BadgeMetal } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useMotion } from './motion';

export type FrameKind = 'seal' | 'hex' | 'shield' | 'leaf';
export interface MedallionLook {
  frame: FrameKind;
  enamel: BadgeEnamelId;
  /** The passport stamp (Moments): no ribbon, a dashed postmark ring in the field. */
  stamp?: boolean;
}

/**
 * Each set's look: a frame shape and an enamel. Within a shape the two sets
 * that share it have clearly different enamels (light against dark, or
 * green against clay), and sets that share an enamel never share a shape.
 */
export const SET_LOOK: Record<SetId, MedallionLook> = {
  groundwork: { frame: 'seal', enamel: 'forest' },
  domains: { frame: 'hex', enamel: 'paper' },
  evergreen: { frame: 'hex', enamel: 'forest' },
  judgement: { frame: 'shield', enamel: 'ink' },
  examDay: { frame: 'shield', enamel: 'clay' },
  rooted: { frame: 'seal', enamel: 'clay' },
  moments: { frame: 'seal', enamel: 'paper', stamp: true },
  fieldNotes: { frame: 'leaf', enamel: 'paper' },
};

export type MedallionState = 'earned' | 'open' | 'gated';

type Node = [string, Record<string, string | number>, Node[]?];
type FrameArt = {
  edge: string;
  metal: string;
  metalLine: string;
  innerEdge: string;
  field: string;
  locked: string;
  trace: string;
  traceLength: number;
  emblem: { cx: number; cy: number; s: number };
  pips: Record<string, { at: [number, number, number][]; span: number }>;
  domainPips: Record<string, { at: [number, number, number][]; span: number }>;
  beads: Record<string, string>;
  laurel: { stem: string; leaves: { x: number; y: number; r: number; d: string; rib: string | null }[] };
};
const FRAMES = ART.frames as unknown as Record<FrameKind, FrameArt>;
const EMBLEMS = ART.emblems as unknown as Record<string, Node[]>;

/**
 * The emblem for a badge: Rooted grows with its tier; Firm Footing wears its
 * domain's own emblem (`emblem`, mobile 1.11) when the exam has one.
 */
export function emblemId(badge: string, tier?: number, emblem?: string): string {
  if (emblem && EMBLEMS[emblem]) return emblem;
  return badge === 'rooted' ? `rooted:${tier ?? 3}` : badge;
}

/** "#7D897F" mixed toward "#E6EBE2" by t (the locked emblem's second tone). */
function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i, 3 + i), 16);
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  return `#${[0, 2, 4].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('')}`;
}

const SVG_ATTR: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
};

/** One emblem drawn with a role → colour map (E1, E2, E3, D2, D3, L3, K). */
function drawEmblem(nodes: Node[], pal: Record<string, string>, key = 'e'): React.ReactNode[] {
  return nodes.map(([tag, attrs, kids], i) => {
    const props: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(attrs)) {
      const name = SVG_ATTR[k] ?? k;
      props[name] = (k === 'fill' || k === 'stroke') && typeof v === 'string' && pal[v] !== undefined ? pal[v] : v;
    }
    const id = `${key}${i}`;
    switch (tag) {
      case 'g':
        return (
          <G key={id} {...props}>
            {drawEmblem(kids ?? [], pal, `${id}.`)}
          </G>
        );
      case 'path':
        return <Path key={id} {...(props as { d: string })} />;
      case 'circle':
        return <Circle key={id} {...props} />;
      case 'ellipse':
        return <Ellipse key={id} {...props} />;
      case 'rect':
        return <Rect key={id} {...props} />;
      default:
        return null;
    }
  });
}

const ROLES = ['E1', 'E2', 'E3', 'D2', 'D3', 'L3', 'K'] as const;
const allRoles = (color: string) => Object.fromEntries(ROLES.map((r) => [r, color]));

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

/** The unlock moment's strike: a new `run` plays it once; `settled` shows its end. */
export interface Strike {
  run: number;
  settled: boolean;
  /** When the strike starts (ms after the run begins). */
  delay?: number;
}

export interface MedallionProps {
  badge: string;
  set: SetId;
  /** 0 = a one-mark badge (the struck sage, no pips); 1–3 = its tier. */
  tier?: number;
  state: MedallionState;
  /** Not yet earned: how far along (0..1), drawn as the trace. */
  progress?: number;
  size: number;
  /** Firm Footing: which domain leaf on the rim is this badge's (0-based, blueprint order)… */
  domainIndex?: number;
  /** …and how many there are. Primitives, so the memo holds across renders. */
  domainCount?: number;
  /** Firm Footing's domain emblem ("domain-audit"); none: the badge's own. */
  emblem?: string;
  /** What it sits on: the page (default) or the forest panel (on-forest inks for a not-yet badge). */
  surface?: 'paper' | 'forest';
  strike?: Strike;
}

/** The rim for a tier: Clay, Lichen, Gold leaf; a one-mark badge's calm sage. */
export const metalFor = (tier: number): BadgeMetal => (tier >= 1 && tier <= 3 ? badgeMetal[tier as 1 | 2 | 3] : badgeStruck);

/** One medallion. Memoised (primitive props): the art only changes with its state, size and progress. */
export const Medallion = memo(function Medallion({ badge, set, tier = 0, state, progress = 0, size, domainIndex, domainCount, emblem: emblemKey, surface = 'paper', strike }: MedallionProps) {
  const { c } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const look = SET_LOOK[set];
  const fr = FRAMES[look.frame];
  const compact = size <= 47;
  const light = size <= 64;
  const onForest = surface === 'forest';
  const domain = useMemo(
    () => (domainIndex !== undefined && domainIndex >= 0 && domainCount ? { index: domainIndex, count: domainCount } : undefined),
    [domainIndex, domainCount],
  );
  const vb = compact ? '6 0 188 188' : '0 0 200 200';
  const emblem = EMBLEMS[emblemId(badge, tier || undefined, emblemKey)] ?? EMBLEMS['first-foothold'];
  const s = fr.emblem.s * (compact ? 1.08 : 1);
  const place = `translate(${fr.emblem.cx - 50 * s} ${fr.emblem.cy - 50 * s}) scale(${s})`;
  const earned = state === 'earned';
  const art = useMemo(
    () =>
      earned
        ? earnedArt({ uid, look, fr, tier, compact, light, domain, emblem, place, enamel: badgeEnamel[look.enamel], metal: metalFor(tier) })
        : lockedArt({
            fr,
            compact,
            emblem,
            place,
            gated: state === 'gated',
            ink: onForest ? { field: c.forestTrack, line: c.onForest2, emblem: c.onForest2 } : { field: c.soft, line: c.control, emblem: c.muted },
          }),
    [earned, uid, look, fr, tier, compact, light, domain, emblem, place, state, c, onForest],
  );
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={vb}>
        {art}
        {!earned && state !== 'gated' && progress > 0 && (
          <Path
            d={fr.trace}
            fill="none"
            stroke={onForest ? c.sap : c.accent}
            strokeWidth={compact ? 5 : 4.2}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0.01, Math.min(1, progress)) * fr.traceLength} ${fr.traceLength}`}
          />
        )}
        {earned && strike && (
          <StrikeLayer strike={strike} fr={fr} metal={metalFor(tier)} field={badgeEnamel[look.enamel].field} emblem={emblem} place={place} />
        )}
      </Svg>
    </View>
  );
});

function earnedArt({
  uid,
  look,
  fr,
  tier,
  compact,
  light,
  domain,
  emblem,
  place,
  enamel,
  metal,
}: {
  uid: string;
  look: MedallionLook;
  fr: FrameArt;
  tier: number;
  compact: boolean;
  /** ≤ 64pt: no growth rings and no cast emblem shadow (detail too fine to see). */
  light: boolean;
  domain?: { index: number; count: number };
  emblem: Node[];
  place: string;
  enamel: BadgeEnamel;
  metal: BadgeMetal;
}) {
  const paper = look.enamel === 'paper';
  const domainPips = !compact && domain ? fr.domainPips[String(domain.count)] : undefined;
  const tierPips = !compact && !domain && tier ? fr.pips[String(tier)] : undefined;
  const beadKey = domainPips ? `d${domain!.count}` : String(tier);
  // Beads mark the upper tiers only; a one-mark badge keeps a plain, calm rim.
  const beads = !compact && tier >= 2 ? fr.beads[beadKey] : undefined;
  const ribbon = (
    <>
      <Path d={ART.ribbon.tail} fill={enamel.ribbon} />
      <Path d={ART.ribbon.fold} fill={enamel.ribbonDeep} />
      <Path d={ART.ribbon.shine} fill={badgeGlaze.color} opacity={0.12} />
    </>
  );
  const laurelSide = (
    <>
      <Path d={fr.laurel.stem} fill="none" stroke={metal.edge} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {fr.laurel.leaves.map((l, i) => (
        <G key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
          <Path d={l.d} fill={metal.mid} stroke={metal.edge} strokeWidth={1.4} strokeLinejoin="round" />
          {l.rib && <Path d={l.rib} stroke={metal.light} strokeWidth={1.1} strokeLinecap="round" />}
        </G>
      ))}
    </>
  );
  return (
    <>
      <Defs>
        <LinearGradient id={`${uid}m`} x1="40" y1="12" x2="160" y2="182" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={metal.light} />
          <Stop offset="0.42" stopColor={metal.mid} />
          <Stop offset="1" stopColor={metal.dark} />
        </LinearGradient>
        <ClipPath id={`${uid}f`}>
          <Path d={fr.field} />
        </ClipPath>
      </Defs>
      {!compact && !look.stamp && (
        <>
          {ribbon}
          <G transform="translate(200 0) scale(-1 1)">{ribbon}</G>
        </>
      )}
      {!compact && tier === 3 && (
        <>
          {laurelSide}
          <G transform="translate(200 0) scale(-1 1)">{laurelSide}</G>
        </>
      )}
      <Path d={fr.edge} fill={metal.edge} />
      <Path d={fr.metal} fill={`url(#${uid}m)`} />
      <Path d={fr.metalLine} fill="none" stroke={metal.light} strokeWidth={1} opacity={0.7} />
      {beads && (
        <>
          <Path d={beads} fill={metal.edge} opacity={0.45} transform="translate(0.5 0.7)" />
          <Path d={beads} fill={metal.bead} />
        </>
      )}
      {tierPips?.at.map(([x, y, r], i) => (
        <Path key={`p${i}`} transform={`translate(${x} ${y}) rotate(${r})`} d={ART.leafPip.off} fill={metal.edge} stroke={metal.edge} strokeWidth={0.6} />
      ))}
      {domainPips?.at.map(([x, y, r], i) => {
        const mine = i === domain!.index;
        return (
          <G key={`d${i}`} transform={`translate(${x} ${y}) rotate(${r})`}>
            <Path d={ART.leafPip.on} fill={mine ? badgeLeafPip.on : metal.light} stroke={mine ? badgeLeafPip.on : metal.edge} strokeWidth={mine ? 1 : 1.5} />
            {mine && <Path d={ART.leafPip.rib} stroke={badgeLeafPip.rib} strokeWidth={1.2} strokeLinecap="round" />}
          </G>
        );
      })}
      <Path d={fr.innerEdge} fill={metal.edge} />
      <Path d={fr.field} fill={enamel.field} />
      <G clipPath={`url(#${uid}f)`}>
        {!light && ART.rings.map((d, i) => <Path key={`r${i}`} d={d} fill="none" stroke={enamel.lite} strokeWidth={1.7} />)}
        <Ellipse cx={62} cy={40} rx={80} ry={44} transform="rotate(-28 62 40)" fill={badgeGlaze.color} opacity={paper ? badgeGlaze.paperOpacity : badgeGlaze.opacity} />
        <Path d={fr.field} fill="none" stroke={enamel.deep} strokeWidth={3} opacity={0.55} transform="translate(1.2 2)" />
      </G>
      {look.stamp && (
        // The postmark: a dashed ring inside the field, like a passport stamp.
        <Circle cx={ART.centre.x} cy={ART.centre.y} r={compact ? 60 : 62} fill="none" stroke={enamel.E3} strokeWidth={compact ? 3.2 : 2.2} strokeDasharray={compact ? '8 6' : '6 4.5'} opacity={0.85} />
      )}
      <G transform={place}>
        {!light && (
          <G transform="translate(0 2.6)" opacity={paper ? 1 : 0.9}>
            {drawEmblem(emblem, allRoles(enamel.deep), 's')}
          </G>
        )}
        {drawEmblem(emblem, { E1: enamel.E1, E2: enamel.E2, E3: enamel.E3, D2: enamel.D2, D3: enamel.D3, L3: enamel.L3, K: enamel.field })}
      </G>
    </>
  );
}

function lockedArt({
  fr,
  compact,
  emblem,
  place,
  gated,
  ink,
}: {
  fr: FrameArt;
  compact: boolean;
  emblem: Node[];
  place: string;
  gated: boolean;
  /** The field, the stitched line and the one-tone emblem (paper: soft / control / muted; forest: forestTrack / onForest2 / onForest2). */
  ink: { field: string; line: string; emblem: string };
}) {
  const second = mix(ink.emblem, ink.field, 0.3);
  const pal = { E1: ink.emblem, E2: second, D2: second, E3: ink.emblem, D3: ink.emblem, L3: second, K: ink.field };
  // Not yet: a stitched dashed outline (a patch not yet sewn on). Gated: dotted, the texture of "later".
  const dash = gated ? (compact ? '0.1 7' : '0.1 6') : compact ? '9 6' : '6.5 4.5';
  return (
    <>
      <Path d={fr.metal} fill={ink.field} />
      <Path d={fr.locked} fill="none" stroke={ink.line} strokeWidth={gated ? (compact ? 4.4 : 3.4) : compact ? 3.6 : 2.6} strokeDasharray={dash} strokeLinecap="round" />
      <Path d={fr.innerEdge} fill="none" stroke={ink.line} strokeWidth={compact ? 2.4 : 1.6} opacity={0.7} />
      <G transform={place} opacity={gated ? 0.75 : 1}>
        {drawEmblem(emblem, pal)}
      </G>
    </>
  );
}

/**
 * The strike, over the earned art: the emblem starts as its one-tone outline
 * (the badge it was) and fills in (400–600 ms), while a glint of the rim's
 * own light runs round it once (200–600 ms) and fades. Nothing under
 * Reduce Motion or once settled.
 */
function StrikeLayer({ strike, fr, metal, field, emblem, place }: { strike: Strike; fr: FrameArt; metal: BadgeMetal; field: string; emblem: Node[]; place: string }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const live = strike.run > 0 && !strike.settled && !reduced;
  const glint = useSharedValue(0);
  const fade = useSharedValue(live ? 1 : 0);
  const L = fr.traceLength;
  const d0 = strike.delay ?? 0;
  useEffect(() => {
    if (!live) {
      glint.set(0);
      fade.set(0);
      return;
    }
    const never = ReduceMotion.Never;
    const out = Easing.out(Easing.cubic);
    glint.set(withSequence(withTiming(0, { duration: 0, reduceMotion: never }), withDelay(d0 + 80, withTiming(1, { duration: 400, easing: out, reduceMotion: never }))));
    fade.set(withSequence(withTiming(1, { duration: 0, reduceMotion: never }), withDelay(d0 + 280, withTiming(0, { duration: motion.dur.short, reduceMotion: never }))));
  }, [live, strike.run, d0, glint, fade]);
  const glintProps = useAnimatedProps(() => ({
    strokeDashoffset: L * (1 - glint.value),
    strokeOpacity: glint.value <= 0 || glint.value >= 1 ? 0 : 0.9,
  }));
  const fadeProps = useAnimatedProps(() => ({ opacity: fade.value }));
  const second = mix(c.muted, c.soft, 0.3);
  if (!live) return null;
  return (
    <>
      <AnimatedG animatedProps={fadeProps}>
        <G transform={place}>{drawEmblem(emblem, { E1: c.muted, E2: second, D2: second, E3: c.muted, D3: c.muted, L3: second, K: field }, 'x')}</G>
      </AnimatedG>
      <AnimatedPath d={fr.trace} fill="none" stroke={metal.light} strokeWidth={3.2} strokeLinecap="round" strokeDasharray={`${L * 0.18} ${L}`} animatedProps={glintProps} />
    </>
  );
}
