/**
 * Drills: the brain games, as a section of Practice (mobile 1.51, the owner's
 * menu pick A: four tabs, Today · Learn · Practice · You; the Play tab is gone).
 *
 * Plain English: the nine short games that train one exam skill each now sit
 * under Practice, because they ARE practice. A learner who used to tap Play
 * finds the same games one section down, and every old way in (the /play
 * route, kaisip://play, a badge's "Study for this") lands here.
 *
 * Field Guide grammar (DESIGN_SYSTEM.md §21): no tile grid and no second
 * hero. The games are a `KeyList` (numbered rows with a dotted leader and the
 * minutes at its end); the first row is "Today's drill", the game that trains
 * the learner's own mistake pattern (engine/games/todaysDrill.ts; a new
 * learner gets Snare Spotter). Practice's own path stays the screen's one
 * primary action.
 *
 * Unchanged from Play (mobile 1.40, owner decision): a new learner sees the
 * three core games; the others open under "More drills" after about 50
 * practice answers, with one quiet line until then. A game already played is
 * never taken away. No leaderboards, no play counts, no bank size.
 *
 * Performance: its own component with its own narrow subscriptions (as Play
 * had), so an answer elsewhere never re-renders Practice for it.
 */
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { KeyList, type KeyItem } from './fieldguide';
import { DisclosureRow } from './pathChooser';
import { Enter, Section, T, useScreenScroll } from './ui';
import { GAME_TIER_NAME, growthTier } from '../engine/games/growth';
import { scoreSpoken, scoreText } from '../engine/games/recap';
import { GAMES, type GameId } from '../engine/games/registry';
import { availableGames, drillPlan, moreGamesOpen, MORE_GAMES_AT, waitingGames } from '../engine/games/todaysDrill';
import { PATTERN_COPY } from '../engine/slipCoach';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { useActiveCertId } from '../lib/activeCert';
import { moveFocus } from '../lib/a11y';
import { playableGames } from '../lib/games';
import { topSlipPattern } from '../lib/slipPattern';
import { selectCert, useProgress, type ProgressState } from '../store/progress';
import { space } from '../theme/tokens';


/**
 * Every game this learner has played, on any exam (a best score, a recent
 * round or a level): as one sorted string, so Drills re-renders only when a
 * game is played for the first time.
 */
function playedKey(s: ProgressState): string {
  const ids = new Set<string>();
  for (const c of Object.values(s.byCert)) {
    for (const id of Object.keys(c?.gameBest ?? {})) ids.add(id);
    for (const [id, h] of Object.entries(c?.gameRecent ?? {})) if (h?.length) ids.add(id);
    for (const id of Object.keys(c?.gameGrowth ?? {})) ids.add(id);
  }
  return [...ids].sort().join(',');
}

/** How long after a jump Drills keeps following its own position (saved progress can still grow the sections above). */
const FOLLOW_MS = 1500;

/** Has this learner played any game, on any exam? (The one-time "games moved" hint on Practice is for them.) */
export const playedAnyGame = (s: ProgressState): boolean => playedKey(s) !== '';
/** The `moments` key (store/seen.ts) of that hint, once seen. */
export const DRILLS_MOVED = 'drills-moved';

export const Drills = memo(function Drills({
  jumpKey = 0,
  onJumped,
  onSeen,
  enter = 0,
}: {
  /** A new non-zero value asks for a jump: scroll Drills to the top and move focus to its heading (old Play links, "Go to Drills"). */
  jumpKey?: number;
  /** Once per jump, after the first scroll. */
  onJumped?: () => void;
  /** While set: called once Drills is on screen (a page that comes to rest with it in view, or a jump). */
  onSeen?: () => void;
  /** Its place in the screen's entrance order. */
  enter?: number;
}) {
  const certId = useActiveCertId();
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  const gameBest = useProgress((s) => selectCert(s, certId).gameBest);
  const gameGrowth = useProgress((s) => selectCert(s, certId).gameGrowth);
  // A game whose question pool is too small for this exam is not offered at all (never explained with a number).
  const playable = useMemo(() => playableGames(cert.id), [cert.id]);
  // The other games open after about 50 practice answers, subscribed as a yes/no.
  const open = useProgress((s) => moreGamesOpen(Object.keys(selectCert(s, certId).answers).length));
  const played = useProgress(playedKey);
  const access = useMemo(() => ({ answered: open ? MORE_GAMES_AT : 0, played: (played ? played.split(',') : []) as GameId[] }), [open, played]);
  const available = useMemo(() => availableGames(playable, access), [playable, access]);
  const waiting = useMemo(() => waitingGames(playable, access), [playable, access]);
  // The learner's own mistake pattern picks Today's drill (subscribed as the pattern's id only).
  const top = useProgress((s) => topSlipPattern(cert.id, selectCert(s, certId).mistakes));
  const pattern = top ? PATTERN_COPY[top] : null;
  const plan = useMemo(() => drillPlan(pattern ? pattern.game : null, available), [pattern, available]);
  const [moreOpen, setMoreOpen] = useState(false);
  const level = (id: GameId) => growthTier(gameGrowth?.[id]);

  // A jump (an old Play link, "Go to Drills"): bring the section to the top and the reader to its heading.
  // Run from Drills' own layout (its outer view sits right in the page, so it is laid out again whenever the
  // sections above change height), never a fixed delay: on a cold kaisip://play launch the saved progress can
  // still grow the sections above after the first frame, so for a moment Drills follows its own position.
  const box = useRef<View>(null);
  const head = useRef<View>(null);
  const scroll = useScreenScroll();
  const laidOut = useRef(false);
  const done = useRef(0);
  const followUntil = useRef(0);
  const jumpTo = useCallback(() => {
    if (!jumpKey) return;
    if (done.current !== jumpKey) {
      done.current = jumpKey;
      followUntil.current = Date.now() + FOLLOW_MS;
      scroll?.scrollToView(box.current);
      moveFocus(head, 400);
      onJumped?.();
      onSeen?.();
    } else if (Date.now() < followUntil.current) {
      scroll?.scrollToView(box.current);
    }
  }, [jumpKey, scroll, onJumped, onSeen]);
  // A new request once Drills is already laid out (the tab was open, or "Go to Drills" on this page).
  useEffect(() => {
    if (laidOut.current) jumpTo();
  }, [jumpTo]);
  const onLayout = () => {
    laidOut.current = true;
    jumpTo();
    checkSeen.current();
  };

  // On screen (the "games moved" hint is done then): checked on layout and each time the page comes to rest.
  const { height: windowH } = useWindowDimensions();
  const checkSeen = useRef<() => void>(() => {});
  useEffect(() => {
    if (!onSeen) {
      checkSeen.current = () => {};
      return;
    }
    let over = false;
    const check = () => {
      const node = box.current;
      if (over || !node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((_x, y, _w, h) => {
        if (!over && h > 0 && y < windowH && y + Math.min(h, 120) > 0) {
          over = true;
          onSeen();
        }
      });
    };
    checkSeen.current = check;
    const stop = scroll?.onSettle(check);
    return () => {
      over = true;
      checkSeen.current = () => {};
      stop?.();
    };
  }, [onSeen, scroll, windowH]);

  /** One game as a key row: what it trains above the name, its minutes (and best) at the end of the leader. */
  const item = (id: GameId, kicker?: string): KeyItem => {
    const g = GAMES[id];
    const b = gameBest[id];
    const grown = level(id) !== 'seedling' ? ` · ${GAME_TIER_NAME[level(id)]}` : '';
    return {
      key: id,
      title: g.name,
      kicker: `${kicker ? `${kicker} · ` : ''}${g.plain}${grown}`,
      right: b !== undefined ? `best ${scoreText(b)} · ${g.minutes} min` : `${g.minutes} min`,
      spoken: `${kicker ? `${kicker}: ` : ''}${g.name}. ${g.plain}. Your level: ${GAME_TIER_NAME[level(id)]}. About ${g.minutes} minutes.${b !== undefined ? ` Best score ${scoreSpoken(b)}.` : ''}`,
      hint: 'Opens the game',
      onPress: () => router.push(`/game/${id}`),
    };
  };
  const inSight = plan.drill ? [item(plan.drill, 'Today’s drill'), ...plan.also.map((id) => item(id))] : [];
  const allSeedling = available.length > 0 && available.every((id) => level(id) === 'seedling');

  // "Today's pick is from your mistakes: you often pick…" (lower case after the colon; UX review H1).
  const why = pattern ? pattern.title.replace(/\.$/, '') : '';
  return (
    <View ref={box} testID="drills" collapsable={false} onLayout={onLayout}>
      <Enter i={enter}>
      <Section variant="head" title="Drills" headRef={head} meta={allSeedling ? 'All at Seedling' : undefined} />
      {!plan.drill ? (
        // No game has enough questions for this exam yet: said calmly, no numbers.
        <T v="meta">Drills arrive once this exam has enough practice questions for them.</T>
      ) : (
        <>
          <T v="meta" style={{ marginBottom: space.xs }}>
            {plan.fromPattern && pattern
              ? `Short games, each for one exam skill. Today’s pick is from your mistakes: ${why.charAt(0).toLowerCase()}${why.slice(1)}.`
              : 'Short games, each for one exam skill. Missed questions go to your review.'}
          </T>
          <KeyList items={inSight} testID="drills-list" />
          {plan.more.length > 0 && (
            <>
              <DisclosureRow
                title="More drills"
                subtitle={`${plan.more.length} more, each trains one exam skill`}
                expanded={moreOpen}
                onPress={() => setMoreOpen((o) => !o)}
                accessibilityHint={moreOpen ? 'Hides the other drills' : 'Shows the other drills'}
                last={!moreOpen}
              />
              {moreOpen && <KeyList items={plan.more.map((id) => item(id))} start={inSight.length + 1} testID="drills-more" />}
            </>
          )}
          {/* One quiet line while drills wait for 50 answers (no count of them, no lock icons). */}
          {waiting.length > 0 && (
            <View testID="more-games-wait" style={{ marginTop: space.md }}>
              <T v="meta">{`${plan.more.length ? 'The other drills' : 'More drills'} open after ${MORE_GAMES_AT} practice questions.`}</T>
            </View>
          )}
        </>
      )}
      </Enter>
    </View>
  );
});
