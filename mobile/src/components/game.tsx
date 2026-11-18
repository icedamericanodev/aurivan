/**
 * Shared game frame: header (close · round progress · score), the question
 * as a serif stem, tinted reveal blocks, and an end-of-round summary.
 * Games stay full-screen and calm.
 */
import { router } from 'expo-router';
import { backOr, DRILLS_HREF, openTab } from '../lib/actions';
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
import { identityPermutation, makePermutation, type Permutation } from '../engine/shuffle';
import { useSettings } from '../store/settings';
import { lastScores, reviewLine, runningScore, scoreSpoken, scoreText, trendSpoken, type RecapMiss } from '../engine/games/recap';
import { useProgress, type GameId } from '../store/progress';
import { LARGE_TEXT, maxScale, motion, radius, space, type } from '../theme/tokens';
import { glyphTile, grovePlate, groveRadius, heroInset } from '../theme/grove';
import { drillName } from '../lib/drillNames';
import { FieldText } from './fieldguide';
import { HeroCard } from './groveToday';
import { LevelMarkers, Twig, twigMode, twigSpoken, TwigSquares, type ItemResult } from './drillKit';
import { useTheme } from '../theme/useTheme';
import { ScenarioBlock, StickyFooter } from './quiz';
import { useReportFlow } from './support';
import { questionTarget } from '../lib/support';
import type { ReportTarget } from '../engine/support';
import { GameGlyph, SPARK, Sparkline } from './glyphs';
import { AnimatedPressable, Celebrate, Pop, RollingText, Shake, StateLayer, useCelebration, useMotion, usePressScale } from './motion';
import { haptic } from '../lib/haptics';
import { momentName } from './milestones';
import { PressedTile } from './pressedTile';
import { markBadge } from '../engine/milestones';
import type { MilestoneMoment } from '../lib/milestones';
import { sayLater } from '../lib/a11y';
import { GAME_TIER_NAME, GAME_TIERS, growthTier, tierChangeLine, type GameTier } from '../engine/games/growth';
import type { RoundNews } from '../lib/gameRounds';
import { Check, Info, ICON_STROKE, Play as PlayIcon, X } from './icons';
import { BigNum, Button, cardLift, Enter, groveCard, Gap, ICON_SIZE, IconButton, InviteRow, PushedHeader, Stem, T, useFontScale } from './ui';

/**
 * How long the `leaf` spring takes to come to rest (its 280 ms is perceptual;
 * the real settle is about 1.5×). A level-up's grow starts this long before
 * the celebration's 1.2 s ceiling, so it is over by then.
 */
export const LEAF_SETTLE_MS = Math.round(motion.spring.leaf.duration * 1.5) + 30;

/** The level just below (the one a level-up grew from). */
const tierBelow = (t: GameTier): GameTier => GAME_TIERS[Math.max(0, GAME_TIERS.indexOf(t) - 1)];

/**
 * A fixed list of questions + one shuffle each, created once per round.
 * Release bug hunt round 3: Settings → Shuffle answer options is honoured here too (practice, review,
 * mocks and lessons already did). Off: the bank's own order. Read once when the round is made, so the
 * order stays fixed for the whole round. Grading still converts back to the ORIGINAL letters.
 */
export function useRound(certId: string, build: (rngSeed: number) => string[]) {
  const [seed, setSeed] = useState(() => Date.now());
  const round = useMemo(() => {
    const rng = createRng(seed);
    const ids = build(seed);
    const shuffle = useSettings.getState().shuffleOptions;
    const items: { q: PackQuestion; perm: Permutation }[] = [];
    for (const id of ids) {
      const q = findQuestion(certId, id);
      if (q) items.push({ q, perm: shuffle ? makePermutation(q, rng) : identityPermutation(q) });
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
  results,
  children,
  footer,
  onInfo,
  infoOpen,
  strip,
  scrollToY,
}: {
  /** Mobile 1.12: the game's own header (its glyph and name), so a round never looks like Practice. */
  game: GameId;
  /** The name in the header (default: the game's name as the phone shows it). */
  title?: string;
  index: number;
  total: number;
  score: number;
  /**
   * Grove Phase 4b (PHASE4B 6.3 item 2): each finished item, in order, for the twig (right = a filled
   * leaf, missed = an outline with a notch). Left out: every item shows as still to come.
   */
  results?: readonly ItemResult[];
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
  const name = title ?? drillName(game);
  const g = GAMES[game];
  const fontScale = useFontScale();
  const done = results ?? NO_RESULTS;
  // Grove Phase 4b (PHASE4B 6.3 items 1 to 3): the twig in the header; from text scale 1.3 numbered
  // squares on their own row under it; a round of more than 8 items a Figtree counter (its squares
  // are on the recap). Never a sideways scroll.
  const mode = twigMode(total, fontScale);
  const place = Math.min(index + 1, total);
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
      {/* Header (the tab bar is hidden, as in any quiz): close (48pt), the twig, the score under "Score". */}
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader
          icon="close"
          onBack={() => backOr(DRILLS_HREF)}
          center={
            mode === 'twig' ? (
              <Twig total={total} results={done} index={index} />
            ) : (
              // The squares under the bar (or, past 8 items, the recap) show each item; the bar says where you are.
              <View testID="drill-counter" accessible accessibilityLabel={twigSpoken(index, total, done)} style={{ alignItems: 'center' }}>
                <T v="label" num center>{`Question ${place} of ${total}`}</T>
              </View>
            )
          }
          // The running score never shows below 0 (display only; the recap shows the real total).
          right={<RoundScore value={runningScore(score)} />}
        />
        {mode === 'squares' && (
          <View style={{ marginBottom: space.sm }}>
            <TwigSquares total={total} results={done} index={index} />
          </View>
        )}
        {/* The game line (PHASE4B 6.3 item 4): glyph, name in label, "Beating distractors · 2 of 5" in meta. One stop. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${name}, ${place} of ${total}. ${g.skill}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: groveRadius.badge, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <GameGlyph game={game} size={22} color={c.accentText} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="label">{name}</T>
              <T v="meta" num>{`${g.skill} · ${place} of ${total}`}</T>
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
          <StickyFooter onHeight={setFooterH} safeArea={false}>
            <View style={{ gap: space.sm }}>{footer}</View>
          </StickyFooter>
        )}
      </View>
    </SafeAreaView>
  );
}

/** No item finished yet. */
const NO_RESULTS: readonly ItemResult[] = [];

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
    <View accessible accessibilityLabel={`Score ${value}`} style={{ alignItems: 'flex-end' }}>
      {/* Grove Phase 4b (PHASE4B 6.3 item 1): a visible "Score" caption over the counter (Figtree tabular, F14). */}
      <T v="caption" color={c.ink2}>Score</T>
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
export function QuestionHead({ q, highlight, ink }: { q: PackQuestion; highlight?: string | null; /** Grove 4b: the word underlined in ink (Signpost). */ ink?: boolean }) {
  return (
    <View>
      {q.scenario && (
        <>
          <ScenarioBlock text={q.scenario} />
          <Gap h={space.md} />
        </>
      )}
      <Stem highlight={highlight} ink={ink}>{q.stem}</Stem>
      <Gap h={space.xl} />
    </View>
  );
}

/**
 * End-of-round summary, shared by every game. Grove Phase 4b (PHASE4B 6.5), in this order:
 * 1. ONE forest panel (HeroCard): the game's glyph, "Round complete · Snare Spotter", the score in
 *    `num.score` 52 rolling from blank (300 ms; a score of 0 or below shows still), "out of 10 · best 8",
 *    the game's own round line, one row of tick and cross squares, and "New personal best" (static).
 * 2. A level change, as a band inside the panel: the three level markers in forest inks, the game's
 *    level line ("You've grown to Sapling. Your next round starts there.") and, on a level-up, what
 *    changes at the new level (the game's own level line). A step back never animates.
 * 3. A badge this round earned (never on a level-up round: one celebration per round end).
 * 4. "What caught you" (a card, when the round had misses), then "Missed questions are in your review."
 * 5. "Last 5 rounds" (a card): the sparkline, and on a round with no level change the level line
 *    ("One more strong round moves you to Sapling." with two dots, by shape).
 * 6. The game's own end note (children), one "Report a problem", and Play again / Done in a sticky footer.
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
  results,
  roundLine,
  tierLines,
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
  /** Grove Phase 4b: each item of the round, right or missed, for the panel's row of squares. */
  results?: readonly ItemResult[];
  /** The game's own line about this round ("This round: 4 of 5 snares spotted"). */
  roundLine?: string;
  /** The game's line for each level (its intro's words): on a level-up, "What changes: ..." for the new one. */
  tierLines?: Partial<Record<GameTier, string>>;
}) {
  const { c, isDark } = useTheme();
  const name = drillName(game);
  const best = useProgress((s) => s.byCert[certId]?.gameBest?.[game]);
  // Older saves have no history: `?.` keeps them loading (shows best only).
  const history = useProgress((s) => s.byCert[certId]?.gameRecent?.[game]);
  const growth = useProgress((s) => s.byCert[certId]?.gameGrowth?.[game]);
  const recent = lastScores(history);
  const review = reviewNote !== undefined ? (misses.length ? reviewNote : null) : reviewLine(misses);
  // Mobile 1.9: the round's score rolls up from blank once, as the recap arrives
  // (never a score at or below 0); "New personal best" is static text beside it.
  const [roll] = useState(() => score > 0);
  // Mobile 1.12: a level up is the round's one small moment (T1), through the
  // celebration budget: in full only the level marker changes, after the score has
  // rolled; short or static it simply shows the new level. Never with a
  // milestone moment on the same screen (that one is the moment), and never
  // for a step back (nothing animates a loss). The words are on screen and said once.
  const levelUp = news?.change === 'up' && !news.moment;
  const changeLine = news ? tierChangeLine(news.change, news.tier) : null;
  const spokenLevelUp = levelUp && changeLine ? `Score ${scoreSpoken(score)} out of ${max}. ${changeLine}` : undefined;
  const grown = useCelebration('level-up', levelUp, spokenLevelUp, `${game}:${news?.tier ?? ''}`);
  // The full level-up (PHASE4B section 8): the marker of the level it grew from shows first, then only
  // that marker cross-fades (with the leaf spring) late in the score's roll, so it settles by 1.2 s.
  const growAt = roll ? motion.dur.celebrate - LEAF_SETTLE_MS : motion.dur.quick;
  const growing = levelUp && grown.mode === 'full';
  const [grew, setGrew] = useState(false);
  useEffect(() => {
    if (!growing || grew || grown.settled) return;
    const t = setTimeout(() => setGrew(true), growAt);
    return () => clearTimeout(t);
  }, [growing, grown.settled, grew, growAt]);
  // The new level has arrived: it grew, or a tap skipped to it. Its one light haptic, once.
  const arrived = growing && (grew || grown.settled);
  useEffect(() => {
    if (arrived) haptic.light();
  }, [arrived]);
  // ONE light haptic per level up, short or static (Reduce Motion: the end state, the same haptic).
  useEffect(() => {
    if (grown.run > 0 && grown.mode !== 'full') haptic.light();
  }, [grown.run, grown.mode]);
  const shownTier = news && growing && !arrived ? tierBelow(news.tier) : news?.tier;
  const changes = levelUp && news ? tierLines?.[news.tier] : undefined;
  // The level line on a round with no level change: the saved count of strong rounds in a row
  // (engine/games/growth.ts), never a count that could silently drop, and none at the top level.
  const level = growthTier(growth);
  const next = GAME_TIERS[GAME_TIERS.indexOf(level) + 1];
  const levelLine =
    news && !news.change && next
      ? (growth?.up ?? 0) >= 1
        ? { text: `One more strong round moves you to ${GAME_TIER_NAME[next]}.`, dots: true }
        : { text: `Two strong rounds in a row move you to ${GAME_TIER_NAME[next]}.`, dots: false }
      : null;
  const theme = isDark ? 'dark' : 'light';
  const [footerH, setFooterH] = useState(140);
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: footerH + space.xl }}>
          <Enter>
            <Celebrate celebration={grown}>
              <HeroCard testID="recap-panel">
                {/* The game's own glyph and the kicker: the recap belongs to this game. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: groveRadius.badge, backgroundColor: heroInset[theme], alignItems: 'center', justifyContent: 'center' }}>
                    <GameGlyph game={game} size={26} color={c.sap} />
                  </View>
                  <FieldText v="head" color={c.onForest2} style={{ flexShrink: 1 }}>{`Round complete · ${name}`}</FieldText>
                </View>
                <View>
                  <BigNum
                    value={scoreText(score)}
                    size={52}
                    color={c.onForest}
                    accessibilityLabel={`Score ${scoreSpoken(score)} out of ${max}`}
                    roll={{ play: roll, from: null, run: 1, delay: motion.dur.enter, dur: 'fill' }}
                  />
                  <T v="meta" num color={c.onForest2}>{`out of ${max}${best !== undefined ? ` · best ${scoreText(best)}` : ''}`}</T>
                </View>
                {roundLine ? <T v="small" color={c.onForest}>{roundLine}</T> : null}
                {results && results.length > 0 ? (
                  <TwigSquares
                    total={results.length}
                    results={results}
                    forest
                    testID="recap-squares"
                    spoken={`${results.filter((r) => r === 'right').length} right, ${results.filter((r) => r === 'missed').length} to review.`}
                  />
                ) : null}
                {news?.best ? <T v="caption" color={c.sap}>New personal best</T> : null}
                {news && changeLine && shownTier ? (
                  // The level change, as an inset band inside the panel (HeroTile's inset).
                  <View testID="recap-level" style={{ borderRadius: groveRadius.tile, backgroundColor: heroInset[theme], padding: space.md, gap: space.sm }}>
                    <LevelMarkers key={grown.run} level={shownTier} forest play={growing && !grown.settled} testID="recap-markers" />
                    <T v="small" color={c.onForest}>{changeLine}</T>
                    {changes ? <T v="small" color={c.onForest2}>{`What changes: ${changes.charAt(0).toLowerCase()}${changes.slice(1)}`}</T> : null}
                  </View>
                ) : null}
              </HeroCard>
            </Celebrate>
          </Enter>
          {news?.moment && (
            // Mobile 1.40: a badge THIS round earned (lib/gameRounds.ts) is a quiet InviteRow, an
            // award on the paper (DESIGN_SYSTEM §6), never a ruled quote: that rule is the coach's voice.
            <View style={{ marginTop: space.md }}>
              <RoundBadge moment={news.moment} />
            </View>
          )}
          {misses.length > 0 && (
            <View testID="recap-misses" style={[groveCard(c), { marginTop: space.md, padding: grovePlate.pad }]}>
              <T v="headline" accessibilityRole="header">What caught you</T>
              {misses.map((m, k) => (
                <MissRow key={m.questionId} miss={m} last={k === misses.length - 1} />
              ))}
              {review && <T v="meta" style={{ marginTop: space.sm }}>{review}</T>}
            </View>
          )}
          {(recent.length > 1 || levelLine) && (
            <View testID="recap-trend" style={[groveCard(c), { marginTop: space.md, padding: grovePlate.pad, gap: space.sm }]}>
              {recent.length > 1 && (
                // Oldest to newest: the sparkline (ui.md G4), the latest round a filled leaf, the scores
                // printed under it. One spoken sentence for both.
                <View accessible accessibilityLabel={trendSpoken(recent, best)}>
                  <T v="headline">{`Last ${recent.length} rounds`}</T>
                  <View style={{ marginTop: space.sm, alignItems: 'center' }}>
                    <Sparkline values={recent} color={c.accent} paper={c.raised} />
                    <SparkScores values={recent} />
                  </View>
                </View>
              )}
              {levelLine && (
                <View testID="recap-level-line" accessible accessibilityLabel={levelLine.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  {levelLine.dots ? (
                    // One strong round in a row of two: one filled dot, one outline (shape, not colour alone).
                    <View testID="recap-level-dots" style={{ flexDirection: 'row', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} />
                      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.accent }} />
                    </View>
                  ) : null}
                  <T v="small" style={{ flexShrink: 1 }}>{levelLine.text}</T>
                </View>
              )}
            </View>
          )}
          {children ? <View style={{ marginTop: space.lg }}>{children}</View> : null}
          {/* Mobile 1.40: ONE "Report a problem" at the foot of the recap, not one under every item. */}
          <RecapReport certId={certId} game={game} misses={misses} />
        </ScrollView>
        <StickyFooter onHeight={setFooterH} safeArea={false}>
          {/* Play again (solid) and Done (ghost), side by side; one above the other from text scale 1.3. */}
          <View style={{ flexDirection: large ? 'column' : 'row', gap: space.sm }}>
            <Button label="Play again" onPress={onAgain} style={large ? undefined : { flex: 1 }} />
            <Button kind="ghost" label="Done" onPress={() => backOr(DRILLS_HREF)} style={large ? undefined : { flex: 1 }} />
          </View>
        </StickyFooter>
      </View>
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
  const name = drillName(game);
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
      // Polish round 1: the earned badge's own pressed paper tile, as on Results (a plain outline icon
      // read as a different thing). Its last frame at once: the recap's moment is the level change above.
      lead={
        <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <PressedTile badge={markBadge(moment.key)} tier={moment.tier} {...(moment.emblem ? { emblem: moment.emblem } : {})} state="earned" size={RECAP_TILE} motion="end" testID="recap-badge-tile" />
        </View>
      }
      title={`A new badge: ${name}`}
      body={moment.completes ? `${moment.unlock} That completes ${moment.setName}.` : moment.unlock}
      onPress={() => router.push({ pathname: '/milestones', params: { open: moment.key } })}
      accessibilityHint="Opens it in your badges"
    />
  );
}
/** The recap badge tile's side: a little larger than the 36pt icon circle, smaller than Results' 68. */
const RECAP_TILE = 44;
/** Badges already announced this app session (a re-render never says it twice). */
const saidBadges = new Set<string>();

/**
 * A game's first screen. Grove Phase 4b (PHASE4B 6.2): a pushed page with the back row "Practice",
 * the game's glyph tile (decorative), its name as the page's one `display` title, its line in `small`,
 * "A strong round: 80% or more." (the one place "strong" is defined) for a game with levels, the
 * game's rules, then "Pick your level" as the three level markers (a radiogroup: the learner's own
 * level filled, the picked one with the ink edge and tick, each spoken with what it means), the
 * picked level's line, the learner's level, and Start (solid, in the sticky footer).
 * Daylight passes its own picker words ("Pick your light") and lines (PHASE4B 6.6).
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
  pickTitle = 'Pick your level',
  spokenTier,
  below,
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
  /** The picker's heading (Daylight: "Pick your light"). */
  pickTitle?: string;
  /** Each level's whole spoken label (Daylight: "Seedling, 120 seconds a question, suggested"). Default: name and line. */
  spokenTier?: Record<V, string>;
  /** Lines under the picker instead of the picked level's line and the learner's level (Daylight's). */
  below?: ReactNode;
}) {
  const { c } = useTheme();
  const g = GAMES[game];
  const [footerH, setFooterH] = useState(120);
  const levels = Boolean(tiers && tier !== undefined && onTier && tierName && tierLine);
  const own: GameTier = level ?? 'seedling';
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader backLabel="Practice" onBack={() => backOr(DRILLS_HREF)} />
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: footerH + space.xl }}>
          {/* The game's glyph tile: decorative (its name is the title under it). */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: glyphTile.size, height: glyphTile.size, borderRadius: glyphTile.radius, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <GameGlyph game={game} size={40} color={c.accentText} rise={game === 'daylight'} />
          </View>
          <T v="display" accessibilityRole="header" style={{ marginTop: space.lg }}>{drillName(game)}</T>
          <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{g.tagline}</T>
          {levels ? <T v="meta" style={{ marginTop: space.sm }}>{STRONG_ROUND}</T> : null}
          <T v="body" color={c.ink2} style={{ marginTop: space.lg }}>{rules}</T>
          {children}
          {levels && (
            <>
              <T v="headline" accessibilityRole="header" style={{ marginTop: space.xl, marginBottom: space.sm }}>{pickTitle}</T>
              <LevelMarkers
                level={own}
                picked={tier as unknown as GameTier}
                onPick={(t) => onTier!(t as unknown as V)}
                lines={tierLine as unknown as Partial<Record<GameTier, string>>}
                labels={spokenTier as unknown as Partial<Record<GameTier, string>> | undefined}
                yours={Boolean(level)}
              />
              {below ?? (
                <>
                  <T v="meta" center style={{ marginTop: space.sm }}>{tierLine![tier!]}</T>
                  {level && <LevelNote level={level} />}
                </>
              )}
            </>
          )}
        </ScrollView>
        <StickyFooter onHeight={setFooterH} safeArea={false}>
          <Button label="Start" onPress={onStart} icon={(col) => <PlayIcon size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />} />
        </StickyFooter>
      </View>
    </SafeAreaView>
  );
}

/** The one place "strong" is defined (PHASE4B 6.2 and section 9). */
export const STRONG_ROUND = 'A strong round: 80% or more.';

/**
 * "Your level: Sapling. Two strong rounds in a row move you up." under a level picker (Build F; one meta
 * line in Grove 4b). Rounds at your level move it; any level can be tried.
 */
export function LevelNote({ level }: { level: GameTier }) {
  const how = level === 'heartwood' ? 'The top level.' : 'Two strong rounds in a row move you up.';
  const name = `Your level: ${GAME_TIER_NAME[level]}.`;
  const line = `${name} ${how}`;
  // Release prep 2.0.0: one sentence per line. As one centred line it wrapped at 390pt with "it."
  // alone on the second line. Still one screen-reader stop that says the whole line.
  return (
    <View testID="level-note" accessible accessibilityRole="text" accessibilityLabel={line} style={{ marginTop: space.xs }}>
      <T v="meta" center>{name}</T>
      <T v="meta" center>{how}</T>
    </View>
  );
}

/**
 * The verdict card after one step of a game that is not a question (Root or Rumor, Term Match,
 * Canopy Call, Stepping Stones) and Signpost's word, read. Grove Phase 4b (PHASE4B 6.4 and 6.6): the
 * built answer card, untinted: a `caption` in its state colour with its ✓ / ✗ (shape and words, never
 * colour alone), then the body in `small`. Long explanations clamp to 5 lines with a 48pt "Read full
 * explanation". `spoken`: what a screen reader hears when it appears (default: the title). A miss
 * animates nothing; a right answer fades in (opacity only).
 */
export function RevealCard({ tone, title, body, spoken }: { tone: 'good' | 'bad' | 'info'; title: string; body: string; spoken?: string }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const [open, setOpen] = useState(false);
  const fg = tone === 'good' ? c.correct : tone === 'bad' ? c.wrong : c.ink2;
  const mark = tone === 'good' ? '✓ ' : tone === 'bad' ? '✗ ' : '';
  const long = body.length > 280;
  const say = spoken ?? title;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(say);
  }, [say]);
  const card = (
    <View testID="reveal-card" style={[groveCard(c), { padding: 18 }]}>
      <View accessibilityLiveRegion="polite">
        <T v="caption" color={fg} accessibilityLabel={title}>{`${mark}${title}`}</T>
      </View>
      <Gap h={space.xs} />
      <T v="small" numberOfLines={long && !open ? 5 : undefined}>{body}</T>
      {long && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, justifyContent: 'center' }}>
          <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read full explanation'}</T>
        </Pressable>
      )}
    </View>
  );
  // A miss arrives still (PHASE4B section 8: nothing animates a miss).
  if (tone === 'bad') return card;
  return <Animated.View entering={FadeIn.duration(reduced ? motion.dur.reduced : motion.dur.reveal).reduceMotion(ReduceMotion.Never)}>{card}</Animated.View>;
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
      <T v="body" color={look.fg} style={{ flex: 1 }}>
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
      header={drillName(game)}
      fallback={DRILLS_HREF}
      title="This game is on the way"
      body="It needs more practice questions for this exam first. Practice is ready in the meantime."
      primary={{ label: 'Go to Practice', onPress: () => openTab('/practice') }}
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
