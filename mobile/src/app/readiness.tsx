/**
 * Readiness report (mobile 1.16, PHASE5.md §3.1): "is my readiness moving,
 * where, and what would move it?" in one place. A data screen: no plant, no
 * celebration, nothing grows or draws in.
 *
 * Top to bottom:
 *   1. The range ("67–77%", estimated readiness) or "Not enough data yet".
 *      Mobile 1.24: one plain yardstick line under it (YARDSTICK_LINE: the app's own 80% low
 *      end and 70% per-domain bars; a study bar, never a pass mark).
 *   2. What this number is: "A study estimate, not a prediction.", always shown,
 *      with "How it's worked out" one tap away.
 *      (In exam week, the checklist follows, right under the framing.)
 *   3. What would raise your low end: up to 3 concrete actions, each a button
 *      (before there is a range: "What gets you a range").
 *   4. The low end of the range over the last 30 days.
 *   5. The mock trend: oldest → newest, full and mini told apart by shape, the
 *      trend in words ("Up 6 points over your last 3 mocks."). A fall is said
 *      plainly, never in red.
 *   6. Domain by domain, 1 → n: weight, domain readiness, the evidence behind
 *      it and the last two mocks in it. Never "of N questions" (bank size).
 *      Mobile 1.20: each row ends in "Lessons and notes ›" (Learn on that domain),
 *      or "Study notes ›" (that domain's notes) once all its lessons are done.
 *   7. Pacing (timed mocks only).
 *   8. Your path: the six steps, the current one marked ("Now"), with why.
 *   9. Your mocks, newest 5 (then "Show all N mocks"): a tap shows how each
 *      domain went (`?mock=<id>` opens one, and shows all when it is older).
 *  10. The trademark notice.
 *
 * Honest numbers: no pass, fail or guarantee wording anywhere; practice
 * scores are not scaled exam scores, and the screen says so.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { lessonsFor } from '../content/lessons';
import { noteDomain } from '../content/notes';
import { openTab } from '../lib/actions';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReadinessFigure } from '../components/journey';
import { ICON_STROKE, ListChecks } from '../components/icons';
import { Collapse } from '../components/motion';
import { DisclosureRow } from '../components/pathChooser';
import { DomainReportRow, type DomainLink, FRAMING_LINE, HOW_LINE, lowMarks, mockSubtitle, PRACTICE_SCORES_NOTE, ScoreChart, TrendLegend, trendMarks, useChartWidth } from '../components/readinessReport';
import { PlanLeaf } from '../components/glyphs';
import { BigNum, Button, DomainDot, EmptyState, ICON_SIZE, Lead, ListRow, PushedHeader, Section, T, useFontScale } from '../components/ui';
import type { Certification, DomainInfo } from '../content/types';
import { examWeekCount, examWeekOf } from '../engine/examWeek';
import { aboutSeconds, pacingStats, pacingStatsLine, spokenMin, timingOf } from '../engine/pace';
import { YARDSTICK_LINE } from '../engine/domainBand';
import { rangeSpoken } from '../engine/readinessRange';
import {
  domainBreakdown,
  lowSeries,
  lowSpoken,
  lowSummary,
  lowWords,
  mockPct,
  mockTally,
  mockTrend,
  PATH_NOTE,
  PATH_REASON,
  PATH_STEPS,
  raiseLowerBound,
  stepLabel,
  tallySpoken,
  tallyText,
  trendSpoken,
  trendWords,
  type RaiseAction,
} from '../engine/readinessReport';
import { STAGE_LABEL } from '../engine/journey';
import { dayKey } from '../engine/streak';
import { sessionSize } from '../engine/studyModes';
import { moveFocus } from '../lib/a11y';
import { shortDate } from '../lib/format';
import { guardedStart, startPractice, startReview, startStudy } from '../lib/sessions';
import { useJourney } from '../lib/useJourney';
import type { MockResult } from '../store/progress';
import { useDailyMinutes, useSettings } from '../store/settings';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Your mocks shows the newest this many, then "Show all N mocks" (UX review P8). */
export const MOCKS_SHOWN = 5;

export default function ReadinessReport() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mock?: string | string[] }>();
  // A repeated key arrives as an array: only a single id can open a mock (code review M5a).
  const want = typeof params.mock === 'string' ? params.mock : undefined;
  const j = useJourney();
  const { cert, readiness, range, progress, dueCount, stage, examFocused, daysLeft, examDate } = j;
  const minutes = useDailyMinutes();
  const savedSize = useSettings((s) => s.studySize);
  const size = sessionSize(savedSize, minutes);
  const width = useChartWidth();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const open = () => router.push('/session');
  // Mobile 1.20: where each domain row leads. Lessons still to do → Learn on that domain
  // (Learn reads ?domain= for its "Up next"). Every lesson done → that domain's study
  // notes, the honest next step (Learn would only offer another domain's lesson).
  const domainLink = (d: DomainInfo): DomainLink | undefined => {
    const lessons = lessonsFor(cert.id, d.id);
    const toDo = lessons.some((l) => !progress.lessonsDone.includes(l.id));
    if (!toDo && noteDomain(cert.id, d.id)) {
      return {
        label: 'Study notes ›',
        accessibilityLabel: `Study notes for ${d.name}`,
        hint: 'Every lesson here is done. Opens the study notes for this domain',
        onPress: () => router.push(`/notes/${encodeURIComponent(d.id)}`),
      };
    }
    if (!lessons.length) return undefined;
    return {
      label: 'Lessons and notes ›',
      accessibilityLabel: `Lessons and notes for ${d.name}`,
      hint: 'Opens Learn on this domain',
      onPress: () => openTab({ pathname: '/learn', params: { domain: d.id } }),
    };
  };

  // 3. What would raise the low end.
  const actions = raiseLowerBound(cert, readiness, range, dueCount);
  const short = (id: string) => cert.domains.find((d) => d.id === id)?.short ?? '';
  const run = (a: RaiseAction) => {
    switch (a.kind) {
      case 'unlock':
        return guardedStart(() => startStudy(cert.id, { mode: 'smart', count: size }), open);
      case 'answer':
        return guardedStart(() => startPractice(cert.id, { count: Math.max(a.more, size), domainId: a.domainId, title: short(a.domainId) }), open);
      case 'focus':
        return guardedStart(() => startPractice(cert.id, { count: size, domainId: a.domainId, title: `Weak spots: ${short(a.domainId)}` }), open);
      case 'review':
        return guardedStart(() => startReview(cert.id), open, () => router.push('/caught-up'));
      case 'mix':
        return undefined;
    }
  };

  // 4–7. Everything the charts and rows read, worked out once per change of
  // data (code review M5b): toggling a mock or "How it's worked out" re-sorts
  // nothing and redraws no chart.
  const [today] = useState(() => dayKey(Date.now()));
  const momentsLog = progress.moments?.readiness;
  const data = useMemo(() => {
    const mocks = [...progress.mocks].sort((a, b) => b.finishedAt - a.finishedAt);
    const trend = mockTrend(mocks, cert.exam.questions);
    const low = lowSummary(lowSeries(momentsLog, today));
    return {
      mocks,
      trend,
      // 4. The low end over the last 30 days.
      low,
      lowChart: lowMarks(low.values),
      // 5. The mock trend.
      words: trendWords(trend),
      scores: trend.map((p) => `${p.pct}%`).join(' · '),
      trendChart: trendMarks(trend),
      // 6. Domain by domain.
      rows: domainBreakdown(cert, readiness, mocks),
      // 7. Pacing: timed mocks with pacing data, newest first, up to 5.
      pacingLine: pacingStatsLine(pacingStats(mocks)),
      paced: mocks.filter((m) => timingOf(m.timing) !== 'untimed' && typeof m.medianSec === 'number').slice(0, 5),
    };
  }, [progress.mocks, momentsLog, readiness, cert, today]);
  const { mocks, trend, low, words, scores, rows, pacingLine, paced } = data;

  // Exam week: the checklist is one tap away here, even after Today's card was hidden.
  const examWeek = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && examDate ? examWeekOf(progress.moments?.examWeek, examDate) : null;

  // 9. Your mocks; `?mock=<id>` opens that one and scrolls it into view (an
  // unknown id opens nothing). An older one shows the whole list first.
  const target = want && mocks.some((m) => m.id === want) ? want : null;
  const [opened, setOpened] = useState<string[]>(() => (target ? [target] : []));
  const [showAll, setShowAll] = useState(() => (target ? mocks.findIndex((m) => m.id === target) >= MOCKS_SHOWN : false));
  const toggle = (id: string) => setOpened((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const scroll = useRef<ScrollView>(null);
  const mocksY = useRef<number | null>(null);
  const targetY = useRef<number | null>(null);
  // Follows the target while the layout above it settles (a chart's width, a
  // font), until the learner scrolls themselves (code review M5c).
  const userScrolled = useRef(false);
  const targetRef = useRef<View>(null);
  const scrollToTarget = () => {
    if (!target || userScrolled.current || mocksY.current === null || targetY.current === null) return;
    scroll.current?.scrollTo({ y: Math.max(0, mocksY.current + targetY.current - space.xl), animated: false });
  };
  useEffect(() => {
    if (target) moveFocus(targetRef, 500);
  }, [target]);

  const stepNow = PATH_STEPS.findIndex((s) => s.stage === stage);
  const shownMocks = showAll ? mocks : mocks.slice(0, MOCKS_SHOWN);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        ref={scroll}
        onScrollBeginDrag={() => {
          userScrolled.current = true;
        }}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl * 2 }}
      >
        <PushedHeader title="Readiness report" onBack={back} />

        {/* 1. The range */}
        <View
          accessible
          accessibilityLabel={range.enough ? `Estimated readiness ${rangeSpoken(range)}.` : `Not enough data yet. ${range.needed} more ${range.needed === 1 ? 'answer' : 'answers'} until your readiness range.`}
          style={{ marginTop: space.lg }}
        >
          <ReadinessFigure range={range} />
          <T v="meta" style={{ marginTop: 4 }}>
            {range.enough ? 'estimated readiness' : `${range.needed} more ${range.needed === 1 ? 'answer' : 'answers'} until your readiness range`}
          </T>
        </View>
        {/* Mobile 1.24: what to compare the range with, in the app's own bars (80% low end, 70% per domain).
            Never a pass mark and never a promise: the framing below says so too. */}
        <View testID="readiness-yardstick" style={{ marginTop: space.sm }}>
          <T v="small" color={c.ink2}>{YARDSTICK_LINE}</T>
        </View>

        {/* 2. What this number is: always on screen, never hidden. Before
            there is a number, it says what the range will be (UX review P3). */}
        <View testID="readiness-framing" style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
          <View accessible accessibilityLabel={`${range.enough ? 'What this number is' : 'What your range will be'}. A study estimate, not a prediction. ${FRAMING_LINE}`}>
            <T v="caption" color={c.accentText}>{range.enough ? 'What this number is' : 'What your range will be'}</T>
            <T v="quote" style={{ marginTop: 4 }}>A study estimate, not a prediction.</T>
            <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{FRAMING_LINE}</T>
          </View>
        </View>
        <HowItWorks />

        {/* Exam week: the checklist sits right under the framing (UX review O6). */}
        {examWeek && (
          <View style={{ marginTop: space.sm }}>
            <ListRow
              icon={<ListChecks size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
              title="Exam-week checklist"
              subtitle={examWeekCount(examWeek.done)}
              onPress={() => router.push('/exam-week')}
              last
            />
          </View>
        )}

        {/* 3. What would raise the low end ("low end": one name for the number, UX review P2) */}
        <Section title={range.enough ? 'What would raise your low end' : 'What gets you a range'} />
        {actions.map((a, i) => (
          <View key={a.kind} testID={`raise-${a.kind}`} style={{ paddingVertical: space.sm, borderBottomWidth: i === actions.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <T v="label">{a.text}</T>
            {a.kind !== 'mix' && (
              <Button kind="ghost" label={a.button} onPress={() => run(a)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
            )}
          </View>
        ))}

        {/* 4. The low end over time */}
        <Section title="Your low end over time" />
        <T v="caption" color={c.ink2}>The cautious end of your range, last 30 days</T>
        {low.enough && low.values.length > 1 ? (
          <View accessible accessibilityRole="image" accessibilityLabel={lowSpoken(low) ?? undefined} style={{ marginTop: space.sm }}>
            <ScoreChart marks={data.lowChart} width={width} testID="low-chart" />
            <T v="meta" style={{ marginTop: space.xs }}>{lowWords(low)}</T>
          </View>
        ) : (
          <T v="meta" style={{ marginTop: space.xs }}>This fills in as you study on more days.</T>
        )}

        {/* 5. The mock trend */}
        <Section title="Mock trend" />
        {trend.length === 0 ? (
          <>
            <EmptyState compact title="No mocks yet" body="A mini mock shows how the exam feels." />
            <Button
              kind="ghost"
              label="Start a mini mock"
              accessibilityHint={`${Math.round(cert.exam.questions / 3)} questions. Opens the timing choices first.`}
              onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(Math.round(cert.exam.questions / 3)) } })}
              style={{ alignSelf: 'center', marginTop: space.xs }}
            />
          </>
        ) : trend.length === 1 ? (
          <View accessible accessibilityLabel={`Your mock: ${trend[0].pct} percent, ${trend[0].kind === 'full' ? 'a full mock' : trend[0].kind === 'mini' ? 'a mini mock' : `${mocks[0].total} questions`}, ${shortDate(trend[0].at)}.`} style={{ marginTop: space.xs }}>
            <BigNum value={String(trend[0].pct)} pct size={34} />
            <T v="meta">{`${trend[0].kind === 'full' ? 'Full mock' : trend[0].kind === 'mini' ? 'Mini mock' : `${mocks[0].total} questions`} · ${shortDate(trend[0].at)}${trend[0].timed ? '' : ' · untimed'}`}</T>
          </View>
        ) : (
          <View
            accessible
            accessibilityRole="image"
            // Each score with its kind, so mini and full are told apart by ear too (code review M3c).
            accessibilityLabel={`${trendSpoken(trend)} ${words ?? ''}`.trim()}
            style={{ marginTop: space.xs }}
          >
            <ScoreChart marks={data.trendChart} width={width} testID="trend-chart" />
            <TrendLegend points={trend} />
            <T v="meta" num style={{ marginTop: space.xs }}>{`Oldest first: ${scores}`}</T>
            {words && <T v="small" style={{ marginTop: space.sm }}>{words}</T>}
          </View>
        )}
        <T v="meta" style={{ marginTop: space.md }}>{`${PRACTICE_SCORES_NOTE} ${cert.exam.passingNote}`}</T>

        {/* 6. Domain by domain */}
        <Section title="Domain by domain" />
        {rows.map((r, i) => (
          <DomainReportRow
            key={r.domain.id}
            row={r}
            last={i === rows.length - 1}
            link={domainLink(r.domain)}
          />
        ))}

        {/* 7. Pacing (timed mocks only) */}
        {pacingLine && (
          <>
            <Section title="Pacing" />
            <T v="small" accessibilityLabel={spokenMin(pacingLine)}>{pacingLine}</T>
            {paced.map((m) => {
              const line = `${shortDate(m.finishedAt)} · ${aboutSeconds(m.medianSec!)} a question${m.unanswered === undefined ? '' : m.unanswered === 0 ? ' · every question answered' : ` · ${m.unanswered} left blank`}`;
              return (
                <T key={m.id} v="meta" accessibilityLabel={spokenMin(line)} style={{ marginTop: space.xs }}>{line}</T>
              );
            })}
          </>
        )}

        {/* 8. Your path: the six steps. "Now: Make it stick", no "Step N of 6"
            counter (UX review P1, decided): the plan can move back a step. */}
        <Section title="Your path" />
        <T v="stage">{stepLabel(stage)}</T>
        <View style={{ marginTop: space.sm }}>
          {PATH_STEPS.map((s, i) => {
            const now = i === stepNow;
            const skipped = s.stage === 'learn' && examFocused;
            const line = skipped ? `${s.line} Your exam-focused plan skips this; lessons stay in Learn.` : s.line;
            return (
              <View
                key={s.stage}
                accessible
                accessibilityLabel={`${i + 1}. ${STAGE_LABEL[s.stage]}. ${line}${now ? ` You are here. ${PATH_REASON[s.stage]}` : ''}`}
                testID={`path-step-${s.stage}`}
                style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.sm }}
              >
                {/* Filled leaf = where you are (shape AND the word "Now", never colour alone). */}
                <View style={{ width: 22, alignItems: 'center', paddingTop: 4 }}>
                  <PlanLeaf color={c.accent} filled={now} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space.sm }}>
                    <T v="label" color={now ? c.ink : c.ink2}>{`${i + 1}. ${STAGE_LABEL[s.stage]}`}</T>
                    {now && <T v="caption" color={c.accentText}>Now</T>}
                  </View>
                  <T v="meta">{line}</T>
                  {/* Why the plan is here, under the current step only (UX review O8). */}
                  {now && <T v="meta" color={c.ink} style={{ marginTop: 2 }}>{PATH_REASON[s.stage]}</T>}
                </View>
              </View>
            );
          })}
        </View>
        {stepNow >= 0 && <T v="meta" style={{ marginTop: space.xs }}>{PATH_NOTE}</T>}

        {/* 9. Your mocks: the newest 5, then "Show all N mocks" (UX review P8) */}
        {mocks.length > 0 && (
          <View onLayout={(e) => { mocksY.current = e.nativeEvent.layout.y; scrollToTarget(); }}>
            <Section title="Your mocks" />
            {shownMocks.map((m, i) => {
              const isOpen = opened.includes(m.id);
              const isLast = i === shownMocks.length - 1 && mocks.length <= MOCKS_SHOWN;
              const rowEl = (
                <View
                  testID={`mock-${m.id}`}
                  onLayout={m.id === target ? (e) => { targetY.current = e.nativeEvent.layout.y; scrollToTarget(); } : undefined}
                >
                  <DisclosureRow
                    ref={m.id === target ? targetRef : undefined}
                    lead={<Lead value={`${mockPct(m)}%`} unit="score" />}
                    title={`${m.total} questions`}
                    subtitle={mockSubtitle(m)}
                    expanded={isOpen}
                    onPress={() => toggle(m.id)}
                    accessibilityLabel={`${m.total} questions, score ${mockPct(m)} percent, ${spokenMin(mockSubtitle(m))}`}
                    accessibilityHint={isOpen ? 'Hides how each domain went' : 'Shows how each domain went'}
                    last={isLast}
                  />
                  <Collapse open={isOpen}>
                    <MockDomains mock={m} cert={cert} last={isLast} />
                  </Collapse>
                </View>
              );
              // "Show all" sits after the newest 5; the older mocks follow it when it is open.
              return i === MOCKS_SHOWN - 1 && mocks.length > MOCKS_SHOWN ? (
                <View key={m.id}>
                  {rowEl}
                  <DisclosureRow
                    title={`Show all ${mocks.length} mocks`}
                    expanded={showAll}
                    onPress={() => setShowAll((x) => !x)}
                    accessibilityHint={showAll ? 'Hides the older mocks' : 'Shows your older mocks below'}
                    last={!showAll}
                  />
                </View>
              ) : (
                <View key={m.id}>{rowEl}</View>
              );
            })}
          </View>
        )}

        <T v="meta" center style={{ marginTop: space.xxl }}>{cert.trademarkNotice}</T>
      </ScrollView>
    </SafeAreaView>
  );
}

/** "How it's worked out": one tap away, never hidden behind a sheet. */
function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: space.sm }}>
      <DisclosureRow title="How it’s worked out" expanded={open} onPress={() => setOpen((o) => !o)} last />
      <Collapse open={open}>
        <T v="small" style={{ paddingBottom: space.sm }}>{HOW_LINE}</T>
      </Collapse>
    </View>
  );
}

/** Where the tally sits under the name at large text: the dot (8) and its gap. */
const NAME_INSET = 8 + space.sm;

/**
 * One mock's result in each domain, in the exam's order: "8 of 9 (89%)", or
 * "–" when an older save has none. Large text (UX review H1): no 66pt indent,
 * and the tally drops under the name, so a name never breaks mid-word. A
 * hairline closes it when another mock follows (UX review O10).
 */
const MockDomains = memo(function MockDomains({ mock, cert, last }: { mock: MockResult; cert: Certification; last?: boolean }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <View
      testID={`mock-domains-${mock.id}`}
      style={{ paddingLeft: large ? 0 : 66, paddingBottom: space.md, gap: large ? space.sm : 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}
    >
      {cert.domains.map((d) => {
        const t = mockTally(mock, d.id);
        return (
          <View key={d.id} accessible accessibilityLabel={`${d.short}, ${tallySpoken(t ?? undefined)}`} style={large ? undefined : { flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flex: large ? undefined : 1, minWidth: 0 }}>
              <DomainDot domain={d} />
              <T v="meta" color={c.ink} style={{ flexShrink: 1 }}>{d.short}</T>
            </View>
            <T v="meta" num style={large ? { paddingLeft: NAME_INSET } : undefined}>{tallyText(t)}</T>
          </View>
        );
      })}
    </View>
  );
});
