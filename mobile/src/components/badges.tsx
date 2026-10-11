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
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DomainInfo } from '../content/types';
import { completingMark, MOCK_SUGGEST_LINE, setSpoken, spokenDetail, studyNote, studyTarget, suggestLine, type CaseMark, type SetView, type StudyTarget } from '../engine/badgeCatalog';
import type { Stage } from '../engine/journey';
import { moveFocus } from '../lib/a11y';
import { shortDate } from '../lib/format';
import { badgeMetal, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Medallion, type MedallionState } from './medallion';
import { AnimatedPressable, Pop, ProgressFill, useMotion, usePressScale } from './motion';
import { Button, DomainDot, HeroPanel, ProgressBar, Row, T } from './ui';

/** The medallion state for a mark (started and open both draw "not yet"; gated is dotted). */
export const medallionState = (m: CaseMark): MedallionState => (m.status === 'earned' ? 'earned' : m.status === 'gated' ? 'gated' : 'open');

/** Rooted's tier material, printed beside it ("Clay"), so the metal is never the only signal. */
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
  };
}

/**
 * When a badge was earned, as printed: "11 Oct", or "By 11 Oct" for a badge
 * the back-fill saved quietly (`quietAt`): it was already held by then, and
 * that is all the app knows (UX P6). Spoken the same way.
 */
export function earnedWhen(m: CaseMark, quietAt?: number): string | undefined {
  if (m.earnedAt === undefined) return undefined;
  return m.earnedAt === quietAt ? `By ${shortDate(m.earnedAt)}` : shortDate(m.earnedAt);
}

/** The short line under a medallion: when it was earned, or how close it is. */
export function cellLine(m: CaseMark, showProgress: boolean, quietAt?: number): string | undefined {
  if (m.status === 'earned') {
    const when = earnedWhen(m, quietAt);
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
export const earnedLine = (m: CaseMark, quietAt?: number) => {
  const when = earnedWhen(m, quietAt);
  return when ? `Earned ${when.replace(/^By /, 'by ')}` : 'Earned';
};

/** Inside Rooted's own shelf the tier is enough: "10 days". */
export const tierCaption = (m: CaseMark) => m.caption.replace(/^Rooted · /, '');

/** The spoken label for one medallion (the art says nothing itself). */
export function cellSpoken(m: CaseMark, setName: string, showProgress: boolean, quietAt?: number): string {
  const parts = [m.name + (m.tier ? `, ${tierName(m)}` : '')];
  parts.push(m.status === 'earned' ? earnedLine(m, quietAt) : 'Not yet');
  parts.push(m.rule.replace(/\.$/, ''));
  if (m.status === 'gated') parts.push(m.gateLine!.replace(/\.$/, ''));
  else if (m.status !== 'earned' && showProgress && m.detail) parts.push(spokenDetail(m.detail));
  if (m.domain) parts.push(`${m.domain.weight}% of the exam`);
  parts.push(setName);
  return `${parts.join('. ')}.`;
}

/** What a cell or row needs to open its sheet: a stable callback, keyed by the mark (so memo holds). */
type OnOpen = (key: string) => void;

// ── One cell of the grid ─────────────────────────────────────────────────
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
  quietAt,
}: {
  mark: CaseMark;
  setName: string;
  width: number;
  /** The medallion's size (88 in three columns). */
  size: number;
  domains: readonly DomainInfo[];
  onOpen: OnOpen;
  /** Earned since the case was last opened: it presses in after this many ms. */
  press?: number;
  /** Flat sorts: the set's name under the line. */
  showSet?: boolean;
  showProgress?: boolean;
  /** When the back-fill ran: badges stamped then read "By 11 Oct". */
  quietAt?: number;
}) {
  const { c } = useTheme();
  const touch = usePressScale({});
  const line = cellLine(mark, showProgress, quietAt);
  const domain = mark.domain ? domains.find((d) => d.id === mark.domain!.id) : undefined;
  // Firm Footing's leaves are named by domain; in a flat sort they also keep the badge's name.
  const caption = domain ? (showSet ? `Firm Footing · ${domain.short}` : domain.short) : showSet || !mark.tier ? mark.caption : tierCaption(mark);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={cellSpoken(mark, setName, showProgress, quietAt)}
      accessibilityHint="Opens its details"
      onPress={() => onOpen(mark.key)}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ width, alignItems: 'center', paddingVertical: space.sm, minHeight: 48 }, touch.style]}
    >
      <Pop mount={press !== undefined} from={0.4} delay={press ?? 0}>
        <Medallion {...medallionProps(mark, domains, showProgress)} size={size} />
      </Pop>
      <T v="label" center style={{ marginTop: space.xs }}>{caption}</T>
      {domain && mark.domain && (
        // The domain's blueprint weight, with its tone dot (the dot is never alone: the name is above).
        <Row gap={6} style={{ marginTop: 2, justifyContent: 'center' }}>
          <DomainDot domain={domain} />
          <T v="meta" num color={c.ink2} style={{ flexShrink: 1 }}>{`${mark.domain.weight}% of exam`}</T>
        </Row>
      )}
      {line && (
        <T v="meta" num center color={mark.status === 'earned' ? c.accentText : c.ink2} style={{ marginTop: 2 }}>
          {line}
        </T>
      )}
      {showSet && (
        <T v="meta" center color={c.muted} style={{ marginTop: 2 }}>
          {setName}
        </T>
      )}
    </AnimatedPressable>
  );
}
/** The cell, memoised (the case's grid): only cells whose mark, size or press changed re-render. */
export const BadgeCellMemo = memo(BadgeCell);

// ── One row (large text, and "Next for your exam" slots 2–3) ─────────────
export function BadgeListRow({
  mark,
  setName,
  domains,
  onOpen,
  press,
  last,
  showSet,
  showProgress = true,
  quietAt,
  size = 48,
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
  quietAt?: number;
  size?: number;
  /** Under the text (a progress bar). */
  extra?: React.ReactNode;
}) {
  const { c } = useTheme();
  const touch = usePressScale({ scale: 1, tint: c.soft });
  const line = cellLine(mark, showProgress, quietAt);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={cellSpoken(mark, setName, showProgress, quietAt)}
      accessibilityHint="Opens its details"
      onPress={() => onOpen(mark.key)}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ flexDirection: 'row', gap: space.md, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, alignItems: 'center' }, touch.style]}
    >
      {touch.layer}
      <Pop mount={press !== undefined} from={0.4} delay={press ?? 0}>
        <Medallion {...medallionProps(mark, domains, showProgress)} size={size} />
      </Pop>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label">{mark.name}{mark.tier ? ` · ${tierName(mark)}` : ''}</T>
        {line && (
          <T v="meta" num color={mark.status === 'earned' ? c.accentText : c.ink2} style={{ marginTop: 2 }}>
            {mark.status === 'earned' ? earnedLine(mark, quietAt) : mark.domain ? `${mark.domain.weight}% of the exam · ${line}` : line}
          </T>
        )}
        {showSet && <T v="meta" color={c.muted}>{setName}</T>}
        {extra}
      </View>
    </AnimatedPressable>
  );
}
/** The row, memoised (the case's large-text list). */
export const BadgeListRowMemo = memo(BadgeListRow);

// ── A shelf's header ─────────────────────────────────────────────────────
export function ShelfHeader({ set, line, quietAt }: { set: SetView; line?: string; quietAt?: number }) {
  const { c } = useTheme();
  const complete = set.completeAt !== undefined;
  // A set the back-fill completed: "by 11 Oct" (it was already complete then).
  const when = complete ? `${set.completeAt === quietAt ? 'by ' : ''}${shortDate(set.completeAt!)}` : '';
  return (
    <View style={{ marginTop: space.section }}>
      <View accessible accessibilityRole="header" accessibilityLabel={complete ? `${setSpoken(set)}, ${when}` : setSpoken(set)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: space.md }}>
        <T v="headline" style={{ flexShrink: 1 }}>{set.info.name}</T>
        {line && (
          <T v="meta" num color={complete ? c.accentText : c.ink2}>
            {complete ? `${line} · ${when}` : line}
          </T>
        )}
      </View>
      <T v="meta" color={c.ink2} style={{ marginTop: 2 }}>
        {set.info.purpose}
      </T>
    </View>
  );
}

// ── Next for your exam ───────────────────────────────────────────────────
/** The forest panel's line under the name: a domain's weight and gap, or the progress. */
function bestMeta(m: CaseMark): string {
  if (m.domain) {
    const [gap] = m.detail.split(' · ');
    return `${m.domain.weight}% of the exam · ${gap}`;
  }
  // A badge with no partial progress ("Not yet"): its rule says what to do.
  return m.progress > 0 ? m.detail : m.rule;
}

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
  const bestTarget = best ? studyTarget(best, weakest) : null;
  const bestNote = best && bestTarget ? studyNote(best, bestTarget, dueCount) : undefined;
  return (
    <View style={{ marginTop: space.xl }}>
      {best && (
        <HeroPanel
          caption="Next for your exam"
          title={best.name}
          // The heading is spoken with its context: "Next for your exam: Dress Rehearsal" (UX P10).
          titleLabel={`Next for your exam: ${best.name}`}
          meta={bestMeta(best)}
          metaLabel={spokenDetail(bestMeta(best))}
          art="frond"
          sway={false}
          action={
            bestTarget
              ? {
                  label: 'Study for this',
                  onPress: () => onStudy(bestTarget),
                  hint: `Studies for ${best.name}${bestNote ? `. ${bestNote}` : ''}`,
                }
              : undefined
          }
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cellSpoken(best, setName(best), true)}
            accessibilityHint="Opens its details"
            onPress={() => onOpen(best.key)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, minHeight: 48 }}
          >
            {/* On the forest panel: on-forest inks, so a not-yet badge keeps 3:1 (UX review H1). */}
            <Medallion {...medallionProps(best, domains)} size={56} surface="forest" />
            <View style={{ flex: 1, minWidth: 0 }}>
              {best.progress > 0 ? (
                <>
                  <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: c.forestTrack }}>
                    <ProgressFill value={best.progress} color={c.sap} radius={3} from={barFrom?.(best.key)} delay={motion.dur.screen} />
                  </View>
                  {/* Firm Footing's answer count (the gap is in the line above); others' progress is that line. */}
                  {best.domain && (
                    <T v="meta" num color={c.onForest2} style={{ marginTop: space.xs }}>
                      {best.detail.split(' · ')[1] ?? ''}
                    </T>
                  )}
                </>
              ) : (
                // Nothing to fill yet (a mock badge): what it takes, instead of an empty bar.
                <T v="meta" color={c.onForest2}>{best.effort}</T>
              )}
            </View>
          </Pressable>
          {bestNote && (
            <T v="meta" color={c.onForest2} style={{ marginTop: space.sm }}>
              {bestNote}
            </T>
          )}
        </HeroPanel>
      )}
      {nearest.map((m, k) => {
        const target = studyTarget(m, weakest);
        const note = target ? studyNote(m, target, dueCount) : undefined;
        return (
          <View key={m.key} style={{ borderBottomWidth: k === nearest.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <BadgeListRow
              mark={m}
              setName={setName(m)}
              domains={domains}
              onOpen={onOpen}
              size={40}
              last
              extra={
                m.progress > 0 ? (
                  <View style={{ marginTop: space.sm }}>
                    <ProgressBar value={m.progress} height={6} from={barFrom?.(m.key)} delay={motion.dur.screen} />
                  </View>
                ) : undefined
              }
            />
            {target && (
              <View style={{ alignItems: 'flex-end', marginTop: -space.sm, paddingBottom: space.xs }}>
                {note && <T v="meta" color={c.ink2} style={{ alignSelf: 'stretch', marginLeft: 52 }}>{note}</T>}
                <Button kind="ghost" label="Study for this ›" accessibilityLabel={`Study for ${m.name}`} onPress={() => onStudy(target)} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── The detail sheet ─────────────────────────────────────────────────────
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
  quietAt,
  visible = true,
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
  quietAt?: number;
  /** False while it slides away (it stays mounted so it can say when it has gone). */
  visible?: boolean;
  onClose: () => void;
  /** iOS: the sheet has finished sliding away (Study for this navigates only then). */
  onDismissed?: () => void;
  onStudy: (target: StudyTarget) => void;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const title = useRef<View>(null);
  const [opened] = useState(() => Date.now());
  useEffect(() => moveFocus(title, 450), [opened]);
  const earned = mark.status === 'earned';
  const target = studyTarget(mark, weakest);
  const note = target ? studyNote(mark, target, dueCount) : undefined;
  const best = suggestLine(mark, stage, daysLeft, wholeMap);
  const quiet = earned && mark.earnedAt !== undefined && mark.earnedAt === quietAt;
  // "This completed Groundwork": only the one badge that did, and never for a set the back-fill completed (the order is unknown).
  const completedHere = earned && !quiet && completingMark(set) === mark.key;
  // The ladder's "next": the first tier not yet earned, whichever tier was opened.
  const nextTier = ladder?.find((t) => t.status !== 'earned')?.key;
  const metaParts = [set.info.name, mark.tier ? `${tierName(mark)}, tier ${mark.tier} of ${ladder?.length ?? 3}` : undefined, mark.domain ? `${mark.domain.weight}% of the exam` : undefined].filter(Boolean);
  const earnedCaption = quiet ? `Already earned when badges arrived (by ${shortDate(mark.earnedAt!)})` : mark.earnedAt !== undefined ? `Earned ${shortDate(mark.earnedAt)}` : 'Earned';
  return (
    <Modal visible={visible} animationType={reduced ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismissed}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.raised2 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.xs }}>
            <Button kind="ghost" label="Close" accessibilityLabel={`Close ${mark.name}`} onPress={onClose} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Turn>
              <Medallion {...medallionProps(mark, domains, showProgress)} size={160} />
            </Turn>
            <View ref={title} accessible accessibilityRole="header" accessibilityLabel={`${mark.name}. ${earned ? earnedLine(mark, quietAt) : 'Not yet'}. ${metaParts.join(', ')}.`} style={{ marginTop: space.lg, alignItems: 'center' }}>
              <T v="hero" center>{mark.name}</T>
              <T v="meta" center color={c.ink2} style={{ marginTop: space.xs }}>
                {metaParts.join(' · ')}
              </T>
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
            </View>
          )}

          {ladder && ladder.length > 1 && (
            <View
              style={{ marginTop: space.xl }}
              accessible
              accessibilityLabel={ladder
                .map((t) => `${tierCaption(t)}, ${tierName(t)}: ${t.status === 'earned' ? earnedLine(t, quietAt).replace(/^Earned/, 'earned') : showProgress ? spokenDetail(t.detail) : 'not yet'}${t.key === nextTier && showProgress ? ', next' : ''}`)
                .join('. ')}
            >
              <T v="caption" color={c.ink2}>Tiers</T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
                {ladder.map((t) => (
                  <View key={t.key} style={{ alignItems: 'center', flex: 1 }}>
                    <Medallion {...medallionProps(t, domains, showProgress)} size={56} />
                    <T v="label" center style={{ marginTop: space.xs }}>{tierName(t)!}</T>
                    <T v="meta" num center color={t.status === 'earned' ? c.accentText : c.ink2}>
                      {tierCaption(t)}
                      {t.status === 'earned' ? ' · earned' : t.key === nextTier && showProgress ? ' · next' : ''}
                    </T>
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
