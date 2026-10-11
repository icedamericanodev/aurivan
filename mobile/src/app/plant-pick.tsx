/**
 * Plant picker (mobile 1.13, Phase 4a): one screen, three jobs.
 * - mode "new" (default): plant yours. Pick from the 13 species (each shown
 *   at Crown, so you see where it goes), name it with a suggestion, Plant it.
 *   An existing learner's study sets the growth quietly: Your plant then
 *   says so in one line ("Your study so far grew Kai to Bough.").
 * - mode "species": change species. The growth stays ("Same growth, new look.").
 * - mode "name": rename.
 * About 10 seconds; nothing here asks for anything later. Never "stage".
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlantNameField, SpeciesGrid } from '../components/plant/PlantUI';
import { StickyFooter } from '../components/quiz';
import { Button, Gap, PushedHeader, T } from '../components/ui';
import { SPECIES_INFO, suggestName, type PlantSpecies } from '../engine/plant';
import { plantFor, usePlantView } from '../lib/plant';
import { useProgress } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Mode = 'new' | 'species' | 'name';
const TITLE: Record<Mode, string> = { new: 'Plant yours', species: 'Change species', name: 'Rename' };

export default function PlantPick() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const view = usePlantView();
  const p = view.plant;
  // Without a plant, every mode is "plant yours".
  const mode: Mode = p && (params.mode === 'species' || params.mode === 'name') ? params.mode : 'new';
  const [species, setSpecies] = useState<PlantSpecies>(p?.species ?? 'oak');
  // A name idea, prefilled (the learner can clear it for no name).
  const [name, setName] = useState(() => (p ? p.name : suggestName('oak', Math.random())));
  const [footerH, setFooterH] = useState(120);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/plant'));

  const confirm = () => {
    const certId = view.certId;
    if (mode === 'new') {
      plantFor(certId, species, name);
      router.replace('/plant');
      return;
    }
    if (mode === 'species') useProgress.getState().switchPlantSpecies(certId, species);
    else useProgress.getState().renamePlant(certId, name);
    back();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title={TITLE[mode]} onBack={back} icon="close" />
        {mode === 'new' && (
          <>
            <T v="display" accessibilityRole="header" style={{ marginTop: space.md }}>Choose what you’ll grow</T>
            <T v="meta" style={{ marginTop: space.sm }}>It grows only from real progress across the exam outline. Never from taps or time. It asks for nothing and never wilts.</T>
          </>
        )}
        {mode === 'species' && <T v="meta" style={{ marginTop: space.md }}>Same growth, new look. Shown here fully grown.</T>}
        {mode !== 'name' && (
          <>
            <Gap h={space.lg} />
            <SpeciesGrid
              value={species}
              quietLook={!view.face}
              onChange={(s) => {
                // A suggested name follows the species until the learner types their own.
                if (mode === 'new' && SPECIES_INFO[species].suggestions.includes(name)) setName(suggestName(s, Math.random()));
                setSpecies(s);
              }}
            />
            <T v="quote" color={c.ink2} style={{ marginTop: space.md }}>{`${SPECIES_INFO[species].name}: ${SPECIES_INFO[species].line}`}</T>
          </>
        )}
        {mode !== 'species' && (
          <View style={{ marginTop: space.xl }}>
            <PlantNameField species={species} value={name} onChange={setName} />
          </View>
        )}
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button label={mode === 'new' ? 'Plant it' : mode === 'species' ? 'Use this plant' : 'Save name'} onPress={confirm} />
        <Button kind="ghost" label={mode === 'new' ? 'Not now' : 'Cancel'} onPress={back} />
      </StickyFooter>
    </SafeAreaView>
  );
}
