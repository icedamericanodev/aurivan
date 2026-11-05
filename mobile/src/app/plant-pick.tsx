/**
 * Plant picker (mobile 1.13; Grove Phase 4b, design-notes/grove/phase4b/PHASE4B.md 4.3): one
 * screen, three jobs, each with the same layout.
 * - mode "new" (default): plant yours. "Choose what you'll grow": the chosen species in a
 *   spotlight on its soil line, the name field right under it, then the 13 species (each shown at
 *   Crown, so you see where it goes), and "Plant it". An existing learner's study sets the growth
 *   quietly: Your plant then says so in one line ("Your study so far grew Kai to Bough.").
 * - mode "species": change plant (the species). The growth stays ("Same growth, new look.").
 * - mode "name": rename: the spotlight and the name field, no grid.
 * The buttons sit in a bottom bar (side by side; stacked from text scale 1.3). About 10 seconds;
 * nothing here asks for anything later. Never "stage".
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { PICK_PREVIEW, PlantNameField, SpeciesGrid } from '../components/plant/PlantUI';
import { Plant } from '../components/plant/Plant';
import { SoilBed, soilYFor } from '../components/plant/PlantPage';
import { StickyFooter } from '../components/quiz';
import { Button, Gap, PushedHeader, T, useFontScale } from '../components/ui';
import { SPECIES_INFO, suggestName, type PlantSpecies } from '../engine/plant';
import { NEW_PLANT_STYLE } from '../engine/plantLooks';
import { plantFor, usePlantView } from '../lib/plant';
import { useKeyboardShown } from '../lib/useKeyboardShown';
import { useProgress } from '../store/progress';
import { sayLater } from '../lib/a11y';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Mode = 'new' | 'species' | 'name';
/** Each mode's title (the page's one `display`) and its one line (PHASE4B 4.3). */
const TITLE: Record<Mode, string> = { new: 'Choose what you’ll grow', species: 'Change plant', name: 'Rename' };
const LINE: Record<Mode, string | null> = { new: 'Grows from real progress, never from taps or time.', species: 'Same growth, new look. Each is shown at Crown.', name: null };

/** The spotlight's art: 160pt, 120pt from text scale 1.3. */
export const spotlightSize = (fontScale: number) => (fontScale >= LARGE_TEXT ? 120 : 160);

export default function PlantPick() {
  const { c, isDark } = useTheme();
  // `from=today`: opened from Today's plant row, where "Not now" also hides that row (mobile 1.21).
  const params = useLocalSearchParams<{ mode?: string; from?: string }>();
  const view = usePlantView();
  const scale = useFontScale();
  const large = scale >= LARGE_TEXT;
  const p = view.plant;
  // Without a plant, every mode is "plant yours".
  const mode: Mode = p && (params.mode === 'species' || params.mode === 'name') ? params.mode : 'new';
  const [species, setSpecies] = useState<PlantSpecies>(p?.species ?? 'oak');
  // Empty to start (the name field shows an idea as its placeholder); renaming starts from the current name.
  const [name, setName] = useState(() => (p ? p.name : ''));
  const [footerH, setFooterH] = useState(120);
  // The keyboard and the sticky footer never cover the name field (UX review H2).
  const typing = useKeyboardShown();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/plant'));

  const confirm = () => {
    const certId = view.certId;
    if (mode === 'new') {
      plantFor(certId, species, name);
      // Phase 4b (PHASE4B 4.3 item 5): Your plant plays the planting (plantIn, 820 ms) on arrival.
      router.replace({ pathname: '/plant', params: { planted: '1' } });
      return;
    }
    if (mode === 'species') useProgress.getState().switchPlantSpecies(certId, species);
    else useProgress.getState().renamePlant(certId, name);
    back();
  };

  // Show my plant off: the same "hidden" screen as Your plant, never a
  // picker whose pick would be ignored (QA 6: a deep link or a stale back stack).
  if (!view.shown) {
    return (
      <EmptyScreen
        header="Your plant"
        fallback="/you"
        art="seedling"
        title="Your plant is hidden"
        body="Its growth is kept. Turn on Show my plant in Settings."
        primary={{ label: 'Open Settings', onPress: () => router.push({ pathname: '/settings', params: { section: 'plant' } }) }}
      />
    );
  }

  const theme = isDark ? 'dark' : 'light';
  // The spotlight: the chosen species on the soil line. A new plant is drawn as it will grow
  // (botanical); Change plant and Rename in the plant's own style. Shown at Crown, as in the grid.
  const style = mode === 'new' ? NEW_PLANT_STYLE : view.style;
  const look = { style };
  const art = spotlightSize(scale);
  const info = SPECIES_INFO[species];
  const line = LINE[mode];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* iOS moves the scroll insets itself; Android shrinks the view (the support sheet's pattern). */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? undefined : 'height'}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: (typing ? 0 : footerH) + space.xl }}
        >
          <PushedHeader onBack={back} icon="close" />
          <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>
            {TITLE[mode]}
          </T>
          {line ? <T v="meta" style={{ marginTop: space.sm }}>{line}</T> : null}
          {/* Opened from Today's plant row: say what "Not now" does there (review decision). */}
          {mode === 'new' && params.from === 'today' ? <T v="meta" style={{ marginTop: space.xs }}>Not now hides this on Today. Plant one any time from You.</T> : null}

          {/* The spotlight (paper, not a forest card): the chosen species, its name and its line. */}
          <View testID="pick-spotlight" style={{ marginTop: space.lg }}>
            <SoilBed size={art} soilY={soilYFor(species, PICK_PREVIEW, look, art, theme)} bleed={space.gutter}>
              <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Plant species={species} stage={PICK_PREVIEW} quietLook={style !== 'storybook-face'} look={look} size={art} fit={false} theme={theme} />
              </View>
            </SoilBed>
            <T v="title" style={{ marginTop: space.md }}>{info.name}</T>
            <T v="aside" color={c.ink2} style={{ marginTop: space.xs }}>{info.line}</T>
          </View>

          {/* Name it (new and rename), right under the spotlight so it is on the first or second screen. */}
          {mode !== 'species' && (
            <View style={{ marginTop: space.lg }}>
              <PlantNameField species={species} value={name} onChange={setName} />
            </View>
          )}
          {mode !== 'name' && (
            <>
              <Gap h={space.xl} />
              <SpeciesGrid
                value={species}
                // A new plant is previewed as it will grow (botanical); Change plant, in the plant's own style.
                plantStyle={mode === 'species' ? view.style : undefined}
                onChange={(s) => {
                  // A suggested name follows the species until the learner types their own.
                  if (mode === 'new' && SPECIES_INFO[species].suggestions.includes(name)) setName(suggestName(s, Math.random()));
                  setSpecies(s);
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Hidden while typing: "Done" on the keyboard closes it and brings the buttons back. */}
      {!typing && (
        <StickyFooter onHeight={setFooterH}>
          <View testID="pick-buttons" style={large ? { gap: space.sm } : { flexDirection: 'row-reverse', gap: space.sm }}>
            <View style={large ? undefined : { flex: 1 }}>
              <Button label={mode === 'new' ? 'Plant it' : mode === 'species' ? 'Use this plant' : 'Save name'} onPress={confirm} />
            </View>
            <View style={large ? undefined : { flex: 1 }}>
              <Button
                kind="ghostNeutral"
                label={mode === 'new' ? 'Not now' : 'Cancel'}
                accessibilityHint={mode === 'new' && params.from === 'today' ? 'Hides the plant row on Today. You can plant one from You.' : undefined}
                onPress={() => {
                  if (mode === 'new' && params.from === 'today') {
                    useProgress.getState().setPlantSettings({ promptHidden: true });
                    sayLater('Hidden from Today. You can plant one from You.');
                  }
                  back();
                }}
              />
            </View>
          </View>
        </StickyFooter>
      )}
    </SafeAreaView>
  );
}
