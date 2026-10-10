/**
 * Play — short games that train real exam skills.
 * Grove v2: the featured game on the forest panel, the others as hairline
 * rows with an icon circle; best scores are serif numerals.
 * Professional tone: no mascots, no confetti.
 *
 * Names, taglines, skills and round lengths all come from the game registry
 * (engine/games/registry.ts), so this screen, the game screens, Today's plan
 * and the Mistake journal always agree. Only the icons live here (they are UI).
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Crosshair, ICON_STROKE, Play as PlayIcon, Scale, Sparkles } from '../../components/icons';
import { Button, EmptyState, Enter, HeroPanel, ICON_SIZE, ListRow, Screen, Section, T, Trail } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { GAME_ORDER, GAMES, isPlayable, type GameId } from '../../engine/games/registry';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const ICONS: Record<GameId, typeof Crosshair> = { trap: Crosshair, sprint: Scale, priority: Sparkles };

export default function Play() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  // A game whose question pool is too small for this certification is not
  // offered at all (never explained with a number: no bank-size leaks).
  const games = useMemo(() => GAME_ORDER.filter((id) => isPlayable(id, getAllQuestions(cert.id))).map((id) => GAMES[id]), [cert.id]);
  const [featured, ...others] = games;
  const best = (id: GameId) => progress.gameBest[id];

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
            caption={`${featured.skill} · about ${featured.minutes} min`}
            title={featured.name}
            meta={best(featured.id) !== undefined ? `${featured.tagline} Best ${best(featured.id)}.` : featured.tagline}
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
          <Section title="More games" />
          {others.map((g, i) => {
            const Icon = ICONS[g.id];
            const b = best(g.id);
            return (
              <ListRow
                key={g.id}
                icon={<Icon size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                title={g.name}
                subtitle={g.tagline}
                trailing={b !== undefined ? <Trail value={String(b)} unit="best" /> : undefined}
                accessibilityLabel={`${g.name}. ${g.tagline} About ${g.minutes} minutes.${b !== undefined ? ` Best score ${b}.` : ''}`}
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
