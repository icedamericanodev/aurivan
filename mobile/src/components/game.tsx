/**
 * Shared game frame: header (close · round progress · score), the question
 * as a serif stem, tinted reveal blocks, and an end-of-round summary.
 * Games stay full-screen and calm.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findQuestion } from '../content/loader';
import { GAMES } from '../engine/games/registry';
import { canPlay } from '../lib/games';
import { useActiveCert } from '../lib/useActiveCert';
import { EmptyScreen } from './emptyScreen';
import type { Letter, PackQuestion } from '../content/types';
import { createRng } from '../engine/random';
import { makePermutation, type Permutation } from '../engine/shuffle';
import { lastScores, reviewLine, runningScore, scoreSpoken, scoreText, trendSpoken, type RecapMiss } from '../engine/games/recap';
import { useProgress, type GameId } from '../store/progress';
import { optionText, radius, raisedShadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock, StickyFooter } from './quiz';
import { Seedling, TierLeaf } from './glyphs';
import { MilestoneMomentView, TierTag } from './milestones';
import { tierChangeLine, type GameTier } from '../engine/games/growth';
import type { RoundNews } from '../lib/gameRounds';
import { Check, Info, ICON_STROKE, Play as PlayIcon, X } from './icons';
import { BigNum, Button, Enter, Gap, ICON_SIZE, IconButton, PushedHeader, Row, Section, SegmentBar, Segmented, Stem, T } from './ui';

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
  scrollToY,
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
  /**
   * Scroll so this point of the content (a y measured with onLayout inside
   * `children`) sits near the top, e.g. Call It First's options appearing
   * below the fold. Null / left out = leave the scroll alone.
   */
  scrollToY?: number | null;
}) {
  const { c } = useTheme();
  // Measured height of the sticky footer, so the scroll can clear it.
  const [footerH, setFooterH] = useState(footer ? 120 : 0);
  // Opening the info panel mid-question: scroll up to it (it sits at the top).
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (infoOpen) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [infoOpen]);
  useEffect(() => {
    // `children` sit under the content's top padding (space.md); leave a little
    // air above. No animation: it moves the page once, calmly, under any motion setting.
    if (scrollToY != null) scrollRef.current?.scrollTo({ y: Math.max(0, scrollToY + space.md - space.lg), animated: false });
  }, [scrollToY]);
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
  news,
}: {
  certId: string;
  game: GameId;
  score: number;
  max: number;
  /**
   * Build F: what else this round changed (lib/gameRounds.ts): a new
   * personal best (a text line), the game's level moving, and at most ONE
   * milestone moment. Left out = none of these.
   */
  news?: RoundNews | null;
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
            {news?.best && (
              <T v="meta" center color={c.accentText} style={{ marginTop: space.sm }}>New personal best</T>
            )}
            {news && tierChangeLine(news.change, news.tier) && (
              <Row gap={space.sm} style={{ marginTop: space.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
                <View accessible={false} importantForAccessibility="no-hide-descendants">
                  <TierLeaf tier={news.tier} color={c.accentText} rib={c.bg} />
                </View>
                <T v="small" center style={{ flexShrink: 1 }}>{tierChangeLine(news.change, news.tier)!}</T>
              </Row>
            )}
          </View>
        </Enter>
        {news?.moment && (
          <View style={{ marginTop: space.xl }}>
            <MilestoneMomentView moment={news.moment} once={`round:${game}:${score}:${news.moment.key}`} />
          </View>
        )}
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
  level,
}: {
  game: GameId;
  /** Build F: the learner's own level for this game (the picker starts on it). */
  level?: GameTier;
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
        {level && <LevelNote level={level} />}
        <Gap h={space.xl} />
        <Button label="Start" onPress={onStart} icon={(col) => <PlayIcon size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * "Your level: Sapling" under a level picker (Build F): the leaf and the
 * name, plus how it grows. Rounds at your level move it; any level can be tried.
 */
export function LevelNote({ level }: { level: GameTier }) {
  const { c } = useTheme();
  const how = level === 'heartwood' ? 'The top level.' : 'Two strong rounds in a row at your level grow it.';
  return (
    <View accessible accessibilityLabel={`Your level: ${level === 'seedling' ? 'Seedling' : level === 'sapling' ? 'Sapling' : 'Heartwood'}. ${how}`} style={{ marginTop: space.md, alignItems: 'center' }}>
      <Row gap={space.sm} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <T v="meta">Your level:</T>
        <TierTag tier={level} />
      </Row>
      <T v="meta" center color={c.ink2} style={{ marginTop: 2 }}>{how}</T>
    </View>
  );
}

/**
 * Reveal block after each answer: a tinted feedback block (spec §5: tints
 * are for feedback only). Long explanations clamp to 5 lines with a 48pt
 * "Read full explanation" toggle; the title is announced to screen readers.
 */
/**
 * The verdict card after an answer. `spoken`: what a screen reader hears when
 * it appears (default: the title), e.g. the verdict AND the title when the
 * step that came before it left the learner with no other cue (UX review H1).
 */
export function RevealCard({ tone, title, body, spoken }: { tone: 'good' | 'bad' | 'info'; title: string; body: string; spoken?: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const look = tone === 'good' ? { fg: c.correct, bg: c.correctBg } : tone === 'bad' ? { fg: c.wrong, bg: c.wrongBg } : { fg: c.tip, bg: c.tipBg };
  const long = body.length > 280;
  const say = spoken ?? title;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(say);
  }, [say]);
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

export type TileState = 'idle' | 'selected' | 'matched' | 'correct' | 'wrong' | 'dimmed';

/**
 * Build F: one tappable item in Field Guide (a term or a meaning), Canopy
 * Call (a role) and Stepping Stones (a stone): a raised row like an answer
 * option, 48pt+, text that wraps at any size. Selected = 2px ink border
 * (never green); matched / correct = correctBg with ✓; wrong = wrongBg with
 * ✗ (shape AND colour). `shake` changes when a wrong pair is tried: the tile
 * shakes once (about 160 ms), and not at all under Reduce Motion (the
 * screen also shows a short static 'wrong' state, so the cue never relies
 * on motion). `spoken` is the full screen-reader name ("Term 2 of 4:
 * Snapshot"); the selected / checked state is announced by the role.
 *
 * Screen-reader focus (UX review H2): a tile that was ever tappable stays
 * the SAME Pressable after an answer. `locked` disables it in place; it is
 * never swapped for a View, which would rebuild the native view and drop
 * the learner's focus. In a radio group (`radio`), `checked` marks the
 * learner's pick. `pressRef` lets a screen move focus to a tile.
 * A tile that can never be tapped (a given first step, a Heartwood path
 * step) gets a flat look: `soft` fill, no shadow (UX review P5).
 */
export function MatchTile({
  text,
  lead,
  state,
  onPress,
  spoken,
  hint,
  shake = 0,
  radio,
  locked,
  checked,
  pressRef,
}: {
  /** One choice of several in a radio group (Canopy Call, the recall and missing-step picks). */
  radio?: boolean;
  text: string;
  /** A short mark before the text: "1", "2"… for a stone's place. */
  lead?: string;
  state: TileState;
  onPress?: () => void;
  spoken: string;
  hint?: string;
  shake?: number;
  /** Answered or settled: still the same element, but no longer tappable. */
  locked?: boolean;
  /** Radio only: this is the learner's pick. */
  checked?: boolean;
  /** For moving screen-reader focus to this tile (Stepping Stones). */
  pressRef?: Ref<View>;
}) {
  const { c, isDark } = useTheme();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!shake) return;
    const step = (to: number) => withTiming(to, { duration: 40, reduceMotion: ReduceMotion.System });
    x.value = withSequence(step(-6), step(6), step(-3), step(0));
  }, [shake, x]);
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const interactive = onPress !== undefined || Boolean(radio);
  // Never tappable and nothing to show: the flat "given" look, so it doesn't pass for a stone you can move.
  const flat = !interactive && state === 'idle';
  const look = {
    idle: { bg: flat ? c.soft : c.raised, border: isDark && !flat ? c.line : 'transparent', fg: c.ink },
    selected: { bg: c.raised, border: c.ink, fg: c.ink },
    matched: { bg: c.correctBg, border: 'transparent', fg: c.ink },
    correct: { bg: c.correctBg, border: 'transparent', fg: c.ink },
    wrong: { bg: c.wrongBg, border: 'transparent', fg: c.ink },
    dimmed: { bg: c.raised, border: isDark ? c.line : 'transparent', fg: c.muted },
  }[state];
  const tinted = state === 'matched' || state === 'correct' || state === 'wrong';
  const mark = state === 'matched' || state === 'correct' ? Check : state === 'wrong' ? X : null;
  const markColor = state === 'wrong' ? c.wrong : c.correct;
  // The ✓ / ✗ sits in the top-right corner, so a long single word ("Independence")
  // in a narrow column keeps the full width and never pushes the mark out.
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingRight: mark ? 14 : 0 }}>
      {lead ? (
        <T v="label" num color={c.ink2} style={{ minWidth: 18 }}>
          {lead}
        </T>
      ) : null}
      <T v="body" color={look.fg} style={[optionText, { flex: 1 }]}>
        {text}
      </T>
      {mark ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: -6, right: -8 }}>
          {mark === Check ? <Check size={16} color={markColor} strokeWidth={2.5} /> : <X size={16} color={markColor} strokeWidth={2.5} />}
        </View>
      ) : null}
    </View>
  );
  const box = {
    minHeight: 48,
    justifyContent: 'center' as const,
    borderRadius: radius.md,
    borderWidth: state === 'selected' ? 2 : 1.5,
    borderColor: look.border,
    backgroundColor: look.bg,
    paddingVertical: state === 'selected' ? 11.5 : 12,
    paddingHorizontal: state === 'selected' ? 13.5 : 14,
    marginBottom: space.sm,
    ...(!isDark && !tinted && !flat ? raisedShadow : null),
  };
  const off = Boolean(locked) || !onPress;
  return (
    <Animated.View style={moved}>
      {interactive ? (
        <Pressable
          ref={pressRef}
          accessibilityRole={radio ? 'radio' : 'button'}
          accessibilityLabel={spoken}
          accessibilityHint={off ? undefined : hint}
          accessibilityState={radio ? { checked: Boolean(checked), disabled: off } : { selected: state === 'selected', disabled: off }}
          disabled={off}
          onPress={onPress}
          style={({ pressed }) => [box, pressed && !off && { opacity: 0.85 }]}
        >
          {body}
        </Pressable>
      ) : (
        <View ref={pressRef} accessible accessibilityLabel={spoken} style={box}>
          {body}
        </View>
      )}
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
  const ok = useMemo(() => canPlay(cert.id, game), [game, cert.id]);
  return ok ? <>{children}</> : <GameUnavailable game={game} />;
}

export type { Letter };
