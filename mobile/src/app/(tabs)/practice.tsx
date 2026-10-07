/**
 * Practice — every way to answer questions, in one place.
 * Spec: DESIGN_SYSTEM.md §11 "Practice":
 *   forest "Quick 10" → Spaced review / Weak area rows → "Build a set"
 *   (domain chips, serif segmented size, difficulty chips, Start) →
 *   "Mock exams" rows with a lead serif numeral.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Crosshair, ICON_STROKE, Play, RotateCcw } from '../../components/icons';
import { Button, Chip, ChipRow, Enter, Gap, HeroPanel, ICON_SIZE, Lead, ListRow, Screen, Section, Segmented, T, Trail } from '../../components/ui';
import type { Difficulty } from '../../content/types';
import { MINUTES_PER_QUESTION } from '../../engine/dayPlan';
import { guardedStart, startMock, startPractice, startReview } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZES = [10, 20, 50] as const;
const DIFFS: { label: string; value?: Difficulty }[] = [
  { label: 'Any difficulty' },
  { label: 'Foundational', value: 'foundational' },
  { label: 'Application', value: 'application' },
  { label: 'Analysis', value: 'analysis' },
];

export default function Practice() {
  const { c } = useTheme();
  const { cert, readiness, dueCount } = useActiveCert();
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState<number>(10);
  const [diff, setDiff] = useState(0);
  const open = () => router.push('/session');
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId);
  const mini = Math.round(cert.exam.questions / 3);
  const miniMinutes = Math.round((cert.exam.minutes / cert.exam.questions) * mini);
  const hours = cert.exam.minutes / 60;
  const icon = (G: typeof Crosshair) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Practice</T>
        <T v="meta" style={{ marginTop: space.xs }}>Every option explained, every trap named.</T>
      </Enter>

      <Enter i={1} style={{ marginTop: 18 }}>
        <HeroPanel
          caption="Quick 10"
          title="Ten mixed questions"
          meta={`New material first · about ${Math.round(10 * MINUTES_PER_QUESTION)} min`}
          art="frond2"
          wideTitle
          action={{
            label: 'Start',
            icon: (col) => <Play size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
            hint: 'Ten mixed questions',
            onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), open),
          }}
        />
        <Gap h={space.sm} />
        <ListRow
          icon={icon(RotateCcw)}
          title="Spaced review"
          subtitle={dueCount ? 'Missed questions, due now' : 'All caught up'}
          trailing={dueCount ? <Trail value={String(dueCount)} unit="due" /> : undefined}
          accessibilityLabel={`Spaced review, ${dueCount ? `${dueCount} due` : 'all caught up'}`}
          onPress={() => guardedStart(() => startReview(cert.id), open, () => router.push('/caught-up'))}
          last={!focus}
        />
        {focus && (
          <ListRow
            icon={icon(Crosshair)}
            title={`Weak area: ${focus.short}`}
            subtitle="Most points to gain"
            onPress={() => guardedStart(() => startPractice(cert.id, { count: 10, domainId: focus.id, title: focus.name }), open)}
            last
          />
        )}
      </Enter>

      <Enter i={2}>
        <Section title="Build a set" style={{ marginTop: 22 }} />
        <Gap h={space.sm} />
        <ChipRow>
          <Chip label="All domains" selected={domainId === undefined} onPress={() => setDomainId(undefined)} />
          {cert.domains.map((d) => (
            <Chip key={d.id} label={d.short} selected={domainId === d.id} onPress={() => setDomainId(d.id)} />
          ))}
        </ChipRow>
        <Gap h={space.md} />
        <Segmented
          accessibilityLabel="Number of questions"
          value={count}
          onChange={setCount}
          options={SIZES.map((n) => ({ value: n, numeral: String(n), label: 'questions' }))}
        />
        <Gap h={space.md} />
        <ChipRow>
          {DIFFS.map((d, i) => (
            <Chip key={d.label} label={d.label} selected={diff === i} onPress={() => setDiff(i)} />
          ))}
        </ChipRow>
        <Gap h={space.md} />
        <Button
          kind="secondary"
          label={`Start ${count} questions`}
          onPress={() => {
            const domain = cert.domains.find((d) => d.id === domainId);
            guardedStart(
              () => startPractice(cert.id, { count, domainId, difficulty: DIFFS[diff].value, title: domain ? domain.name : 'Custom set' }),
              open,
            );
          }}
        />
      </Enter>

      <Enter i={3}>
        <Section title="Mock exams" style={{ marginTop: space.xl }} />
        <ListRow
          lead={<Lead value={String(mini)} unit="questions" />}
          title="Mini mock"
          subtitle={`${miniMinutes} min · feedback at the end`}
          accessibilityLabel={`Mini mock, ${mini} questions, ${miniMinutes} minutes, feedback at the end`}
          onPress={() => guardedStart(() => startMock(cert.id, mini), open)}
        />
        <ListRow
          lead={<Lead value={String(cert.exam.questions)} unit="questions" />}
          title="Full mock"
          subtitle={`${hours} hours · weighted like the real ${cert.name}`}
          accessibilityLabel={`Full mock, ${cert.exam.questions} questions, ${hours} hours`}
          onPress={() => guardedStart(() => startMock(cert.id), open)}
          last
        />
        <Gap h={space.sm} />
        <T v="meta">{cert.exam.passingNote}</T>
      </Enter>
    </Screen>
  );
}
