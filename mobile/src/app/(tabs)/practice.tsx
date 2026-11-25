/**
 * Practice: every way to answer questions, in one place.
 *
 * Grove Phase 4 (design-notes/grove/PHASE4.md 7.8; the kit's screens/03-phone-practice.png and
 * reference/03-phone-practice.html). Top to bottom:
 *   1. "Practice" and "Every option explained, every trap named."
 *   2. The jump bar: Questions, Drills and Mock exams. Plain buttons that scroll to their section and
 *      move screen-reader focus to its head (never tabs, and never a "selected" one: the bar is not
 *      sticky, so it would almost always say Questions). A column from text scale 1.3.
 *   3. The Mindset strip (O7): one of the website's Mindset tips a day; hidden for a course with none.
 *   4. The forest "Picked for you" card: the set it starts, "10 questions · about 12 min", the leaf
 *      glyph tile, three inset tiles (Domains and Count open the path chooser; Timed IS the switch),
 *      the timed note and the mint Start. "Or 10 mixed questions" and the pace offer stay under it.
 *   5. Focus next: Questions to revisit (with its count) and the focus area ("Where you’ll gain most").
 *   6. By domain: five rows that each start a set in that area.
 *   7. Review and saved: All missed questions, Weak spots drill (O8), All saved questions, Question
 *      bank, Build a set. The missed and saved lines follow the learner's counts, as on the website.
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
 *
 * Mobile 2.2 (learner request: "one domain, my own length, a timer"):
 * - Build a set has a Timer choice: Untimed, Count up or Countdown. It starts from the Timed switch
 *   (on = Count up, off = Untimed), so nobody gets a countdown without choosing it. A countdown
 *   offers three lengths worked out from the set ("10 questions · 15 min"); it is gentle: it only
 *   runs while a question is being answered, and at zero the learner chooses (session.tsx).
 * - Each By domain row, and the focus area's row, keeps its one tap (10 questions, as before) and
 *   gains a small "Choose length and timer" button: it opens Build a set with that domain chosen.
 *   A link can do the same with `/practice?build=<domain id>`.
 * - If the choices leave fewer questions than asked, the button and a line say the real length.
 */
import { FeatureInfo } from '../../components/featureInfo';
import { findQuestion } from '../../content/loader';
import * as Router from 'expo-router';
import { router } from 'expo-router';
import { Children, memo, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Dimensions, Pressable, View } from 'react-native';
import { ArrowRight, Bookmark, ChartColumn, ChevronRight, Compass, Crosshair, ICON_STROKE, Library, RotateCcw, SlidersHorizontal, X } from '../../components/icons';
import { PracticeLeaf } from '../../components/glyphs';
import { AreaDot, CardDivider, CardHead, CountChip, GlyphTile, HeroKicker, HubCard } from '../../components/groveHub';
import { HeroCard, HeroTile } from '../../components/groveToday';
import { AnimatedPressable, Collapse, usePressScale } from '../../components/motion';
import { Drills } from '../../components/drills';
import { DRILLS_SECTION } from '../../lib/actions';
import { DisclosureRow, FieldLabel, PathChooser } from '../../components/pathChooser';
import { Button, Chip, ChipRow, Enter, Gap, ICON_SIZE, IconCircle, Screen, SEG_ON_DARK, Segmented, T, useFontScale, useScreenScroll, type ScreenScroll } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { mindsetTipsFor } from '../../content/mindset';
import { scaledScoreNote } from '../../content/scoreNote';
import type { Certification, Difficulty } from '../../content/types';
import { BAND_MIN_ANSWERS, bandOf, STEADY_FROM } from '../../engine/domainBand';
import { topicQuestionIds } from '../../engine/outline';
import { aboutMin, examPaceWords, MINUTES_PER_QUESTION, shouldOfferTimer, spokenMin } from '../../engine/pace';
import { choiceFor, countdownChoices, countdownLabel, DEFAULT_COUNTDOWN_PACE, timerKindFromSetting, type PracticeTimerKind } from '../../engine/practiceCountdown';
import { activeMode, MODE_INFO, scopeKey, SESSION_SIZES, sessionSize, suggestedMode, type StudyMode } from '../../engine/studyModes';
import { currentGuidedTopic } from '../../engine/studyPath';
import { guidedStatus, scopeTopics } from '../../lib/outline';
import { shortTopic } from '../../lib/format';
import { guardedStart, practiceSetLength, reviewSubtitle, startBookmarks, startFocusPractice, startPractice, startReview, startStudy, startWeakSpotsDrill } from '../../lib/sessions';
import { weakDrillLine, weakDrillRanked } from '../../engine/weakSpots';
import { readyToday } from '../../engine/srs';
import { moveFocus } from '../../lib/a11y';
import { useJourney, useToday } from '../../lib/useJourney';
import { useDailyMinutes, useSettings } from '../../store/settings';
import { selectCert, useProgress } from '../../store/progress';
import { groveRadius } from '../../theme/grove';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { useContentWidth } from '../../components/layout';

/** The route's params and this screen's own navigation (absent where a test's expo-router stand-in has none). */
type Nav = { setParams?: (p: { section?: string; build?: string }) => void };
/** `build` (mobile 2.2): a domain id; Practice opens Build a set with that domain chosen, once. */
type Params = { section?: string; build?: string };
const useParams: () => Params = (Router as { useLocalSearchParams?: () => Params }).useLocalSearchParams ?? (() => ({}));
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
 * answers, then the score with its band word ("72% · Steady"). Under 70 `below` asks the row to draw it
 * in clay. Polish round 1: the shown words stay short ("68% · Building") so every row keeps its score in
 * the same trailing slot; the band word already says it is under 70 (colour is never alone), and the
 * spoken words still add "below 70". Exported for tests.
 */
export function domainStatus(answered: number, mastery: number): { text: string; spoken: string; below: boolean } {
  if (answered <= 0) return { text: 'Not started', spoken: 'not started', below: false };
  if (answered < BAND_MIN_ANSWERS) return { text: 'Too few yet', spoken: 'too few yet', below: false };
  const pct = Math.round(mastery * 100);
  const below = pct < STEADY_FROM; // 70
  return {
    text: `${pct}% · ${bandOf(pct)}`,
    spoken: `${pct} percent, ${bandOf(pct)}${below ? `, below ${STEADY_FROM}` : ''}`,
    below,
  };
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
  // A link can repeat a key (`?build=1&build=2`): the router then hands back a NEW array on every
  // render, and the "seen" checks below would never settle (a render loop). Only a plain string counts.
  const raw = useParams() as { section?: unknown; build?: unknown };
  const section = typeof raw.section === 'string' ? raw.section : undefined;
  const build = typeof raw.build === 'string' ? raw.build : undefined;
  const navigation = useOwnNavigation();
  // Mobile 2.2: "Choose length and timer" on a domain row (or a `?build=<domain id>` link) opens Build a
  // set with that domain chosen. A new object per request, so asking twice for one domain works twice.
  const [buildFor, setBuildFor] = useState<BuildRequest | null>(null);
  const openBuilder = useCallback((domainId: string) => setBuildFor({ domainId }), []);
  // Closing Build a set ends the request. Without this the old domain stayed "asked for", so opening
  // the panel again from the plain "Build a set" row chose that domain again.
  const clearBuild = useCallback(() => setBuildFor(null), []);
  const [buildSeen, setBuildSeen] = useState<string | undefined>(undefined);
  if (buildSeen !== build) {
    setBuildSeen(build);
    // Only a domain this course has; anything else in the link is ignored.
    if (build && cert.domains.some((d) => d.id === build)) setBuildFor({ domainId: build });
  }
  useEffect(() => {
    // Used once: clear it, so coming back to the Practice tab later opens at the top as usual.
    if (build) navigation?.setParams?.({ build: undefined });
  }, [build, navigation]);
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
      ? 'Learn, practice, then mix in earlier topics.'
      : `${pathSize} questions · ${aboutMin(pathSize * MINUTES_PER_QUESTION, true)}${timed ? ' · timed' : ''}`;
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId);

  // ── Jump bar targets ──
  const heroBox = useRef<View>(null);
  const heroHead = useRef<View>(null);
  const mocksBox = useRef<View>(null);
  const mocksHead = useRef<View>(null);
  const drillsBox = useRef<View>(null);
  // Polish round 1: the jump bar marks the section in view. Asked each time the page comes to rest: the
  // last section whose top is above 40% of the window (Questions at the top of the page).
  const sectionInView = useCallback(async (): Promise<JumpKey> => {
    const boxes: [JumpKey, RefObject<View | null>][] = [
      ['questions', heroBox],
      ['drills', drillsBox],
      ['mocks', mocksBox],
    ];
    const tops = await Promise.all(
      boxes.map(
        ([k, r]) =>
          new Promise<[JumpKey, number, number] | null>((res) => {
            const node = r.current;
            if (!node || typeof node.measureInWindow !== 'function') return res(null);
            node.measureInWindow((_x, y, _w, h) => res(h > 0 ? [k, y, h] : null));
          }),
      ),
    );
    const windowH = Dimensions.get('window').height;
    const line = windowH * 0.4;
    let best: JumpKey = 'questions';
    let bestY = -Infinity;
    let last: [JumpKey, number, number] | null = null;
    for (const t of tops) {
      if (!t) continue;
      if (t[1] <= line && t[1] > bestY) [best, bestY] = [t[0], t[1]];
      if (!last || t[1] > last[1]) last = t;
    }
    // At the end of the page the last section may never reach the line: wholly on screen, it is the one in view.
    if (last && last[1] > bestY && last[1] >= 0 && last[1] + last[2] <= windowH) best = last[0];
    return best;
  }, []);
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
        {/* Short text (Sky, 5 Nov): the hero above already says it counts up and the exam's pace,
            so this card adds only what is new. */}
        It pauses while you read each explanation.
      </T>
      <Gap h={space.md} />
      <View style={{ gap: space.sm }}>
        {/* Secondary, not primary: an offer, never a push (P3). */}
        <Button kind="secondary" label="Turn on Timed" onPress={() => answerOffer('accepted')} />
        <Button kind="ghostNeutral" label="No thanks" accessibilityHint="Hides this card. You can turn the timer on in Settings." onPress={() => answerOffer('dismissed')} />
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T v="display" accessibilityRole="header" style={{ flex: 1, marginTop: space.xs }}>Practice</T>
          <FeatureInfo title="Practice"><T v="body">Choose a study path or build a one-off set by domain, topic and difficulty. Drills are short games that practice specific skills.</T></FeatureInfo>
        </View>
        <JumpBar onJump={jump} inView={sectionInView} />
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
          paceLine={`Timed counts up, never down. ${examPaceWords(cert.exam)}`}
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
        <FocusNext cert={cert} dueCount={dueCount} focus={focus} hasAnswers={readiness.domains.some((d) => d.answered > 0)} onBuild={openBuilder} />
      </Enter>

      <Enter i={3} style={{ marginTop: space.lg }}>
        <ByDomain cert={cert} figures={readiness.domains.map((d) => `${d.domainId}:${d.answered}:${d.mastery}`).join('|')} onBuild={openBuilder} />
      </Enter>

      <Enter i={4} style={{ marginTop: space.lg }}>
        <ReviewSaved cert={cert} timed={timed} buildFor={buildFor} onBuildClosed={clearBuild} weakLine={weakDrillLine(weakDrillRanked(readiness.domains), (id) => cert.domains.find((d) => d.id === id)?.short ?? `Domain ${id}`, readiness.domains.some((d) => d.answered > 0))} />
      </Enter>

      {/* The brain games (mobile 1.51: the Play tab moved here). Its own outer view sits right in the page, so
          its layout follows the sections above (the jump runs from it). */}
      <View ref={drillsBox} collapsable={false} style={{ marginTop: space.lg }}>
        <Drills enter={5} jumpKey={jumpKey} onJumped={section === DRILLS_SECTION ? jumped : undefined} />
      </View>

      {!mocksFirst && <Enter i={6}>{mockCard}</Enter>}
    </Screen>
  );
}

/** Opens the session screen once a set has started (module level, so memoised cards never re-render for it). */
const open = () => router.push('/session');

/** Mobile 2.2: a request to open Build a set with a domain already chosen (a domain row's small button). */
type BuildRequest = { domainId: string };

/**
 * Mobile 2.2: the small "Choose length and timer" button at the end of a domain's row. It sits BESIDE
 * the row's own button (never inside it, so a screen reader reaches both), 48pt wide and as tall as the
 * row, in the place the row's chevron had. The row's one tap still starts the usual 10 questions.
 */
function BuildButton({ name, onPress }: { name: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose length and timer for ${name}`}
      accessibilityHint="Opens Build a set with this domain chosen"
      onPress={onPress}
      // The card pads 16pt: the button reaches its edge, so the icon sits where the chevron sat.
      style={({ pressed }) => ({ width: 48, minHeight: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginRight: -space.lg, borderRadius: groveRadius.tile, backgroundColor: pressed ? c.soft : 'transparent' })}
    >
      <SlidersHorizontal size={18} color={c.ink2} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

type JumpKey = 'questions' | 'drills' | 'mocks';
const JUMPS: { key: JumpKey; label: string }[] = [
  { key: 'questions', label: 'Questions' },
  { key: 'drills', label: 'Drills' },
  { key: 'mocks', label: 'Mock exams' },
];

/**
 * The jump bar (PHASE4.md 7.8 item 2): three equal buttons in a `soft` track, each at least 48pt.
 * Inside the Screen, so it can scroll the page. A column from text scale 1.3.
 * Polish round 1: the segment for the section in view is marked, the Segmented look (raised fill and a
 * 2pt ink edge, so never colour alone) and spoken as selected. It follows a tap at once, then the page:
 * each time the page comes to rest it asks which section is in view.
 */
const JumpBar = memo(function JumpBar({ onJump, inView }: { onJump: (k: JumpKey, scroll: ScreenScroll | null) => void; inView: () => Promise<JumpKey> }) {
  const { c, isDark } = useTheme();
  const scroll = useScreenScroll();
  const large = useFontScale() >= LARGE_TEXT;
  const [current, setCurrent] = useState<JumpKey>('questions');
  useEffect(() => {
    let over = false;
    const stop = scroll?.onSettle(() => {
      void inView().then((k) => {
        if (!over) setCurrent(k);
      });
    });
    return () => {
      over = true;
      stop?.();
    };
  }, [scroll, inView]);
  return (
    <View testID="practice-jump" style={{ flexDirection: large ? 'column' : 'row', gap: 4, padding: 4, marginTop: space.lg, borderRadius: groveRadius.tile, backgroundColor: c.soft }}>
      {JUMPS.map((j) => {
        const on = j.key === current;
        return (
          <Pressable
            key={j.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={j.label}
            accessibilityHint={`Jumps to ${j.label}`}
            onPress={() => {
              setCurrent(j.key);
              onJump(j.key, scroll);
            }}
            style={({ pressed }) => ({
              flex: large ? undefined : 1,
              minHeight: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              // The 2pt edge below + 6 = the old 8pt inset, so "Mock exams" keeps its one line at 360pt.
              paddingHorizontal: space.sm - 2,
              // A transparent edge of the same width when not chosen, so nothing moves.
              borderWidth: 2,
              borderColor: on ? c.ink : 'transparent',
              backgroundColor: on ? (isDark ? SEG_ON_DARK : c.raised) : pressed ? c.raised : 'transparent',
              opacity: pressed && on ? 0.85 : 1,
            })}
          >
            <T v="chip" center color={on ? c.ink : c.ink2}>
              {j.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
});

/** The Mindset strip (PHASE4.md 7.8 item 3): a compass badge, "Mindset." and one tip. Nothing without tips. */
export const MindsetStrip = memo(function MindsetStrip({ tips }: { tips: readonly string[] }) {
  const { c } = useTheme();
  // One tip a day, so it stays put while the learner moves between tabs. The local day (useToday)
  // rolls over at midnight and when the app comes back, so a Practice tab left open shows the new
  // day's tip, as every other tab follows the new day.
  const { key } = useToday();
  const [y, m, d] = key.split('-').map(Number);
  const day = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  const tip = tips.length ? tips[day % tips.length] : null;
  if (!tip) return null;
  return (
    <HubCard testID="mindset-strip" style={{ marginTop: space.md, paddingBottom: space.md, flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
      <Compass size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
      {/* Spoken: a ">" between words (an order of preference) is said as ", then", not "greater than". */}
      <T v="small" color={c.ink2} style={{ flex: 1 }} accessibilityLabel={`Mindset. ${tip.replace(/\s*>\s*/g, ', then ')}`}>
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
        {/* One area picked: its name ("IT Governance") needs a whole row to stay unbroken, so Domains
            sits on its own line and Count and Timed share the next one. */}
        <HeroTileRow domainsAlone={Boolean(pathDomainId)}>
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

/**
 * Do three hero tiles fit side by side? Each tile's inner width is the window less the 20pt gutters,
 * the hero card's 16pt padding and the two 8pt gaps, split in three, less the tile's 12pt padding
 * each side. The widest key, "DOMAINS" (11pt caps, letter-spaced), needs about 60pt at 1.0 text,
 * and its spacing grows with the text size on Android.
 */
export function heroTilesFit(windowWidth: number, fontScale: number): boolean {
  const inner = (windowWidth - 2 * 20 - 2 * 16 - 2 * 8) / 3 - 2 * 12;
  return inner >= 60 * fontScale;
}

/**
 * The hero's three tiles in a row, or a column from text scale 1.3. With `domainsAlone` (one area
 * picked), the first tile (Domains) takes a full row and the others share the row under it, so a long
 * area name is never broken mid-word. The font never shrinks to make it fit (the label stays 16).
 */
export function HeroTileRow({ children, domainsAlone = false }: { children: ReactNode; domainsAlone?: boolean }) {
  const scale = useFontScale();
  const width = useContentWidth();
  const large = scale >= LARGE_TEXT;
  if (large) return <View style={{ flexDirection: 'column', gap: space.sm }}>{children}</View>;
  // Release bug hunt round 1: on a narrow phone (or at the next text size up) three tiles side by side
  // broke the tracked "DOMAINS" key mid-word ("DOMAIN / S"). Then Domains takes its own row too.
  if (!domainsAlone && heroTilesFit(width, scale)) return <View style={{ flexDirection: 'row', gap: space.sm }}>{children}</View>;
  const [first, ...rest] = Children.toArray(children);
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row' }}>{first}</View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>{rest}</View>
    </View>
  );
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
  onBuild,
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
  /** Mobile 2.2: a domain's row ends with "Choose length and timer" (in the chevron's place) instead of the chevron. */
  onBuild?: () => void;
}) {
  const { c } = useTheme();
  // From text scale 1.3 the icon badge goes and the trailing part (the count chip) moves under the
  // words, as DomainRow does with its status: the title keeps the row's width and never breaks mid-word.
  const large = useFontScale() >= LARGE_TEXT;
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: groveRadius.tile });
  const row = (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken ?? [kicker, title, line].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.md }, onBuild ? { flex: 1, minWidth: 0 } : null, press.style]}
    >
      {press.layer}
      {!large && <IconCircle>{icon(badgeTone ?? c.accentText)}</IconCircle>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker ? <T v="caption" color={c.accentText}>{kicker}</T> : null}
        <T v="label">{title}</T>
        {line ? <T v="meta">{line}</T> : null}
        {large && trailing ? <View style={{ flexDirection: 'row', marginTop: space.xs }}>{trailing}</View> : null}
      </View>
      {!large && trailing}
      {!onBuild && <RowChevron />}
    </AnimatedPressable>
  );
  if (!onBuild) return row;
  // Two buttons side by side: the row (one tap starts the set) and "Choose length and timer".
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {row}
      <BuildButton name={title} onPress={onBuild} />
    </View>
  );
}

/** The divider between CardRows: inset to the words, or full width from text scale 1.3 (no icon badge then). */
function RowDivider() {
  const large = useFontScale() >= LARGE_TEXT;
  return <CardDivider inset={large ? 0 : 36 + space.md} />;
}

/** The row chevron, muted (ListRow's own). Decorative: the row's role says it opens something. */
function RowChevron() {
  const { c } = useTheme();
  return <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />;
}

/** Focus next (PHASE4.md 7.8 item 6): what is ready to revisit, and the area with the most to gain. */
const FocusNext = memo(function FocusNext({ cert, dueCount, focus, hasAnswers, onBuild }: { cert: Certification; dueCount: number; focus: Certification['domains'][number] | undefined; hasAnswers: boolean; /** Mobile 2.2: open Build a set with a domain chosen. */ onBuild: (domainId: string) => void }) {
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
          <RowDivider />
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
            // Mobile 2.2: the one tap above is unchanged; this opens Build a set for another length or a timer.
            onBuild={() => onBuild(focus.id)}
          />
        </>
      )}
    </HubCard>
  );
});

/** By domain (PHASE4.md 7.8 item 7): each area's weight, how many seen and its status; a tap starts a set there. */
const ByDomain = memo(function ByDomain({ cert, figures, onBuild }: { cert: Certification; /** "1:12:0.5|2:0:0|...": id, answered, mastery. */ figures: string; /** Mobile 2.2: open Build a set with a domain chosen. */ onBuild: (domainId: string) => void }) {
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
              // Polish round 1: short enough for one line at 360pt ("18% · 40 seen"); the spoken words keep "of the exam".
              line={`${d.weight}% · ${answered} seen`}
              status={status.text}
              below={status.below}
              spoken={`Domain ${d.id}, ${d.short}, ${d.weight} percent of the exam, ${answered} seen, ${status.spoken}`}
              certId={cert.id}
              domainId={d.id}
              onBuild={onBuild}
            />
          </View>
        );
      })}
      <View style={{ height: space.xs }} />
    </HubCard>
  );
});

const DomainRow = memo(function DomainRow({ n, dot, name, line, status, below, spoken, certId, domainId, onBuild }: { n: string; dot: string; name: string; line: string; status: string; /** Under 70: the status in clay (its words say "below 70" too). */ below: boolean; spoken: string; certId: string; domainId: string; onBuild: (domainId: string) => void }) {
  // One tap, as before 2.2: 10 questions in this domain with the usual timer setting.
  const onPress = () => guardedStart(() => startPractice(certId, { count: DOMAIN_SET, domainId, title: name }), open);
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  // The status sits in the same trailing slot on every row; from text scale 1.3 it sits under the words
  // on EVERY row (never one row alone), so the area name and its line keep the row's width. Under 70 is a
  // text colour (clay), never a layout change (polish round 1).
  const under = large;
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: groveRadius.tile });
  return (
    // Mobile 2.2: two buttons side by side. The row starts the set in one tap (unchanged); the small
    // button after it, in the chevron's place, opens Build a set with this domain chosen.
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint="Starts a set in this domain"
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.md }, press.style]}
      >
        {press.layer}
        <T v="numInline" num color={c.ink2} style={{ minWidth: 16 }}>{n}</T>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AreaDot color={dot} />
            <T v="label" style={{ flexShrink: 1 }}>{name}</T>
          </View>
          <T v="meta">{line}</T>
          {under && <T v="meta" num color={below ? c.clay : c.ink2}>{status}</T>}
        </View>
        {!under && <T v="meta" num color={below ? c.clay : c.ink2}>{status}</T>}
      </AnimatedPressable>
      <BuildButton name={name} onPress={() => onBuild(domainId)} />
    </View>
  );
});

/**
 * The two count lines in Review and saved, the website's rule (index.html, the Practice hub's
 * `phMore` rows): missed ? "Each one you missed, to try again" : "None yet"; saved ? "{n} saved" :
 * "Save a question to find it here". Exported for tests.
 */
export function reviewLines(missed: number, saved: number): { missed: string; saved: string } {
  return {
    missed: missed > 0 ? 'Each one you missed, to try again' : 'None yet',
    saved: saved > 0 ? `${saved} saved` : 'Save a question to find it here',
  };
}

/**
 * Review and saved (PHASE4.md 7.8 item 8), the kit's five rows: All missed questions, Weak spots drill
 * (O8, the website's rule; `weakLine` names the domains it draws from), All saved questions, Question
 * bank and Build a set (which opens its choices in place). The missed and saved lines follow the
 * learner's own counts, as on the website; each row's spoken label is its title and that same line.
 */
const ReviewSaved = memo(function ReviewSaved({ cert, timed, weakLine, buildFor, onBuildClosed }: { cert: Certification; timed: boolean; weakLine: string; /** Mobile 2.2: open Build a set with this domain chosen. */ buildFor: BuildRequest | null; /** The learner closed Build a set: the request above is over. */ onBuildClosed: () => void }) {
  const { c } = useTheme();
  const [setOpen, setSetOpen] = useState(false);
  // Mobile 2.2: a domain row asked for Build a set. Open it (React's "adjust state when a value changes"
  // pattern, during render), then bring its row into view and put screen-reader focus on it.
  const [buildSeen, setBuildSeen] = useState<BuildRequest | null>(null);
  if (buildSeen !== buildFor) {
    setBuildSeen(buildFor);
    if (buildFor) setSetOpen(true);
  }
  const scroll = useScreenScroll();
  const buildRow = useRef<View>(null);
  useEffect(() => {
    if (!buildFor) return;
    scroll?.scrollToView(buildRow.current);
    return moveFocus(buildRow, 400);
  }, [buildFor, scroll]);
  // Primitives from the store, so the card re-renders only when its words change: the missed line
  // only says whether any are open (an answer that fixes one of several changes nothing here).
  const anyMissed = useProgress((p) => Object.values(selectCert(p, cert.id).mistakes).some((m) => !m.resolved));
  // Only saved questions this build has (the Saved list shows the same ones; mobile 2.3, free sample).
  const savedCount = useProgress((p) => selectCert(p, cert.id).bookmarks.filter((id) => findQuestion(cert.id, id)).length);
  const lines = reviewLines(anyMissed ? 1 : 0, savedCount);
  return (
    <HubCard testID="practice-more">
      <CardHead title="Review and saved" />
      <CardRow
        icon={(col) => <X size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="All missed questions"
        line={lines.missed}
        hint="Opens your Mistake journal"
        onPress={() => router.push('/mistakes')}
      />
      <RowDivider />
      {/* Grove Phase 4 (O8): the website's Weak spots drill, the three domains missed most plus open misses. */}
      <CardRow
        icon={(col) => <ChartColumn size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="Weak spots drill"
        line={weakLine}
        hint="Starts a set from the domains you miss most"
        // Nothing to drill (a course with no questions): the usual "Nothing to practice yet" note.
        onPress={() => guardedStart(() => startWeakSpotsDrill(cert.id), open)}
      />
      <RowDivider />
      <CardRow
        icon={(col) => <Bookmark size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="All saved questions"
        line={lines.saved}
        hint="Starts a set of your saved questions"
        onPress={() => guardedStart(() => startBookmarks(cert.id), open, () => router.push('/saved'))}
      />
      <RowDivider />
      {/* Browse every question by domain and topic (app/bank). Never shows bank size. */}
      <CardRow
        icon={(col) => <Library size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />}
        title="Question bank"
        line="Browse by domain and topic"
        onPress={() => router.push('/bank')}
      />
      <RowDivider />
      {/* A one-off set: saves nothing, and the only place with topic and difficulty. */}
      <DisclosureRow
        icon={<SlidersHorizontal size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
        title="Build a set"
        expanded={setOpen}
        onPress={() => {
          // Closing the panel forgets the domain a row (or a link) asked for, so the next plain
          // opening starts from "All domains" again.
          if (setOpen) onBuildClosed();
          setSetOpen((o) => !o);
        }}
        accessibilityHint="Shows the choices for a one-off set. Your path doesn't change."
        last
        ref={buildRow}
      />
      <Collapse open={setOpen}>
        <BuildASet cert={cert} timed={timed} preset={buildFor} />
      </Collapse>
    </HubCard>
  );
});

/** The Timer chips in Build a set (mobile 2.2), in this order. The hints say what each does. */
const TIMERS: { kind: PracticeTimerKind; label: string; hint: string }[] = [
  { kind: 'untimed', label: 'Untimed', hint: 'No timer' },
  { kind: 'countUp', label: 'Count up', hint: 'Counts up while you answer' },
  { kind: 'countdown', label: 'Countdown', hint: 'A time budget. At zero you choose: finish, or keep going untimed.' },
];

/** "10 questions", "1 question". */
const questionsWord = (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`;

/**
 * Build a set, inside the Review and saved card: domain, topic, length and difficulty as before, plus
 * (mobile 2.2) the Timer. `preset`: a domain row asked for this panel with its domain already chosen.
 */
const BuildASet = memo(function BuildASet({ cert, timed, preset }: { cert: Certification; timed: boolean; preset: BuildRequest | null }) {
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [topicId, setTopicId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState<number>(10);
  const [diff, setDiff] = useState(0);
  // A new request from a domain row: choose that domain (and no topic). "Adjust state when a value
  // changes", during render; it runs on the first render too, when the panel opens for the request.
  const [presetSeen, setPresetSeen] = useState<BuildRequest | null>(null);
  if (presetSeen !== preset) {
    setPresetSeen(preset);
    if (preset && cert.domains.some((d) => d.id === preset.domainId)) {
      setDomainId(preset.domainId);
      setTopicId(undefined);
    }
  }
  // The Timer starts from the screen's Timed switch (on = Count up, off = Untimed: the switch never
  // means a countdown). A choice made here is for this panel only; flipping the switch later wins again.
  const [timerHere, setTimerHere] = useState<PracticeTimerKind | null>(null);
  const [timedSeen, setTimedSeen] = useState(timed);
  if (timedSeen !== timed) {
    setTimedSeen(timed);
    setTimerHere(null);
  }
  const timer = timerHere ?? timerKindFromSetting(timed);
  // The countdown's pace (seconds per question) is what is remembered, so a new length keeps "about 90 s each".
  const [pace, setPace] = useState<number>(DEFAULT_COUNTDOWN_PACE);
  // "Hide the clock" (the mock start sheet's choice, for a countdown): words instead of ticking numbers.
  const [hideClock, setHideClock] = useState(false);
  const setTopics = scopeTopics(cert.id, domainId);
  const setTopic = domainId ? setTopics.find((t) => t.id === topicId) : undefined;
  const difficulty = DIFFS[diff].value;
  // How long the set will REALLY be: fewer than asked when the choices leave fewer questions.
  // (One pass over the course's questions; the panel is memoised, so it runs when a choice changes.)
  const real = practiceSetLength(cert.id, { count, domainId, difficulty, ...(setTopic ? { ids: topicQuestionIds(setTopic) } : {}) });
  // Nothing matches: keep the asked length on the button; the tap shows the usual "Nothing to practice yet".
  const length = real > 0 ? real : count;
  const shorter = real > 0 && real < count;
  const lengths = countdownChoices(length);
  const chosen = timer === 'countdown' ? choiceFor(lengths, pace) : undefined;
  const startLabel = chosen ? `Start ${countdownLabel(length, chosen.minutes)}` : `Start ${questionsWord(length)}${timer === 'countUp' ? ', timed' : ''}`;
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
      {/* Mobile 2.2: Untimed, Count up (the Timed switch's timer) or Countdown. */}
      <FieldLabel>Timer</FieldLabel>
      <View accessibilityLabel="Timer for this set">
        <ChipRow>
          {TIMERS.map((t) => (
            <Chip key={t.kind} label={t.label} accessibilityHint={t.hint} selected={timer === t.kind} onPress={() => setTimerHere(t.kind)} />
          ))}
        </ChipRow>
      </View>
      {timer === 'countdown' && lengths.length > 0 && (
        <View testID="build-set-countdown">
          {/* Three lengths worked out from the set: about 60, 90 and 120 seconds a question, in whole minutes. */}
          {/* "Time limit", not "length": "Length" beside it already means how many questions. */}
          <FieldLabel>Time limit</FieldLabel>
          <View accessibilityLabel="Time limit">
            <ChipRow>
              {lengths.map((l) => (
                <Chip
                  key={l.secPerQuestion}
                  label={`${l.minutes} min`}
                  accessibilityLabel={`${l.minutes} ${l.minutes === 1 ? 'minute' : 'minutes'}, about ${l.secPerQuestion} seconds a question`}
                  selected={l === chosen}
                  onPress={() => setPace(l.secPerQuestion)}
                />
              ))}
            </ChipRow>
          </View>
          <T v="meta" style={{ marginTop: space.sm }}>
            It only runs while you answer, and pauses while you read each explanation. At zero you choose: finish, or keep going untimed.
          </T>
          {/* For anyone a ticking clock unsettles (as on the mock start sheet): the countdown still runs. */}
          <View style={{ flexDirection: 'row', marginTop: space.sm }}>
            <Chip
              checkbox
              label="Hide the clock"
              accessibilityHint="The countdown still runs. You see the last 5 minutes in words, not ticking numbers."
              selected={hideClock}
              onPress={() => setHideClock((v) => !v)}
            />
          </View>
        </View>
      )}
      {/* Fewer questions match than were asked for: say the real length (the button says it too). */}
      {shorter && (
        <View testID="build-set-shorter" style={{ marginTop: space.sm }}>
          <T v="meta">{`These choices give ${questionsWord(real)}.`}</T>
        </View>
      )}
      <Gap h={space.md} />
      <Button
        kind="secondary"
        label={startLabel}
        // "min" is said as "minutes" (the label keeps the short form on screen).
        accessibilityLabel={chosen ? `Start ${questionsWord(length)} with a ${chosen.minutes} minute countdown` : undefined}
        onPress={() => {
          const domain = cert.domains.find((d) => d.id === domainId);
          guardedStart(
            () =>
              startPractice(cert.id, {
                count,
                domainId,
                difficulty,
                // Session titles use the short name, like chips and plan items (C9).
                title: setTopic ? setTopic.name : domain ? domain.short : 'Custom set',
                // A countdown is built from the set's real length (lib/sessions.ts); otherwise on or off, as before.
                ...(chosen ? { countdownSec: chosen.secPerQuestion, hideClock } : { timed: timer === 'countUp' }),
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
  const width = useContentWidth();
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
          line={`${hours} hours · weighted by domain`}
          spoken={`Full mock, ${cert.exam.questions} questions, ${hours} hours, weighted by domain`}
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
