/**
 * Shared game frame: header (close · round · score), the question, and an
 * end-of-round summary. Games stay full-screen and calm.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findQuestion } from '../content/loader';
import type { Letter, PackQuestion } from '../content/types';
import { createRng } from '../engine/random';
import { makePermutation, type Permutation } from '../engine/shuffle';
import { useProgress, type GameId } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock } from './quiz';
import { Button, Card, Gap, Row, T } from './ui';

/** A fixed list of questions + one shuffle each, created once per round. */
export function useRound(certId: string, build: (rngSeed: number) => string[]) {
  const [seed, setSeed] = useState(() => Date.now());
  const round = useMemo(() => {
    const rng = createRng(seed);
    const ids = build(seed);
    const items: { q: PackQuestion; perm: Permutation }[] = [];
    for (const id of ids) {
      const q = findQuestion(certId, id);
      if (q) items.push({ q, perm: makePermutation(q, rng) });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, certId]);
  return { round, seed, restart: () => setSeed(Date.now()) };
}

export function GameFrame({
  title,
  index,
  total,
  score,
  children,
  footer,
}: {
  title: string;
  index: number;
  total: number;
  score: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close game"
            onPress={() => router.back()}
            style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
          >
            <T v="label" color={c.accentText}>Close</T>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T v="label" numberOfLines={1}>{title}</T>
          </View>
          <T v="meta" num accessibilityLabel={`Round ${index + 1} of ${total}, score ${score}`}>
            {`${Math.min(index + 1, total)}/${total} · ${score}`}
          </T>
        </Row>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>{children}</ScrollView>
      {footer && (
        <View style={{ padding: space.lg, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, gap: space.sm }}>
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

export function QuestionHead({ q }: { q: PackQuestion }) {
  return (
    <Animated.View entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}>
      {q.scenario && (
        <>
          <ScenarioBlock text={q.scenario} />
          <Gap h={space.md} />
        </>
      )}
      <T v="title">{q.stem}</T>
      <Gap />
    </Animated.View>
  );
}

/** End-of-round card: score, best, and what to do next. */
export function RoundEnd({
  certId,
  game,
  score,
  max,
  children,
  onAgain,
}: {
  certId: string;
  game: GameId;
  score: number;
  max: number;
  children?: ReactNode;
  onAgain: () => void;
}) {
  const { c } = useTheme();
  const best = useProgress((s) => s.byCert[certId]?.gameBest?.[game]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, flexGrow: 1, justifyContent: 'center' }}>
        <Animated.View entering={ZoomIn.duration(320).reduceMotion(ReduceMotion.System)}>
          <T v="eyebrow" center>Round complete</T>
          <Gap h={space.sm} />
          <T v="display" num center>{`${score}`}</T>
          <T v="meta" num center>{`out of ${max}${best !== undefined ? ` · best ${best}` : ''}`}</T>
        </Animated.View>
        <Gap h={space.xl} />
        {children}
        <Gap />
        <Button label="Play again" onPress={onAgain} />
        <Gap h={space.sm} />
        <Button kind="ghost" label="Done" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Reveal card after each answer. Long explanations are clamped to 5 lines
 * with a 48px "Read full explanation" toggle, and the title is announced
 * to screen readers.
 */
export function RevealCard({ tone, title, body }: { tone: 'good' | 'bad' | 'info'; title: string; body: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const color = tone === 'good' ? c.correct : tone === 'bad' ? c.wrong : c.accentText;
  const long = body.length > 280;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);
  return (
    <Animated.View entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}>
      <Card style={{ borderColor: color }}>
        <View accessibilityLiveRegion="polite">
          <T v="label" color={color}>{title}</T>
        </View>
        <Gap h={space.xs} />
        <T numberOfLines={long && !open ? 5 : undefined}>{body}</T>
        {long && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(!open)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read full explanation'}</T>
          </Pressable>
        )}
      </Card>
    </Animated.View>
  );
}

export type { Letter };
