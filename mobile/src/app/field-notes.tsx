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
 * - Grove Phase 4b (design-notes/grove/phase4b/PHASE4B.md 6.6): a pushed list page. Back row "You",
 *   the page's one `display` title, then one card with a row per game: its name in `label`, its level
 *   in `meta`, and the three level markers (one screen-reader stop per row: "Snare Spotter. Level:
 *   Sapling. Heartwood not reached."). How a level grows is said once, above the card.
 */
import { router } from 'expo-router';
import { backOr } from '../lib/actions';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ICON_STROKE, Leaf } from '../components/icons';
import { LevelMarkers, levelSpoken } from '../components/drillKit';
import { groveCard, ICON_SIZE, ListRow, PushedHeader, T } from '../components/ui';
import { drillName } from '../lib/drillNames';
import { grovePlate } from '../theme/grove';
import { GAME_TIER_NAME, growthTier } from '../engine/games/growth';
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
        <PushedHeader backLabel="You" onBack={() => backOr('/you')} />
        <T v="display" accessibilityRole="header" style={{ marginTop: space.sm }}>Field notes</T>
        {/* How a level grows, said once for every game (it is the same rule for each). */}
        <T v="small" color={c.ink2} style={{ marginTop: space.md }}>Two rounds in a row at 80% or more, at your level, grow it.</T>

        <T v="headline" accessibilityRole="header" style={{ marginTop: space.xl }}>Game levels</T>
        <View testID="field-notes-levels" style={[groveCard(c), { marginTop: space.sm, paddingHorizontal: grovePlate.pad }]}>
          {games.map((id, k) => {
            const tier = growthTier(progress.gameGrowth?.[id]);
            return (
              <View
                key={id}
                testID={`field-notes-${id}`}
                accessible
                accessibilityLabel={`${drillName(id)}. ${levelSpoken(tier)} ${HOW[tier]}`}
                style={{ minHeight: 56, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.md, borderTopWidth: k === 0 ? 0 : 1, borderTopColor: c.line }}
              >
                <View style={{ flex: 1, minWidth: 140 }}>
                  <T v="label">{drillName(id)}</T>
                  <T v="meta" style={{ marginTop: 2 }}>{GAME_TIER_NAME[tier]}</T>
                </View>
                {/* The three markers, drawn small; the row's one label says them. */}
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <LevelMarkers level={tier} small decorative testID={`field-notes-markers-${id}`} />
                </View>
              </View>
            );
          })}
        </View>
        <T v="meta" style={{ marginTop: space.sm }}>Two rounds in a row under 50% at your level move it back one level. Two strong rounds grow it again.</T>

        {!hidden && (
          <>
            <T v="headline" accessibilityRole="header" style={{ marginTop: space.xl, marginBottom: space.sm }}>Skill badges</T>
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
