/**
 * <Plant>: the learner's companion plant, drawn with react-native-svg from
 * the part tree in ./art.ts (a port of the Phase 0 generator).
 *
 * Static in Phase 4a: nothing moves. The tree keeps every part in a named
 * group (trunk, canopy › domain-1…5, face, blooms, fx…), and `wrapGroup`
 * lets a later motion layer swap a named group for an animated one without
 * touching the art.
 *
 * Accessibility: the whole plant is ONE image with a spoken label
 * (engine/plant.ts plantLabel). Its meaning is always in that label and in
 * the text beside it, never in the drawing alone.
 */
import { memo, useMemo, type ReactElement, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { GrowthLevel, PlantSpecies } from '../../engine/plant';
import { buildPlant, lodFor, type ArtLook, type Lod, type Mood, type PNode, type Paint } from './art';

export interface PlantProps {
  species: PlantSpecies;
  /** Growth 1 (Seed) … 6 (Elder). */
  stage: GrowthLevel;
  /** D1…D5 organ scales from engine/plant.ts organScales(); omitted = a balanced, healthy plant. */
  organs?: readonly number[];
  /** "Quiet look": no face. (The face is also dropped at icon size.) */
  quietLook?: boolean;
  /** Rendered size in points (square). ≤ 32 draws the icon level, ≤ 96 the small level, else full detail. */
  size: number;
  theme: 'light' | 'dark';
  /** The calm resting look (dusk backdrop and a small moon). Never sad, never smaller. */
  resting?: boolean;
  /** The face's expression (mobile 1.14; the face only, so Quiet look shows none). */
  mood?: Mood;
  /** Mobile 1.14: the resolved look (engine/plantLooks.ts resolveLook → lib/plant.ts artLook). */
  look?: ArtLook;
  /** Force a detail level (e.g. a contact sheet); normally chosen from `size`. */
  lod?: Lod;
  /** Frame tightly around the plant (default for 96pt and below) or use the shared 200 × 200 stage (hero, so growth reads). */
  fit?: boolean;
  /** The spoken label (engine/plant.ts plantLabel). Without one the plant is decorative and hidden from screen readers. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Motion hook (later): wrap a named group's element, e.g. put "body" in an animated G. */
  wrapGroup?: (name: string, element: ReactElement) => ReactElement;
  testID?: string;
}

function paintProps(n: Paint) {
  const p: Record<string, unknown> = {};
  if (n.fill !== undefined) p.fill = n.fill;
  if (n.opacity !== undefined) p.opacity = n.opacity;
  if (n.transform) p.transform = n.transform;
  if (n.stroke) {
    p.stroke = n.stroke;
    p.strokeWidth = n.sw;
    p.strokeLinecap = 'round';
    p.strokeLinejoin = 'round';
  }
  return p;
}

/** Maps one part-tree node to react-native-svg (recursive). */
export function renderNode(n: PNode, key: string, wrap?: PlantProps['wrapGroup']): ReactNode {
  switch (n.t) {
    case 'g': {
      const el = (
        <G key={key} {...paintProps(n)}>
          {n.children.map((c, i) => renderNode(c, `${key}.${i}`, wrap))}
        </G>
      );
      return n.id && wrap ? wrap(n.id, el) : el;
    }
    case 'path':
      return <Path key={key} d={n.d} {...paintProps(n)} />;
    case 'circle':
      return <Circle key={key} cx={n.cx} cy={n.cy} r={n.r} {...paintProps(n)} />;
    case 'ellipse':
      return <Ellipse key={key} cx={n.cx} cy={n.cy} rx={n.rx} ry={n.ry} {...paintProps(n)} />;
  }
}

/** The organs as the drawing reads them (rounded to 1/40), so tiny mastery moves never redraw. */
const organKeyOf = (organs: readonly number[] | undefined) => (organs ? organs.map((v) => Math.round(v * 40) / 40).join(',') : '');

function PlantInner({ species, stage, organs, quietLook, size, theme, resting, mood, look, lod, fit, accessibilityLabel, style, wrapGroup, testID }: PlantProps) {
  const level = lod ?? lodFor(size);
  // Rounded organs keep the memo steady while mastery moves by tiny amounts.
  const organKey = organKeyOf(organs);
  const built = useMemo(
    () => buildPlant({ species, stage, organs: organKey ? organKey.split(',').map(Number) : undefined, quietLook, lod: level, theme, resting, mood, look }),
    [species, stage, organKey, quietLook, level, theme, resting, mood, look],
  );
  // The element tree is kept too, so a parent's re-render never rebuilds ~150 SVG elements.
  const tree = useMemo(() => renderNode(built.root, 'p', wrapGroup), [built, wrapGroup]);
  const tight = fit ?? size <= 96;
  const labelled = !!accessibilityLabel;
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
      accessibilityIgnoresInvertColors
      testID={testID}
    >
      <Svg width={size} height={size} viewBox={tight ? built.frame : '0 0 200 200'}>
        {tree}
      </Svg>
    </View>
  );
}

/** A look as a stable string, so an equal look built fresh never redraws. */
export const lookKeyOf = (l: ArtLook | undefined) => (l ? JSON.stringify([l.palette, l.ground, l.planter, l.visitor, l.keepsakes]) : '');

/** Same props, same drawing: the organs compare by their rounded values, not the array (code review M6c). */
function sameProps(a: PlantProps, b: PlantProps): boolean {
  for (const k of Object.keys({ ...a, ...b }) as (keyof PlantProps)[]) {
    if (k === 'organs') {
      if (organKeyOf(a.organs) !== organKeyOf(b.organs)) return false;
    } else if (k === 'look') {
      if (lookKeyOf(a.look) !== lookKeyOf(b.look)) return false;
    } else if (a[k] !== b[k]) return false;
  }
  return true;
}

export const Plant = memo(PlantInner, sameProps);
