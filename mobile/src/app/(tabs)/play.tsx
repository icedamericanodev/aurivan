/**
 * Play — two-minute games that train real exam skills.
 * Grove v2: the featured game on the forest panel, the others as hairline
 * rows with an icon circle; best scores are serif numerals.
 * Professional tone: no mascots, no confetti.
 */
import { router } from 'expo-router';
import { Crosshair, ICON_STROKE, Play as PlayIcon, Scale, Sparkles } from '../../components/icons';
import { Enter, HeroPanel, ICON_SIZE, ListRow, Screen, Section, T, Trail } from '../../components/ui';
import { GAME_MINUTES } from '../../engine/dayPlan';
import { useActiveCert } from '../../lib/useActiveCert';
import type { GameId } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const GAMES: { id: GameId; name: string; hook: string; skill: string; Icon: typeof Crosshair }[] = [
  { id: 'trap', name: 'Trap Spotter', hook: 'Find the trap, then the best answer.', skill: 'Beating distractors', Icon: Crosshair },
  { id: 'sprint', name: 'Calibrated Sprint', hook: 'Bet 1–3 points on each answer.', skill: 'Knowing what you know', Icon: Scale },
  { id: 'priority', name: 'Priority Lens', hook: 'Spot the word that decides it.', skill: 'Reading like the examiner', Icon: Sparkles },
];

export default function Play() {
  const { c } = useTheme();
  const { progress } = useActiveCert();
  const [featured, ...others] = GAMES;
  const best = (id: GameId) => progress.gameBest[id];

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Play</T>
        <T v="meta" style={{ marginTop: space.xs }}>Quick games. They count toward review.</T>
      </Enter>

      <Enter i={1} style={{ marginTop: 18 }}>
        <HeroPanel
          caption={`${featured.skill} · ${GAME_MINUTES} min`}
          title={featured.name}
          meta={best(featured.id) !== undefined ? `${featured.hook} Best ${best(featured.id)}.` : featured.hook}
          art="frond"
          action={{
            label: 'Play',
            icon: (col) => <PlayIcon size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
            hint: featured.name,
            onPress: () => router.push(`/game/${featured.id}`),
          }}
        />
      </Enter>

      <Enter i={2}>
        <Section title="More games" />
        {others.map((g, i) => (
          <ListRow
            key={g.id}
            icon={<g.Icon size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
            title={g.name}
            subtitle={g.hook}
            trailing={best(g.id) !== undefined ? <Trail value={String(best(g.id))} unit="best" /> : undefined}
            accessibilityLabel={`${g.name}. ${g.hook}${best(g.id) !== undefined ? ` Best score ${best(g.id)}.` : ''}`}
            onPress={() => router.push(`/game/${g.id}`)}
            last={i === others.length - 1}
          />
        ))}
        <T v="meta" style={{ marginTop: space.md }}>Each game takes about two minutes and trains one exam skill.</T>
      </Enter>
    </Screen>
  );
}
