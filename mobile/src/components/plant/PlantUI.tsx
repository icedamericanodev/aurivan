/**
 * The plant's small UI pieces (mobile 1.13, Phase 4a), shared by Today, You,
 * the Your plant screen, its picker and onboarding:
 * - PlantButton: the plant you can tap (opens Your plant), one stop for
 *   screen readers with the plant's spoken label;
 * - PlantNote: one calm line as an InviteRow (mobile 1.21; it was a green
 *   rule), for the grow-up line, the back-fill and Today's one quiet
 *   "Plant a companion" line;
 * - SpeciesGrid: the 13 species as a radio group, each previewed at Crown
 *   (growth 5), so the learner sees where it goes before choosing; three,
 *   two or one across from the measured width and text size;
 * - PlantNameField: the name (empty to start, a suggestion as its
 *   placeholder) and "Another idea".
 *
 * Never used on question, mock, lesson or game screens (a test checks).
 * Copy rule: "growth", never "stage"; no needs, no guilt.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { cleanPlantName, MAX_NAME, PLANT_SPECIES, SPECIES_INFO, suggestName, type GrowthLevel, type PlantSpecies } from '../../engine/plant';
import { radius, space, type as typeScale, maxScale, LARGE_TEXT } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ICON_STROKE, Sprout } from '../icons';
import { Button, CARD_LIFT, ICON_SIZE, InviteRow, T, useFontScale } from '../ui';
import { Plant } from './Plant';
import { LivePlant, type LivePlantProps } from './LivePlant';
import type { ArtLook, Lod } from './art';
import type { PlantMood } from '../../engine/plantLooks';

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
  lod,
  caption,
  hint = 'Opens your plant',
  testID,
  look,
  mood,
  reaction,
  grows,
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
  /** Force a detail level (Today draws the small level at 104pt). */
  lod?: Lod;
  /** A short line under the plant (Today: its name), inside the same tap target; the label already says it. */
  caption?: string;
  hint?: string;
  testID?: string;
  /** Mobile 1.14: the look, the face's mood, its one reaction and the growth sequence. */
  look?: ArtLook;
  mood?: PlantMood;
  reaction?: LivePlantProps['reaction'];
  /** The growth sequence (Today's grow-up moment). */
  grows?: LivePlantProps['growth'];
}) {
  const { c, isDark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      // The drawing is the target; never smaller than 48pt.
      style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
    >
      <LivePlant species={species} stage={growth} organs={scales} quietLook={quietLook} resting={resting} size={size} theme={isDark ? 'dark' : 'light'} fit={fit} lod={lod} look={look} mood={mood} reaction={reaction} growth={grows} />
      {caption ? (
        <T v="meta" center numberOfLines={2} color={c.ink2} style={{ maxWidth: Math.max(size, 120), marginTop: 2 }}>
          {caption}
        </T>
      ) : null}
    </Pressable>
  );
}

// ── One calm line about the plant (an InviteRow) ───────────────────────
// Mobile 1.21 (spec §5 "One meaning per device"): the green left rule is the
// coach's voice only, so the plant's invitations and news are InviteRows: a
// sprout in an icon circle, the caption as the title, the line under it, the
// buttons as ghosts under the words. The words are one stop; each button
// stays its own (UX review H1).
export function PlantNote({ caption, line, children, testID }: { caption: string; line: string; children?: ReactNode; testID?: string }) {
  const { c } = useTheme();
  return (
    <InviteRow
      testID={testID}
      icon={<Sprout size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
      title={caption}
      body={line}
      actions={children}
    />
  );
}

// ── The species picker ─────────────────────────────────────────────────
/** The growth shown in the picker: Crown, a full plant (owner brief: "stage 5 preview"). */
export const PICK_PREVIEW: GrowthLevel = 5;

/** The narrowest tile a species name fits in at 100% text (UX review H1); it grows with the text, up to ×1.3. */
export const PICK_MIN_CELL = 112;
/** From this text scale the picker is one column of rows (plant beside its name and line). */
export const PICK_ONE_COLUMN = 1.6;

/**
 * How many tiles across (UX review H1): three when three fit at this text
 * size, else two, and one row per species at ×1.6 text or when two don't fit.
 * Measured from the real width, so a 360 dp phone gets two and never clips
 * a name.
 */
export function pickColumns(width: number, fontScale: number, gap: number = space.sm): 1 | 2 | 3 {
  if (fontScale >= PICK_ONE_COLUMN) return 1;
  const min = PICK_MIN_CELL * Math.min(Math.max(fontScale, 1), LARGE_TEXT);
  const fits = (n: number) => width >= n * min + (n - 1) * gap;
  return fits(3) ? 3 : fits(2) ? 2 : 1;
}

export function SpeciesGrid({ value, onChange, quietLook }: { value: PlantSpecies; onChange: (s: PlantSpecies) => void; quietLook?: boolean }) {
  const { c, isDark } = useTheme();
  const scale = useFontScale();
  const [width, setWidth] = useState(0);
  const gap = space.sm;
  const cols = pickColumns(width, scale, gap);
  const rows = cols === 1;
  const cell = width ? Math.floor((width - gap * (cols - 1)) / cols) : 0;
  const art = rows ? 56 : Math.min(scale >= LARGE_TEXT ? 96 : 76, Math.max(56, cell - 32));
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
                  // One column: the plant beside its name and line, like a list row.
                  flexDirection: rows ? 'row' : 'column',
                  alignItems: 'center',
                  gap: rows ? space.md : 0,
                  borderRadius: radius.md,
                  backgroundColor: c.raised,
                  // Selected = 2px ink border (shape, not colour alone); padding shrinks so nothing jumps.
                  borderWidth: selected ? 2 : 1.5,
                  borderColor: selected ? c.ink : isDark ? c.line : 'transparent',
                  paddingTop: selected ? space.sm - 0.5 : space.sm,
                  paddingBottom: selected ? space.sm + 1.5 : space.sm + 2,
                  paddingHorizontal: rows ? (selected ? space.md - 0.5 : space.md) : space.xs,
                },
                !isDark && CARD_LIFT,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Plant species={s} stage={PICK_PREVIEW} quietLook={quietLook} size={art} theme={isDark ? 'dark' : 'light'} />
              {rows ? (
                <View style={{ flex: 1 }}>
                  <T v="label">{info.name}</T>
                  <T v="meta" style={{ marginTop: 2 }}>{info.line}</T>
                </View>
              ) : (
                // Two lines at most, and never a break inside a word ("Cherry / blossom", not "Cherry blos- / som").
                <T v="label" center numberOfLines={2} style={{ marginTop: space.xs }}>
                  {info.name}
                </T>
              )}
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
  // A name idea, shown as the placeholder (UX review P1): the field starts
  // empty, so nothing is chosen for the learner. "Another idea" fills in a
  // real name; an empty name is simply "Your oak".
  // One random pick per field, read for each species (render stays pure).
  const [pick] = useState(() => Math.random());
  const idea = { name: suggestName(species, pick) };
  const lower = SPECIES_INFO[species].lower;
  return (
    <View>
      <T v="caption" color={c.accentText}>Name it</T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={idea.name}
        placeholderTextColor={c.muted}
        accessibilityLabel="Your plant’s name"
        accessibilityHint={`Optional. Up to ${MAX_NAME} characters. Left empty, it is your ${lower}. You can change it any time.`}
        maxFontSizeMultiplier={maxScale.body}
        // MAX_NAME UTF-16 units: the field never takes characters the save would silently drop (code review M3d).
        maxLength={MAX_NAME}
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
        <T v="meta" style={{ flexShrink: 1 }}>{`Optional. Left empty, it is “Your ${lower}”.`}</T>
        <Button kind="ghost" label="Another idea" accessibilityLabel="Suggest another name" onPress={() => onChange(anotherName(species, value || idea.name))} />
      </View>
    </View>
  );
}
