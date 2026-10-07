/**
 * Journey building blocks: readiness ring, domain route, week strip and
 * tappable rows. Calm motion only (the ring tweens; nothing loops).
 */
import { useEffect, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { DomainInfo } from '../content/types';
import type { DomainMastery } from '../engine/readiness';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Check, ChevronRight, ICON_STROKE } from './icons';
import { ICON_SIZE, IconTile, T } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Readiness ring ────────────────────────────────────────────────────
export function ReadinessRing({ score, size = 120, label = 'ready' }: { score: number; size?: number; label?: string }) {
  const { c } = useTheme();
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, score)) / 100, {
      duration: 500,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      reduceMotion: ReduceMotion.System,
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Exam readiness ${score} percent`}
      accessibilityValue={{ min: 0, max: 100, now: score }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.soft} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <T v="display" num maxFontSizeMultiplier={1.3}>
        {`${score}%`}
      </T>
      <T v="meta" maxFontSizeMultiplier={1.3}>{label}</T>
    </View>
  );
}

// ── Domain route: one node per domain, joined by a line ──────────────
export function DomainRoute({
  domains,
  mastery,
  focusId,
  onPress,
}: {
  domains: DomainInfo[];
  mastery: DomainMastery[];
  focusId?: string | null;
  onPress?: (domainId: string) => void;
}) {
  const { c } = useTheme();
  return (
    <View>
      {domains.map((d, i) => {
        const m = mastery.find((x) => x.domainId === d.id)?.mastery ?? 0;
        const done = m >= 0.7;
        const current = !done && d.id === focusId;
        const last = i === domains.length - 1;
        return (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityLabel={`Domain ${d.id}, ${d.name}, ${Math.round(m * 100)} percent${done ? ', on track' : current ? ', your focus' : ''}`}
            onPress={() => onPress?.(d.id)}
            style={{ flexDirection: 'row', gap: space.md, minHeight: 56 }}
          >
            <View style={{ alignItems: 'center', width: 36 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? c.accent : current ? c.soft : c.raised,
                  borderWidth: current ? 3 : 1,
                  borderColor: done ? c.accent : current ? c.accent : c.line,
                }}
              >
                {done ? (
                  <Check size={ICON_SIZE.row} color={c.bg} strokeWidth={ICON_STROKE} />
                ) : (
                  <T v="label" num color={current ? c.accentText : c.ink2} maxFontSizeMultiplier={1.3}>{d.id}</T>
                )}
              </View>
              {!last && <View style={{ width: 2, flex: 1, backgroundColor: done ? c.accent : c.line }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: space.md }}>
              <T v="label">{d.short}</T>
              <T v="meta" num>
                {`${Math.round(m * 100)}% · ${d.weight}% of exam${current ? ' · focus now' : ''}`}
              </T>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Week strip: 7 calm dots, no red, no guilt ─────────────────────────
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeekStrip({ days }: { days: boolean[] }) {
  const { c } = useTheme();
  const today = new Date().getDay();
  return (
    <View
      accessible
      accessibilityLabel={`Studied ${days.filter(Boolean).length} of the last 7 days`}
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
    >
      {days.map((studied, i) => {
        const dow = (today - (6 - i) + 7) % 7;
        return (
          <View key={i} style={{ alignItems: 'center', gap: space.xs }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: studied ? c.clay : c.soft,
                borderWidth: i === 6 ? 2 : 0,
                borderColor: c.accent,
              }}
            >
              {studied && <Check size={ICON_SIZE.inline} color={c.bg} strokeWidth={ICON_STROKE} />}
            </View>
            <T v="meta">{DAY_LETTERS[dow]}</T>
          </View>
        );
      })}
    </View>
  );
}

// ── Row: icon + text + chevron, 56px tall, whole row tappable ─────────
export function ActionRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: string;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, right].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 56,
        paddingVertical: space.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon && <IconTile>{icon}</IconTile>}
      <View style={{ flex: 1 }}>
        <T v="label">{title}</T>
        {subtitle && <T v="meta">{subtitle}</T>}
      </View>
      {right && <T v="meta" num>{right}</T>}
      <ChevronRight size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}
