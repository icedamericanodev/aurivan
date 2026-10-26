/**
 * Practice — every way to answer questions, in one place.
 * Spec: DESIGN_SYSTEM.md §11 "Practice":
 *   forest "Quick 10" → Spaced review / Weak spots rows → "Build a set"
 *   (domain chips, serif segmented size, difficulty chips, Start) →
 *   "Mock exams" rows with a lead serif numeral.
 *
 * Build D: a "Timed" switch (count-up timer, never a countdown) for your
 * path and Build a set, starting from Settings → Study defaults; and, once, a
 * "Practice at exam pace?" card close to the exam (engine/pace.ts).
 *
 * Build E, "Choose your path": the forest hero starts the learner's study
 * mode (Smart, Guided, In order or Random; engine/studyModes.ts) for the
 * chosen domain and size. The picker below it is a radio list, each mode
 * with its one-line "why"; the app marks the mode it suggests for the
 * journey stage, but the learner's last choice is saved and always wins.
 * Build a set gains topic chips once a domain is picked.
 *
 * Build E redesign (beginner load): the hero is the one action. Under it,
 * one row says what it starts ("Smart · All domains · 10 questions") and
 * opens the path chooser in place (components/pathChooser.tsx). Build a set
 * is folded into one row with its own labelled controls (Domain, Topic,
 * Length, Difficulty), so the two sets of controls are never confused.
 * "Or 10 mixed questions" keeps a quick mixed 10 one tap away whenever the
 * hero isn't already one.
 *
 * Mobile 1.15 (PHASE5.md §2.4, ui.md P1–P2): "Mock exams" moves up, right
 * under the hero, for the Exam-focused plan and at the mock and ready
 * stages. The one-time "Practice at exam pace?" card sits under the Timed
 * switch it changes, never above the hero. Session titles use a domain's
 * short name (C9), and the exam pace is said in seconds (C2).
 *
 * Mobile 1.21 (premium pass): the hero title names the path and never holds
 * a count ("Picked for you"); the count and the minutes go to its meta line
 * ("10 questions · about 12 min"). The title is short, so it keeps clear of
 * the frond (no wideTitle). The "Practice at exam pace?" offer is an L1
 * plate, not a raised card: it is an offer, not a choice between things.
 */
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, View, type Switch } from 'react-native';
import { ArrowRight, Crosshair, ICON_STROKE, Library, ListChecks, RotateCcw } from '../../components/icons';
import { Collapse } from '../../components/motion';
import { DisclosureRow, FieldLabel, PathChooser, pathSummary } from '../../components/pathChooser';
import { Button, Card, Chip, ChipRow, Enter, Gap, HeroPanel, ICON_SIZE, Lead, ListRow, Screen, Section, Segmented, T, ToggleRow, Trail } from '../../components/ui';
import type { Difficulty } from '../../content/types';
import { topicQuestionIds } from '../../engine/outline';
import { aboutMin, examPaceWords, MINUTES_PER_QUESTION, shouldOfferTimer, spokenMin } from '../../engine/pace';
import { REVIEW_UNIT } from '../../engine/srs';
import { activeMode, MODE_INFO, scopeKey, SESSION_SIZES, sessionSize, suggestedMode } from '../../engine/studyModes';
import { currentGuidedTopic } from '../../engine/studyPath';
import { guidedStatus, scopeTopics } from '../../lib/outline';
import { shortTopic } from '../../lib/format';
import { guardedStart, reviewSubtitle, startPractice, startReview, startStudy } from '../../lib/sessions';
import { moveFocus } from '../../lib/a11y';
import { useJourney } from '../../lib/useJourney';
import { useDailyMinutes, useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const DIFFS: { label: string; value?: Difficulty }[] = [
  { label: 'Any difficulty' },
  { label: 'Foundational', value: 'foundational' },
  { label: 'Application', value: 'application' },
  { label: 'Analysis', value: 'analysis' },
];

export default function Practice() {
  const { c } = useTheme();
  const { cert, readiness, dueCount, daysLeft, stage, progress, examFocused } = useJourney();
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
  const timedRef = useRef<Switch>(null);
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
  const startPath = () => {
    if (mode === 'guided') {
      router.push({ pathname: '/guided', params: { ...(pathDomain ? { domain: pathDomain.id } : {}), timed: timed ? '1' : '0' } });
      return;
    }
    guardedStart(() => startStudy(cert.id, { mode, domainId: pathDomain?.id, count: pathSize, timed }), open);
  };
  // A quick mixed 10 stays one tap away for everyone: offered under the hero
  // whenever the hero isn't already a 10-question mix across all domains.
  const heroIsQuickMix = (mode === 'smart' || mode === 'random') && !pathDomain && pathSize === 10;
  const startQuickMix = () => guardedStart(() => startStudy(cert.id, { mode: 'random', count: 10, timed }), open);
  // The path chooser and Build a set start folded: one action, one row.
  const [pathOpen, setPathOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const pathRowRef = useRef<View>(null);
  const summary = pathSummary(mode, pathDomain, pathSize);
  const heroMeta =
    mode === 'guided'
      ? 'Learn it, practice it, then mix it with earlier topics.'
      : `${pathSize} questions · ${aboutMin(pathSize * MINUTES_PER_QUESTION, true)}${timed ? ' · timed' : ''}`;

  // ── Build a set ──
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [topicId, setTopicId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState<number>(10);
  const [diff, setDiff] = useState(0);
  const setTopics = scopeTopics(cert.id, domainId);
  const setTopic = domainId ? setTopics.find((t) => t.id === topicId) : undefined;
  const open = () => router.push('/session');
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId);
  const mini = Math.round(cert.exam.questions / 3);
  const miniMinutes = Math.round((cert.exam.minutes / cert.exam.questions) * mini);
  const hours = cert.exam.minutes / 60;
  const icon = (G: typeof Crosshair) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;

  /** The one-time "Practice at exam pace?" card: under Timed, or under Mock exams when they lead. */
  const paceCard = offer ? (
    // Offered ONCE (behavioural review §2): close to the exam or at the
    // mock / ready stage. Never switched on without the learner's tap.
    // Mobile 1.15 (ui.md P1): under the Timed switch it changes, not above the hero.
    <Card variant="plate" style={{ marginTop: space.md }}>
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
    </Card>
  ) : null;
  /** Mock exams: under the hero for the Exam-focused plan and the mock / ready stages (`top`), else last. */
  const mockExams = (top: boolean) => (
    <Enter i={top ? 2 : 4}>
        <Section title="Mock exams" />
        <ListRow
          lead={<Lead value={String(mini)} unit="questions" />}
          title="Mini mock"
          subtitle={`${miniMinutes} min · feedback at the end`}
          accessibilityLabel={`Mini mock, ${mini} questions, ${miniMinutes} minutes, feedback at the end`}
          // The start sheet first: timing (standard, extra time, untimed) and "hide the clock".
          onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(mini) } })}
        />
        <ListRow
          lead={<Lead value={String(cert.exam.questions)} unit="questions" />}
          title="Full mock"
          subtitle={`${hours} hours · weighted like the real ${cert.name}`}
          accessibilityLabel={`Full mock, ${cert.exam.questions} questions, ${hours} hours`}
          onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(cert.exam.questions) } })}
          last
        />
        <Gap h={space.sm} />
        <T v="meta">{cert.exam.passingNote}</T>
    </Enter>
  );

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Practice</T>
        <T v="meta" style={{ marginTop: space.xs }}>Every option explained, every trap named.</T>
      </Enter>

      <Enter i={1} style={{ marginTop: space.xl }}>
        <HeroPanel
          // The mode, domain and length live in the summary row below (O2: said once).
          caption="Your path"
          // Mobile 1.21: the title names the path, never a count (the count goes to the meta).
          title={
            mode === 'guided'
              ? guidedTopic
                ? `Next topic: ${guidedTopic.name}`
                : 'Your next topic'
              : mode === 'smart'
                ? 'Picked for you'
                : mode === 'inOrder'
                  ? 'Topic by topic'
                  : 'A mixed set'
          }
          // The mode's why lives once, under its radio (O2); the hero says how many and how long.
          meta={heroMeta}
          metaLabel={spokenMin(heroMeta)}
          art="frond2"
          // Mobile 1.43 (tab header C): a white card with the Practice seal; Today keeps the forest panel.
          seal="leafvein"
          action={{
            label: mode === 'guided' ? 'Open step' : 'Start',
            // Play is for lessons (the 1.20 icon rule): practice goes forward with an arrow (mobile 1.22).
            icon: (col) => <ArrowRight size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
            iconTrailing: true,
            hint: mode === 'guided' ? 'Opens your Guided step' : `${pathSize} questions, ${MODE_INFO[mode].name}`,
            onPress: startPath,
          }}
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
      </Enter>

      <Enter i={2} style={{ marginTop: heroIsQuickMix ? space.sm : 0 }}>
        {/* One row says what the hero starts; it opens the chooser right here. */}
        <DisclosureRow
          ref={pathRowRef}
          title={summary}
          action={pathOpen ? 'Close' : 'Change'}
          expanded={pathOpen}
          onPress={() => setPathOpen((o) => !o)}
          accessibilityLabel={`Your path: ${summary.split(' · ').join(', ')}. ${pathOpen ? 'Close' : 'Change'}`}
          accessibilityHint="Shows the study mode, domain and length the Start button uses."
        />
        {/* Opens right here: the panel arrives (fade + 8pt rise); nothing slides (motion.md M4). */}
        <Collapse open={pathOpen}>
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
              moveFocus(pathRowRef);
            }}
          />
        </Collapse>
        <ToggleRow
          ref={timedRef}
          title="Timed"
          subtitle="Your path and Build a set. Counts up while you answer; never a countdown."
          value={timed}
          onValueChange={setTimedHere}
          last
        />
      {!mocksFirst && paceCard}
      </Enter>
      {/* Mock exams straight after Timed when they lead, then the pace offer (UX review P3). */}
      {mocksFirst && mockExams(true)}
      {mocksFirst && paceCard && <Enter i={2}>{paceCard}</Enter>}

      <Enter i={3}>
        <Section title="More ways to practice" />
        <ListRow
          icon={icon(RotateCcw)}
          title="Questions to revisit"
          subtitle={reviewSubtitle(dueCount)}
          trailing={dueCount ? <Trail value={String(dueCount)} unit={REVIEW_UNIT} /> : undefined}
          accessibilityLabel={`Questions to revisit, ${dueCount ? `${dueCount} ${REVIEW_UNIT}. ${reviewSubtitle(dueCount)}` : 'all caught up'}`}
          onPress={() => guardedStart(() => startReview(cert.id), open, () => router.push('/caught-up'))}
        />
        {focus && (
          <ListRow
            icon={icon(Crosshair)}
            title={`Weak spots: ${focus.short}`}
            subtitle="Most points to gain"
            onPress={() => guardedStart(() => startPractice(cert.id, { count: 10, domainId: focus.id, title: focus.short }), open)}
          />
        )}
        {/* Browse every question by domain and topic (app/bank). Never shows bank size. */}
        <ListRow
          icon={icon(Library)}
          title="Question bank"
          subtitle="Browse by domain and topic"
          onPress={() => router.push('/bank')}
        />
        {/* A one-off set: saves nothing, and the only place with topic and difficulty. */}
        <DisclosureRow
          icon={icon(ListChecks)}
          title="Build a set"
          subtitle="Pick a domain, topic and difficulty"
          expanded={setOpen}
          onPress={() => setSetOpen((o) => !o)}
          accessibilityHint="Shows the choices for a one-off set. Your path doesn't change."
          last
        />
        <Collapse open={setOpen}>
          <View testID="build-set">
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
        </Collapse>
      </Enter>

      {!mocksFirst && mockExams(false)}
    </Screen>
  );
}
