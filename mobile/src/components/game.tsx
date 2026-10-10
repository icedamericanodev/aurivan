/**
 * Shared game frame: header (close · round progress · score), the question
 * as a serif stem, tinted reveal blocks, and an end-of-round summary.
 * Games stay full-screen and calm.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findQuestion, getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import { GAMES, isPlayable } from '../engine/games/registry';
import { useActiveCert } from '../lib/useActiveCert';
import { EmptyScreen } from './emptyScreen';
import type { Letter, PackQuestion } from '../content/types';
import { createRng } from '../engine/random';
import { makePermutation, type Permutation } from '../engine/shuffle';
import { lastScores, reviewLine, runningScore, scoreSpoken, scoreText, trendSpoken, type RecapMiss } from '../engine/games/recap';
import { useProgress, type GameId } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock, StickyFooter } from './quiz';
import { Seedling } from './glyphs';
import { Info, ICON_STROKE, Play as PlayIcon } from './icons';
import { BigNum, Button, Enter, Gap, ICON_SIZE, IconButton, PushedHeader, Section, SegmentBar, Segmented, Stem, T } from './ui';

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
  strip,
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
  /** Fixed under the header, outside the scroll: Daylight's pace strip (components/pace.tsx). */
  strip?: ReactNode;
}) {
  const { c } = useTheme();
  // Measured height of the sticky footer, so the scroll can clear it.
  const [footerH, setFooterH] = useState(footer ? 120 : 0);
  // Opening the info panel mid-question: scroll up to it (it sits at the top).
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (infoOpen) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [infoOpen]);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Pushed header: close · round progress · live score (Figtree tabular: it changes as you watch). */}
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader
          icon="close"
          onBack={() => router.back()}
          center={<SegmentBar total={total} done={Math.min(index, total)} current={index} />}
          // The running score never shows below 0 (display only; the recap shows the real total).
          right={<T v="label" num accessibilityLabel={`Score ${runningScore(score)}`}>{String(runningScore(score))}</T>}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: onInfo ? 48 : undefined }}>
          <T v="meta" num style={{ flexShrink: 1 }}>{`${title} · ${Math.min(index + 1, total)} of ${total}`}</T>
          {onInfo && (
            <IconButton
              label="How scoring works"
              expanded={Boolean(infoOpen)}
              onPress={onInfo}
              icon={(col) => <Info size={ICON_SIZE.bar} color={col} strokeWidth={ICON_STROKE} />}
            />
          )}
        </View>
      </View>
      {strip}
      <View style={{ flex: 1 }}>
        {/* Pad by the sticky footer + 24 (spec §11), so the last option is never under it. */}
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: footer ? footerH + space.xl : space.xxl }}>
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

/** The stem; `highlight` marks a priority word (tip colour + heavier weight) once it is in play. */
export function QuestionHead({ q, highlight }: { q: PackQuestion; highlight?: string | null }) {
  return (
    <View>
      {q.scenario && (
        <>
          <ScenarioBlock text={q.scenario} />
          <Gap h={space.md} />
        </>
      )}
      <Stem highlight={highlight}>{q.stem}</Stem>
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
  reviewNote,
}: {
  certId: string;
  game: GameId;
  score: number;
  max: number;
  /** This round's misses, in question order. */
  misses?: RecapMiss[];
  children?: ReactNode;
  onAgain: () => void;
  /**
   * The line under the misses, for games whose misses aren't questions
   * (Root or Rumor: "Missed statements come back in a later round.").
   * Left out = the usual "Missed questions are in your review." rule.
   */
  reviewNote?: string;
}) {
  const { c } = useTheme();
  const best = useProgress((s) => s.byCert[certId]?.gameBest?.[game]);
  // Older saves have no history: `?.` keeps them loading (shows best only).
  const history = useProgress((s) => s.byCert[certId]?.gameRecent?.[game]);
  const recent = lastScores(history);
  const review = reviewNote !== undefined ? (misses.length ? reviewNote : null) : reviewLine(misses);
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
            <BigNum value={scoreText(score)} size={52} accessibilityLabel={`Score ${scoreSpoken(score)} out of ${max}`} />
            <T v="meta" num center>{`out of ${max}${best !== undefined ? ` · best ${scoreText(best)}` : ''}`}</T>
            {recent.length > 1 && (
              // Figtree tabular, oldest → newest: a quiet trend, not a chart.
              <View accessible accessibilityLabel={trendSpoken(recent, best)} style={{ marginTop: space.sm, alignItems: 'center' }}>
                <T v="caption" center>{`Last ${recent.length} rounds`}</T>
                <T v="label" num center>{recent.map(scoreText).join('  ·  ')}</T>
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
 * A game's first screen (Build E games, after Daylight's pattern): pushed
 * header → line icon → skill caption → tagline as the hero → the rules →
 * "Pick your level" Seedling / Sapling / Heartwood (spoken with what each
 * tier means) and one meta line on the chosen tier → primary "Start".
 */
export function GameIntro<V extends string>({
  game,
  icon,
  rules,
  tiers,
  tier,
  onTier,
  tierName,
  tierLine,
  onStart,
}: {
  game: GameId;
  icon: (color: string) => ReactNode;
  rules: string;
  tiers: V[];
  tier: V;
  onTier: (t: V) => void;
  tierName: Record<V, string>;
  tierLine: Record<V, string>;
  onStart: () => void;
}) {
  const { c } = useTheme();
  const g = GAMES[game];
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader icon="close" onBack={() => router.back()} title={g.name} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxl }}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center' }}>
          {icon(c.accent)}
        </View>
        <T v="caption" center color={c.accentText} style={{ marginTop: space.sm }}>{`${g.skill} · about ${g.minutes} min`}</T>
        <T v="hero" center accessibilityRole="header" style={{ marginTop: space.xs }}>{g.tagline}</T>
        <T v="body" color={c.ink2} style={{ marginTop: space.md }}>{rules}</T>
        <Section title="Pick your level" />
        <Gap h={space.sm} />
        <Segmented
          accessibilityLabel="Pick your level"
          value={tier}
          onChange={onTier}
          options={tiers.map((t) => ({ value: t, label: tierName[t], spoken: `${tierName[t]}. ${tierLine[t]}` }))}
        />
        <T v="meta" center style={{ marginTop: space.sm }}>{tierLine[tier]}</T>
        <Gap h={space.xl} />
        <Button label="Start" onPress={onStart} icon={(col) => <PlayIcon size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />} />
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

/**
 * A game this certification can't play yet (too few suitable questions,
 * registry minPool). Calm, no numbers (never reveal a bank size).
 */
export function GameUnavailable({ game }: { game: GameId }) {
  return (
    <EmptyScreen
      header={GAMES[game].name}
      title="This game is on the way"
      body="It needs more practice questions for this exam first. Practice is ready in the meantime."
      primary={{ label: 'Go to Practice', onPress: () => router.replace('/practice') }}
    />
  );
}

/** Renders the game, or GameUnavailable when this certification's pool is too small. */
export function PlayableGate({ game, children }: { game: GameId; children: ReactNode }) {
  const { cert } = useActiveCert();
  const ok = useMemo(() => isPlayable(game, getAllQuestions(cert.id), getNotes(cert.id)), [game, cert.id]);
  return ok ? <>{children}</> : <GameUnavailable game={game} />;
}

export type { Letter };
