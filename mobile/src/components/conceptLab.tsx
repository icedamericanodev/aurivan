/** Offline lab instruments. Visual positions supplement the complete written/spoken values. */
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useMotion } from './motion';
import { Button, T, useFontScale } from './ui';
import { motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { formatClock } from '../engine/conceptLab';

export function LabRange({ label, value, max, onChange, target, meaning, precise = true }: { meaning?: string; target?: string; precise?: boolean; label: string; value: number; max: number; onChange: (n: number) => void }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(1);
  const latest = useRef({ width, max, onChange });
  const range = useRef<View>(null);
  const direction = useRef<'pending' | 'vertical'>('pending');
  useEffect(() => { latest.current = { width, max, onChange }; }, [width, max, onChange]);
  // PanResponder stores these callbacks; refs are read only later, during touch events.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => PanResponder.create({
    // Let Pressability handle taps and let the parent ScrollView cancel them on scroll.
    onStartShouldSetPanResponderCapture: () => { direction.current = 'pending'; return false; },
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, g) => {
      if (direction.current === 'vertical') return false;
      if (Math.abs(g.dy) > 6 && Math.abs(g.dy) >= Math.abs(g.dx)) {
        direction.current = 'vertical';
        return false;
      }
      return Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
    },
    onPanResponderGrant: (e) => {
      const p = latest.current;
      p.onChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / p.width)) * p.max));
    },
    onPanResponderMove: (e) => {
      const p = latest.current;
      p.onChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / p.width)) * p.max));
    },
  }));
  const adjust = (delta: number) => onChange(Math.max(0, Math.min(max, value + delta)));
  return <View style={{ gap: space.sm }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm }}>
      <T v="label" style={{ flexShrink: 1 }}>{label}</T>
      <T v="label" num>{value} min</T>
    </View>
    {meaning && <T v="meta">{meaning}</T>}
    <View
      {...responder.panHandlers}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
    <Pressable
      ref={range}
      testID={`lab-range-${max}`}
      onPress={(e) => {
        if (direction.current === 'vertical') return;
        const localX = e.nativeEvent.locationX;
        if (Number.isFinite(localX)) {
          const p = latest.current;
          p.onChange(Math.round(Math.max(0, Math.min(1, localX / p.width)) * p.max));
          return;
        }
        // Web Pressability may supply a TouchEvent instead of a responder event.
        const pageX = e.nativeEvent.changedTouches?.[0]?.pageX ?? e.nativeEvent.pageX;
        if (!Number.isFinite(pageX)) return;
        const host = range.current;
        host?.measureInWindow((originX, _y, measuredWidth) => {
          if (range.current !== host || direction.current === 'vertical' || !Number.isFinite(originX) || !Number.isFinite(measuredWidth) || measuredWidth <= 0) return;
          const p = latest.current;
          p.onChange(Math.round(Math.max(0, Math.min(1, (pageX - originX) / measuredWidth)) * p.max));
        });
      }}
      accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityHint={`${meaning ? `${meaning}. ` : ''}Swipe up or down to change by one minute. Show precise controls for decrease and increase buttons.`}
      accessibilityValue={{ min: 0, max, now: value, text: `${value} ${value === 1 ? 'minute' : 'minutes'}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') adjust(1);
        if (e.nativeEvent.actionName === 'decrement') adjust(-1);
      }}
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      <View pointerEvents="none" style={{ height: 6, backgroundColor: c.control, borderRadius: 3 }}>
        <View style={{ width: `${value / max * 100}%`, height: 6, backgroundColor: c.accent, borderRadius: 3 }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${value / max * 100}%`, marginLeft: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, borderWidth: 3, borderColor: c.bg }} />
    </Pressable>
    </View>
    {target ? <T v="meta">{target}</T> : <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="meta">0 min</T><T v="meta">{max} min</T></View>}
    {precise && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Button kind="secondary" label="− 1 min" accessibilityLabel={`Decrease ${label}`} disabled={value === 0} onPress={() => adjust(-1)} style={{ flexGrow: 1 }} />
      <Button kind="secondary" label="+ 1 min" accessibilityLabel={`Increase ${label}`} disabled={value === max} onPress={() => adjust(1)} style={{ flexGrow: 1 }} />
    </View>}
  </View>;
}

/** Two independently labelled rails: a round restoration point, a square usable-data point. */
export function LabTimeline({ recovery, gap, rto, rpo, maxRecovery, maxGap, outageMinutes, part }: { part?: 'data' | 'service'; outageMinutes: number; recovery: number; gap: number; rto: number; rpo: number; maxRecovery: number; maxGap: number }) {
  return <View style={{ gap: space.lg }}>
    {part !== 'service' && <TimelineRail label="Data before outage" value={maxGap - gap} target={maxGap - rpo} max={maxGap} start={formatClock(outageMinutes - maxGap)} end={`${formatClock(outageMinutes)} · outage`} targetLabel={`RPO limit (${formatClock(outageMinutes - rpo)})`} square />}
    {part !== 'data' && <TimelineRail label="Service after outage" value={recovery} target={rto} max={maxRecovery} start={`${formatClock(outageMinutes)} · outage`} end={formatClock(outageMinutes + maxRecovery)} targetLabel={`RTO limit (${formatClock(outageMinutes + rto)})`} />}
  </View>;
}
function TimelineRail({ label, value, target, max, start, end, targetLabel, square = false }: { targetLabel: string; label: string; value: number; target: number; max: number; start: string; end: string; square?: boolean }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(value / max);
  useEffect(() => {
    position.value = withTiming(value / max, { duration: reduced ? 0 : motion.dur.quick, reduceMotion: ReduceMotion.Never });
  }, [value, max, reduced, position]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * width }] }));
  return <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    <T v="label">{label}</T>
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ marginHorizontal: 10, marginTop: space.sm, height: 32, justifyContent: 'center' }}>
      <View style={{ height: 2, backgroundColor: c.muted }} />
      <View style={{ position: 'absolute', left: `${target / max * 100}%`, top: 0, height: 32, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: c.ink }} />
      <Animated.View testID={square ? 'lab-data-marker' : 'lab-service-marker'} style={[{ position: 'absolute', left: -8, width: 16, height: 16, borderRadius: square ? 2 : 8, backgroundColor: c.accent, borderWidth: 2, borderColor: c.bg }, style]} />
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.xs }}><T v="meta" style={{ flex: 1 }}>{start}</T><T v="meta" style={{ flex: 1, textAlign: 'right' }}>{end}</T></View>
    <T v="caption">{`${square ? '■ Usable data' : '● Restoration'} · dashed line: ${targetLabel}`}</T>
  </View>;
}

export function LabChoice({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return <Pressable accessibilityRole="radio" accessibilityLabel={text} accessibilityState={{ checked: selected }} onPress={onPress} style={{ minHeight: 56, padding: space.md, borderWidth: selected ? 2 : 1, borderColor: selected ? c.accent : c.line, borderRadius: 12, backgroundColor: selected ? c.soft : c.bg }}><T v="body">{selected ? '● ' : '○ '}{text}</T></Pressable>;
}

/** Compact comparison: labels and symbols carry the verdict, independently of colour. */
export function LabOutcomes({ recovery, gap, rto, rpo }: { recovery: number; gap: number; rto: number; rpo: number }) {
  const { c } = useTheme();
  const large = useFontScale() >= 1.3;
  return <View testID="lab-result" style={{ flexDirection: large ? 'column' : 'row', gap: space.sm }}>
    {[{ name: 'RTO', actual: recovery, limit: rto }, { name: 'RPO', actual: gap, limit: rpo }].map(({ name, actual, limit }) => {
      const met = actual <= limit;
      return <View key={name} style={{ flex: large ? undefined : 1, minWidth: 0, backgroundColor: c.soft, borderRadius: 16, padding: space.md, gap: space.xs, alignItems: 'center' }}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden><T v="title" color={met ? c.correct : c.wrong}>{met ? '✓' : '×'}</T></View>
        <View accessible accessibilityLiveRegion="polite"><T v="label">{`${name} ${met ? 'met' : 'missed'}`}</T></View>
        <T v="meta" num>Actual {actual} min</T>
        <T v="caption" num>Limit {limit} min</T>
      </View>;
    })}
  </View>;
}
