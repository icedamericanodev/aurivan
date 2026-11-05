/**
 * Practice: every way to answer questions, in one place.
 *
 * Grove Phase 4 (design-notes/grove/PHASE4.md 7.8; the kit's screens/03-phone-practice.png and
 * reference/03-phone-practice.html). Top to bottom:
 *   1. "Practice" and "Every option explained, every trap named."
 *   2. The jump bar: Questions, Drills and Mock exams. Plain buttons that scroll to their section and
 *      move screen-reader focus to its head (never tabs, and never a "selected" one: the bar is not
 *      sticky, so it would almost always say Questions). A column from text scale 1.3.
 *   3. The Mindset strip, hidden while the phone has no mindset tips (O7).
 *   4. The forest "Picked for you" card: the set it starts, "10 questions · about 12 min", the leaf
 *      glyph tile, three inset tiles (Domains and Count open the path chooser; Timed IS the switch),
 *      the timed note and the mint Start. "Or 10 mixed questions" and the pace offer stay under it.
 *   5. Focus next: Questions to revisit (with its count) and the focus area ("Where you’ll gain most").
 *   6. By domain: five rows that each start a set in that area.
 *   7. Review and saved: All missed questions, All saved questions, Question bank, Build a set (the
 *      kit's Weak spots drill waits for the owner's yes, O8).
 *   8. Drills (components/drills.tsx), then Mock exams (two tiles and the scaled score note). For the
 *      Exam-focused plan and the mock and ready stages, Mock exams moves up under the hero.
 * Every row, count, link and option from the earlier Practice is still here; only the look changed.
 *
 * Kept from earlier releases (still true): the hero starts the learner's study mode (Smart, Guided, In
 * order or Random; engine/studyModes.ts) for the chosen domain and size, with the last choice saved;
 * Timed counts up and never down, starting from Settings' default; the one-time "Practice at exam
 * pace?" offer sits under the hero; session titles use a domain's short name; Build a set is the one
 * place with topic and difficulty; every old Play link opens `/practice?section=drills`, which scrolls
 * to Drills and moves screen-reader focus to its head, once.
 */
import * as Router from 'expo-router';
import { router } from 'expo-router';
import { memo, useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Pressable, useWindowDimensions, View } from 'react-native';
import { ArrowRight, Bookmark, ChevronRight, Compass, Crosshair, ICON_STROKE, Library, RotateCcw, SlidersHorizontal, X } from '../../components/icons';
import { PracticeLeaf } from '../../components/glyphs';
import { AreaDot, CardDivider, CardHead, CountChip, GlyphTile, HeroKicker, HubCard } from '../../components/groveHub';
import { HeroCard, HeroTile } from '../../components/groveToday';
import { AnimatedPressable, Collapse, usePressScale } from '../../components/motion';
import { Drills, DRILLS_MOVED, playedAnyGame } from '../../components/drills';
import { DRILLS_SECTION } from '../../lib/actions';
import { DisclosureRow, FieldLabel, PathChooser } from '../../components/pathChooser';
import { Button, Chip, ChipRow, Enter, Gap, ICON_SIZE, IconCircle, Screen, Segmented, T, useFontScale, useScreenScroll, type ScreenScroll } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { mindsetTipsFor } from '../../content/mindset';
import { scaledScoreNote } from '../../content/scoreNote';
import type { Certification, Difficulty } from '../../content/types';
import { BAND_MIN_ANSWERS, bandOf } from '../../engine/domainBand';
import { topicQuestionIds } from '../../engine/outline';
import { aboutMin, examPaceWords, MINUTES_PER_QUESTION, shouldOfferTimer, spokenMin } from '../../engine/pace';
import { activeMode, MODE_INFO, scopeKey, SESSION_SIZES, sessionSize, suggestedMode, type StudyMode } from '../../engine/studyModes';
import { currentGuidedTopic } from '../../engine/studyPath';
import { guidedStatus, scopeTopics } from '../../lib/outline';
import { shortTopic } from '../../lib/format';
import { guardedStart, reviewSubtitle, startBookmarks, startFocusPractice, startPractice, startReview, startStudy } from '../../lib/sessions';
import { readyToday } from '../../engine/srs';
import { moveFocus } from '../../lib/a11y';
import { useJourney } from '../../lib/useJourney';
import { useDailyMinutes, useSettings } from '../../store/settings';
import { useProgress } from '../../store/progress';
import { useSeen } from '../../store/seen';
import { groveRadius } from '../../theme/grove';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The route's params and this screen's own navigation (absent where a test's expo-router stand-in has none). */
type Nav = { setParams?: (p: { section?: string }) => void };
const useParams: () => { section?: string } = (Router as { useLocalSearchParams?: () => { section?: string } }).useLocalSearchParams ?? (() => ({}));
const useOwnNavigation: () => Nav | undefined = (Router as { useNavigation?: () => Nav }).useNavigation ?? (() => undefined);

const DIFFS: { label: string; value?: Difficulty }[] = [
  { label: 'Any difficulty' },
  { label: 'Foundational', value: 'foundational' },
  { label: 'Application', value: 'application' },
  { label: 'Analysis', value: 'analysis' },
];

/** The set each By domain row starts (the same size as You's and Today's focus sets). */
const DOMAIN_SET = 10;

/**
 * One area's status words on By domain (PHASE4.md 7.8 item 7): "Not started", "Too few yet" under 30
 * answers, then the score with its band word ("72% · Steady"). Exported for tests.
 */
export function domainStatus(answered: number, mastery: number): { text: string; spoken: string } {
  if (answered <= 0) return { text: 'Not started', spoken: 'not started' };
  if (answered < BAND_MIN_ANSWERS) return { text: 'Too few yet', spoken: 'too few yet' };
  const pct = Math.round(mastery * 100);
  return { text: `${pct}% · ${bandOf(pct)}`, spoken: `${pct} percent, ${bandOf(pct)}` };
}

/** The hero's title: the set it starts. Smart and Random name the area, or "A mixed set". Exported for tests. */
export function heroTitle(mode: keyof typeof MODE_INFO, area: string | undefined, guidedTopic?: string): string {
  if (mode === 'guided') return guidedTopic ? `Next topic: ${guidedTopic}` : 'Your next topic';
  if (mode === 'inOrder') return 'Topic by topic';
  return area ?? 'A mixed set';
}

export default function Practice() {
  const { c } = useTheme();
  const { cert, readiness, dueCount, daysLeft, stage, progress, examFocused } = useJourney();
  // An old Play link (?section=drills): Drills scrolls into view once, then the param is cleared, so a
  // later tap on the Practice tab opens at the top as usual. Through Practice's OWN navigation (as Learn).
  const { section } = useParams();
  const navigation = useOwnNavigation();
  // Each jump is a new number (Drills runs it from its own layout): one per arrival with ?section=drills,
  // one per "Go to Drills" or jump bar tap. React's "adjust state when a value changes" pattern, during render.
  const [jumpKey, setJumpKey] = useState(0);
  const [sectionSeen, setSectionSeen] = useState<string | undefined>(undefined);
  if (sectionSeen !== section) {
    setSectionSeen(section);
    if (section === DRILLS_SECTION) setJumpKey((k) => k + 1);
  }
  const jumped = useCallback(() => {
    if (navigation?.setParams) navigation.setParams({ section: undefined });
    else (router as { setParams?: (p: object) => void }).setParams?.({ section: undefined });
  }, [navigation]);
  // Mobile 1.51 (UX review P4): one quiet line for a learner who played games on the old Play tab, once.
  // Seen on "Go to Drills" or the first time Drills is on screen; kept in the seen store's `moments`.
  const playedBefore = useProgress(playedAnyGame);
  const movedSeen = useSeen((s) => (s.moments[DRILLS_MOVED] ?? 0) > 0);
  const movedHint = playedBefore && !movedSeen;
  const seeMoved = useCallback(() => {
    if (!((useSeen.getState().moments[DRILLS_MOVED] ?? 0) > 0)) useSeen.getState().played(DRILLS_MOVED);
  }, []);
  const familiarity = useSettings((s) => s.familiarity);
  // Mock exams right under the hero for the Exam-focused plan and at the mock / ready stages.
  const mocksFirst = examFocused || stage === 'mock' || stage === 'ready';
  // Timed practice: starts from the Study default; this screen's switch can
  // change it for the next start without touching the default.
  const timerDefault = useSettings((s) => s.practiceTimer);
  const paceOffer = useSettings((s) => s.paceOffer);
  const [timedHere, setTimedHere] = useState<boolean | null>(null);
  // A new default (changed in Settings) wins over this screen's last flip (C6).
  // React's "adjust state when a value changes" pattern, during render.
  const [defaultSeen, setDefaultSeen] = useState(timerDefault);
  if (defaultSeen !== timerDefault) {
    setDefaultSeen(timerDefault);
    setTimedHere(null);
  }
  const timed = timedHere ?? timerDefault;
  const timedRef = useRef<View>(null);
  // The switch's current value, not just the default: no offer while it is already on (QA B3).
  const offer = shouldOfferTimer({ daysLeft, stage, answered: paceOffer !== undefined, timerOn: timed });
  const answerOffer = (choice: 'accepted' | 'dismissed') => {
    useSettings.getState().answerPaceOffer(choice);
    // Accepting turns the default on, so the switch follows it; "No thanks"
    // leaves the switch exactly as the learner set it (QA B3).
    if (choice === 'accepted') setTimedHere(null);
    if (choice === 'accepted') AccessibilityInfo.announceForAccessibility('Timed practice is on. Change it any time in Settings.');
    // The card is gone: land on the Timed switch, not on nothing (P9).
    moveFocus(timedRef);
  };
  // ── Your path (Build E): the saved choice wins over the stage's suggestion ──
  const savedMode = useSettings((s) => s.studyMode);
  const savedDomain = useSettings((s) => s.studyDomain);
  const savedSize = useSettings((s) => s.studySize);
  // Never picked a length: sized from the daily minutes (UX review O8).
  const dailyMinutes = useDailyMinutes();
  const mode = activeMode(savedMode, stage, familiarity);
  const suggested = suggestedMode(stage, familiarity);
  // A saved domain this cert doesn't have reads as All domains.
  const pathDomain = cert.domains.find((d) => d.id === savedDomain);
  const pathSize = sessionSize(savedSize, dailyMinutes);
  const guidedTopics = scopeTopics(cert.id, pathDomain?.id);
  const guidedTopic =
    mode === 'guided'
      ? currentGuidedTopic(guidedTopics, progress.studyPath?.guided?.[scopeKey(pathDomain?.id)], (t) => guidedStatus(cert.id, t, progress).clear)
      : undefined;
  // A quick mixed 10 stays one tap away for everyone: offered under the hero
  // whenever the hero isn't already a 10-question mix across all domains.
  const heroIsQuickMix = (mode === 'smart' || mode === 'random') && !pathDomain && pathSize === 10;
  const startQuickMix = () => guardedStart(() => startStudy(cert.id, { mode: 'random', count: 10, timed }), open);
  // The path chooser (opened by the Domains and Count tiles) and Build a set start folded.
  const [pathOpen, setPathOpen] = useState(false);
  const domainsTileRef = useRef<View>(null);
  const chooserHeadRef = useRef<View>(null);
  const heroMeta =
    mode === 'guided'
      ? 'Learn it, practice it, then mix it with earlier topics.'
      : `${pathSize} questions · ${aboutMin(pathSize * MINUTES_PER_QUESTION, true)}${timed ? ' · timed' : ''}`;
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId);

  // ── Jump bar targets ──
  const heroBox = useRef<View>(null);
  const heroHead = useRef<View>(null);
  const mocksBox = useRef<View>(null);
  const mocksHead = useRef<View>(null);
  const jump = useCallback((k: JumpKey, scroll: ScreenScroll | null) => {
    if (k === 'drills') {
      // Drills runs its own jump (scroll and focus) from its layout, as an old Play link does.
      setJumpKey((n) => n + 1);
      return;
    }
    const [box, head] = k === 'questions' ? [heroBox, heroHead] : [mocksBox, mocksHead];
    scroll?.scrollToView(box.current);
    moveFocus(head, 400);
  }, []);

  /** The one-time "Practice at exam pace?" card, under the hero. */
  const paceCard = offer ? (
    // Offered ONCE (behavioural review §2): close to the exam or at the
    // mock / ready stage. Never switched on without the learner's tap.
    <HubCard style={{ marginTop: space.md, paddingBottom: space.md }}>
      <T v="headline" accessibilityRole="header">Practice at exam pace?</T>
      <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
        {`${examPaceWords(cert.exam)} A timer counts up while you answer, never down, and stops while you read the explanation.`}
      </T>
      <Gap h={space.md} />
      <View style={{ gap: space.sm }}>
        {/* Secondary, not primary: an offer, never a push (P3). */}
        <Button kind="secondary" label="Turn on Timed" onPress={() => answerOffer('accepted')} />
        <Button kind="ghost" label="No thanks" accessibilityHint="Hides this card. You can turn the timer on in Settings." onPress={() => answerOffer('dismissed')} />
      </View>
    </HubCard>
  ) : null;

  const mockCard = (
    <View ref={mocksBox} collapsable={false} style={{ marginTop: space.lg }}>
      <MockExams cert={cert} headRef={mocksHead} />
    </View>
  );

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Practice</T>
        <T v="meta" style={{ marginTop: space.xs }}>Every option explained, every trap named.</T>
        {movedHint && (
          // Once, for those who played on the old Play tab: where the games went (no modal, no toast).
          <View testID="drills-moved" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm, marginTop: space.xs }}>
            <T v="meta">The games are here now, as Drills.</T>
            {/* A label-size text button (R6), so it reads as a control, not as part of the sentence. */}
            <Button
              kind="ghost"
              label="Go to Drills"
              accessibilityHint="Scrolls to Drills on this page"
              onPress={() => {
                seeMoved();
                setJumpKey((k) => k + 1);
              }}
              style={{ marginLeft: -space.sm }}
            />
          </View>
        )}
        <JumpBar onJump={jump} />
        <MindsetStrip tips={mindsetTipsFor(cert.id)} />
      </Enter>

      <Enter i={1} style={{ marginTop: space.lg }}>
        <PracticeHero
          boxRef={heroBox}
          headRef={heroHead}
          domainsRef={domainsTileRef}
          timedRef={timedRef}
          kicker={mode === 'smart' ? 'Picked for you' : `Your path · ${MODE_INFO[mode].name}`}
          title={heroTitle(mode, pathDomain?.short, guidedTopic?.name)}
          meta={heroMeta}
          domains={pathDomain ? pathDomain.short : `All ${cert.domains.length}`}
          domainsSpoken={`Domains, ${pathDomain ? pathDomain.name : 'all domains'}`}
          count={mode === 'guided' ? null : pathSize}
          timed={timed}
          onTimed={setTimedHere}
          onChoose={setPathOpen}
          chooserHeadRef={chooserHeadRef}
          paceLine={`Timed counts up while you answer, never a countdown. ${examPaceWords(cert.exam)}`}
          startLabel={mode === 'guided' ? 'Open step' : 'Start'}
          startHint={mode === 'guided' ? 'Opens your Guided step' : `${pathSize} questions, ${MODE_INFO[mode].name}`}
          certId={cert.id}
          mode={mode}
          pathDomainId={pathDomain?.id}
          pathSize={pathSize}
        />
        {!heroIsQuickMix && (
          <Button
            kind="ghost"
            label="Or 10 mixed questions"
            accessibilityHint={`Starts 10 questions from all domains${timed ? ', timed' : ''}. Your path stays as it is.`}
            onPress={startQuickMix}
            // Text lines up with the gutter (the ghost button pads 8pt each side).
            style={{ alignSelf: 'flex-start', marginTop: space.xs, marginLeft: -space.sm }}
          />
        )}
        {/* The path chooser opens right here, under the hero, when Domains or Count is tapped. */}
        <Collapse open={pathOpen}>
          <HubCard style={{ marginTop: space.md }}>
            <CardHead title="Your path" headRef={chooserHeadRef} />
            <PathChooser
              mode={mode}
              suggested={suggested}
              domains={cert.domains}
              domainId={pathDomain?.id}
              size={pathSize}
              onMode={(m) => useSettings.getState().setStudyMode(m)}
              onDomain={(id) => useSettings.getState().setStudyDomain(id)}
              onSize={(n) => useSettings.getState().setStudySize(n)}
              onDone={() => {
                setPathOpen(false);
                moveFocus(domainsTileRef);
              }}
            />
          </HubCard>
        </Collapse>
        {!mocksFirst && paceCard}
      </Enter>

      {/* Mock exams straight under the hero when they lead, then the pace offer (UX review P3). */}
      {mocksFirst && <Enter i={2}>{mockCard}</Enter>}
      {mocksFirst && paceCard && <Enter i={2}>{paceCard}</Enter>}

      <Enter i={3} style={{ marginTop: space.lg }}>
        <FocusNext cert={cert} dueCount={dueCount} focus={focus} hasAnswers={readiness.domains.some((d) => d.answered > 0)} />
      </Enter>

      <Enter i={3} style={{ marginTop: space.lg }}>
        <ByDomain cert={cert} figures={readiness.domains.map((d) => `${d.domainId}:${d.answered}:${d.mastery}`).join('|')} />
      </Enter>

      <Enter i={4} style={{ marginTop: space.lg }}>
        <ReviewSaved cert={cert} timed={timed} />
      </Enter>

      {/* The brain games (mobile 1.51: the Play tab moved here). Its own outer view sits right in the page, so
          its layout follows the sections above (the jump runs from it). */}
      <View style={{ marginTop: space.lg }}>
        <Drills enter={5} jumpKey={jumpKey} onJumped={section === DRILLS_SECTION ? jumped : undefined} onSeen={movedHint ? seeMoved : undefined} />
      </View>

      {!mocksFirst && <Enter i={6}>{mockCard}</Enter>}
    </Screen>
  );
}

/** Opens the session screen once a set has started (module level, so memoised cards never re-render for it). */
const open = () => router.push('/session');

type JumpKey = 'questions' | 'drills' | 'mocks';
const JUMPS: { key: JumpKey; label: string }[] = [
  { key: 'questions', label: 'Questions' },
  { key: 'drills', label: 'Drills' },
  { key: 'mocks', label: 'Mock exams' },
];

/**
 * The jump bar (PHASE4.md 7.8 item 2): three equal buttons in a `soft` track, each at least 48pt.
 * Inside the Screen, so it can scroll the page. A column from text scale 1.3.
 */
const JumpBar = memo(function JumpBar({ onJump }: { onJump: (k: JumpKey, scroll: ScreenScroll | null) => void }) {
  const { c } = useTheme();
  const scroll = useScreenScroll();
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <View testID="practice-jump" style={{ flexDirection: large ? 'column' : 'row', gap: 4, padding: 4, marginTop: space.lg, borderRadius: groveRadius.tile, backgroundColor: c.soft }}>
      {JUMPS.map((j) => (
        <Pressable
          key={j.key}
          accessibilityRole="button"
          accessibilityLabel={j.label}
          accessibilityHint={`Jumps to ${j.label}`}
          onPress={() => onJump(j.key, scroll)}
          style={({ pressed }) => ({
            flex: large ? undefined : 1,
            minHeight: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: space.sm,
            backgroundColor: pressed ? c.raised : 'transparent',
          })}
        >
          <T v="chip" center>{j.label}</T>
        </Pressable>
      ))}
    </View>
  );
});

/** The Mindset strip (PHASE4.md 7.8 item 3): a compass badge, "Mindset." and one tip. Nothing without tips. */
export const MindsetStrip = memo(function MindsetStrip({ tips }: { tips: readonly string[] }) {
  const { c } = useTheme();
  // One tip a day, so it stays put while the learner moves between tabs (the day is read once, on mount).
  const [day] = useState(() => Math.floor(Date.now() / 86400000));
  const tip = tips.length ? tips[day % tips.length] : null;
  if (!tip) return null;
  return (
    <HubCard testID="mindset-strip" style={{ marginTop: space.md, paddingBottom: space.md, flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
      <Compass size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
      <T v="small" color={c.ink2} style={{ flex: 1 }} accessibilityLabel={`Mindset. ${tip}`}>
        <T v="label">Mindset. </T>
        {tip}
      </T>
    </HubCard>
  );
});

/**
 * The forest "Picked for you" card (PHASE4.md 7.8 item 4). Not a button itself: its tiles and Start are
 * the controls. Memoised with words and stable callbacks, so an answer elsewhere never redraws it.
 */
const PracticeHero = memo(function PracticeHero({
  boxRef,
  headRef,
  domainsRef,
  timedRef,
  chooserHeadRef,
  kicker,
  title,
  meta,
  domains,
  domainsSpoken,
  count,
  timed,
  onTimed,
  onChoose,
  paceLine,
  startLabel,
  startHint,
  certId,
  mode,
  pathDomainId,
  pathSize,
}: {
  boxRef: RefObject<View | null>;
  headRef: RefObject<View | null>;
  domainsRef: RefObject<View | null>;
  timedRef: RefObject<View | null>;
  /** The path chooser's head: screen-reader focus moves there when Domains or Count opens it. */
  chooserHeadRef: RefObject<View | null>;
  kicker: string;
  title: string;
  meta: string;
  domains: string;
  domainsSpoken: string;
  /** null for Guided, which has no length. */
  count: number | null;
  timed: boolean;
  onTimed: (on: boolean) => void;
  /** Opens the path chooser under the hero (the state setter, so it never changes). */
  onChoose: (open: boolean) => void;
  paceLine: string;
  startLabel: string;
  startHint: string;
  certId: string;
  mode: StudyMode;
  pathDomainId: string | undefined;
  pathSize: number;
}) {
  const { c } = useTheme();
  const choose = 'Opens the choices for your path: mode, domains and length';
  const openChooser = () => {
    onChoose(true);
    moveFocus(chooserHeadRef, 400);
  };
  // Start: the learner's path (Guided opens its step screen; the others start a set).
  const startPath = () => {
    if (mode === 'guided') {
      router.push({ pathname: '/guided', params: { ...(pathDomainId ? { domain: pathDomainId } : {}), timed: timed ? '1' : '0' } });
      return;
    }
    guardedStart(() => startStudy(certId, { mode, domainId: pathDomainId, count: pathSize, timed }), open);
  };
  return (
    <View ref={boxRef} collapsable={false}>
      <HeroCard testID="practice-plate">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
            {/* The kicker names the path: "Picked for you" for Smart, the mode's name otherwise. */}
            <HeroKicker ref={headRef} label={kicker} />
            <T v="hero" color={c.onForest}>{title}</T>
            <T v="meta" color={c.onForest2} accessibilityLabel={spokenMin(meta)}>{meta}</T>
          </View>
          <GlyphTile>
            <PracticeLeaf size={40} color={c.sap} />
          </GlyphTile>
        </View>
        <HeroTileRow>
          <HeroChoice ref={domainsRef} k="Domains" value={domains} spoken={domainsSpoken} hint={choose} onPress={openChooser} />
          {count !== null && <HeroChoice k="Count" value={String(count)} spoken={`Count, ${count} questions`} hint={choose} onPress={openChooser} />}
          <TimedTile ref={timedRef} on={timed} onChange={onTimed} />
        </HeroTileRow>
        <T v="meta" color={c.onForest2}>{paceLine}</T>
        <Button
          kind="hero"
          label={startLabel}
          // Play is for lessons (the 1.20 icon rule): practice goes forward with an arrow (mobile 1.22).
          icon={(col) => <ArrowRight size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          accessibilityHint={startHint}
          onPress={startPath}
        />
      </HeroCard>
    </View>
  );
});

/** The hero's three tiles in a row, or a column from text scale 1.3. */
function HeroTileRow({ children }: { children: ReactNode }) {
  const large = useFontScale() >= LARGE_TEXT;
  return <View style={{ flexDirection: large ? 'column' : 'row', gap: space.sm }}>{children}</View>;
}

/** A hero tile that opens a choice (Domains, Count): the inset tile as one button, at least 48pt. */
function HeroChoice({ k, value, spoken, hint, onPress, ref }: { k: string; value: string; spoken: string; hint: string; onPress: () => void; ref?: RefObject<View | null> }) {
  const { c } = useTheme();
  return (
    <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={spoken} accessibilityHint={hint} onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.85 : 1 })}>
      <HeroTile k={k} minHeight={48}>
        <T v="label" color={c.onForest}>{value}</T>
      </HeroTile>
    </Pressable>
  );
}

/**
 * The Timed tile IS the switch (PHASE4.md 7.8 item 4): no platform switch drawn on forest (its tracks
 * fail contrast there). Spoken "Timed, switch, on / off"; the label never says "off" itself.
 */
function TimedTile({ on, onChange, ref }: { on: boolean; onChange: (v: boolean) => void; ref?: RefObject<View | null> }) {
  const { c } = useTheme();
  return (
    <Pressable
      ref={ref}
      testID="timed-switch"
      accessibilityRole="switch"
      accessibilityLabel="Timed"
      accessibilityState={{ checked: on }}
      accessibilityHint="Counts up while you answer, for your path and Build a set"
      onPress={() => onChange(!on)}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.85 : 1 })}
    >
      <HeroTile k="Timed" minHeight={48}>
        <T v="label" color={c.onForest}>{on ? 'On' : 'Off'}</T>
      </HeroTile>
    </Pressable>
  );
}

/** One row inside a card: a 36pt icon badge, `label` over `meta`, the trailing part and a chevron. */
function CardRow({
  icon,
  title,
  line,
  kicker,
  trailing,
  hint,
  spoken,
  onPress,
  badgeTone,
}: {
  icon: (color: string) => ReactNode;
  title: string;
  line?: string;
  kicker?: string;
  trailing?: ReactNode;
  hint?: string;
  spoken?: string;
  onPress: () => void;
  /** The icon's colour, when it is not the accent (the focus area's clay mark). */
  badgeTone?: string;
}) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: groveRadius.tile });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken ?? [kicker, title, line].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.md }, press.style]}
    >
      {press.layer}
      <IconCircle>{icon(badgeTone ?? c.accentText)}</IconCircle>
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker ? <T v="caption" color={c.accentText}>{kicker}</T> : null}
        <T v="label">{title}</T>
        {line ? <T v="meta">{line}</T> : null}
      </View>
      {trailing}
      <RowChevron />
    </AnimatedPressable>
  );
}

/** The row chevron, muted (ListRow's own). Decorative: the row's role says it opens something. */
function RowChevron() {
  const { c } = useTheme();
  return <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />;
}

/** Focus next (PHASE4.md 7.8 item 6): what is ready to revisit, and the area with the most to gain. */
const FocusNext = memo(function FocusNext({ cert, dueCount, focus, hasAnswers }: { cert: Certification; dueCount: number; focus: Certification['domains'][number] | undefined; hasAnswers: boolean }) {
  const { c } = useTheme();
  return (
    <HubCard testID="focus-next">
      <CardHead title="Focus next" />
      <CardRow
        icon={(col) => <RotateCcw size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="Questions to revisit"
        // Premium pass 4.6: the line names the set a tap starts; the count is the chip at the end.
        line={dueCount ? 'Ready today · oldest first' : 'All caught up'}
        spoken={`Questions to revisit, ${dueCount ? reviewSubtitle(dueCount).replace(' · ', ', ') : 'all caught up'}`}
        trailing={dueCount ? <CountChip value={String(readyToday(dueCount))} /> : undefined}
        onPress={() => guardedStart(() => startReview(cert.id), open, () => router.push('/caught-up'))}
      />
      {focus && (
        <>
          <CardDivider inset={36 + space.md} />
          {/* The focus area by name with its clay mark (DECISIONS 11): always readiness.focusDomainId, the
              same set as You's "Practice {area}" (lib/sessions.ts startFocusPractice). Never "weak spot". */}
          <CardRow
            icon={(col) => <Crosshair size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
            badgeTone={c.clay}
            title={focus.short}
            // Why this area, once there are answers to judge by; before that, "Focus next".
            line={hasAnswers ? 'Where you’ll gain most' : 'Focus next'}
            hint={`Starts 10 questions in ${focus.name}`}
            onPress={() => guardedStart(() => startFocusPractice(cert.id, focus), open)}
          />
        </>
      )}
    </HubCard>
  );
});

/** By domain (PHASE4.md 7.8 item 7): each area's weight, how many seen and its status; a tap starts a set there. */
const ByDomain = memo(function ByDomain({ cert, figures }: { cert: Certification; /** "1:12:0.5|2:0:0|...": id, answered, mastery. */ figures: string }) {
  // The area colour is only the dot's: the status words carry the state (never colour alone).
  const { isDark } = useTheme();
  const byId = new Map(figures.split('|').map((f) => f.split(':')).map(([id, answered, mastery]) => [id, { answered: Number(answered), mastery: Number(mastery) }]));
  return (
    <HubCard testID="by-domain">
      <CardHead title="By domain" meta="Starts a set in that domain" />
      {cert.domains.map((d, i) => {
        const r = byId.get(d.id);
        const answered = r?.answered ?? 0;
        const status = domainStatus(answered, r?.mastery ?? 0);
        return (
          <View key={d.id}>
            {i > 0 && <CardDivider />}
            <DomainRow
              n={d.id}
              dot={domainColor(d.tone, isDark)}
              name={d.short}
              line={`${d.weight}% of the exam · ${answered} seen`}
              status={status.text}
              spoken={`Domain ${d.id}, ${d.short}, ${d.weight} percent of the exam, ${answered} seen, ${status.spoken}`}
              certId={cert.id}
              domainId={d.id}
            />
          </View>
        );
      })}
      <View style={{ height: space.xs }} />
    </HubCard>
  );
});

const DomainRow = memo(function DomainRow({ n, dot, name, line, status, spoken, certId, domainId }: { n: string; dot: string; name: string; line: string; status: string; spoken: string; certId: string; domainId: string }) {
  const onPress = () => guardedStart(() => startPractice(certId, { count: DOMAIN_SET, domainId, title: name }), open);
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: groveRadius.tile });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint="Starts a set in this domain"
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.md }, press.style]}
    >
      {press.layer}
      <T v="numInline" num color={c.ink2} style={{ minWidth: 16 }}>{n}</T>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AreaDot color={dot} />
          <T v="label" style={{ flexShrink: 1 }}>{name}</T>
        </View>
        <T v="meta">{line}</T>
        {large && <T v="meta" color={c.ink}>{status}</T>}
      </View>
      {!large && <T v="meta">{status}</T>}
      <RowChevron />
    </AnimatedPressable>
  );
});

/**
 * Review and saved (PHASE4.md 7.8 item 8): All missed questions, All saved questions, Question bank and
 * Build a set (which opens its choices in place). The kit's Weak spots drill waits for the owner (O8).
 */
const ReviewSaved = memo(function ReviewSaved({ cert, timed }: { cert: Certification; timed: boolean }) {
  const { c } = useTheme();
  const [setOpen, setSetOpen] = useState(false);
  return (
    <HubCard testID="practice-more">
      <CardHead title="Review and saved" />
      <CardRow
        icon={(col) => <X size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="All missed questions"
        line="Each one you missed, to try again"
        hint="Opens your Mistake journal"
        onPress={() => router.push('/mistakes')}
      />
      <CardDivider inset={36 + space.md} />
      <CardRow
        icon={(col) => <Bookmark size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="All saved questions"
        line="Save a question to find it here"
        hint="Starts a set of your saved questions"
        onPress={() => guardedStart(() => startBookmarks(cert.id), open, () => router.push('/saved'))}
      />
      <CardDivider inset={36 + space.md} />
      {/* Browse every question by domain and topic (app/bank). Never shows bank size. */}
      <CardRow
        icon={(col) => <Library size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="Question bank"
        line="Browse by domain and topic"
        onPress={() => router.push('/bank')}
      />
      <CardDivider inset={36 + space.md} />
      {/* A one-off set: saves nothing, and the only place with topic and difficulty. */}
      <DisclosureRow
        icon={<SlidersHorizontal size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
        title="Build a set"
        subtitle="Pick a domain, topic and difficulty"
        expanded={setOpen}
        onPress={() => setSetOpen((o) => !o)}
        accessibilityHint="Shows the choices for a one-off set. Your path doesn't change."
        last
      />
      <Collapse open={setOpen}>
        <BuildASet cert={cert} timed={timed} />
      </Collapse>
    </HubCard>
  );
});

/** Build a set (unchanged choices, now inside the Review and saved card). */
const BuildASet = memo(function BuildASet({ cert, timed }: { cert: Certification; timed: boolean }) {
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [topicId, setTopicId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState<number>(10);
  const [diff, setDiff] = useState(0);
  const setTopics = scopeTopics(cert.id, domainId);
  const setTopic = domainId ? setTopics.find((t) => t.id === topicId) : undefined;
  return (
    <View testID="build-set" style={{ paddingBottom: space.md }}>
      <FieldLabel>Domain</FieldLabel>
      <View accessibilityLabel="Domain for this set">
        <ChipRow>
          <Chip label="All domains" selected={domainId === undefined} onPress={() => { setDomainId(undefined); setTopicId(undefined); }} />
          {cert.domains.map((d) => (
            <Chip key={d.id} label={d.short} selected={domainId === d.id} onPress={() => { setDomainId(d.id); setTopicId(undefined); }} />
          ))}
        </ChipRow>
      </View>
      {/* Topic chips once a domain is picked (the notes outline, in reading order). */}
      {domainId && setTopics.length > 0 && (
        <>
          <FieldLabel>Topic</FieldLabel>
          <ChipRow>
            <Chip label="All topics" selected={!setTopic} onPress={() => setTopicId(undefined)} />
            {setTopics.map((t) => (
              <Chip key={t.id} label={shortTopic(t.name)} accessibilityLabel={`Topic ${t.name}`} selected={setTopic?.id === t.id} onPress={() => setTopicId(t.id)} />
            ))}
          </ChipRow>
        </>
      )}
      <FieldLabel>Length</FieldLabel>
      <Segmented
        accessibilityLabel="Number of questions"
        value={count}
        onChange={setCount}
        options={SESSION_SIZES.map((n) => ({ value: n, numeral: String(n), label: 'questions' }))}
      />
      <FieldLabel>Difficulty</FieldLabel>
      <View accessibilityLabel="Difficulty">
        <ChipRow>
          {DIFFS.map((d, i) => (
            <Chip key={d.label} label={d.label} selected={diff === i} onPress={() => setDiff(i)} />
          ))}
        </ChipRow>
      </View>
      <Gap h={space.md} />
      <Button
        kind="secondary"
        label={`Start ${count} questions${timed ? ', timed' : ''}`}
        onPress={() => {
          const domain = cert.domains.find((d) => d.id === domainId);
          guardedStart(
            () =>
              startPractice(cert.id, {
                count,
                domainId,
                difficulty: DIFFS[diff].value,
                // Session titles use the short name, like chips and plan items (C9).
                title: setTopic ? setTopic.name : domain ? domain.short : 'Custom set',
                timed,
                ...(setTopic ? { ids: topicQuestionIds(setTopic) } : {}),
              }),
            open,
          );
        }}
      />
    </View>
  );
});

/**
 * Mock exams (PHASE4.md 7.8 item 10): the Mini and Full tiles (the numeral over the title), stacked
 * from text scale 1.3, then the scaled score note. Each tile opens the mock start sheet first (timing
 * and "hide the clock").
 */
const MockExams = memo(function MockExams({ cert, headRef }: { cert: Certification; headRef: RefObject<View | null> }) {
  const { width } = useWindowDimensions();
  const large = useFontScale() >= LARGE_TEXT;
  const mini = Math.round(cert.exam.questions / 3);
  const miniMinutes = Math.round((cert.exam.minutes / cert.exam.questions) * mini);
  const hours = cert.exam.minutes / 60;
  const stack = large || width < 340;
  return (
    <HubCard testID="practice-mocks" style={{ paddingBottom: space.md }}>
      <CardHead title="Mock exams" meta="Timed like the real exam" headRef={headRef} />
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: space.sm }}>
        <MockTile
          n={mini}
          title="Mini mock"
          line={`${miniMinutes} min · feedback at the end`}
          spoken={`Mini mock, ${mini} questions, ${miniMinutes} minutes, feedback at the end`}
          onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(mini) } })}
        />
        <MockTile
          n={cert.exam.questions}
          title="Full mock"
          line={`${hours} hours · weighted like the real ${cert.name}`}
          spoken={`Full mock, ${cert.exam.questions} questions, ${hours} hours`}
          onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(cert.exam.questions) } })}
        />
      </View>
      <T v="meta" style={{ marginTop: space.md }}>{scaledScoreNote(cert)}</T>
    </HubCard>
  );
});

function MockTile({ n, title, line, spoken, onPress }: { n: number; title: string; line: string; spoken: string; onPress: () => void }) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 0.98, tint: c.raised, tintRadius: groveRadius.tile });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint="Opens the timing choices first"
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flex: 1, minHeight: 48, padding: 14, gap: 2, borderRadius: groveRadius.tile, backgroundColor: c.soft }, press.style]}
    >
      {press.layer}
      <T v="numValue" num>{String(n)}</T>
      <T v="label">{title}</T>
      <T v="meta">{line}</T>
    </AnimatedPressable>
  );
}
