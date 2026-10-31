/**
 * About the exam ("About the CISA exam"): what the exam looks like, how to
 * book it, the day itself, results, and becoming certified.
 *
 * Opened from Learn → Look it up (a row under Principles) and from Help →
 * Get help. Deep link: /exam-guide?section=exam-day opens at that section
 * (an unknown id simply opens the top).
 *
 * Plain English, top to bottom:
 * - The title and one line on what the page is.
 * - ONE calm notice: "check isaca.org before you book" with the date the
 *   facts were last checked (the content says it once, never per item).
 * - "On this page": a row per section that scrolls there (smooth, or at
 *   once under Reduce Motion) and moves screen-reader focus to its heading.
 * - Each section: its title, a short summary, the domain weights (in the
 *   domains section), numbered steps, bullets, and a quiet Sources line
 *   whose links open in the browser.
 * - Each section ends with "Back to contents" (scrolls up to "On this page"
 *   and moves focus there). A section's own checked date shows only when it
 *   differs from the page's "Last checked".
 * - The independence disclaimer at the end.
 *
 * Content: data/exam/cisa_exam_guide.json via the content build
 * (scripts/exam-guide-pack.cjs → content/exam). A cert with none shows a
 * calm "not in the app yet" screen. Nothing is saved.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { openTab } from '../lib/actions';
import { createRef, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { Bullets, Plate, SourcesLine, Steps } from '../components/examGuide';
import { Button, Enter, ListRow, ProgressBar, PushedHeader, Row, Screen, Section, T, useScreenScroll } from '../components/ui';
import { domainColor } from '../content/certifications';
import { getExamGuide } from '../content/exam';
import type { ExamGuide, GuideSection } from '../content/exam/types';
import type { Certification } from '../content/types';
import { moveFocus } from '../lib/a11y';
import { isoLongDate } from '../lib/format';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The header title's hysteresis (pt): it shows past the line, and hides only 8pt back above it. */
const HYSTERESIS = 8;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

export default function ExamGuideScreen() {
  const { cert } = useActiveCert();
  const guide = getExamGuide(cert.id);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [titleUnder, setTitleUnder] = useState(false);
  const titleBottom = useRef(0);

  if (!guide) {
    return (
      <EmptyScreen
        header="About the exam"
        fallback="/learn"
        art="fieldbook"
        title="Not in the app yet"
        body="A guide to this exam isn't ready yet. Lessons and practice are ready now."
        primary={{ label: 'Back to Learn', onPress: () => openTab('/learn') }}
      />
    );
  }
  const onScroll = (y: number) => {
    const edge = titleBottom.current;
    const under = edge > 0 && (titleUnder ? y > edge - HYSTERESIS : y > edge);
    if (under !== titleUnder) setTitleUnder(under);
  };
  return (
    <Screen edges={['top', 'bottom']} onScroll={onScroll} header={<PushedHeader title={guide.title} showTitle={titleUnder} onBack={goBack} />}>
      <Enter i={0}>
        <View onLayout={(e) => (titleBottom.current = space.lg + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <T v="hero" accessibilityRole="header">{guide.title}</T>
          <T v="meta" style={{ marginTop: space.xs }}>{guide.description}</T>
        </View>
      </Enter>
      <GuideBody guide={guide} cert={cert} openAt={typeof section === 'string' ? section : undefined} />
    </Screen>
  );
}

/** The page under the title. Its own component, so it can reach the Screen's scroll (useScreenScroll). */
function GuideBody({ guide, cert, openAt }: { guide: ExamGuide; cert: Certification; openAt?: string }) {
  const { c } = useTheme();
  const scroll = useScreenScroll();
  // One heading ref per section: the jump rows and the deep link scroll and move focus there.
  const refs = useMemo(() => new Map(guide.sections.map((s) => [s.id, createRef<View>()])), [guide]);
  // "On this page": where "Back to contents" returns (UX review P7).
  const contentsRef = useRef<View>(null);
  const toContents = () => {
    scroll?.scrollToView(contentsRef.current);
    moveFocus(contentsRef, 400);
  };
  const jump = (id: string) => {
    const ref = refs.get(id);
    if (!ref) return;
    scroll?.scrollToView(ref.current);
    moveFocus(ref, 400);
  };
  // ?section=…: once laid out, open there (an unknown id stays at the top).
  useEffect(() => {
    if (!openAt || !refs.has(openAt)) return;
    const t = setTimeout(() => jump(openAt), 250);
    return () => clearTimeout(t);
    // Only a new section asked for should jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAt]);

  return (
    <>
      <Enter i={1} style={{ marginTop: space.lg }}>
        <Plate testID="guide-check-line">
          <T v="small" color={c.ink}>{guide.checkBeforeBooking}</T>
          {guide.lastChecked ? (
            <T v="meta" style={{ marginTop: space.xs }}>{`Last checked ${isoLongDate(guide.lastChecked)}`}</T>
          ) : null}
        </Plate>
      </Enter>

      <Enter i={2}>
        <Section title="On this page" headRef={contentsRef} />
        {guide.sections.map((s, i) => (
          <ListRow
            key={s.id}
            title={s.title}
            accessibilityLabel={`${s.title}. Section ${i + 1} of ${guide.sections.length}`}
            accessibilityHint="Scrolls to this section"
            onPress={() => jump(s.id)}
            last={i === guide.sections.length - 1}
          />
        ))}
      </Enter>

      {guide.sections.map((s) => (
        <GuidePart key={s.id} section={s} cert={cert} headRef={refs.get(s.id)!} lastChecked={guide.lastChecked} onContents={toContents} />
      ))}

      <T v="meta" style={{ marginTop: space.xxl }}>{guide.disclaimer}</T>
    </>
  );
}

/** One section: its heading, summary, weights, steps, bullets and sources. */
function GuidePart({
  section: s,
  cert,
  headRef,
  lastChecked,
  onContents,
}: {
  section: GuideSection;
  cert: Certification;
  headRef: RefObject<View | null>;
  lastChecked: string;
  onContents: () => void;
}) {
  return (
    <View testID={`guide-section-${s.id}`} style={{ marginTop: space.xl }}>
      <Section title={s.title} headRef={headRef} />
      {s.summary ? <T v="body">{s.summary}</T> : null}
      {s.domains && s.domains.length > 0 && <DomainWeights domains={s.domains} cert={cert} />}
      {s.steps && s.steps.length > 0 && <Steps steps={s.steps} />}
      <Bullets items={s.items} v="small" />
      {/* The section's own checked date only when it differs from the page's "Last checked" (UX review P6). */}
      <SourcesLine sources={s.sources} asOf={s.asOf && s.asOf !== lastChecked ? s.asOf : undefined} />
      <Button
        kind="ghost"
        label="Back to contents"
        accessibilityHint="Scrolls back to On this page"
        onPress={onContents}
        style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
      />
    </View>
  );
}

/**
 * The five domains and their weights: the official name, the share as a
 * number and a quiet bar in the domain's colour (scaled to the largest).
 * Spoken as one line each: "Domain 4, …, 26 percent of the exam".
 */
function DomainWeights({ domains, cert }: { domains: NonNullable<GuideSection['domains']>; cert: Certification }) {
  const { isDark } = useTheme();
  const max = Math.max(...domains.map((d) => d.weight), 1);
  return (
    <View style={{ marginTop: space.md, gap: space.md }}>
      {domains.map((d) => {
        const tone = cert.domains.find((x) => x.id === d.id)?.tone ?? 0;
        return (
          <View key={d.id} accessible accessibilityLabel={`Domain ${d.id}, ${d.name}, ${d.weight} percent of the exam`}>
            <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="caption">{`Domain ${d.id}`}</T>
                <T v="label">{d.name}</T>
              </View>
              <T v="label" num>{`${d.weight}%`}</T>
            </Row>
            <View style={{ marginTop: space.xs }}>
              <ProgressBar value={d.weight / max} color={domainColor(tone, isDark)} height={4} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
