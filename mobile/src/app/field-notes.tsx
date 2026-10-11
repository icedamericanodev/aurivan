/**
 * Field notes (You → Field notes), Build F — games review §5.
 *
 * Plain English for the founder:
 * - "Game levels": each game this exam can play, with the learner's level
 *   as a leaf AND its name (Seedling, Sapling, Heartwood), and one line on
 *   how it grows. Never a play count, never a leaderboard.
 * - Mobile 1.10: the 7 skill badges moved to the badge case, on their own
 *   Field notes shelf (counted on their own). This screen links there (the
 *   case opens at that shelf), unless badges are hidden in Settings.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ICON_STROKE, Leaf } from '../components/icons';
import { TierTag } from '../components/milestones';
import { ICON_SIZE, ListRow, PushedHeader, Section, T } from '../components/ui';
import { GAME_TIER_NAME, growthTier } from '../engine/games/growth';
import { GAMES } from '../engine/games/registry';
import { badgeViews } from '../engine/milestones';
import { playableGames } from '../lib/games';
import { marksFor } from '../lib/milestones';
import { useActiveCert } from '../lib/useActiveCert';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Only rounds played at the learner's own level move it (engine/games/growth.ts),
// and the top level is just a fact, never a warning (behaviour review).
const HOW: Record<'seedling' | 'sapling' | 'heartwood', string> = {
  seedling: 'Two rounds in a row at 80% or more, at your level, grow it to Sapling.',
  sapling: 'Two rounds in a row at 80% or more, at your level, grow it to Heartwood.',
  heartwood: 'The top level.',
};

export default function FieldNotes() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const games = useMemo(() => playableGames(cert.id), [cert.id]);
  const skills = useMemo(() => badgeViews(marksFor(cert.id, progress), progress.milestones?.earned, 'skill'), [cert.id, progress]);
  const earned = skills.filter((v) => v.earned.length).length;
  const hidden = useSettings((s) => s.badgesHidden);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxl }}>
        <PushedHeader title="Field notes" onBack={() => router.back()} />
        <T v="meta" style={{ marginTop: space.sm }}>Your level in each game, and how it grows.</T>

        <Section title="Game levels" />
        {games.map((id, k) => {
          const tier = growthTier(progress.gameGrowth?.[id]);
          return (
            <View
              key={id}
              accessible
              accessibilityLabel={`${GAMES[id].name}. Level: ${GAME_TIER_NAME[tier]}. ${HOW[tier]}`}
              style={{ paddingVertical: 13, borderBottomWidth: k === games.length - 1 ? 0 : 1, borderBottomColor: c.line }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.md }}>
                <T v="label" style={{ flexShrink: 1 }}>{GAMES[id].name}</T>
                <TierTag tier={tier} />
              </View>
              <T v="meta" style={{ marginTop: 2 }}>{HOW[tier]}</T>
            </View>
          );
        })}
        <T v="meta" style={{ marginTop: space.sm }}>Two rounds in a row under 50% at your level move it back one level. Two strong rounds grow it again.</T>

        {!hidden && (
          <>
            <Section title="Skill badges" />
            {/* The 7 skill badges live in the badge case, on their own shelf (counted on their own). */}
            <ListRow
              icon={<Leaf size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
              title="Your skill badges"
              subtitle={earned ? `${earned} of ${skills.length} earned, in your badges` : 'In your badges, with what each needs'}
              accessibilityLabel={`Your skill badges. ${earned ? `${earned} of ${skills.length} earned` : 'None yet'}. Opens your badges.`}
              onPress={() => router.push({ pathname: '/milestones', params: { shelf: 'fieldNotes' } })}
              last
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
