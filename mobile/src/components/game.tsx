/**
 * Shared game frame: header (close · round progress · score), the question
 * as a serif stem, tinted reveal blocks, and an end-of-round summary.
 * Games stay full-screen and calm.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findQuestion } from '../content/loader';
import type { Letter, PackQuestion } from '../content/types';
import { createRng } from '../engine/random';
import { makePermutation, type Permutation } from '../engine/shuffle';
import { useProgress, type GameId } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock } from './quiz';
import { Seedling } from './glyphs';
import { BigNum, Button, Enter, Gap, PushedHeader, SegmentBar, Stem, T } from './ui';

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
      {/* Pushed header: close · round progress · live score (Figtree tabular: it changes as you watch). */}
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader
          icon="close"
          onBack={() => router.back()}
          center={<SegmentBar total={total} done={Math.min(index, total)} current={index} />}
          right={<T v="label" num accessibilityLabel={`Score ${score}`}>{String(score)}</T>}
        />
        <T v="meta" num>{`${title} · ${Math.min(index + 1, total)} of ${total}`}</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.xxl }}>
        <Enter key={index}>{children}</Enter>
      </ScrollView>
      {footer && <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.md, gap: space.sm, backgroundColor: c.bg }}>{footer}</View>}
    </SafeAreaView>
  );
}

export function QuestionHead({ q }: { q: PackQuestion }) {
  return (
    <View>
      {q.scenario && (
        <>
          <ScenarioBlock text={q.scenario} />
          <Gap h={space.md} />
        </>
      )}
      <Stem>{q.stem}</Stem>
      <Gap h={space.xl} />
    </View>
  );
}

/** End-of-round summary: a serif score, your best, and what to do next. */
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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.gutter, flexGrow: 1, justifyContent: 'center' }}>
        <Enter>
          <View style={{ alignItems: 'center' }}>
            <View accessible={false} importantForAccessibility="no-hide-descendants">
              <Seedling color={c.accent} size={96} />
            </View>
            <T v="caption" center color={c.accentText}>Round complete</T>
            <Gap h={space.sm} />
            <BigNum value={String(score)} size={52} accessibilityLabel={`Score ${score} out of ${max}`} />
            <T v="meta" num center>{`out of ${max}${best !== undefined ? ` · best ${best}` : ''}`}</T>
          </View>
        </Enter>
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
 * Reveal block after each answer: a tinted feedback block (spec §5: tints
 * are for feedback only). Long explanations clamp to 5 lines with a 48pt
 * "Read full explanation" toggle; the title is announced to screen readers.
 */
export function RevealCard({ tone, title, body }: { tone: 'good' | 'bad' | 'info'; title: string; body: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const look = tone === 'good' ? { fg: c.correct, bg: c.correctBg } : tone === 'bad' ? { fg: c.wrong, bg: c.wrongBg } : { fg: c.tip, bg: c.tipBg };
  const long = body.length > 280;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);
  return (
    <Animated.View entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}>
      <View style={{ backgroundColor: look.bg, borderRadius: radius.md, padding: space.lg }}>
        <View accessibilityLiveRegion="polite">
          <T v="caption" color={look.fg}>{title}</T>
        </View>
        <Gap h={space.xs} />
        <T v="small" numberOfLines={long && !open ? 5 : undefined}>{body}</T>
        {long && (
          <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read full explanation'}</T>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export type { Letter };
