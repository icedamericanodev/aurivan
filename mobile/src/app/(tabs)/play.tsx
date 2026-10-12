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
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { ICON_STROKE, Play as PlayIcon } from '../../components/icons';
import { GameGlyph, TierLeaf } from '../../components/glyphs';
import { TierTag } from '../../components/milestones';
import { Button, EmptyState, Enter, HeroPanel, ICON_SIZE, ListRow, Row, Screen, Section, T, Trail } from '../../components/ui';
import { GAME_TIER_NAME, growthTier } from '../../engine/games/growth';
import { scoreSpoken, scoreText } from '../../engine/games/recap';
import { GAMES, type GameId } from '../../engine/games/registry';
import { playableGames } from '../../lib/games';
import { CERTIFICATIONS, getCertification } from '../../content/certifications';
import { selectCert, useProgress } from '../../store/progress';
import { useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';


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
  const games = useMemo(() => playableGames(cert.id).map((id) => GAMES[id]), [cert.id]);
  const [featured, ...others] = games;
  const best = (id: GameId) => gameBest[id];
  // Each game's level (Build F): Seedling until it has been played.
  const level = (id: GameId) => growthTier(gameGrowth?.[id]);

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
        <Enter i={1} style={{ marginTop: 18 }}>
          <HeroPanel
            captionLead={<GameGlyph game={featured.id} size={20} color={c.sap} />}
            caption={`${featured.skill} · about ${featured.minutes} min`}
            captionExtra={
              // The level on forest: the leaf in sap, its name in text.
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                <View accessible={false} importantForAccessibility="no-hide-descendants">
                  <TierLeaf tier={level(featured.id)} color={c.sap} rib={c.forest} />
                </View>
                <T v="caption" color={c.onForest2} accessibilityLabel={`Your level: ${GAME_TIER_NAME[level(featured.id)]}`}>
                  {GAME_TIER_NAME[level(featured.id)]}
                </T>
              </Row>
            }
            title={featured.name}
            meta={best(featured.id) !== undefined ? `${featured.tagline} Best ${scoreText(best(featured.id)!)}.` : featured.tagline}
            art="frond"
            action={{
              label: 'Play',
              icon: (col) => <PlayIcon size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
              hint: featured.name,
              onPress: () => router.push(`/game/${featured.id}`),
            }}
          />
        </Enter>
      )}

      {others.length > 0 && (
        <Enter i={2}>
          {/* Every game starts at Seedling: say it once, and show a level on a row
              only once it has grown past that (ui.md G2). Spoken on every row. */}
          <Section title="More games" meta={others.every((g) => level(g.id) === 'seedling') ? 'All at Seedling' : undefined} />
          {others.map((g, i) => {
            const b = best(g.id);
            return (
              <ListRow
                key={g.id}
                icon={<GameGlyph game={g.id} size={ICON_SIZE.row + 2} color={c.accentText} />}
                title={g.name}
                subtitle={
                  <View>
                    <T v="meta">{g.tagline}</T>
                    {level(g.id) !== 'seedling' && (
                      <View style={{ marginTop: 2 }}>
                        <TierTag tier={level(g.id)} />
                      </View>
                    )}
                  </View>
                }
                trailing={b !== undefined ? <Trail value={scoreText(b)} unit="best" /> : undefined}
                accessibilityLabel={`${g.name}. ${g.tagline} Your level: ${GAME_TIER_NAME[level(g.id)]}. About ${g.minutes} minutes.${b !== undefined ? ` Best score ${scoreSpoken(b)}.` : ''}`}
                onPress={() => router.push(`/game/${g.id}`)}
                last={i === others.length - 1}
              />
            );
          })}
          <T v="meta" style={{ marginTop: space.md }}>Each game trains one exam skill in a few minutes.</T>
        </Enter>
      )}
    </Screen>
  );
}
