/**
 * Shared game frame: header (close · round progress · score), the question
 * as a serif stem, tinted reveal blocks, and an end-of-round summary.
 * Games stay full-screen and calm.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
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
import { LARGE_TEXT, maxScale, motion, optionText, radius, space, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock, StickyFooter } from './quiz';
import { useReportFlow } from './support';
import { questionTarget } from '../lib/support';
import type { ReportTarget } from '../engine/support';
import { GameGlyph, SPARK, Sparkline, TierLeafMorph } from './glyphs';
import { AnimatedPressable, Celebrate, FadeIn as Arrive, Pop, RollingText, Shake, StateLayer, useCelebration, useMotion, usePressScale } from './motion';
import { haptic } from '../lib/haptics';
import { momentName, TierTag } from './milestones';
import type { MilestoneMoment } from '../lib/milestones';
import { sayLater } from '../lib/a11y';
import { GAME_TIERS, tierChangeLine, type GameTier } from '../engine/games/growth';
import type { RoundNews } from '../lib/gameRounds';
import { BadgeIcon, Check, Info, ICON_STROKE, Play as PlayIcon, X } from './icons';
import { BigNum, Button, cardLift, Enter, Gap, ICON_SIZE, IconButton, InviteRow, PushedHeader, Row, Section, SegmentBar, Segmented, Stem, T, useFontScale } from './ui';

/**
 * How long the `leaf` spring takes to come to rest (its 280 ms is perceptual;
 * the real settle is about 1.5×). A level-up's grow starts this long before
 * the celebration's 1.2 s ceiling, so it is over by then.
 */
export const LEAF_SETTLE_MS = Math.round(motion.spring.leaf.duration * 1.5) + 30;

/** The level just below (the one a level-up grew from). */
const tierBelow = (t: GameTier): GameTier => GAME_TIERS[Math.max(0, GAME_TIERS.indexOf(t) - 1)];

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
  game,
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
  /** Mobile 1.12: the game's own header (its glyph and name), so a round never looks like Practice. */
  game: GameId;
  /** The name in the header (default: the game's name from the registry). */
  title?: string;
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
  const name = title ?? GAMES[game].name;
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
          right={<RoundScore value={runningScore(score)} />}
        />
        {/* The game's own header (ui.md G1): its glyph in a soft circle, its name, and where you are.
            A round never looks like a Practice question. One screen-reader stop. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${name}, ${Math.min(index + 1, total)} of ${total}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <GameGlyph game={game} size={22} color={c.accentText} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="label">{name}</T>
              <T v="meta" num>{`${Math.min(index + 1, total)} of ${total}`}</T>
            </View>
          </View>
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

/**
 * The round's running score in the header (motion.md M5): when it goes UP
 * its digits roll to the new value (300 ms, no stagger: it is small and
 * changes often). A score that goes down just shows (nothing animates a
 * loss). Reduced: the new value brightens in. Screen readers hear "Score 4"
 * at ALL times (still, rolling, reduced): the label is on a wrapper, one
 * stop, never on the rolling columns alone (which are plain text again
 * once the roll ends).
 */
export function RoundScore({ value }: { value: number }) {
  const { c } = useTheme();
  const [s, setS] = useState({ value, from: value, run: 0 });
  if (s.value !== value) setS({ value, from: s.value, run: value > s.value ? s.run + 1 : s.run });
  return (
    <View accessible accessibilityLabel={`Score ${value}`}>
      <RollingText
        value={String(value)}
        from={String(s.from)}
        play={s.run > 0}
        run={s.run}
        style={{ ...type.label, fontVariant: ['tabular-nums'] }}
        maxScale={maxScale.label}
        color={c.ink}
        dur="fill"
        stagger={false}
      />
    </View>
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
  // Mobile 1.9: the round's score rolls up from 0 once, as the recap arrives
  // (never a score at or below 0); "New personal best" follows it.
  const [roll] = useState(() => score > 0);
  // Mobile 1.12: a level up is the round's one small moment (T1), through the
  // celebration budget: in full it grows the leaf once, after the score has
  // rolled; short or static it simply shows the new level. Never with a
  // milestone moment on the same screen (that one is the moment), and never
  // for a step back (nothing animates a loss). The words are on screen.
  const levelUp = news?.change === 'up' && !news.moment;
  const grown = useCelebration('level-up', levelUp, undefined, `${game}:${news?.tier ?? ''}`);
  // ONE light haptic per level up, after it commits (never during a render React may replay):
  // short or static, as the level shows; in full, as the leaf grows, or as it settles
  // there when the learner skips before it grew (TierLeafMorph onGrown).
  useEffect(() => {
    if (grown.run > 0 && grown.mode !== 'full') haptic.light();
  }, [grown.run, grown.mode]);
  // The full grow ends inside the celebration's 1.2 s: it starts late in the score's roll
  // (or just after the recap arrives, with no roll), so the leaf spring settles by the ceiling.
  const growAt = roll ? motion.dur.celebrate - LEAF_SETTLE_MS : motion.dur.quick;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.gutter, flexGrow: 1, justifyContent: 'center' }}>
        <Enter>
          <View style={{ alignItems: 'center' }}>
            {/* The game's own glyph (ui.md G1): the recap belongs to this game. */}
            <View style={{ width: 72, height: 72, borderRadius: radius.pill, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', marginBottom: space.md }}>
              <GameGlyph game={game} size={40} color={c.accentText} />
            </View>
            <T v="caption" center color={c.accentText}>{`Round complete · ${GAMES[game].name}`}</T>
            <Gap h={space.sm} />
            <BigNum
              value={scoreText(score)}
              size={52}
              accessibilityLabel={`Score ${scoreSpoken(score)} out of ${max}`}
              roll={{ play: roll, from: null, run: 1, delay: motion.dur.enter }}
            />
            <T v="meta" num center>{`out of ${max}${best !== undefined ? ` · best ${scoreText(best)}` : ''}`}</T>
            {recent.length > 1 && (
              // Oldest → newest: a small sparkline (ui.md G4), the latest round a filled
              // leaf, with the scores printed under it. One spoken sentence for both.
              <View accessible accessibilityLabel={trendSpoken(recent, best)} style={{ marginTop: space.lg, alignItems: 'center' }}>
                <T v="caption" center>{`Last ${recent.length} rounds`}</T>
                <View style={{ marginTop: space.xs }}>
                  <Sparkline values={recent} color={c.accent} paper={c.bg} />
                </View>
                <SparkScores values={recent} />
              </View>
            )}
            {news?.best && (
              <Arrive delay={roll ? motion.dur.enter + motion.dur.grow : 0} rise={false}>
                <T v="meta" center color={c.accentText} style={{ marginTop: space.sm }}>New personal best</T>
              </Arrive>
            )}
            {news && tierChangeLine(news.change, news.tier) && (
              <Celebrate celebration={grown}>
                <Row gap={space.sm} style={{ marginTop: space.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {/* A level up grows the leaf once (T1), after the score has rolled; a step back just shows. */}
                  <TierLeafMorph
                    tier={news.tier}
                    color={c.accentText}
                    rib={c.bg}
                    grow={levelUp && grown.mode === 'full' && !grown.settled ? { from: tierBelow(news.tier), delay: growAt } : undefined}
                    onGrown={levelUp && grown.mode === 'full' ? () => haptic.light() : undefined}
                  />
                  <T v="small" center style={{ flexShrink: 1 }}>{tierChangeLine(news.change, news.tier)!}</T>
                </Row>
              </Celebrate>
            )}
          </View>
        </Enter>
        {news?.moment && (
          // Mobile 1.40: a badge THIS round earned (lib/gameRounds.ts) is a quiet InviteRow, an
          // award on the paper (DESIGN_SYSTEM §6), never a ruled quote: that rule is the coach's voice.
          <View style={{ marginTop: space.xl }}>
            <RoundBadge moment={news.moment} />
          </View>
        )}
        <Gap h={space.xl} />
        {misses.length > 0 && (
          <View style={{ marginBottom: space.lg }}>
            <T v="headline" accessibilityRole="header">What caught you</T>
            {misses.map((m, k) => (
              <MissRow key={m.questionId} miss={m} last={k === misses.length - 1} />
            ))}
            {review && <T v="meta" style={{ marginTop: space.sm }}>{review}</T>}
          </View>
        )}
        {children}
        <Gap />
        <Button label="Play again" onPress={onAgain} />
        <Gap h={space.sm} />
        <Button kind="ghost" label="Done" onPress={() => router.back()} />
        {/* Mobile 1.40: ONE "Report a problem" at the foot of the recap, not one under every item. */}
        <RecapReport certId={certId} game={game} misses={misses} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The printed scores under the recap's sparkline (ui.md G4): each one centred
 * under its own point (a row of equal slots, one per round, as wide as the
 * line's point spacing). At large text (×1.3 and above) the slots would be
 * too narrow, so the scores stay one compact line. Decorative: the group
 * around it speaks the trend in one sentence. Exported for tests.
 */
export function SparkScores({ values }: { values: number[] }) {
  const large = useFontScale() >= LARGE_TEXT;
  if (large || values.length < 2) {
    return <T v="meta" num center style={{ marginTop: 2 }}>{values.map(scoreText).join('  ·  ')}</T>;
  }
  const slot = (SPARK.width - 2 * SPARK.pad) / (values.length - 1);
  return (
    <View testID="spark-scores" style={{ flexDirection: 'row', width: slot * values.length, marginTop: 2 }}>
      {values.map((v, i) => (
        <View key={i} style={{ width: slot, alignItems: 'center' }}>
          <T v="meta" num center>{scoreText(v)}</T>
        </View>
      ))}
    </View>
  );
}

/**
 * One "What caught you" row: the miss, one screen-reader stop. Mobile 1.40:
 * no link under each row any more; the recap has ONE "Report a problem" at
 * its foot (RecapReport).
 */
function MissRow({ miss: m, last }: { miss: RecapMiss; last: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: 13, paddingBottom: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
      <View accessible accessibilityLabel={`${m.stem} ${m.tag}. ${m.why}`}>
        <T v="meta">{m.stem}</T>
        <T v="caption" color={c.tip} style={{ marginTop: space.xs }}>{m.tag}</T>
        <T v="small" style={{ marginTop: 2 }}>{m.why}</T>
      </View>
    </View>
  );
}

/**
 * What the recap's one report is about (exported for tests): the miss itself
 * when there is exactly one (a question, or a game card by its stable id);
 * otherwise the round, with the missed items named in "where" so the team
 * can still find them.
 */
export function recapReportTarget(certId: string, game: GameId, misses: readonly RecapMiss[]): ReportTarget {
  const name = GAMES[game].name;
  const where = `Game recap · ${name}`;
  if (misses.length === 1) {
    const m = misses[0];
    const q = findQuestion(certId, m.questionId);
    return q ? questionTarget(certId, q, where) : { kind: 'card', id: m.reportId ?? m.questionId, name, where };
  }
  const missed = misses.map((m) => m.reportId ?? m.questionId).slice(0, 12);
  return { kind: 'app', id: `game-recap:${game}`, name: `${name} recap`, where: missed.length ? `${where} · missed ${missed.join(', ')}` : where };
}

/** The recap's single "Report a problem" (its link, its note after sending, and its sheet). */
function RecapReport({ certId, game, misses }: { certId: string; game: GameId; misses: readonly RecapMiss[] }) {
  const target = useMemo(() => recapReportTarget(certId, game, misses), [certId, game, misses]);
  const report = useReportFlow(certId, target);
  return (
    <View testID="recap-report" style={{ marginTop: space.lg, alignItems: 'center' }}>
      {report.link}
      {report.block}
      {report.sheet}
    </View>
  );
}

/**
 * A badge this round earned, as an InviteRow: the badge glyph in its circle,
 * "A new badge: Snare-wise", what it means, and the whole row opens it in
 * Badges. Said once as the recap arrives (a screen-reader user hears it
 * without scrolling); calm, no burst.
 */
function RoundBadge({ moment }: { moment: MilestoneMoment }) {
  const { c } = useTheme();
  const name = momentName(moment);
  useEffect(() => {
    if (saidBadges.has(moment.key)) return;
    saidBadges.add(moment.key);
    // One success tap and one spoken line, once (never again on a re-render).
    haptic.success();
    sayLater(`A new badge: ${name}.`);
  }, [moment.key, name]);
  return (
    <InviteRow
      testID="recap-badge"
      icon={<BadgeIcon size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
      title={`A new badge: ${name}`}
      body={moment.completes ? `${moment.unlock} That completes ${moment.setName}.` : moment.unlock}
      onPress={() => router.push({ pathname: '/milestones', params: { open: moment.key } })}
      accessibilityHint="Opens it in your badges"
    />
  );
}
/** Badges already announced this app session (a re-render never says it twice). */
const saidBadges = new Set<string>();

/**
 * A game's first screen (Build E games, after Daylight's pattern): pushed
 * header → the game's glyph (48) → skill caption → tagline as the hero →
 * the rules → (Forecast: its scoring block, `children`) → "Pick your level"
 * Seedling / Sapling / Heartwood (spoken with what each tier means) with
 * the chosen level's leaf and one meta line → primary "Start".
 * Mobile 1.12: the leaf beside the chosen level MORPHS when the learner
 * picks another (motion.md M5); a game without levels leaves `tiers` out.
 */
export function GameIntro<V extends string>({
  game,
  rules,
  tiers,
  tier,
  onTier,
  tierName,
  tierLine,
  onStart,
  level,
  children,
}: {
  game: GameId;
  /** Build F: the learner's own level for this game (the picker starts on it). */
  level?: GameTier;
  rules: string;
  tiers?: V[];
  tier?: V;
  onTier?: (t: V) => void;
  tierName?: Record<V, string>;
  tierLine?: Record<V, string>;
  onStart: () => void;
  /** Extra intro content under the rules (Forecast's scoring block). */
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const g = GAMES[game];
  const leafTier = tier && (GAME_TIERS as string[]).includes(tier) ? (tier as unknown as GameTier) : null;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader icon="close" onBack={() => router.back()} title={g.name} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxl }}>
        <View style={{ alignItems: 'center' }}>
          <GameGlyph game={game} size={48} color={c.accent} />
        </View>
        <T v="caption" center color={c.accentText} style={{ marginTop: space.sm }}>{`${g.skill} · about ${g.minutes} min`}</T>
        <T v="hero" center accessibilityRole="header" style={{ marginTop: space.xs }}>{g.tagline}</T>
        <T v="body" color={c.ink2} style={{ marginTop: space.md }}>{rules}</T>
        {children}
        {tiers && tier !== undefined && onTier && tierName && tierLine && (
          <>
            <Section title="Pick your level" />
            <Gap h={space.sm} />
            <Segmented
              accessibilityLabel="Pick your level"
              value={tier}
              onChange={onTier}
              options={tiers.map((t) => ({ value: t, label: tierName[t], spoken: `${tierName[t]}. ${tierLine[t]}` }))}
            />
            <Row gap={space.sm} style={{ marginTop: space.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
              {leafTier && <TierLeafMorph tier={leafTier} color={c.accentText} rib={c.bg} />}
              <T v="meta" center style={{ flexShrink: 1 }}>{tierLine[tier]}</T>
            </Row>
          </>
        )}
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
  const { reduced } = useMotion();
  const [open, setOpen] = useState(false);
  const look = tone === 'good' ? { fg: c.correct, bg: c.correctBg } : tone === 'bad' ? { fg: c.wrong, bg: c.wrongBg } : { fg: c.tip, bg: c.tipBg };
  const long = body.length > 280;
  const say = spoken ?? title;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(say);
  }, [say]);
  return (
    <Animated.View entering={FadeIn.duration(reduced ? motion.dur.reduced : 240).reduceMotion(ReduceMotion.Never)}>
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
  const press = usePressScale();
  // The state the tile was first drawn in: a mark already there on the screen's first paint never springs.
  const [firstState] = useState(state);
  const interactive = onPress !== undefined || Boolean(radio);
  // Never tappable and nothing to show: the flat "given" look, so it doesn't pass for a stone you can move.
  const flat = !interactive && state === 'idle';
  const look = {
    idle: { bg: flat ? c.soft : c.raised, border: isDark && !flat ? c.line : 'transparent', fg: c.ink },
    // Selected keeps the idle box: the 2px ink ring is a layer that cross-fades in (spec §8).
    selected: { bg: c.raised, border: isDark ? c.line : 'transparent', fg: c.ink },
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
          {/* The mark springs in as the state arrives on screen (a mark may pop; the tint never bounces).
              The mark mounts WITH its state, so it pops on mount, unless the tile was drawn so. */}
          <Pop mount={state !== firstState} trigger={state}>
            {mark === Check ? <Check size={16} color={markColor} strokeWidth={2.5} /> : <X size={16} color={markColor} strokeWidth={2.5} />}
          </Pop>
        </View>
      ) : null}
    </View>
  );
  const box = {
    minHeight: 48,
    justifyContent: 'center' as const,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: look.border,
    backgroundColor: look.bg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: space.sm,
    ...(!tinted && !flat ? cardLift(isDark) : null),
  };
  const off = Boolean(locked) || !onPress;
  return (
    // A wrong try shakes once (motion.tsx Shake; nothing moves under Reduce Motion).
    <Shake trigger={shake}>
      {interactive ? (
        <AnimatedPressable
          ref={pressRef}
          accessibilityRole={radio ? 'radio' : 'button'}
          accessibilityLabel={spoken}
          accessibilityHint={off ? undefined : hint}
          accessibilityState={radio ? { checked: Boolean(checked), disabled: off } : { selected: state === 'selected', disabled: off }}
          disabled={off}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={[box, interactive && tinted ? { backgroundColor: c.raised } : null, press.style]}
        >
          {/* The selected ring (first), then mobile 1.12's state tints (motion.md M5):
              a matched pair, a right or a wrong place tints in over 160 ms, both
              tiles of a pair together, instead of flipping colour. The states never
              overlap, and every layer is always mounted, so nothing reflows. */}
          <StateLayer on={state === 'selected'} style={[tileRing, { borderColor: c.ink }]} />
          <StateLayer on={state === 'matched' || state === 'correct'} dur="quick" style={[tileTint, { backgroundColor: c.correctBg }]} />
          <StateLayer on={state === 'wrong'} dur="quick" style={[tileTint, { backgroundColor: c.wrongBg }]} />
          {body}
        </AnimatedPressable>
      ) : (
        <View ref={pressRef} accessible accessibilityLabel={spoken} style={box}>
          {body}
        </View>
      )}
    </Shake>
  );
}

/** A tile's state tint, laid over its whole box (the 1.5 border included). */
const tileTint = { top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, borderRadius: radius.md } as const;

/** The selected tile's 2px ink ring, laid over the tile's own 1.5 border. */
const tileRing = { top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, borderRadius: radius.md, borderWidth: 2 } as const;

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
