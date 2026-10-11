/**
 * The plant's small UI pieces (mobile 1.13, Phase 4a), shared by Today, You,
 * the Your plant screen, its picker and onboarding:
 * - PlantButton: the plant you can tap (opens Your plant), one stop for
 *   screen readers with the plant's spoken label;
 * - PlantNote: one calm line with a green rule (the key-idea recipe, like
 *   You's back-fill line), for the grow-up line, the back-fill and Today's
 *   one quiet "Plant a companion" line;
 * - SpeciesGrid: the 13 species as a radio group, each previewed at Crown
 *   (growth 5), so the learner sees where it goes before choosing;
 * - PlantNameField: the name, with a suggestion and "Another idea".
 *
 * Never used on question, mock, lesson or game screens (a test checks).
 * Copy rule: "growth", never "stage"; no needs, no guilt.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { cleanPlantName, MAX_NAME, PLANT_SPECIES, SPECIES_INFO, suggestName, type GrowthLevel, type PlantSpecies } from '../../engine/plant';
import { radius, raisedShadow, space, type as typeScale, maxScale, LARGE_TEXT } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Button, T, useFontScale } from '../ui';
import { Plant } from './Plant';

// ── The plant you can tap ──────────────────────────────────────────────
export function PlantButton({
  species,
  growth,
  scales,
  quietLook,
  resting,
  size,
  label,
  onPress,
  fit,
  hint = 'Opens your plant',
  testID,
}: {
  species: PlantSpecies;
  growth: GrowthLevel;
  scales?: readonly number[];
  quietLook?: boolean;
  resting?: boolean;
  size: number;
  /** The plant's spoken label (engine/plant.ts plantLabel). */
  label: string;
  onPress: () => void;
  fit?: boolean;
  hint?: string;
  testID?: string;
}) {
  const { isDark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      // The drawing is the target; never smaller than 48pt.
      style={({ pressed }) => ({ minWidth: 48, minHeight: 48, opacity: pressed ? 0.85 : 1 })}
    >
      <Plant species={species} stage={growth} organs={scales} quietLook={quietLook} resting={resting} size={size} theme={isDark ? 'dark' : 'light'} fit={fit} />
    </Pressable>
  );
}

// ── One calm line (green rule) ─────────────────────────────────────────
export function PlantNote({ caption, line, children, testID }: { caption: string; line: string; children?: ReactNode; testID?: string }) {
  const { c } = useTheme();
  return (
    <View testID={testID} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      {/* The words are one stop; each button stays its own (UX review H1). */}
      <View accessible accessibilityLabel={`${caption}. ${line}`}>
        <T v="caption" color={c.accentText}>{caption}</T>
        <T v="quote" style={{ marginTop: space.xs }}>{line}</T>
      </View>
      {children ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginLeft: -space.sm }}>{children}</View> : null}
    </View>
  );
}

// ── The species picker ─────────────────────────────────────────────────
/** The growth shown in the picker: Crown, a full plant (owner brief: "stage 5 preview"). */
export const PICK_PREVIEW: GrowthLevel = 5;

export function SpeciesGrid({ value, onChange, quietLook }: { value: PlantSpecies; onChange: (s: PlantSpecies) => void; quietLook?: boolean }) {
  const { c, isDark } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const [width, setWidth] = useState(0);
  // Three across on a phone; two at large text, so "Cherry blossom" never squeezes.
  const cols = large ? 2 : 3;
  const gap = space.sm;
  const cell = width ? Math.floor((width - gap * (cols - 1)) / cols) : 0;
  const art = Math.min(large ? 96 : 76, Math.max(56, cell - 32));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Choose your plant"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {cell > 0 &&
        PLANT_SPECIES.map((s) => {
          const selected = s === value;
          const info = SPECIES_INFO[s];
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${info.name}. ${info.line}`}
              onPress={() => onChange(s)}
              testID={`species-${s}`}
              style={({ pressed }) => [
                {
                  width: cell,
                  minHeight: 48,
                  alignItems: 'center',
                  borderRadius: radius.md,
                  backgroundColor: c.raised,
                  // Selected = 2px ink border (shape, not colour alone); padding shrinks so nothing jumps.
                  borderWidth: selected ? 2 : 1.5,
                  borderColor: selected ? c.ink : isDark ? c.line : 'transparent',
                  paddingTop: selected ? space.sm - 0.5 : space.sm,
                  paddingBottom: selected ? space.sm + 1.5 : space.sm + 2,
                  paddingHorizontal: space.xs,
                },
                !isDark && raisedShadow,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Plant species={s} stage={PICK_PREVIEW} quietLook={quietLook} size={art} theme={isDark ? 'dark' : 'light'} />
              <T v="label" center style={{ marginTop: space.xs }}>{info.name}</T>
            </Pressable>
          );
        })}
    </View>
  );
}

// ── The name ───────────────────────────────────────────────────────────
/** Another idea from the species' list, never the same one twice in a row. */
export function anotherName(species: PlantSpecies, current: string, pick = Math.random()): string {
  const list = SPECIES_INFO[species].suggestions;
  const others = list.filter((n) => n !== current);
  return others.length ? others[Math.min(others.length - 1, Math.floor(pick * others.length))] : suggestName(species, pick);
}

export function PlantNameField({ species, value, onChange }: { species: PlantSpecies; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  return (
    <View>
      <T v="caption" color={c.accentText}>Name it</T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={`Your ${SPECIES_INFO[species].lower}`}
        placeholderTextColor={c.muted}
        accessibilityLabel="Your plant’s name"
        accessibilityHint={`Optional. Up to ${MAX_NAME} characters. You can change it any time.`}
        maxFontSizeMultiplier={maxScale.body}
        maxLength={MAX_NAME * 2}
        autoCorrect={false}
        returnKeyType="done"
        onEndEditing={() => {
          const clean = cleanPlantName(value);
          if (clean !== value) onChange(clean);
        }}
        style={[
          typeScale.body,
          { marginTop: space.sm, minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, paddingVertical: space.md, color: c.ink, backgroundColor: c.raised, borderColor: c.control },
        ]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }}>
        <T v="meta" style={{ flexShrink: 1 }}>You can change it any time.</T>
        <Button kind="ghost" label="Another idea" accessibilityLabel="Suggest another name" onPress={() => onChange(anotherName(species, value))} />
      </View>
    </View>
  );
}
