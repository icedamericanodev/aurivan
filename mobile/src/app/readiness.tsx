/**
 * Readiness report (mobile 1.16, PHASE5.md §3.1): "is my readiness moving,
 * where, and what would move it?" in one place. A data screen: no plant, no
 * celebration, nothing grows or draws in.
 *
 * Top to bottom:
 *   1. The range ("67–77%", estimated readiness) or "Not enough data yet".
 *   2. What this number is: "A study estimate, not a prediction.", always shown,
 *      with "How it's worked out" one tap away.
 *   3. What would raise your lower number: up to 3 concrete actions, each a button.
 *      (In exam week, the checklist follows.)
 *   4. The low end of the range over the last 30 days.
 *   5. The mock trend: oldest → newest, full and mini told apart by shape, the
 *      trend in words ("Up 6 points over your last 3 mocks."). A fall is said
 *      plainly, never in red.
 *   6. Domain by domain, 1 → n: weight, domain readiness, the evidence behind
 *      it and the last two mocks in it. Never "of N questions" (bank size).
 *   7. Pacing (timed mocks only).
 *   8. Your path: the six steps, the current one marked.
 *   9. Every mock: a tap shows how each domain went (`?mock=<id>` opens one).
 *  10. The trademark notice.
 *
 * Honest numbers: no pass, fail or guarantee wording anywhere; practice
 * scores are not scaled exam scores, and the screen says so.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReadinessFigure } from '../components/journey';
import { ICON_STROKE, ListChecks } from '../components/icons';
import { Collapse } from '../components/motion';
import { DisclosureRow } from '../components/pathChooser';
import { DomainReportRow, FRAMING_LINE, HOW_LINE, lowMarks, mockSubtitle, PRACTICE_SCORES_NOTE, ScoreChart, TrendLegend, trendMarks, useChartWidth } from '../components/readinessReport';
import { PlanLeaf } from '../components/glyphs';
import { BigNum, Button, DomainDot, EmptyState, ICON_SIZE, Lead, ListRow, PushedHeader, Section, T } from '../components/ui';
import type { Certification } from '../content/types';
import { examWeekCount, examWeekOf } from '../engine/examWeek';
import { aboutSeconds, pacingStats, pacingStatsLine, spokenMin, timingOf } from '../engine/pace';
import { rangeSpoken } from '../engine/readinessRange';
import {
  domainBreakdown,
  lowSeries,
  lowSpoken,
  lowSummary,
  lowWords,
  mockPct,
  mockTrend,
  PATH_STEPS,
  raiseLowerBound,
  stepLabel,
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
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function ReadinessReport() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mock?: string }>();
  const j = useJourney();
  const { cert, readiness, range, progress, dueCount, stage, examFocused, daysLeft, examDate } = j;
  const minutes = useDailyMinutes();
  const savedSize = useSettings((s) => s.studySize);
  const size = sessionSize(savedSize, minutes);
  const width = useChartWidth();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const open = () => router.push('/session');

  // 3. What would raise the lower number.
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

  // 4. The low end over the last 30 days.
  const [today] = useState(() => dayKey(Date.now()));
  const low = lowSummary(lowSeries(progress.moments?.readiness, today));

  // 5. The mock trend.
  const mocks = [...progress.mocks].sort((a, b) => b.finishedAt - a.finishedAt);
  const trend = mockTrend(mocks, cert.exam.questions);
  const words = trendWords(trend);
  const scores = trend.map((p) => `${p.pct}%`).join(' · ');

  // 6. Domain by domain.
  const rows = domainBreakdown(cert, readiness, mocks);

  // 7. Pacing: timed mocks with pacing data, newest first, up to 5.
  const pacingLine = pacingStatsLine(pacingStats(mocks));
  const paced = mocks.filter((m) => timingOf(m.timing) !== 'untimed' && typeof m.medianSec === 'number').slice(0, 5);

  // Exam week: the checklist is one tap away here, even after Today's card was hidden.
  const examWeek = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && examDate ? examWeekOf(progress.moments?.examWeek, examDate) : null;

  // 9. Every mock; `?mock=<id>` opens that one and scrolls it into view.
  const [opened, setOpened] = useState<string[]>(() => (params.mock ? [params.mock] : []));
  const toggle = (id: string) => setOpened((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const scroll = useRef<ScrollView>(null);
  const mocksY = useRef<number | null>(null);
  const targetY = useRef<number | null>(null);
  const scrolled = useRef(false);
  const targetRef = useRef<View>(null);
  const target = params.mock && mocks.some((m) => m.id === params.mock) ? params.mock : null;
  const scrollToTarget = () => {
    if (scrolled.current || mocksY.current === null || targetY.current === null) return;
    scrolled.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, mocksY.current + targetY.current - space.xl), animated: false });
  };
  useEffect(() => {
    if (target) moveFocus(targetRef, 500);
  }, [target]);

  const stepNow = PATH_STEPS.findIndex((s) => s.stage === stage);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl * 2 }}>
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

        {/* 2. What this number is: always on screen, never hidden. */}
        <View testID="readiness-framing" style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
          <View accessible accessibilityLabel={`What this number is. A study estimate, not a prediction. ${FRAMING_LINE}`}>
            <T v="caption" color={c.accentText}>What this number is</T>
            <T v="quote" style={{ marginTop: 4 }}>A study estimate, not a prediction.</T>
            <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{FRAMING_LINE}</T>
          </View>
        </View>
        <HowItWorks />

        {/* 3. What would raise the lower number */}
        <Section title="What would raise your lower number" />
        {actions.map((a, i) => (
          <View key={a.kind} testID={`raise-${a.kind}`} style={{ paddingVertical: space.sm, borderBottomWidth: i === actions.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <T v="label">{a.text}</T>
            {a.kind !== 'mix' && (
              <Button kind="ghost" label={a.button} onPress={() => run(a)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
            )}
          </View>
        ))}
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

        {/* 4. The low end over time */}
        <Section title="Your cautious number over time" />
        <T v="caption" color={c.ink2}>Low end of your range, last 30 days</T>
        {low.enough && low.values.length > 1 ? (
          <View accessible accessibilityRole="image" accessibilityLabel={lowSpoken(low) ?? undefined} style={{ marginTop: space.sm }}>
            <ScoreChart marks={lowMarks(low.values)} width={width} testID="low-chart" />
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
            accessibilityLabel={`Your last ${trend.length} mocks, oldest first: ${trend.map((p) => p.pct).join(', ')} percent. ${words ?? ''}`}
            style={{ marginTop: space.xs }}
          >
            <ScoreChart marks={trendMarks(trend)} width={width} testID="trend-chart" />
            <TrendLegend points={trend} />
            <T v="meta" num style={{ marginTop: space.xs }}>{`Oldest first: ${scores}`}</T>
            {words && <T v="small" style={{ marginTop: space.sm }}>{words}</T>}
          </View>
        )}
        <T v="meta" style={{ marginTop: space.md }}>{`${PRACTICE_SCORES_NOTE} ${cert.exam.passingNote}`}</T>

        {/* 6. Domain by domain */}
        <Section title="Domain by domain" />
        {rows.map((r, i) => (
          <DomainReportRow key={r.domain.id} row={r} last={i === rows.length - 1} />
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

        {/* 8. Your path: the six steps */}
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
                accessibilityLabel={`Step ${i + 1} of ${PATH_STEPS.length}, ${STAGE_LABEL[s.stage]}. ${line}${now ? ' You are here.' : ''}`}
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
                </View>
              </View>
            );
          })}
        </View>

        {/* 9. Every mock */}
        {mocks.length > 0 && (
          <View onLayout={(e) => { mocksY.current = e.nativeEvent.layout.y; scrollToTarget(); }}>
            <Section title="Your mocks" />
            {mocks.map((m, i) => {
              const isOpen = opened.includes(m.id);
              return (
                <View
                  key={m.id}
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
                    last={i === mocks.length - 1}
                  />
                  <Collapse open={isOpen}>
                    <MockDomains mock={m} cert={cert} />
                  </Collapse>
                </View>
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

/** One mock's result in each domain, in the exam's order ("–" when an older save has none). */
function MockDomains({ mock, cert }: { mock: MockResult; cert: Certification }) {
  const { c } = useTheme();
  return (
    <View testID={`mock-domains-${mock.id}`} style={{ paddingLeft: 66, paddingBottom: space.md, gap: 6 }}>
      {cert.domains.map((d) => {
        const t = mock.byDomain?.[d.id];
        const tally = t && t.total > 0 ? `${Math.min(t.correct, t.total)} of ${t.total}` : '–';
        return (
          <View key={d.id} accessible accessibilityLabel={`${d.short}, ${tally === '–' ? 'not recorded' : tally}`} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <DomainDot domain={d} />
            <T v="meta" color={c.ink} style={{ flex: 1, minWidth: 0 }}>{d.short}</T>
            <T v="meta" num>{tally}</T>
          </View>
        );
      })}
    </View>
  );
}
