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
 * - The detail sheet: the pressed tile (pressed flat once as it opens, still
 *   under Reduce Motion), then the rule, how to earn it (or, once earned, what it
 *   means), one honest effort fact and the button.
 * - Grove Phase 4b (PHASE4B.md 5.1 to 5.3, 5.6): every badge is a pressed paper
 *   tile (components/pressedTile.tsx); each set is ONE card (its name, "2 of 3
 *   pressed", the tiles, its planter line); no roman numbers; "Earned 4 Nov" on
 *   tiles and sheets, said "Earned 4 November"; "Share this badge".
 */
import { memo, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DomainInfo } from '../content/types';
import { completingMark, mockSuggestLine, setSpoken, spokenDetail, STRETCH, stretchLine, studyNote, studyTarget, suggestLine, type CaseMark, type SetView, type StudyTarget } from '../engine/badgeCatalog';
import type { Stage } from '../engine/journey';
import { moveFocus } from '../lib/a11y';
import { longDate, shortDate, spokenShortDate } from '../lib/format';
import { badgeDef, badgeName } from '../engine/milestones';
import { badgeCardText, badgeShareable, type BadgeCardText, type ShareCert } from '../engine/shareCard';
import { STORE_LINK } from '../content/storeLinks';
import { BadgeSharePanel } from './shareCard';
import { grovePlate } from '../theme/grove';
import { badgeMetal, LARGE_TEXT, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import type { MedallionState } from './medallion';
import { AnimatedPressable, useMotion, usePressScale } from './motion';
import { ChevronRight, ICON_STROKE, Share2 } from './icons';
import { Button, DomainDot, groveCard, ICON_SIZE, ProgressBar, Row, T, useFontScale } from './ui';
import { TierLine } from './fieldguide';
import { FeatureInfo } from './featureInfo';
import { PressedTile, type TileState } from './pressedTile';
import { ContentColumn } from './layout';

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
  // Domain Mastery: its gap ("62% → 70%"); the weight has its own line.
  if (m.domain) return m.detail.split(' · ')[0];
  return m.detail;
}

/**
 * How a tile's date is said (PHASE4B 3.4): shown "Earned 4 Nov", said "Earned 4 November"
 * ("Earned by 11 October" for a back-filled badge), so the state is in plain words.
 */
export function pressedSpoken(m: CaseMark, quiet: Quiet = NO_QUIET): string {
  if (m.earnedAt === undefined) return 'Earned';
  return `Earned ${isQuiet(m, quiet) ? 'by ' : ''}${spokenShortDate(m.earnedAt)}`;
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
  // Grove 4b: shown "Earned 3 Oct", said "Earned 3 October" (or "Earned by 3 October"), the date in full.
  parts.push(m.status === 'earned' ? pressedSpoken(m, quiet) : 'Not yet');
  parts.push(m.rule.replace(/\.$/, ''));
  if (m.status === 'gated') parts.push(m.gateLine!.replace(/\.$/, ''));
  else if (m.status !== 'earned' && showProgress && m.detail) parts.push(spokenDetail(m.detail));
  if (m.domain) parts.push(`${m.domain.weight}% of the exam`);
  parts.push(setName);
  return `${parts.join('. ')}.`;
}

/** What a cell or row needs to open its sheet: a stable callback, keyed by the mark (so memo holds). */
type OnOpen = (key: string) => void;

// ── One pressed tile on a set's card (Grove Phase 4b, PHASE4B 5.1 and 5.2) ──
/** The tile's name: a Domain Mastery leaf by its domain, a ladder by its badge ("Rooted"), else the caption. */
function specimenName(m: CaseMark, domain: DomainInfo | undefined, showSet?: boolean): string {
  if (domain) return showSet ? m.name : domain.short;
  if (m.tier && !showSet) return m.name.split(' · ')[0];
  return m.caption;
}

/** The label's last line: "Earned 3 Oct" (or "Earned by 3 Oct"), the gate, or how close it is. */
export function specimenLine(m: CaseMark, showProgress: boolean, quiet: Quiet = NO_QUIET): string | undefined {
  if (m.status === 'earned') {
    const when = earnedWhen(m, quiet);
    return when ? `Earned ${when.replace(/^By /, 'by ')}` : 'Pressed';
  }
  if (m.status === 'gated') return m.gateLine?.replace(/\.$/, '') ?? 'Opens later';
  if (!showProgress) return undefined;
  if (m.domain) return m.detail.split(' · ')[0];
  return m.detail;
}

/** How close a not-yet tile's outline is drawn (the same value as its words); none after the exam. */
export const tileProgress = (m: CaseMark, showProgress: boolean) => (showProgress && m.status === 'started' ? m.progress : 0);

/** A mark's tile state (started and open both draw "not yet"; gated is dotted). */
export const tileState = (m: CaseMark): TileState => medallionState(m);

/**
 * A tile's size on a set's card (PHASE4B 5.1): min(84, cell width - 12), never larger on dark
 * (the cream tile is bright there).
 */
export const caseTileSize = (cellWidth: number) => Math.max(48, Math.min(84, cellWidth - 12));

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
}: {
  mark: CaseMark;
  setName: string;
  /** The cell's width (3 across, 2 from text scale 1.3). */
  width: number;
  /** The tile's side (caseTileSize). */
  size: number;
  domains: readonly DomainInfo[];
  onOpen: OnOpen;
  /** Earned since the case was last opened: it is pressed in after this many ms. */
  press?: number;
  /** Flat sorts: the set's name under the label. */
  showSet?: boolean;
  showProgress?: boolean;
  /** When the back-fill ran: badges stamped then read "Earned by 11 Oct". */
  quiet?: Quiet;
  /** Kept for callers (the old sheet varied sizes by place); every tile is the same size now. */
  index?: number;
}) {
  const { c } = useTheme();
  const touch = usePressScale({});
  const domain = mark.domain ? domains.find((d) => d.id === mark.domain!.id) : undefined;
  const state = tileState(mark);
  const line = specimenLine(mark, showProgress, quiet);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={cellSpoken(mark, setName, showProgress, quiet)}
      accessibilityHint="Opens its details"
      onPress={() => onOpen(mark.key)}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ width, alignItems: 'center', paddingTop: 6, paddingBottom: space.sm, minHeight: 48 }, touch.style]}
    >
      <PressedTile
        badge={mark.badge}
        tier={mark.tier}
        emblem={mark.domain?.emblem}
        state={state}
        size={size}
        progress={tileProgress(mark, showProgress)}
        motion={press !== undefined ? 'press' : 'end'}
        delay={press}
      />
      {/* The name in meta, then the tier in words, the area's weight, and the date or how close. */}
      <T v="meta" center color={c.ink} style={{ marginTop: space.sm }}>
        {specimenName(mark, domain, showSet)}
      </T>
      {mark.tier ? <TierLine tier={mark.tier} tiers={mark.tiers} earned={state === 'earned'} caption={tierCaption(mark)} /> : null}
      {domain && mark.domain && (
        // The domain's blueprint weight, with its area dot (the dot is never alone: the name is above).
        <Row gap={6} style={{ marginTop: 2, justifyContent: 'center' }}>
          <DomainDot domain={domain} />
          <T v="meta" color={c.ink2} style={{ flexShrink: 1 }}>{mark.stretch ? `${mark.tierLabel} mastery` : `${mark.domain.weight}% of the exam`}</T>
        </Row>
      )}
      {line ? (
        <T v="meta" num center color={state === 'earned' ? c.accentText : c.ink2}>
          {line}
        </T>
      ) : null}
      {showSet && (
        // Flat sorts have no set heading, so a Stretch tier says so here, in words.
        <T v="meta" center color={c.muted}>{mark.stretch ? `${setName} · Stretch` : setName}</T>
      )}
    </AnimatedPressable>
  );
}
/** The cell, memoised: only cells whose mark, size or press changed re-render. */
export const BadgeCellMemo = memo(BadgeCell);

// ── One row (text scale 2 and up, and a flat sort's list there) ──────────
export function BadgeListRow({
  mark,
  setName,
  domains: _domains,
  onOpen,
  press,
  last,
  showSet,
  showProgress = true,
  quiet,
  size = 56,
  extra,
  weakest,
  onStudy,
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
  /** The tile's side (56pt in the one-column list). */
  size?: number;
  /** Under the text (a progress bar). */
  extra?: React.ReactNode;
  /** For the row's "Study for this" link (the weakest area for a Domain Mastery leaf). */
  weakest?: string;
  /** Not yet, before the exam: "Study for this" as a text link on the row (PHASE4B 5.1 item 5). */
  onStudy?: (target: StudyTarget) => void;
}) {
  const { c } = useTheme();
  const touch = usePressScale({ scale: 1, tint: c.soft });
  const line = specimenLine(mark, showProgress, quiet);
  const state = tileState(mark);
  const target = onStudy && showProgress && mark.status !== 'earned' && mark.status !== 'gated' ? studyTarget(mark, weakest) : undefined;
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={cellSpoken(mark, setName, showProgress, quiet)}
        accessibilityHint="Opens its details"
        onPress={() => onOpen(mark.key)}
        onPressIn={touch.onPressIn}
        onPressOut={touch.onPressOut}
        style={[{ flexDirection: 'row', gap: space.md, paddingVertical: 12, alignItems: 'center', minHeight: 56 }, touch.style]}
      >
        {touch.layer}
        <PressedTile
          badge={mark.badge}
          tier={mark.tier}
          emblem={mark.domain?.emblem}
          state={state}
          size={size}
          progress={tileProgress(mark, showProgress)}
          motion={press !== undefined ? 'press' : 'end'}
          delay={press}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label">{mark.name}{mark.tier ? ` · ${tierName(mark)}` : ''}</T>
          {line && (
            <T v="meta" num color={state === 'earned' ? c.accentText : c.ink2} style={{ marginTop: 2 }}>
              {`${mark.stretch ? 'Stretch · ' : ''}${mark.status !== 'earned' && mark.domain ? `${mark.domain.weight}% of the exam · ${line}` : line}`}
            </T>
          )}
          {showSet && <T v="meta" color={c.muted}>{setName}</T>}
          {extra}
        </View>
      </AnimatedPressable>
      {target && (
        // A link of its own under the row's words (never a button inside a button).
        <View style={{ paddingLeft: size + space.md, marginTop: -space.sm, marginBottom: space.xs }}>
          {mark.stretch ? (
            <Button kind="ghost" label="Go further ›" accessibilityLabel={`Go further: ${mark.name}. Optional, beyond exam need`} onPress={() => onStudy!(target)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
          ) : (
            <Button kind="ghost" label="Study for this ›" accessibilityLabel={`Study for this: ${mark.name}`} onPress={() => onStudy!(target)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
          )}
        </View>
      )}
    </View>
  );
}
/** The row, memoised (the large-text list). */
export const BadgeListRowMemo = memo(BadgeListRow);

// ── A set's card ─────────────────────────────────────────────────────────
/** "2 of 3 pressed", or "3 of 3 · complete 20 Nov". Never a total across sets. */
export function setCountWords(set: SetView, quiet: Quiet = NO_QUIET): string | undefined {
  if (!set.info.counter || set.total <= 0) return undefined;
  if (set.completeAt === undefined) return `${set.earned} of ${set.total} earned`;
  return `${set.earned} of ${set.total} · complete ${quiet.includes(set.completeAt) ? 'by ' : ''}${shortDate(set.completeAt)}`;
}

/**
 * One card per set (PHASE4B 5.1 item 5): the set's name in `headline` with "2 of 3 pressed" in
 * `meta` beside it (said as before, "Groundwork, 2 of 3"), its purpose in `aside`, the "New in"
 * note, the tiles, then the planter line as the card's last row. No roman numbers.
 */
export function ShelfHeader({
  set,
  quiet = NO_QUIET,
  grown,
  children,
}: {
  set: SetView;
  /** Kept for callers: the old sheet number. Never shown. */
  no?: string;
  line?: string;
  quiet?: Quiet;
  grown?: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const complete = set.completeAt !== undefined;
  const spoken = complete ? `${setSpoken(set)}, ${quiet.includes(set.completeAt!) ? 'by ' : ''}${spokenShortDate(set.completeAt!)}` : setSpoken(set);
  const count = setCountWords(set, quiet);
  return (
    <View style={[groveCard(c), { padding: grovePlate.pad, marginTop: space.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View accessible accessibilityRole="header" accessibilityLabel={spoken}
          style={{ flex: 1, flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'baseline', justifyContent: 'space-between', columnGap: space.md, rowGap: 2 }}>
          <T v="headline" style={{ flexShrink: 1 }}>{set.info.name}</T>
          {count ? <T v="meta" num color={c.ink2}>{count}</T> : null}
        </View>
        <FeatureInfo title={set.info.name} label={`About ${set.info.name}`}><T v="body">{set.info.purpose}</T></FeatureInfo>
      </View>
      {/* A set that was complete and has since gained badges (UX O3): said plainly, never as a loss. */}
      {grown ? <T v="meta" color={c.accentText} style={{ marginTop: space.xs }}>{grown}</T> : null}
      <View style={{ marginTop: space.sm }}>{children}</View>

    </View>
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
      <T v="caption" color={c.ink2}>{line}</T>
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
 * Still to collect: the badge that helps the exam most right now, then the two nearest, as rows in
 * one card (Grove F6, dividers between rows): a not-yet tile with its "how close" outline, the name,
 * why it helps now, a progress bar when there is one, and "Study for this ›". The head is `headline` (F4).
 */
export function NextPanel({
  best,
  nearest,
  setName,
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
      <T v="headline" accessibilityRole="header">{extraOnly ? 'If you want to go further' : COLLECT_TITLE}</T>
      {extraOnly && (
        <T v="meta" color={c.ink2} style={{ marginTop: space.xs }}>
          These go beyond what the exam needs. Entirely optional.
        </T>
      )}
      <View style={[groveCard(c), { marginTop: space.sm, paddingHorizontal: grovePlate.pad }]}>
        {rows.map((m, k) => {
          const target = studyTarget(m, weakest);
          const note = target ? studyNote(m, target, dueCount) : undefined;
          return (
            <View key={m.key} style={k > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
              <CollectTileRow
                mark={m}
                name={m === best ? m.name : `${m.name}${m.tier ? ` · ${tierName(m)}` : ''}`}
                why={`${m.stretch ? 'Stretch · ' : ''}${bestMeta(m)}`}
                spoken={m === best ? `For your exam: ${cellSpoken(m, setName(m), true)}` : cellSpoken(m, setName(m), true)}
                onPress={() => onOpen(m.key)}
              >
                {m.progress > 0 && (
                  <View style={{ marginTop: space.sm }}>
                    <ProgressBar value={m.progress} height={6} from={barFrom?.(m.key)} delay={motion.dur.screen} />
                  </View>
                )}
              </CollectTileRow>
              {target && (
                <View style={{ alignItems: 'flex-end', paddingBottom: space.xs }}>
                  {note && <T v="meta" color={c.ink2} style={{ alignSelf: 'stretch', marginLeft: 44 + space.md }}>{note}</T>}
                  {m.stretch ? (
                    <Button kind="ghost" label="Go further ›" accessibilityLabel={`Go further: ${m.name}. Optional, beyond exam need`} onPress={() => onStudy(target)} />
                  ) : (
                    <Button kind="ghost" label="Study for this ›" accessibilityLabel={`Study for this: ${m.name}`} accessibilityHint={note} onPress={() => onStudy(target)} />
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

/** One Still to collect row: the not-yet tile, the name and why, a chevron. One button that opens its details. */
function CollectTileRow({ mark, name, why, spoken, onPress, children }: { mark: CaseMark; name: string; why: string; spoken: string; onPress: () => void; children?: React.ReactNode }) {
  const { c } = useTheme();
  const touch = usePressScale({ scale: 1, tint: c.soft });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint="Opens its details"
      onPress={onPress}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: 12 }, touch.style]}
    >
      {touch.layer}
      <PressedTile badge={mark.badge} tier={mark.tier} emblem={mark.domain?.emblem} state={tileState(mark)} size={44} progress={tileProgress(mark, true)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label">{name}</T>
        <T v="meta" color={c.ink2} style={{ marginTop: 2 }}>{why}</T>
        {children}
      </View>
      <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
    </AnimatedPressable>
  );
}

// ── The detail sheet ─────────────────────────────────────────────────────
/**
 * The share card's words for an earned mark, or null when it can't be
 * shared (a Moment, a badge on the never-share list, an empty skill line, or a line that fails the
 * honesty check). Built BEFORE Share is offered, inside a try, so a future
 * cert name or date that trips the check hides Share instead of crashing
 * the sheet. The card carries the plain badge name ("Domain Mastery"); its
 * tier line and skill line carry the domain and the numbers.
 */
export function cardText(mark: CaseMark, cert: ShareCert, quiet: Quiet = NO_QUIET): BadgeCardText | null {
  if (mark.status !== 'earned' || mark.earnedAt === undefined) return null;
  const badge = {
    badge: mark.badge,
    // The plain badge name in the course's words ("Section Mastery" for a course with sections; CISA unchanged).
    name: badgeDef(mark.badge) ? badgeName(mark.badge, cert) : mark.name,
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
  /** All Domains is earned (mock badges are then suggested at any stage). */
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
  // The course's words: "every section" for a course with sections (CISA: "every domain", as before).
  const best = suggestLine(mark, stage, daysLeft, wholeMap, cert);
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
  // Grove 4b (3.4): "Earned 2 Nov" on the sheet as on the tile (said "Earned 2 November"); a quiet back-fill keeps its own words.
  const earnedCaption = quietly ? `Already earned when this badge arrived (by ${shortDate(mark.earnedAt!)})` : mark.earnedAt !== undefined ? `Earned ${shortDate(mark.earnedAt)}` : 'Pressed';
  // Said with the dates in full ("Earned 11 October … This completed Groundwork on 4 October."; UX review P1).
  const earnedSpoken = earned
    ? [
        quietly ? `Already earned when this badge arrived, by ${spokenShortDate(mark.earnedAt!)}` : mark.earnedAt !== undefined ? `Earned ${spokenShortDate(mark.earnedAt)}` : 'Earned',
        mark.unlock,
        completedHere ? `This completed ${set.info.name} on ${spokenShortDate(set.completeAt!)}.` : null,
      ]
        .filter(Boolean)
        .join('. ')
        .replace(/\.\./g, '.')
    : undefined;
  return (
    <Modal visible={visible} animationType={reduced ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={sharing ? backFromShare : onClose} onDismiss={onDismissed}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.raised2 }}>
        <ContentColumn>
          <ScrollView key={sharing ? 'share' : 'details'} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.xs }}>
              <Button kind="ghost" label="Close" accessibilityLabel={`Close ${mark.name}`} onPress={onClose} />
            </View>
            {sharing && shareText ? (
              // Grove 4b (5.6): the card shows the pressed tile, not the struck medallion.
              <BadgeSharePanel text={shareText} art={<PressedTile badge={mark.badge} tier={mark.tier} emblem={mark.domain?.emblem} state="earned" size={112} />} onBack={backFromShare} />
            ) : (
              <>
                <View style={{ alignItems: 'center' }}>
                  {/* Grove 4b (5.3): the pressed tile at 120pt. An earned one is pressed flat as the sheet opens
                      (1.06 to 1, then its tape); Reduce Motion shows it flat at once. Not yet: its "how close" outline. */}
                  <PressedTile
                    testID="sheet-tile"
                    badge={mark.badge}
                    tier={mark.tier}
                    emblem={mark.domain?.emblem}
                    state={medallionState(mark)}
                    size={120}
                    progress={showProgress && mark.status === 'started' ? mark.progress : 0}
                    motion={earned && !reduced ? 'press' : 'end'}
                  />
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
                  // No 3pt accent rule: that rule is the coach's voice only (spec §5); this is an award.
                  <View style={{ marginTop: space.xl }} accessible accessibilityLabel={earnedSpoken}>
                    <T v="caption" color={c.accentText}>{earnedCaption}</T>
                    <T v="aside" style={{ marginTop: space.xs }}>{mark.unlock}</T>
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
                      .map(
                        (t) =>
                          `${tierCaption(t)}, ${tierName(t)}${t.stretch ? ', Stretch' : ''}: ${t.status === 'earned' ? earnedLine(t, quiet).replace(/^Earned/, 'earned') : t.status === 'gated' ? t.gateLine!.replace(/\.$/, '').toLowerCase() : showProgress ? spokenDetail(t.detail) : 'not yet'}${t.key === nextTier && showProgress ? ', next' : ''}`,
                      )
                      .join('. ')}
                  >
                    <T v="headline">Tiers</T>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
                      {ladder.map((t) => (
                        <View key={t.key} style={{ alignItems: 'center', flex: 1 }}>
                          {/* A 64pt pressed tile per tier (the reached ones pressed), its pips and its metal's name printed (never colour alone). */}
                          <PressedTile badge={t.badge} tier={t.tier} emblem={t.domain?.emblem} state={medallionState(t)} size={64} progress={showProgress && t.status === 'started' ? t.progress : 0} />
                          <View style={{ marginTop: space.xs }}>
                            <TierLine tier={t.tier ?? 0} tiers={ladder.length} earned={t.status === 'earned'} />
                          </View>
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
                  <T v="headline" accessibilityRole="header">The rule</T>
                  <T v="small" style={{ marginTop: space.xs }}>{mark.rule}</T>
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

                <View style={{ marginTop: space.md }}>
                  <FeatureInfo inline title="About this milestone" label={`About earning ${mark.name}`}>
                    {!earned && showProgress && mark.howTo !== '' && <T v="body">{mark.howTo}</T>}
                    {best && <T v="body">{best === mockSuggestLine(cert) ? `${best} It counts whenever you do it.` : best}</T>}
                    <T v="body">{mark.effort}</T>
                  </FeatureInfo>
                </View>

                {!earned && showProgress && target && (
                  <View style={{ marginTop: space.xl }}>
                    {note && <T v="meta" color={c.ink2} style={{ marginBottom: space.sm }}>{note}</T>}
                    <Button label="Study for this" accessibilityLabel={`Study for ${mark.name}`} onPress={() => onStudy(target)} />
                  </View>
                )}

                {/* Earned and shareable only (never Study Return or a Moment), on the learner's tap: nothing opens it on its own. */}
                {shareText && (
                  <View style={{ marginTop: space.xl }}>
                    <Button
                      ref={detailsTop}
                      kind="secondary"
                      label="Share this badge"
                      accessibilityLabel={`Share this badge: ${mark.name}`}
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
        </ContentColumn>
      </SafeAreaView>
    </Modal>
  );
}
