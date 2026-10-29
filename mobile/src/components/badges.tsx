/**
 * The badge case's pieces (mobile 1.10, badges_game.md §4): a medallion cell
 * for the grid, a row for large text and "Next for your exam", a shelf
 * header, the "Next for your exam" panel and the badge's detail sheet.
 *
 * Plain English for the founder:
 * - Every medallion is ONE button, spoken in full: name, state, rule,
 *   progress or date, set. The art itself is hidden from screen readers.
 * - Not-yet badges always say how close you are; gated ones say when they
 *   open. No padlocks, no "?", nothing hidden.
 * - "Study for this" opens what earns the badge, and is spoken with its name.
 * - The detail sheet: the medallion turns in once as it opens (still under
 *   Reduce Motion), then the rule, how to earn it (or, once earned, what it
 *   means), one honest effort fact and the button.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DomainInfo } from '../content/types';
import { completingMark, MOCK_SUGGEST_LINE, setSpoken, spokenDetail, STRETCH, stretchLine, studyNote, studyTarget, suggestLine, type CaseMark, type SetView, type StudyTarget } from '../engine/badgeCatalog';
import type { Stage } from '../engine/journey';
import { moveFocus } from '../lib/a11y';
import { longDate, shortDate } from '../lib/format';
import { badgeDef } from '../engine/milestones';
import { badgeCardText, badgeShareable, type BadgeCardText, type ShareCert } from '../engine/shareCard';
import { STORE_LINK } from '../content/storeLinks';
import { BadgeSharePanel } from './shareCard';
import { badgeMetal, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Medallion, type MedallionState } from './medallion';
import { AnimatedPressable, useMotion, usePressScale } from './motion';
import { ICON_STROKE, Share2 } from './icons';
import { Button, DomainDot, ICON_SIZE, ProgressBar, Row, T } from './ui';
import { CollectRow, FieldText, HerbariumSheet, Specimen, SpecimenMount } from './fieldguide';

/** The medallion state for a mark (started and open both draw "not yet"; gated is dotted). */
export const medallionState = (m: CaseMark): MedallionState => (m.status === 'earned' ? 'earned' : m.status === 'gated' ? 'gated' : 'open');

/** A tier's material, printed beside it ("Clay"), so the metal is never the only signal. */
export const tierName = (m: CaseMark) => (m.tier ? badgeMetal[m.tier as 1 | 2 | 3].name : undefined);

/**
 * What a medallion needs from its mark and its exam: primitives only, so the
 * memoised medallion skips re-drawing when nothing about it changed. The
 * progress trace shows only while progress does (never in the after-exam album).
 */
export function medallionProps(m: CaseMark, domains: readonly DomainInfo[], showProgress = true) {
  const index = m.domain ? domains.findIndex((d) => d.id === m.domain!.id) : -1;
  return {
    badge: m.badge,
    set: m.set,
    tier: m.tier ?? 0,
    state: medallionState(m),
    progress: showProgress && m.status === 'started' ? m.progress : 0,
    ...(index >= 0 ? { domainIndex: index, domainCount: domains.length } : {}),
    ...(m.domain?.emblem ? { emblem: m.domain.emblem } : {}),
  };
}

/** The times badges were saved quietly (the back-fill, the catalogue fill): engine/badgeCatalog.ts quietTimes. */
type Quiet = readonly number[];
const NO_QUIET: Quiet = [];
const isQuiet = (m: CaseMark, quiet: Quiet) => m.earnedAt !== undefined && quiet.includes(m.earnedAt);

/**
 * When a badge was earned, as printed: "11 Oct", or "By 11 Oct" for a badge
 * saved quietly (the launch back-fill, or a newer catalogue's fill): it was
 * already held by then, and that is all the app knows (UX P6). Spoken the same way.
 */
export function earnedWhen(m: CaseMark, quiet: Quiet = NO_QUIET): string | undefined {
  if (m.earnedAt === undefined) return undefined;
  return isQuiet(m, quiet) ? `By ${shortDate(m.earnedAt)}` : shortDate(m.earnedAt);
}

/** The short line under a medallion: when it was earned, or how close it is. */
export function cellLine(m: CaseMark, showProgress: boolean, quiet: Quiet = NO_QUIET): string | undefined {
  if (m.status === 'earned') {
    const when = earnedWhen(m, quiet);
    // After a tier's name it reads on: "Clay · by 11 Oct".
    return [tierName(m), m.tier ? when?.replace(/^By /, 'by ') : when].filter(Boolean).join(' · ') || 'Earned';
  }
  if (m.status === 'gated') return 'Opens later';
  if (!showProgress) return undefined;
  // Firm Footing: its gap ("62% → 70%"); the weight has its own line.
  if (m.domain) return m.detail.split(' · ')[0];
  return m.detail;
}

/** "Earned 11 Oct", or "Earned by 11 Oct" for a back-filled badge. */
export const earnedLine = (m: CaseMark, quiet: Quiet = NO_QUIET) => {
  const when = earnedWhen(m, quiet);
  return when ? `Earned ${when.replace(/^By /, 'by ')}` : 'Earned';
};

/** Inside its own shelf a tier's words are enough: "10 days", "75 recalls", "2 mocks", "80%". */
export const tierCaption = (m: CaseMark) => m.tierLabel ?? m.caption;

/** The spoken label for one medallion (the art says nothing itself). */
export function cellSpoken(m: CaseMark, setName: string, showProgress: boolean, quiet: Quiet = NO_QUIET): string {
  const parts = [m.name + (m.tier ? `, ${tierName(m)}` : '')];
  if (m.stretch) parts.push('Stretch, beyond exam need');
  parts.push(m.status === 'earned' ? earnedLine(m, quiet) : 'Not yet');
  parts.push(m.rule.replace(/\.$/, ''));
  if (m.status === 'gated') parts.push(m.gateLine!.replace(/\.$/, ''));
  else if (m.status !== 'earned' && showProgress && m.detail) parts.push(spokenDetail(m.detail));
  if (m.domain) parts.push(`${m.domain.weight}% of the exam`);
  parts.push(setName);
  return `${parts.join('. ')}.`;
}

/** What a cell or row needs to open its sheet: a stable callback, keyed by the mark (so memo holds). */
type OnOpen = (key: string) => void;

// ── One specimen on a herbarium sheet (mobile 1.51, Field Guide §21) ────
/** The specimen's name: a Firm Footing leaf by its domain, a ladder by its badge ("Rooted"), else the caption. */
function specimenName(m: CaseMark, domain: DomainInfo | undefined, showSet?: boolean): string {
  if (domain) return showSet ? m.name : domain.short;
  if (m.tier && !showSet) return m.name.split(' · ')[0];
  return m.caption;
}

/** The label's last line: "Pressed 3 Oct" (or "Pressed by 3 Oct"), the gate, or how close it is. */
export function specimenLine(m: CaseMark, showProgress: boolean, quiet: Quiet = NO_QUIET): string | undefined {
  if (m.status === 'earned') {
    const when = earnedWhen(m, quiet);
    return when ? `Pressed ${when.replace(/^By /, 'by ')}` : 'Pressed';
  }
  if (m.status === 'gated') return m.gateLine?.replace(/\.$/, '') ?? 'Opens later';
  if (!showProgress) return undefined;
  if (m.domain) return m.detail.split(' · ')[0];
  return m.detail;
}

/** A sheet's specimens are pressed at slightly different sizes and drops, as real ones are. */
const DROP = [0, 12, 4];

export function BadgeCell({
  mark,
  setName,
  width,
  size,
  domains,
  onOpen,
  press,
  showSet,
  showProgress = true,
  quiet,
  index = 0,
}: {
  mark: CaseMark;
  setName: string;
  width: number;
  /** The emblem's size (56 in three columns). */
  size: number;
  domains: readonly DomainInfo[];
  onOpen: OnOpen;
  /** Earned since the case was last opened: it is pressed in after this many ms. */
  press?: number;
  /** Flat sorts: the set's name under the label. */
  showSet?: boolean;
  showProgress?: boolean;
  /** When the back-fill ran: badges stamped then read "Pressed by 11 Oct". */
  quiet?: Quiet;
  /** Its place on the sheet (its size and drop vary a little with it). */
  index?: number;
}) {
  const { c } = useTheme();
  const domain = mark.domain ? domains.find((d) => d.id === mark.domain!.id) : undefined;
  const props = medallionProps(mark, domains, showProgress);
  return (
    <Specimen
      badge={props.badge}
      tier={mark.tier}
      tiers={mark.tiers}
      emblem={props.emblem}
      state={props.state}
      name={specimenName(mark, domain, showSet)}
      tierCaption={mark.tier ? tierCaption(mark) : undefined}
      line={specimenLine(mark, showProgress, quiet)}
      width={width}
      size={index % 3 === 0 ? size : size - 6}
      offset={DROP[index % 3]}
      press={press}
      onPress={() => onOpen(mark.key)}
      spoken={cellSpoken(mark, setName, showProgress, quiet)}
      extra={
        <>
          {domain && mark.domain && (
            // The domain's blueprint weight, with its tone dot (the dot is never alone: the name is above).
            <Row gap={6} style={{ marginTop: 2, justifyContent: 'center' }}>
              <DomainDot domain={domain} />
              <FieldText v="small" style={{ flexShrink: 1 }}>{mark.stretch ? `${mark.tierLabel} mastery` : `${mark.domain.weight}% of exam`}</FieldText>
            </Row>
          )}
          {showSet && (
            // Flat sorts have no sheet heading, so a Stretch tier says so here, in words.
            <FieldText v="small" center color={c.muted}>{mark.stretch ? `${setName} · Stretch` : setName}</FieldText>
          )}
        </>
      }
    />
  );
}
/** The cell, memoised (the herbarium's sheets): only cells whose mark, size or press changed re-render. */
export const BadgeCellMemo = memo(BadgeCell);

// ── One row (very large text, and a flat sort's list) ────────────────────
export function BadgeListRow({
  mark,
  setName,
  domains,
  onOpen,
  press,
  last,
  showSet,
  showProgress = true,
  quiet,
  size = 40,
  extra,
}: {
  mark: CaseMark;
  setName: string;
  domains: readonly DomainInfo[];
  onOpen: OnOpen;
  press?: number;
  last?: boolean;
  showSet?: boolean;
  showProgress?: boolean;
  quiet?: Quiet;
  size?: number;
  /** Under the text (a progress bar). */
  extra?: React.ReactNode;
}) {
  const { c } = useTheme();
  const touch = usePressScale({ scale: 1, tint: c.soft });
  const line = specimenLine(mark, showProgress, quiet);
  const props = medallionProps(mark, domains, showProgress);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={cellSpoken(mark, setName, showProgress, quiet)}
      accessibilityHint="Opens its details"
      onPress={() => onOpen(mark.key)}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ flexDirection: 'row', gap: space.md, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, alignItems: 'center' }, touch.style]}
    >
      {touch.layer}
      <SpecimenMount badge={props.badge} tier={mark.tier} emblem={props.emblem} state={props.state} size={size} press={press} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label">{mark.name}{mark.tier ? ` · ${tierName(mark)}` : ''}</T>
        {line && (
          <T v="meta" num color={mark.status === 'earned' ? c.accentText : c.ink2} style={{ marginTop: 2 }}>
            {`${mark.stretch ? 'Stretch · ' : ''}${mark.status !== 'earned' && mark.domain ? `${mark.domain.weight}% of the exam · ${line}` : line}`}
          </T>
        )}
        {showSet && <T v="meta" color={c.muted}>{setName}</T>}
        {extra}
      </View>
    </AnimatedPressable>
  );
}
/** The row, memoised (the herbarium's large-text list). */
export const BadgeListRowMemo = memo(BadgeListRow);

// ── A sheet's heading ────────────────────────────────────────────────────
/** "Sheet I · Groundwork · 2 of 3 pressed", its purpose in italics; said as before ("Groundwork, 2 of 3"). */
export function ShelfHeader({ set, no, quiet = NO_QUIET, grown, children }: { set: SetView; no: string; line?: string; quiet?: Quiet; grown?: string; children?: React.ReactNode }) {
  const complete = set.completeAt !== undefined;
  // A set a quiet fill completed: "by 11 Oct" (it was already complete then).
  const when = complete ? `${quiet.includes(set.completeAt!) ? 'by ' : ''}${shortDate(set.completeAt!)}` : '';
  const spoken = complete ? `${setSpoken(set)}, ${when}` : setSpoken(set);
  const counted = set.info.counter && set.total > 0;
  return (
    <HerbariumSheet
      no={no}
      name={set.info.name}
      earned={counted ? set.earned : undefined}
      total={counted ? set.total : undefined}
      complete={complete ? when : undefined}
      purpose={set.info.purpose}
      spoken={spoken}
      // A set that was complete and has since gained badges (UX O3): said plainly, never as a loss.
      note={grown}
    >
      {children}
    </HerbariumSheet>
  );
}

/**
 * A set's Stretch row: a hairline and "Stretch · beyond exam need · 0 of 5"
 * above its own small group (badges_game.md §2.1). Never counted in the set.
 */
export function StretchHeader({ set }: { set: SetView }) {
  const { c } = useTheme();
  const line = stretchLine(set);
  if (!line) return null;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`${line.replace(/ · /g, ', ')}. Extra, never needed to feel done.`} style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.line }}>
      <FieldText v="head">{line}</FieldText>
    </View>
  );
}

// ── Still to collect · for your exam ─────────────────────────────────────
/** The line under a badge's name: a domain's weight and gap, or the progress. */
function bestMeta(m: CaseMark): string {
  if (m.domain) {
    const [gap] = m.detail.split(' · ');
    return `${m.domain.weight}% of the exam · ${gap}`;
  }
  // A badge with no partial progress ("Not yet"): its rule says what to do.
  return m.progress > 0 ? m.detail : m.rule;
}

/** The heading over the rows: what they are for. */
export const COLLECT_TITLE = 'Still to collect · for your exam';

/**
 * Still to collect (mobile 1.51; was the "Next for your exam" forest panel): the badge that helps
 * the exam most right now, then the two nearest, as ruled rows on the paper: a pencilled mount with
 * the emblem's outline, the name, why it helps now, a progress bar when there is one, and "Study
 * for this ›". The first row's study note says what a tap starts. Forest stays on primary buttons.
 */
export function NextPanel({
  best,
  nearest,
  setName,
  domains,
  dueCount,
  weakest,
  onOpen,
  onStudy,
  barFrom,
}: {
  best?: CaseMark;
  nearest: CaseMark[];
  setName: (m: CaseMark) => string;
  domains: readonly DomainInfo[];
  dueCount: number;
  weakest?: string;
  onOpen: OnOpen;
  onStudy: (target: StudyTarget) => void;
  /** Where each bar was last seen (it grows from there), by mark key. */
  barFrom?: (key: string) => number | undefined;
}) {
  const { c } = useTheme();
  if (!best && nearest.length === 0) return null;
  // Only Stretch tiers left (every core badge they belong to is done): never
  // "for your exam", which would call depth beyond exam need a next step.
  const extraOnly = !best && nearest.every((m) => m.stretch);
  const rows = [...(best ? [best] : []), ...nearest];
  return (
    <View style={{ marginTop: space.xl }} testID="still-to-collect">
      <FieldText v="head" accessibilityRole="header">{extraOnly ? 'If you want to go further' : COLLECT_TITLE}</FieldText>
      {extraOnly && (
        <T v="meta" color={c.ink2} style={{ marginTop: space.xs }}>
          These go beyond what the exam needs. Entirely optional.
        </T>
      )}
      <View style={{ marginTop: space.sm }}>
        {rows.map((m, k) => {
          const target = studyTarget(m, weakest);
          const note = target ? studyNote(m, target, dueCount) : undefined;
          const props = medallionProps(m, domains);
          const why = bestMeta(m);
          return (
            <View key={m.key}>
              <CollectRow
                badge={props.badge}
                tier={m.tier}
                emblem={props.emblem}
                name={m === best ? m.name : `${m.name}${m.tier ? ` · ${tierName(m)}` : ''}`}
                why={`${m.stretch ? 'Stretch · ' : ''}${why}`}
                spoken={m === best ? `For your exam: ${cellSpoken(m, setName(m), true)}` : cellSpoken(m, setName(m), true)}
                onPress={() => onOpen(m.key)}
                last={k === rows.length - 1 && !target}
              >
                {m.progress > 0 && (
                  <View style={{ marginTop: space.sm }}>
                    <ProgressBar value={m.progress} height={6} from={barFrom?.(m.key)} delay={motion.dur.screen} />
                  </View>
                )}
              </CollectRow>
              {target && (
                <View style={{ alignItems: 'flex-end', paddingBottom: space.xs, borderBottomWidth: k === rows.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
                  {note && <T v="meta" color={c.ink2} style={{ alignSelf: 'stretch', marginLeft: 54 }}>{note}</T>}
                  {m.stretch ? (
                    <Button kind="ghost" label="Go further ›" accessibilityLabel={`Go further: ${m.name}. Optional, beyond exam need`} onPress={() => onStudy(target)} />
                  ) : (
                    <Button kind="ghost" label="Study for this ›" accessibilityLabel={`Study for ${m.name}`} accessibilityHint={note} onPress={() => onStudy(target)} />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── The detail sheet ─────────────────────────────────────────────────────
/**
 * The share card's words for an earned mark, or null when it can't be
 * shared (a Moment, a badge on the never-share list, an empty skill line, or a line that fails the
 * honesty check). Built BEFORE Share is offered, inside a try, so a future
 * cert name or date that trips the check hides Share instead of crashing
 * the sheet. The card carries the plain badge name ("Firm Footing"); its
 * tier line and skill line carry the domain and the numbers.
 */
export function cardText(mark: CaseMark, cert: ShareCert, quiet: Quiet = NO_QUIET): BadgeCardText | null {
  if (mark.status !== 'earned' || mark.earnedAt === undefined) return null;
  const badge = {
    badge: mark.badge,
    name: badgeDef(mark.badge)?.name ?? mark.name,
    ...(mark.tier ? { tierLine: `${tierName(mark)} · tier ${mark.tier} of ${mark.tiers ?? 3}` } : {}),
    skill: mark.skill,
    set: mark.set,
    status: mark.status,
    earnedOn: `${isQuiet(mark, quiet) ? 'by ' : ''}${longDate(mark.earnedAt)}`,
  };
  if (!badgeShareable(badge)) return null;
  try {
    return badgeCardText(badge, cert, STORE_LINK);
  } catch {
    return null;
  }
}

/**
 * The medallion turns in once as the sheet opens, from edge-on to facing you
 * (400 ms), like a coin turned in the hand. It never shows its back, so an
 * emblem is never mirrored (UX P13). Still under Reduce Motion.
 */
export const TURN_MS = 400;
function Turn({ children }: { children: React.ReactNode }) {
  const { reduced } = useMotion();
  const a = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    a.set(withTiming(1, { duration: TURN_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
  }, [a, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateY: `${(1 - a.value) * -90}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function BadgeSheet({
  mark,
  set,
  ladder,
  domains,
  stage,
  daysLeft,
  dueCount,
  weakest,
  wholeMap = false,
  showProgress,
  quiet = NO_QUIET,
  visible = true,
  cert,
  plantLine,
  onClose,
  onDismissed,
  onStudy,
}: {
  mark: CaseMark;
  set: SetView;
  /** Rooted's tiers, lowest first (a ladder of shape + words). */
  ladder?: CaseMark[];
  domains: readonly DomainInfo[];
  stage: Stage;
  daysLeft: number | null;
  dueCount: number;
  weakest?: string;
  /** Whole Map is earned (mock badges are then suggested at any stage). */
  wholeMap?: boolean;
  showProgress: boolean;
  /** When the back-fill ran (a badge stamped then: "Already earned when badges arrived"). */
  quiet?: Quiet;
  /** False while it slides away (it stays mounted so it can say when it has gone). */
  visible?: boolean;
  onClose: () => void;
  /** iOS: the sheet has finished sliding away (Study for this navigates only then). */
  onDismissed?: () => void;
  onStudy: (target: StudyTarget) => void;
  /** The exam, for the share card's "Studying for the CISA® exam" and its notice. */
  cert?: ShareCert;
  /**
   * Mobile 1.14: the badge's keepsake on the learner's plant ("On your plant:
   * the lantern."), one quiet line on an earned badge. Unset: no plant, the
   * plant is hidden, or the badge gives no keepsake.
   */
  plantLine?: string | null;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const title = useRef<View>(null);
  const [opened] = useState(() => Date.now());
  useEffect(() => moveFocus(title, 450), [opened]);
  const earned = mark.status === 'earned';
  // Share (slice D): earned, shareable badges only, on the learner's tap.
  // The card replaces the details in this same sheet (never a sheet over a sheet).
  const [sharing, setSharing] = useState(false);
  const detailsTop = useRef<View>(null);
  const shareText = earned && cert ? cardText(mark, cert, quiet) : null;
  // Android back on the card returns to the badge, like "Back to the badge" (never closes the whole sheet).
  const backFromShare = () => {
    setSharing(false);
    moveFocus(detailsTop, 300);
  };
  const target = studyTarget(mark, weakest);
  const note = target ? studyNote(mark, target, dueCount) : undefined;
  const best = suggestLine(mark, stage, daysLeft, wholeMap);
  const quietly = earned && isQuiet(mark, quiet);
  // "This completed Groundwork": only the one badge that did, and never for a set a quiet fill completed (the order is unknown).
  const completedHere = earned && !quietly && completingMark(set) === mark.key;
  // The ladder's "next": the first core tier not yet earned, whichever tier was
  // opened. A Stretch tier is never "Next": it is beyond what the exam needs.
  const nextTier = ladder?.find((t) => t.status !== 'earned' && !t.stretch)?.key;
  const metaParts = [
    set.info.name,
    mark.tier ? `${tierName(mark)}, tier ${mark.tier} of ${mark.tiers ?? ladder?.length ?? 3}` : undefined,
    mark.domain ? `${mark.domain.weight}% of the exam` : undefined,
  ].filter(Boolean);
  const earnedCaption = quietly ? `Already earned when this badge arrived (by ${shortDate(mark.earnedAt!)})` : mark.earnedAt !== undefined ? `Earned ${shortDate(mark.earnedAt)}` : 'Earned';
  return (
    <Modal visible={visible} animationType={reduced ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={sharing ? backFromShare : onClose} onDismiss={onDismissed}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.raised2 }}>
        <ScrollView key={sharing ? 'share' : 'details'} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.xs }}>
            <Button kind="ghost" label="Close" accessibilityLabel={`Close ${mark.name}`} onPress={onClose} />
          </View>
          {sharing && shareText ? (
            <BadgeSharePanel text={shareText} art={<Medallion {...medallionProps(mark, domains, false)} size={124} />} onBack={backFromShare} />
          ) : (
            <>
              <View style={{ alignItems: 'center' }}>
                <Turn>
                  <Medallion {...medallionProps(mark, domains, showProgress)} size={160} />
                </Turn>
                <View
                  ref={title}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`${mark.name}. ${earned ? earnedLine(mark, quiet) : 'Not yet'}. ${metaParts.join(', ')}.${mark.stretch ? ' Stretch, beyond exam need.' : ''}`}
                  style={{ marginTop: space.lg, alignItems: 'center' }}
                >
                  <T v="hero" center>{mark.name}</T>
                  <T v="meta" center color={c.ink2} style={{ marginTop: space.xs }}>
                    {metaParts.join(' · ')}
                  </T>
                  {mark.stretch && (
                    // The Stretch tag, in words (never a colour or a ring alone).
                    <T v="caption" center color={c.accentText} style={{ marginTop: space.xs }}>{STRETCH}</T>
                  )}
                </View>
              </View>

              {earned && (
                <View style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }} accessible>
                  <T v="caption" color={c.accentText}>{earnedCaption}</T>
                  <T v="quote" style={{ marginTop: space.xs }}>{mark.unlock}</T>
                  {completedHere && (
                    <T v="meta" color={c.ink2} style={{ marginTop: space.sm }}>
                      {`This completed ${set.info.name} on ${shortDate(set.completeAt!)}.`}
                    </T>
                  )}
                  {/* One quiet line, no banner, no count (mobile 1.14). */}
                  {plantLine ? (
                    <T v="meta" color={c.ink2} style={{ marginTop: space.sm }}>
                      {plantLine}
                    </T>
                  ) : null}
                </View>
              )}

              {ladder && ladder.length > 1 && (
                <View
                  style={{ marginTop: space.xl }}
                  accessible
                  accessibilityLabel={ladder
                    .map(
                      (t) =>
                        `${tierCaption(t)}, ${tierName(t)}${t.stretch ? ', Stretch' : ''}: ${t.status === 'earned' ? earnedLine(t, quiet).replace(/^Earned/, 'earned') : t.status === 'gated' ? t.gateLine!.replace(/\.$/, '').toLowerCase() : showProgress ? spokenDetail(t.detail) : 'not yet'}${t.key === nextTier && showProgress ? ', next' : ''}`,
                    )
                    .join('. ')}
                >
                  <T v="caption" color={c.ink2}>Tiers</T>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
                    {ladder.map((t) => (
                      <View key={t.key} style={{ alignItems: 'center', flex: 1 }}>
                        <Medallion {...medallionProps(t, domains, showProgress)} size={56} />
                        <T v="label" center style={{ marginTop: space.xs }}>{tierName(t)!}</T>
                        <T v="meta" num center color={c.ink2}>{tierCaption(t)}</T>
                        {/* Its state on a line of its own, so neighbouring tiers never run together. */}
                        <T v="meta" center color={t.status === 'earned' ? c.accentText : c.ink2}>
                          {t.status === 'earned' ? 'Earned' : t.status === 'gated' ? 'Opens later' : t.key === nextTier && showProgress ? 'Next' : 'Not yet'}
                        </T>
                        {t.stretch && <T v="caption" center color={c.ink2}>Stretch</T>}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ marginTop: space.xl }}>
                <T v="caption" color={c.ink2} accessibilityRole="header">The rule</T>
                <T v="body" style={{ marginTop: space.xs }}>{mark.rule}</T>
                {!earned && mark.status === 'gated' && (
                  <T v="meta" color={c.ink2} style={{ marginTop: space.sm }}>{mark.gateLine}</T>
                )}
                {!earned && mark.status !== 'gated' && showProgress && (
                  <View style={{ marginTop: space.md }}>
                    {mark.progress > 0 && <ProgressBar value={mark.progress} height={6} />}
                    <T v="meta" num color={c.ink2} accessibilityLabel={spokenDetail(mark.detail)} style={{ marginTop: space.xs }}>{mark.detail}</T>
                  </View>
                )}
              </View>

              {/* After the exam the case is a keepsake album: no "how to earn it", no Study button (UX P8). */}
              {!earned && showProgress && mark.howTo !== '' && (
                <View style={{ marginTop: space.xl }}>
                  <T v="caption" color={c.ink2} accessibilityRole="header">How to earn it</T>
                  <T v="body" style={{ marginTop: space.xs }}>{mark.howTo}</T>
                  {best && <T v="meta" color={c.ink2} style={{ marginTop: space.sm }}>{best === MOCK_SUGGEST_LINE ? `${best} It counts whenever you do it.` : best}</T>}
                </View>
              )}

              <T v="meta" color={c.ink2} style={{ marginTop: space.xl }}>{mark.effort}</T>

              {!earned && showProgress && target && (
                <View style={{ marginTop: space.xl }}>
                  {note && <T v="meta" color={c.ink2} style={{ marginBottom: space.sm }}>{note}</T>}
                  <Button label="Study for this" accessibilityLabel={`Study for ${mark.name}`} onPress={() => onStudy(target)} />
                </View>
              )}

              {/* Earned and shareable only (never Fresh Start or a Moment), on the learner's tap: nothing opens it on its own. */}
              {shareText && (
                <View style={{ marginTop: space.xl }}>
                  <Button
                    ref={detailsTop}
                    kind="secondary"
                    label="Share"
                    accessibilityLabel={`Share ${mark.name}`}
                    accessibilityHint="Shows a card you can share. Nothing is shared until you choose."
                    onPress={() => setSharing(true)}
                    icon={(col) => <Share2 size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
                    iconLeading
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
