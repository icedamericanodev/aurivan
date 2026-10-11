/**
 * Look (mobile 1.14, Phase 4b "Dress and Alive") — "how does my plant look?"
 *
 * A live preview at the top (it stays in view while the choices scroll),
 * then five sections: Colour, Ground, Planter, Visitor and Keepsakes (show up
 * to three). A tap changes the look at once; nothing to save.
 *
 * Unlocks are derived (engine/plantLooks.ts): every species' two colourways,
 * the Meadow, its own ground, a terracotta pot and the wren are free; the
 * rest open with growth, badges and completed badge sets. A locked choice
 * says how to open it in plain words. There is no "n of m" anywhere, no
 * purchase, and nothing here says anything about readiness: it's a look.
 *
 * Large text: one column of full-width rows (two across otherwise, when two
 * fit). Never on question, mock, lesson or game screens.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { LivePlant } from '../components/plant/LivePlant';
import { KeepsakeIcon, LookOption, Swatch } from '../components/plant/LookUI';
import { PushedHeader, Section, T, useFontScale } from '../components/ui';
import { growthShort, plantCallName } from '../engine/plant';
import { colourwaysFor, GROUNDS, howToOpen, KEEPSAKE_ITEMS, MAX_SHOWN_KEEPSAKES, plantersFor, toggleKeepsake, VISITORS, type LookItem, type LookSlot } from '../engine/plantLooks';
import { haptic } from '../lib/haptics';
import { usePlantView } from '../lib/plant';
import { useProgress } from '../store/progress';
import { LARGE_TEXT, plantLeaf, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Two tiles across when each gets at least this much width (else one column of rows). */
const MIN_TILE = 150;

export default function PlantLook() {
  const { c, isDark } = useTheme();
  const view = usePlantView();
  const scale = useFontScale();
  const [width, setWidth] = useState(0);
  const p = view.plant;
  const look = view.look;

  if (!view.shown) {
    return (
      <EmptyScreen
        header="Look"
        fallback="/you"
        art="seedling"
        title="Your plant is hidden"
        body="Its growth and look are kept. Turn on Show my plant in Settings to see it again."
        primary={{ label: 'Open Settings', onPress: () => router.push('/settings') }}
      />
    );
  }
  if (!p || !look) {
    return (
      <EmptyScreen
        header="Look"
        fallback="/you"
        art="seedling"
        title="Nothing planted yet"
        body="Pick a plant and give it a name first. Then you can choose its colours and keepsakes."
        primary={{ label: 'Plant yours', onPress: () => router.replace('/plant-pick') }}
      />
    );
  }

  const certId = view.certId;
  const set = useProgress.getState().setPlantLook;
  const rows = scale >= LARGE_TEXT || width < MIN_TILE * 2 + space.sm;
  const tile = rows ? undefined : Math.floor((width - space.sm) / 2);
  const open = (x: LookItem) => look.unlocked.has(x.id);
  const r = look.resolved;
  const choose = (slot: Exclude<LookSlot, 'keepsake'>, id: string) => {
    haptic.selection();
    set(certId, { [slot]: id });
  };
  // The preview shows the visitor whatever the day, so the learner sees their choice.
  const preview = { ...look.art, visitor: r.visitor !== 'no-visitor' ? r.visitor : undefined };
  const previewSize = scale >= LARGE_TEXT ? 112 : 140;

  const group = (label: string, multi: boolean, items: LookItem[], selected: (x: LookItem) => boolean, onPress: (x: LookItem) => void, art?: (x: LookItem) => React.ReactNode, full = false) => (
    <View accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={label} style={{ flexDirection: rows ? 'column' : 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
      {items.map((x) => {
        const locked = !open(x);
        return (
          <LookOption
            key={x.id}
            testID={`look-${x.id}`}
            name={x.name}
            line={locked ? howToOpen(x) : x.caption}
            art={art?.(x)}
            selected={selected(x)}
            locked={locked}
            multi={multi}
            full={full}
            row={rows}
            width={tile}
            onPress={() => onPress(x)}
          />
        );
      })}
    </View>
  );

  // The ribbon only appears once it is earned (it opens when you tell us you passed).
  const keepsakes = KEEPSAKE_ITEMS.filter((k) => k.id !== 'ribbon' || open(k));
  // Open ones first, in catalogue order; then the ones still to open.
  const keepsakesSorted = [...keepsakes.filter(open), ...keepsakes.filter((k) => !open(k))];
  const shown = r.keepsakes;
  const fullUp = shown.length >= MAX_SHOWN_KEEPSAKES;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader title="Look" onBack={() => (router.canGoBack() ? router.back() : router.replace('/plant'))} />
      </View>
      {/* The live preview stays in view while the choices scroll. */}
      <View style={{ alignItems: 'center', paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <LivePlant
          testID="look-preview"
          species={p.species}
          stage={p.growth}
          organs={view.scales}
          quietLook={!view.face}
          size={previewSize}
          fit
          theme={isDark ? 'dark' : 'light'}
          look={preview}
          accessibilityLabel={`Preview: ${view.label}`}
        />
        <T v="meta" center style={{ marginTop: space.xs }}>{`${plantCallName(p)} · ${growthShort(p.growth)}`}</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }} onLayout={(e) => setWidth(e.nativeEvent.layout.width - space.gutter * 2)}>
        <T v="meta" style={{ marginTop: space.md }}>A look is just for you: it never changes your growth or your readiness.</T>

        <Section title="Colour" />
        {group(
          'Colour',
          false,
          colourwaysFor(p.species),
          (x) => x.id === r.colourway,
          (x) => choose('colourway', x.id),
          (x) => {
            const t = plantLeaf[x.palette as keyof typeof plantLeaf];
            return <Swatch tones={[t.deep, t.mid, t.light]} />;
          },
        )}

        <Section title="Ground" />
        {group('Ground', false, GROUNDS, (x) => x.id === r.ground, (x) => choose('ground', x.id))}

        <Section title="Planter" />
        {group('Planter', false, plantersFor(p.species), (x) => x.id === r.planter, (x) => choose('planter', x.id))}

        <Section title="Visitor" meta="Comes on days you clear your plan" />
        {group('Visitor', false, VISITORS, (x) => x.id === r.visitor, (x) => choose('visitor', x.id))}

        <Section title="Keepsakes" meta={`Show up to ${MAX_SHOWN_KEEPSAKES === 3 ? 'three' : MAX_SHOWN_KEEPSAKES}`} />
        <T v="meta">Each one is a badge you earned, kept by your plant.</T>
        {group(
          'Keepsakes',
          true,
          keepsakesSorted,
          (x) => shown.includes(x.id),
          (x) => {
            haptic.selection();
            // Toggle on what is STORED, so a keepsake whose badge a restore took
            // away stays chosen (and comes back with the badge). Only when the
            // learner needs the room is such a hidden one let go.
            const stored = p.look?.keepsakes ?? [];
            const room = stored.includes(x.id) || stored.length < MAX_SHOWN_KEEPSAKES ? stored : stored.filter((k) => look.unlocked.has(k));
            set(certId, { keepsakes: toggleKeepsake(room, x.id) });
          },
          (x) => <KeepsakeIcon id={x.id} size={36} dim={!open(x)} />,
          fullUp,
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
