/** Small read-only Today summaries. The plan remains the only filled study action. */
import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Certification } from '../content/types';
import { BAND_MIN_ANSWERS, LATEST_TRIES_LABEL } from '../engine/domainBand';
import { studyDaysWords, twigSpoken, TWIG_LETTERS, type TwigDay } from '../engine/groveToday';
import type { Readiness } from '../engine/readiness';
import { todayDomains } from '../engine/todayDashboard';
import { groveRadius } from '../theme/grove';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FieldText } from './fieldguide';
import { BookOpen, Check, ICON_STROKE } from './icons';
import { Button, groveCard, T, useFontScale } from './ui';

/** Five marks, with one spoken progress value; no timing or scoring logic. */
export function FirstFiveProgress({ done, total }: { done: number; total: number }) {
  const { c } = useTheme();
  if (!total) return null;
  return (
    <View testID="first-five-progress" accessible accessibilityRole="progressbar" accessibilityLabel="Your first five progress" accessibilityValue={{ min: 0, max: total, now: done, text: `${done} of ${total} answered` }} style={{ gap: space.sm }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: space.xs }}>
        {Array.from({ length: total }, (_, i) => <View key={i} style={{ flex: 1, height: space.sm, borderRadius: groveRadius.step, backgroundColor: i < done ? c.accent : c.soft, borderWidth: 1, borderColor: i < done ? c.accent : c.control }} />)}
      </View>
      <T v="meta">{`${done} of ${total} answered`}</T>
    </View>
  );
}

export const TodayProgress = memo(function TodayProgress({ lessons, answered, onOpen }: { lessons: number; answered: number; onOpen: () => void }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const metrics = [
    ...(lessons > 0 ? [{ value: lessons, label: lessons === 1 ? 'Lesson completed' : 'Lessons completed', Icon: BookOpen }] : []),
    ...(answered > 0 ? [{ value: answered, label: 'Questions answered', Icon: Check }] : []),
  ];
  if (!metrics.length) return null;
  return (
    <View testID="today-progress" style={[groveCard(c), { padding: space.lg, gap: space.md }]}>
      <FieldText v="value" accessibilityRole="header">Your progress</FieldText>
      <View style={{ flexDirection: large ? 'column' : 'row', gap: space.lg }}>
        {metrics.map(({ value, label, Icon }) => (
          <View key={label} accessible accessibilityLabel={`${value} ${label.toLowerCase()}${label === 'Questions answered' ? ', unique questions, across all attempts' : ''}`} style={{ flex: 1, gap: space.xs }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon size={20} color={c.accentText} strokeWidth={ICON_STROKE} /></View>
            <T v="numStat" num>{value}</T>
            <T v="meta">{label}</T>
          </View>
        ))}
      </View>
      {answered > 0 && <T v="meta">Each question counts once, including repeat tries.</T>}
      <Button kind="ghost" label="See your progress" onPress={onOpen} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
    </View>
  );
});

/** The store retains study dates, not complete daily volumes: every filled bar means one study day. */
export const WeeklyActivity = memo(function WeeklyActivity({ week }: { week: readonly TwigDay[] }) {
  const { c } = useTheme();
  const count = week.filter((d) => d.on).length;
  if (!count) return null;
  return (
    <View testID="today-weekly-activity" style={[groveCard(c), { padding: space.lg, gap: space.md }]}>
      <FieldText v="value" accessibilityRole="header">Weekly activity</FieldText>
      <T v="meta">{studyDaysWords(count)}</T>
      <View accessible accessibilityRole="image" accessibilityLabel={`${twigSpoken(week)} ${studyDaysWords(count)}. Each filled bar is a study day, not time or question count.`}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: space.xs }}>
          {week.map((d) => (
            <View key={d.i} style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
              <View style={{ height: 56, width: space.md, borderRadius: groveRadius.step, backgroundColor: d.on ? c.accent : c.soft, borderColor: d.on ? c.accent : c.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                {d.on && <Check size={12} color={c.bg} strokeWidth={3} />}
              </View>
              <T v="meta" color={d.today ? c.accentText : c.ink2}>{TWIG_LETTERS[d.i]}</T>
              <View style={{ height: space.xs, width: space.md, borderRadius: groveRadius.step, backgroundColor: d.today ? c.accent : 'transparent' }} />
            </View>
          ))}
        </View>
      </View>
      <T v="meta">Study days across your courses. Today is underlined.</T>
    </View>
  );
});

export const TodayDomains = memo(function TodayDomains({ cert, readiness, onOpen }: { cert: Certification; readiness: Readiness; onOpen: () => void }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const rows = todayDomains(cert, readiness);
  return (
    <View testID="today-domains" style={[groveCard(c), { padding: space.lg, gap: space.md }]}>
      <FieldText v="value" accessibilityRole="header">{`${cert.name} domains`}</FieldText>
      <T v="meta">Right on your latest tries</T>
      {rows.map(({ domain, answered, figure }) => (
        <View key={domain.id} accessible accessibilityLabel={`Domain ${domain.id}, ${domain.name}. ${figure.spoken}.${figure.thin ? '' : ` ${answered} answered.`}`} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          {!large && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 44, height: 44 }}>
            <Svg width={44} height={44} viewBox="0 0 44 44">
              <Circle cx={22} cy={22} r={19} fill="none" stroke={c.control} strokeWidth={3} />
              {figure.pct !== null && <Circle cx={22} cy={22} r={19} fill="none" stroke={c.accent} strokeWidth={3} strokeDasharray={`${Math.PI * 38 * figure.pct / 100} ${Math.PI * 38}`} transform="rotate(-90 22 22)" />}
            </Svg>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}><T v="caption">{`D${domain.id}`}</T></View>
          </View>}
          <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
            <T v="label">{large ? `D${domain.id} · ${domain.name}` : domain.name}</T>
            <T v="meta">{figure.pct === null ? `${figure.word}${answered ? ` · ${answered} answered` : ''}` : `${figure.pct}% · ${figure.word}`}</T>
          </View>
        </View>
      ))}
      <T v="meta">{`${LATEST_TRIES_LABEL} Hints and quick retests count half. A percentage appears after ${BAND_MIN_ANSWERS} answers in a domain.`}</T>
      <Button kind="ghost" label="Open readiness report" onPress={onOpen} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
    </View>
  );
});
