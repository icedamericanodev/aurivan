/**
 * Play — two-minute games that train real exam skills.
 * Professional tone: no mascots, no confetti. Best scores in mono.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { Crosshair, ICON_STROKE, Scale, Sparkles } from '../../components/icons';
import { Card, Gap, Row, Screen, T } from '../../components/ui';
import { useActiveCert } from '../../lib/useActiveCert';
import type { GameId } from '../../store/progress';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const GAMES: { id: GameId; name: string; hook: string; skill: string; Icon: typeof Crosshair }[] = [
  {
    id: 'trap',
    name: 'Trap Spotter',
    hook: 'Find the answer built to fool you — then the right one.',
    skill: 'Beating distractors',
    Icon: Crosshair,
  },
  {
    id: 'sprint',
    name: 'Calibrated Sprint',
    hook: 'Stake 1–3 points on each answer. Over-confidence costs when it’s wrong.',
    skill: 'Knowing what you know',
    Icon: Scale,
  },
  {
    id: 'priority',
    name: 'Priority Lens',
    hook: 'FIRST, BEST or MOST? Spot the word that decides the question.',
    skill: 'Reading like the examiner',
    Icon: Sparkles,
  },
];

export default function Play() {
  const { c } = useTheme();
  const { progress } = useActiveCert();

  return (
    <Screen>
      <T v="title">Play</T>
      <T color={c.text2}>Two-minute games that sharpen exam judgement — and count toward your review.</T>
      <Gap />
      {GAMES.map((g, i) => {
        const best = progress.gameBest[g.id];
        return (
          <Card
            key={g.id}
            onPress={() => router.push(`/game/${g.id}`)}
            accessibilityLabel={`${g.name}. ${g.hook}${best !== undefined ? ` Best score ${best}.` : ''}`}
            style={{ marginBottom: space.md, borderColor: i === 0 ? c.accent : c.border }}
          >
            <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.md,
                  backgroundColor: c.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <g.Icon size={26} color={c.accentText} strokeWidth={ICON_STROKE} />
              </View>
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="heading">{g.name}</T>
                  <T v="mono" color={c.text2}>{best !== undefined ? `BEST ${best}` : '2 MIN'}</T>
                </Row>
                <T color={c.text2} style={{ lineHeight: 22 }}>{g.hook}</T>
                <Gap h={space.xs} />
                <T v="mono" color={c.tealText}>{g.skill.toUpperCase()}</T>
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
