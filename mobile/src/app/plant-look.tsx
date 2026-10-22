/**
 * Look (mobile 1.14, Phase 4b "Dress and Alive") — "how does my plant look?"
 *
 * A live preview at the top (it stays in view while the choices scroll),
 * then six sections: Style (mobile 1.40: Botanical, Storybook, or Storybook
 * with a face; it replaced Settings' Quiet look), Colour, Ground, Planter,
 * Visitor and Keepsakes (show up to three). A tap changes the look at once; nothing to save. Planter and
 * Keepsakes list what is open; the planters and keepsakes still to earn sit
 * in one closed "More to find" group at the end, each saying how (UX P1).
 *
 * Unlocks are derived (engine/plantLooks.ts): the three styles, every species' two colourways,
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
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { ChevronDown, ICON_STROKE } from '../components/icons';
import { Collapse, Turn } from '../components/motion';
import { LivePlant } from '../components/plant/LivePlant';
import { Plant } from '../components/plant/Plant';
import { KeepsakeIcon, LookOption, PlanterIcon, Swatch } from '../components/plant/LookUI';
import { ICON_SIZE, PushedHeader, Row, Section, T, useFontScale } from '../components/ui';
import { growthShort, plantCallName } from '../engine/plant';
import { colourwaysFor, GROUNDS, howToOpen, skillLine, KEEPSAKE_ITEMS, lookItem, MAX_SHOWN_KEEPSAKES, plantersFor, STYLES, toggleKeepsake, VISITORS, type LookItem, type LookSlot, type PlantStyle } from '../engine/plantLooks';
import { haptic } from '../lib/haptics';
import { usePlantView } from '../lib/plant';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { LARGE_TEXT, plantLeaf, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Two tiles across when each gets at least this much width (else one column of rows). */
const MIN_TILE = 150;
/** From this text size the preview is at its smallest, so the choices keep the screen. */
const HUGE_TEXT = 1.6;
/** How each style is said in the preview's label ("Kai, your oak, botanical style."). */
const STYLE_WORDS: Record<PlantStyle, string> = { botanical: 'botanical style', storybook: 'storybook style', 'storybook-face': 'storybook style with a face' };

/**
 * The preview's size (UX review P9): 140pt, 96pt at large text, 72pt at
 * very large text or on a short phone (the choices need the room).
 */
export function previewSizeFor(fontScale: number, windowHeight: number): number {
  if (fontScale >= HUGE_TEXT || windowHeight < 700) return 72;
  return fontScale >= LARGE_TEXT ? 96 : 140;
}

export default function PlantLook() {
  const { c, isDark } = useTheme();
  const view = usePlantView();
  const scale = useFontScale();
  const win = useWindowDimensions();
  // The first frame already knows the width (UX review P10): no jump when the layout reports it.
  const [width, setWidth] = useState(() => win.width - space.gutter * 2);
  const [moreOpen, setMoreOpen] = useState(false);
  const badgesHidden = useSettings((s) => s.badgesHidden);
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
        primary={{ label: 'Open Settings', onPress: () => router.push({ pathname: '/settings', params: { section: 'plant' } }) }}
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
  const theme = isDark ? 'dark' : 'light';
  const rows = scale >= LARGE_TEXT || width < MIN_TILE * 2 + space.sm;
  const tile = rows ? undefined : Math.floor((width - space.sm) / 2);
  const open = (x: LookItem) => look.unlocked.has(x.id);
  const how = (x: LookItem) => howToOpen(x, { badgesHidden });
  const r = look.resolved;
  const choose = (slot: Exclude<LookSlot, 'keepsake'>, id: string) => {
    haptic.selection();
    set(certId, { [slot]: id });
  };
  // The preview shows the visitor whatever the day, so the learner sees their choice.
  const preview = { ...look.art, visitor: r.visitor !== 'no-visitor' ? r.visitor : undefined };
  const previewSize = previewSizeFor(scale, win.height);
  // The preview's label says what it draws (code review M10a): the plant, then its visitor, planter and keepsakes.
  const named = (id: string | undefined) => (id ? lookItem(id)?.name.toLowerCase() : undefined);
  const extras = [preview.visitor ? `a ${named(preview.visitor)}` : '', r.planter !== 'native' ? `in the ${named(r.planter)}` : '', ...r.keepsakes.map((k) => `the ${named(k)}`)].filter(Boolean);
  // Mobile 1.40: the style follows the name ("Kai, your oak, botanical style. Growth: …").
  const cut = view.label.indexOf('. ');
  const styled = cut > 0 ? `${view.label.slice(0, cut)}, ${STYLE_WORDS[r.style]}${view.label.slice(cut)}` : view.label;
  const previewLabel = `Preview: ${styled}${extras.length ? ` With ${extras.join(', ')}.` : ''}`;

  /**
   * One section's choices. Short ones (colour, ground, visitor) sit two
   * across when two fit; planters and keepsakes, with longer lines, are
   * always one column of rows.
   */
  const group = (label: string, multi: boolean, items: LookItem[], selected: (x: LookItem) => boolean, onPress: (x: LookItem) => void, opts: { art?: (x: LookItem) => React.ReactNode; full?: boolean; asRows?: boolean; line?: (x: LookItem) => string } = {}) => {
    const asRows = rows || !!opts.asRows;
    return (
      <View accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={label} style={{ flexDirection: asRows ? 'column' : 'row', flexWrap: asRows ? 'nowrap' : 'wrap', alignItems: 'stretch', gap: space.sm, marginTop: space.sm }}>
        {items.map((x) => {
          const locked = !open(x);
          return (
            <LookOption
              key={x.id}
              testID={`look-${x.id}`}
              name={x.name}
              line={locked ? how(x) : (opts.line?.(x) ?? x.caption)}
              art={opts.art?.(x)}
              selected={selected(x)}
              locked={locked}
              multi={multi}
              full={opts.full}
              row={asRows}
              width={asRows ? undefined : tile}
              onPress={() => onPress(x)}
            />
          );
        })}
      </View>
    );
  };

  const planters = plantersFor(p.species);
  const planterArt = (x: LookItem) => <PlanterIcon id={x.id} species={p.species} size={40} theme={theme} style={r.style === 'botanical' ? 'botanical' : 'storybook'} />;
  // Each style card shows THIS plant drawn that way (its growth and colours; no visitor or keepsakes at 56pt).
  const styleArt = (x: LookItem) => (
    <Plant species={p.species} stage={p.growth} organs={view.scales} size={56} theme={theme} quietLook={x.id !== 'storybook-face'} look={{ style: x.id as PlantStyle, palette: r.palette }} />
  );
  const keepsakeArt = (x: LookItem) => <KeepsakeIcon id={x.id} size={40} theme={theme} />;
  // Planter and Keepsakes list only what is open (UX review P1). The ribbon is
  // never listed until it is earned (it opens when you tell us you passed).
  const openPlanters = planters.filter(open);
  const openKeepsakes = KEEPSAKE_ITEMS.filter(open);
  const morePlanters = planters.filter((x) => !open(x));
  const moreKeepsakes = KEEPSAKE_ITEMS.filter((k) => !open(k) && k.id !== 'ribbon');
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
          // A preview: the small detail level, so each tap rebuilds quickly on a low-end phone (code review M8b).
          lod="small"
          theme={theme}
          look={preview}
          accessibilityLabel={previewLabel}
        />
        <T v="meta" center style={{ marginTop: space.xs }}>{`${plantCallName(p)} · ${growthShort(p.growth)}`}</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }} onLayout={(e) => setWidth(e.nativeEvent.layout.width - space.gutter * 2)}>
        <T v="meta" style={{ marginTop: space.md }}>A look is just for you: it never changes your growth or your readiness.</T>

        <Section title="Style" />
        {group('Style', false, STYLES, (x) => x.id === r.style, (x) => choose('style', x.id), { asRows: true, art: styleArt })}

        <Section title="Colour" />
        {group(
          'Colour',
          false,
          colourwaysFor(p.species),
          (x) => x.id === r.colourway,
          (x) => choose('colourway', x.id),
          {
            art: (x) => {
              const t = plantLeaf[x.palette as keyof typeof plantLeaf];
              return <Swatch tones={[t.deep, t.mid, t.light]} />;
            },
            // An open colourway needs no words beyond its name: the swatch shows it.
            line: () => '',
          },
        )}

        <Section title="Ground" />
        {group('Ground', false, GROUNDS, (x) => x.id === r.ground, (x) => choose('ground', x.id))}

        <Section title="Planter" />
        {group('Planter', false, openPlanters, (x) => x.id === r.planter, (x) => choose('planter', x.id), { asRows: true, art: planterArt })}

        <Section title="Visitor" meta="Comes on days you clear your plan" />
        {group('Visitor', false, VISITORS, (x) => x.id === r.visitor, (x) => choose('visitor', x.id))}

        <Section title="Keepsakes" meta={fullUp ? 'Three on show' : `Show up to ${MAX_SHOWN_KEEPSAKES === 3 ? 'three' : MAX_SHOWN_KEEPSAKES}`} />
        {openKeepsakes.length ? (
          <>
            {/* Visible, not only spoken: why a tap does nothing once three are on show (UX review H3). */}
            <View testID="look-keepsakes-help">
              <T v="meta">{fullUp ? 'Tap one that’s on show to put it away, then pick another.' : badgesHidden ? 'Each one is kept by your plant.' : 'Each badge you earn leaves a keepsake here.'}</T>
            </View>
            {group(
              'Keepsakes',
              true,
              openKeepsakes,
              (x) => shown.includes(x.id),
              (x) => {
                haptic.selection();
                // Toggle on what is STORED, so a keepsake whose badge a restore took
                // away stays chosen (and comes back with the badge). Only when the
                // learner needs the room is such a hidden one let go. Never chosen
                // yet: start from what shows now (the first three earned).
                const stored = p.look?.keepsakes ?? shown;
                const room = stored.includes(x.id) || stored.length < MAX_SHOWN_KEEPSAKES ? stored : stored.filter((k) => look.unlocked.has(k));
                set(certId, { keepsakes: toggleKeepsake(room, x.id) });
              },
              { art: keepsakeArt, full: fullUp, asRows: true, line: skillLine },
            )}
          </>
        ) : (
          <View testID="look-keepsakes-help">
            <T v="meta">{badgesHidden ? 'Your plant keeps a small keepsake for each step you master.' : 'Each badge you earn leaves a keepsake here. Your first comes with the diagnostic.'}</T>
          </View>
        )}

        {morePlanters.length + moreKeepsakes.length > 0 && (
          <View style={{ marginTop: space.section }}>
            {/* Closed by default: what is still to earn never crowds what is open. No count. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: moreOpen }}
              accessibilityLabel="More to find"
              accessibilityHint={moreOpen ? 'Hides the planters and keepsakes still to earn' : 'Shows the planters and keepsakes still to earn, and how'}
              onPress={() => setMoreOpen(!moreOpen)}
              testID="look-more"
              style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', backgroundColor: pressed ? c.soft : 'transparent' })}
            >
              <Row gap={space.sm}>
                <T v="headline" style={{ flex: 1 }}>More to find</T>
                <Turn deg={moreOpen ? 0 : -90}>
                  <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                </Turn>
              </Row>
            </Pressable>
            <Collapse open={moreOpen} rows>
              <T v="meta" key="line">{badgesHidden ? 'Your study adds more. Each one says how.' : 'Badges and finished badge sets add more. Each one says how.'}</T>
              {morePlanters.length ? <View key="planters">{group('Planters still to earn', false, morePlanters, () => false, () => {}, { asRows: true, art: planterArt })}</View> : null}
              {moreKeepsakes.length ? <View key="keepsakes">{group('Keepsakes still to earn', true, moreKeepsakes, () => false, () => {}, { art: keepsakeArt, asRows: true })}</View> : null}
            </Collapse>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
