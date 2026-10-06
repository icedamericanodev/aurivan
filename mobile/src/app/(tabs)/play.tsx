/**
 * Play — two-minute games that train real exam skills.
 * Professional tone: no mascots, no confetti. Best scores use tabular figures.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { Crosshair, ICON_STROKE, Scale, Sparkles } from '../../components/icons';
import { Card, Gap, ICON_SIZE, IconTile, Row, Screen, T } from '../../components/ui';
import { useActiveCert } from '../../lib/useActiveCert';
import type { GameId } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const GAMES: { id: GameId; name: string; hook: string; skill: string; Icon: typeof Crosshair }[] = [
  {
    id: 'trap',
    name: 'Trap Spotter',
    hook: 'Find the trap, then the best answer.',
    skill: 'Beating distractors',
    Icon: Crosshair,
  },
  {
    id: 'sprint',
    name: 'Calibrated Sprint',
    hook: 'Bet 1–3 points on each answer.',
    skill: 'Knowing what you know',
    Icon: Scale,
  },
  {
    id: 'priority',
    name: 'Priority Lens',
    hook: 'Spot the word that decides it.',
    skill: 'Reading like the examiner',
    Icon: Sparkles,
  },
];

export default function Play() {
  const { c } = useTheme();
  const { progress } = useActiveCert();

  return (
    <Screen>
      <T v="display">Play</T>
      <T v="meta">Quick games. They count toward review.</T>
      <Gap />
      {GAMES.map((g, i) => {
        const best = progress.gameBest[g.id];
        return (
          <Card
            key={g.id}
            onPress={() => router.push(`/game/${g.id}`)}
            accessibilityLabel={`${g.name}. ${g.hook}${best !== undefined ? ` Best score ${best}.` : ''}`}
            emphasis={i === 0}
            style={{ marginBottom: space.md }}
          >
            <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
              <IconTile>
                <g.Icon size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
              </IconTile>
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="title">{g.name}</T>
                  <T v="meta" num>{best !== undefined ? `Best ${best}` : '2 min'}</T>
                </Row>
                <T v="meta">{g.hook}</T>
                <Gap h={space.xs} />
                <T v="eyebrow">{g.skill}</T>
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
