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
import { lastScores, reviewLine, trendSpoken, type RecapMiss } from '../engine/games/recap';
import { useProgress, type GameId } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock, StickyFooter } from './quiz';
import { Seedling } from './glyphs';
import { Info, ICON_STROKE } from './icons';
import { BigNum, Button, Enter, Gap, ICON_SIZE, IconButton, PushedHeader, SegmentBar, Stem, T } from './ui';

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
  onInfo,
  infoOpen,
}: {
  title: string;
  index: number;
  total: number;
  score: number;
  children: ReactNode;
  footer?: ReactNode;
  /** Shows a 48pt "How scoring works" button in the header. */
  onInfo?: () => void;
  infoOpen?: boolean;
}) {
  const { c } = useTheme();
  // Measured height of the sticky footer, so the scroll can clear it.
  const [footerH, setFooterH] = useState(footer ? 120 : 0);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: onInfo ? 48 : undefined }}>
          <T v="meta" num style={{ flexShrink: 1 }}>{`${title} · ${Math.min(index + 1, total)} of ${total}`}</T>
          {onInfo && (
            <IconButton
              label="How scoring works"
              selected={infoOpen}
              onPress={onInfo}
              icon={(col) => <Info size={ICON_SIZE.bar} color={col} strokeWidth={ICON_STROKE} />}
            />
          )}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {/* Pad by the sticky footer + 24 (spec §11), so the last option is never under it. */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: footer ? footerH + space.xl : space.xxl }}>
          <Enter key={index}>{children}</Enter>
        </ScrollView>
        {footer && (
          <StickyFooter onHeight={setFooterH}>
            <View style={{ gap: space.sm }}>{footer}</View>
          </StickyFooter>
        )}
      </View>
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

/**
 * End-of-round summary, shared by every game:
 * - a serif score, with your last 5 round scores beside your best;
 * - "What caught you": each miss with its snare or deciding word and one
 *   line on why (engine/games/recap.ts);
 * - "Missed questions are in your review." when any answer was wrong;
 * - the game's own note (children), then Play again / Done.
 */
export function RoundEnd({
  certId,
  game,
  score,
  max,
  misses = [],
  children,
  onAgain,
}: {
  certId: string;
  game: GameId;
  score: number;
  max: number;
  /** This round's misses, in question order. */
  misses?: RecapMiss[];
  children?: ReactNode;
  onAgain: () => void;
}) {
  const { c } = useTheme();
  const best = useProgress((s) => s.byCert[certId]?.gameBest?.[game]);
  // Older saves have no history: `?.` keeps them loading (shows best only).
  const history = useProgress((s) => s.byCert[certId]?.gameRecent?.[game]);
  const recent = lastScores(history);
  const review = reviewLine(misses);
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
            {recent.length > 1 && (
              // Figtree tabular, oldest → newest: a quiet trend, not a chart.
              <View accessible accessibilityLabel={trendSpoken(recent, best)} style={{ marginTop: space.sm, alignItems: 'center' }}>
                <T v="caption" center>{`Last ${recent.length} rounds`}</T>
                <T v="label" num center>{recent.join('  ·  ')}</T>
              </View>
            )}
          </View>
        </Enter>
        <Gap h={space.xl} />
        {misses.length > 0 && (
          <View style={{ marginBottom: space.lg }}>
            <T v="headline" accessibilityRole="header">What caught you</T>
            {misses.map((m, k) => (
              <View
                key={m.questionId}
                accessible
                accessibilityLabel={`${m.stem} ${m.tag}. ${m.why}`}
                style={{ paddingVertical: 13, borderBottomWidth: k === misses.length - 1 ? 0 : 1, borderBottomColor: c.line }}
              >
                <T v="meta">{m.stem}</T>
                <T v="caption" color={c.tip} style={{ marginTop: space.xs }}>{m.tag}</T>
                <T v="small" style={{ marginTop: 2 }}>{m.why}</T>
              </View>
            ))}
            {review && <T v="meta" style={{ marginTop: space.sm }}>{review}</T>}
          </View>
        )}
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
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read full explanation'}</T>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export type { Letter };
