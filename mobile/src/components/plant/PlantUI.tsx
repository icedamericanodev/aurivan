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
 *   two or one across from the measured width and text size. Mobile 1.40:
 *   a new plant is previewed botanical (how it will grow); Change plant
 *   previews the plant's own style;
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
import { Check, ICON_STROKE, Sprout } from '../icons';
import { Button, ICON_SIZE, InviteRow, T, useFontScale } from '../ui';
import { Plant } from './Plant';
import { LivePlant, type LivePlantProps } from './LivePlant';
import type { ArtLook, Lod } from './art';
import { NEW_PLANT_STYLE, type PlantMood, type PlantStyle } from '../../engine/plantLooks';

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

/** The grid's width on a 360pt phone (360 less the two 16pt gutters): narrower than this is two across. */
export const PICK_NARROW = 328;
/** From this text scale the picker is one column of rows (plant beside its name). */
export const PICK_ONE_COLUMN = 2;
/** Below this the grid is too narrow for two tiles, so it is one column of rows. */
const PICK_TWO_MIN = 220;

/**
 * How many tiles across (Grove Phase 4b, PHASE4B 4.3): three; two from text scale 1.3 or on a
 * phone under 360pt; one column of rows from text scale 2 (or when two don't fit). Measured from
 * the grid's real width.
 */
export function pickColumns(width: number, fontScale: number): 1 | 2 | 3 {
  if (fontScale >= PICK_ONE_COLUMN || width < PICK_TWO_MIN) return 1;
  if (fontScale >= LARGE_TEXT || width < PICK_NARROW) return 2;
  return 3;
}

/** One look object per style (a constant, so the previews never rebuild). */
const STYLE_LOOK: Record<PlantStyle, { style: PlantStyle }> = { botanical: { style: 'botanical' }, storybook: { style: 'storybook' }, 'storybook-face': { style: 'storybook-face' } };

export function SpeciesGrid({ value, onChange, plantStyle = NEW_PLANT_STYLE }: { value: PlantSpecies; onChange: (s: PlantSpecies) => void; plantStyle?: PlantStyle }) {
  const { c, isDark } = useTheme();
  const scale = useFontScale();
  const [width, setWidth] = useState(0);
  const gap = space.sm;
  const cols = pickColumns(width, scale);
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
                  // Grove tile (PHASE4B 4.3): the raised fill with a 1pt line edge; selected is a 2pt ink edge.
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? c.ink : c.line,
                  paddingTop: selected ? space.sm - 1 : space.sm,
                  paddingBottom: selected ? space.sm + 1 : space.sm + 2,
                  paddingHorizontal: rows ? (selected ? space.md - 1 : space.md) : space.xs,
                },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Plant species={s} stage={PICK_PREVIEW} quietLook={plantStyle !== 'storybook-face'} look={STYLE_LOOK[plantStyle]} size={art} theme={isDark ? 'dark' : 'light'} />
              {/* Selected (PHASE4 5, F9): the 2px ink edge plus an ink tick, never green. */}
              {selected ? (
                <View testID={`species-${s}-tick`} style={{ position: 'absolute', top: 6, right: 6 }} accessible={false} importantForAccessibility="no-hide-descendants">
                  <Check size={16} color={c.ink} strokeWidth={2.5} />
                </View>
              ) : null}
              {rows ? (
                <View style={{ flex: 1 }}>
                  <T v="label">{info.name}</T>
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
