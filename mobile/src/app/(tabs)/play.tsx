/**
 * Play — short games that train real exam skills.
 * Grove v2: the featured game on the forest panel, the others as hairline
 * rows with an icon circle; best scores are serif numerals.
 * Professional tone: no mascots, no confetti.
 *
 * Names, taglines, skills and round lengths all come from the game registry
 * (engine/games/registry.ts), so this screen, the game screens, Today's plan
 * and the Mistake journal always agree. Mobile 1.12: each game has its own
 * botanical glyph (components/glyphs.tsx GameGlyph), the same one in its
 * row, its intro, its header and its recap.
 *
 * Build F: every game shows the learner's level (Seedling / Sapling /
 * Heartwood) as a leaf glyph AND its name, never colour alone. No
 * leaderboards, no play counts.
 *
 * Mobile 1.24 (panel decision D5): Play leads with "Today's drill", the game
 * that trains the learner's own mistake pattern (engine/games/todaysDrill.ts;
 * a new learner gets Snare Spotter). Beside it sit two related games, so
 * three games are in sight; the other six wait under "More games", folded.
 * Every row has a plain subtitle ("Spot the trick answer"). Nine games is
 * the limit: no new ones are added.
 *
 * Mobile 1.21: the hero's caption holds two things, not five (the glyph and
 * "Beating distractors · 6 min"); the level (leaf + name) moves under the
 * meta line, clear of the art.
 *
 * Mobile 1.40 (owner decision, 22 Oct 2026): a simpler list. A new learner
 * sees the three core games (Snare Spotter, Signpost, Call It First); the
 * others open under "More games" after about 50 practice answers, with one
 * quiet line until then. A game the learner already played always stays
 * (engine/games/todaysDrill.ts availableGames).
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ICON_STROKE, Play as PlayIcon } from '../../components/icons';
import { GameGlyph, TierLeaf } from '../../components/glyphs';
import { TierTag } from '../../components/milestones';
import { DisclosureRow } from '../../components/pathChooser';
import { Button, EmptyState, Enter, HeroPanel, ICON_SIZE, ListRow, Row, Screen, Section, T, Trail } from '../../components/ui';
import { GAME_TIER_NAME, growthTier } from '../../engine/games/growth';
import { scoreSpoken, scoreText } from '../../engine/games/recap';
import { GAMES, type GameId } from '../../engine/games/registry';
import { availableGames, drillPlan, moreGamesOpen, MORE_GAMES_AT, waitingGames } from '../../engine/games/todaysDrill';
import { spokenMin } from '../../engine/pace';
import { playableGames } from '../../lib/games';
import { topSlipPattern } from '../../lib/slipPattern';
import { PATTERN_COPY } from '../../engine/slipCoach';
import { CERTIFICATIONS, getCertification } from '../../content/certifications';
import { selectCert, useProgress, type ProgressState } from '../../store/progress';
import { useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/**
 * Every game this learner has played, on any exam (a best score, a recent
 * round or a level): as one sorted string, so Play re-renders only when a
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

export default function Play() {
  const { c } = useTheme();
  // Only what Play shows (performance, 1.15.x): its exam, best scores and
  // levels. An answer, a review or a badge elsewhere never re-renders Play,
  // which stays mounted (hidden) while the learner studies.
  const certId = useSettings((s) => s.activeCertId);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  // Progress by the active id itself, as useActiveCert reads it, so every tab shows the same exam's progress.
  const gameBest = useProgress((s) => selectCert(s, certId).gameBest);
  const gameGrowth = useProgress((s) => selectCert(s, certId).gameGrowth);
  // A game whose question pool is too small for this certification is not
  // offered at all (never explained with a number: no bank-size leaks).
  // Note-based games (Root or Rumor) count the cert's study notes instead.
  const playable = useMemo(() => playableGames(cert.id), [cert.id]);
  // Mobile 1.40: the other games open after about 50 practice answers (the same
  // count as the backup preview's "answered": distinct questions answered on this
  // exam). Subscribed as a yes/no, so an answer elsewhere re-renders Play only
  // the one time it flips. A game already played is never taken away.
  const open = useProgress((s) => moreGamesOpen(Object.keys(selectCert(s, certId).answers).length));
  const played = useProgress(playedKey);
  const access = useMemo(() => ({ answered: open ? MORE_GAMES_AT : 0, played: (played ? played.split(',') : []) as GameId[] }), [open, played]);
  const available = useMemo(() => availableGames(playable, access), [playable, access]);
  const waiting = useMemo(() => waitingGames(playable, access), [playable, access]);
  // The learner's own mistake pattern (the same coach as the Mistake journal) picks Today's drill.
  // Subscribed as the pattern's id, not the whole mistakes record (performance,
  // PR #90): a right answer that marks a logged mistake fixed changes the
  // record but not the pattern, and must not re-render this hidden tab.
  const top = useProgress((s) => topSlipPattern(cert.id, selectCert(s, certId).mistakes));
  const pattern = top ? PATTERN_COPY[top] : null;
  const plan = useMemo(() => drillPlan(pattern ? pattern.game : null, available), [pattern, available]);
  const featured = plan.drill ? GAMES[plan.drill] : undefined;
  // "More games" starts folded: three games in sight, the rest one tap away.
  const [moreOpen, setMoreOpen] = useState(false);
  const best = (id: GameId) => gameBest[id];
  // Each game's level (Build F): Seedling until it has been played.
  const level = (id: GameId) => growthTier(gameGrowth?.[id]);

  /** One game as a hairline row: name, plain subtitle, level (once grown), best score. */
  const gameRow = (id: GameId, last: boolean) => {
    const g = GAMES[id];
    const b = best(id);
    return (
      <ListRow
        key={id}
        icon={<GameGlyph game={id} size={ICON_SIZE.row + 2} color={c.accentText} />}
        title={g.name}
        subtitle={
          <View>
            <T v="meta">{g.plain}</T>
            {level(id) !== 'seedling' && (
              <View style={{ marginTop: 2 }}>
                <TierTag tier={level(id)} />
              </View>
            )}
          </View>
        }
        trailing={b !== undefined ? <Trail value={scoreText(b)} unit="best" /> : undefined}
        accessibilityLabel={`${g.name}. ${g.plain}. Your level: ${GAME_TIER_NAME[level(id)]}. About ${g.minutes} minutes.${b !== undefined ? ` Best score ${scoreSpoken(b)}.` : ''}`}
        onPress={() => router.push(`/game/${id}`)}
        last={last}
      />
    );
  };

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Play</T>
        <T v="meta" style={{ marginTop: space.xs }}>Short games. Missed questions go to your review.</T>
      </Enter>

      {!featured && (
        // No game has enough questions for this exam yet: say so calmly, no numbers.
        <Enter i={1}>
          <EmptyState title="Games are on the way" body="Games arrive once this exam has enough practice questions for them. Practice is ready in the meantime." />
          <Button label="Go to Practice" onPress={() => router.push('/practice')} style={{ marginTop: space.xl }} />
        </Enter>
      )}

      {featured && (
        // No extra top margin: the Section below brings its own (a second one left ~64pt under the intro; UX review nit).
        <Enter i={1}>
          {/* Today's drill: why this game, in the learner's own pattern words (or a calm default). */}
          <Section title="Today’s drill" />
          <T v="meta" style={{ marginBottom: space.md }}>
            {plan.fromPattern && pattern ? `Picked from your mistakes. ${pattern.title}.` : 'A good place to start. Your mistakes will shape this pick.'}
          </T>
          <HeroPanel
            captionLead={<GameGlyph game={featured.id} size={20} color={c.sap} />}
            caption={`${featured.skill} · ${featured.minutes} min`}
            captionLabel={spokenMin(`${featured.skill} · ${featured.minutes} min`)}
            title={featured.name}
            meta={best(featured.id) !== undefined ? `${featured.tagline} Best ${scoreText(best(featured.id)!)}.` : featured.tagline}
            art="frond"
            action={{
              label: 'Play',
              icon: (col) => <PlayIcon size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
              hint: featured.name,
              onPress: () => router.push(`/game/${featured.id}`),
            }}
          >
            {/* The level on forest: the leaf in sap, its name in text (under the meta, clear of the art). */}
            <Row gap={space.sm} style={{ marginTop: space.sm }}>
              <View accessible={false} importantForAccessibility="no-hide-descendants">
                <TierLeaf tier={level(featured.id)} color={c.sap} rib={c.forest} />
              </View>
              <T v="caption" color={c.onForest2} accessibilityLabel={`Your level: ${GAME_TIER_NAME[level(featured.id)]}`}>
                {GAME_TIER_NAME[level(featured.id)]}
              </T>
            </Row>
          </HeroPanel>
        </Enter>
      )}

      {plan.also.length > 0 && (
        <Enter i={2}>
          {/* Every game starts at Seedling: say it once, here, and show a level on a row
              only once it has grown past that (ui.md G2). Spoken on every row. */}
          <Section
            title={plan.fromPattern ? 'Also good for this' : 'Also try'}
            meta={available.every((id) => level(id) === 'seedling') ? 'All at Seedling' : undefined}
          />
          {plan.also.map((id, i) => gameRow(id, i === plan.also.length - 1))}
          {/* Mobile 1.40: one quiet line while the other games wait (no count of them, no lock icons). */}
          {waiting.length > 0 && (
            <View testID="more-games-wait" style={{ marginTop: space.md }}>
              <T v="meta">{`More games open after ${MORE_GAMES_AT} answers.`}</T>
            </View>
          )}
        </Enter>
      )}

      {plan.more.length > 0 && (
        <Enter i={3}>
          <DisclosureRow
            title="More games"
            subtitle={`${plan.more.length} more, each trains one exam skill`}
            expanded={moreOpen}
            onPress={() => setMoreOpen((o) => !o)}
            accessibilityHint={moreOpen ? 'Hides the other games' : 'Shows the other games'}
            last={!moreOpen}
          />
          {moreOpen && plan.more.map((id, i) => gameRow(id, i === plan.more.length - 1))}
        </Enter>
      )}
    </Screen>
  );
}
