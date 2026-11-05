/**
 * Look (mobile 1.14; Grove Phase 4b, design-notes/grove/phase4b/PHASE4B.md 4.2): "how does my
 * plant look?"
 *
 * The back row ("Your plant"), the page's title "Look", then a live preview of the plant on its soil
 * line that stays in view while the choices scroll (every change previews there in place), then one
 * column of rows: Style (Botanical, Storybook, or Storybook with a face), Colour, Ground, Planter,
 * Visitor, then the final form (at Elder only), then Keepsakes (show up to three). A tap changes the
 * look at once; there is nothing to save. The planters and keepsakes still to earn sit in one closed
 * "More to find" group at the end, each saying how.
 *
 * Unlocks are derived (engine/plantLooks.ts): the three styles, every species' two colourways,
 * the Meadow, its own ground, a terracotta pot and the wren are free; the rest open with growth,
 * badges and completed badge sets. There is no "n of m" anywhere, no purchase, and nothing here
 * says anything about readiness: it's a look. The ribbon (a keepsake for the score you needed) is
 * not listed under More to find until the exam date has passed.
 *
 * Mobile 1.50: at Elder a botanical plant shows its final form group: the line's own final or one
 * of five flavours. The learner chooses; the strongest area never decides. The choice is kept on
 * this phone for now (store/seen.ts plantFinal; DESIGN_SYSTEM §8.10).
 *
 * The preview: 160pt, 120pt from text scale 1.3; from 1.6, or on a phone shorter than 700pt, 72pt
 * and not sticky, so text never sits under it (UX P9). Never on question, mock, lesson or game screens.
 */
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { ChevronDown, ICON_STROKE } from '../components/icons';
import { Collapse, Turn } from '../components/motion';
import { LivePlant } from '../components/plant/LivePlant';
import { Plant } from '../components/plant/Plant';
import { KeepsakeIcon, LookOption, PlanterIcon, Swatch } from '../components/plant/LookUI';
import { SoilBed, soilYFor } from '../components/plant/PlantPage';
import { ICON_SIZE, PushedHeader, Row, Section, T, useFontScale } from '../components/ui';
import { type GrowthLevel } from '../engine/plant';
import { colourwaysFor, GROUNDS, skillLine, KEEPSAKE_ITEMS, lookItem, MAX_SHOWN_KEEPSAKES, plantersFor, STYLES, toggleKeepsake, VISITORS, type LookItem, type LookSlot, type PlantStyle } from '../engine/plantLooks';
import { FINAL_IDS, finalLook, finalName, type FinalId } from '../engine/plantForms';
import { dayKey } from '../engine/streak';
import { haptic } from '../lib/haptics';
import { lookCaption, lookHowToOpen } from '../lib/plantCopy';
import { useSeen } from '../store/seen';
import { usePlantView } from '../lib/plant';
import { useProgress } from '../store/progress';
import { examDateOf, useSettings } from '../store/settings';
import { LARGE_TEXT, plantLeaf, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** From this text size the preview is at its smallest and scrolls away, so the choices keep the screen. */
const HUGE_TEXT = 1.6;
/** How each style is said in the preview's label ("Kai, your oak, botanical style."). */
const STYLE_WORDS: Record<PlantStyle, string> = { botanical: 'botanical style', storybook: 'storybook style', 'storybook-face': 'storybook style with a face' };
/** The art inside a row's 48pt thumbnail. */
const THUMB_ART = 44;

/**
 * The preview's size (PHASE4B 4.2; UX review P9): 160pt, 120pt at large text, 72pt at very large
 * text or on a short phone (the choices need the room; then it is not sticky).
 */
export function previewSizeFor(fontScale: number, windowHeight: number): number {
  if (fontScale >= HUGE_TEXT || windowHeight < 700) return 72;
  return fontScale >= LARGE_TEXT ? 120 : 160;
}
/** The preview stays in view while the rows scroll, except at its smallest size. */
export const previewSticky = (size: number) => size > 72;

export default function PlantLook() {
  const { c, isDark } = useTheme();
  const view = usePlantView();
  const scale = useFontScale();
  const win = useWindowDimensions();
  const [moreOpen, setMoreOpen] = useState(false);
  const badgesHidden = useSettings((s) => s.badgesHidden);
  const examDate = useSettings((s) => examDateOf(s.examDates, view.certId));
  // "Today" is read once per visit (render stays pure).
  const [today] = useState(() => dayKey(Date.now()));
  const p = view.plant;
  const look = view.look;

  if (!view.shown) {
    return (
      <EmptyScreen
        header="Look"
        fallback="/you"
        art="seedling"
        title="Your plant is hidden"
        body="Its growth and look are kept. Turn on Show my plant in Settings."
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
        body="Plant yours first. Then choose its colours and keepsakes."
        primary={{ label: 'Plant yours', onPress: () => router.replace('/plant-pick') }}
      />
    );
  }

  const certId = view.certId;
  const set = useProgress.getState().setPlantLook;
  const theme = isDark ? 'dark' : 'light';
  const open = (x: LookItem) => look.unlocked.has(x.id);
  const how = (x: LookItem) => lookHowToOpen(x, { badgesHidden });
  const r = look.resolved;
  const choose = (slot: Exclude<LookSlot, 'keepsake'>, id: string) => {
    haptic.selection();
    set(certId, { [slot]: id });
  };
  // The preview shows the visitor whatever the day, so the learner sees their choice.
  const preview = { ...look.art, visitor: r.visitor !== 'no-visitor' ? r.visitor : undefined };
  const previewSize = previewSizeFor(scale, win.height);
  const sticky = previewSticky(previewSize);
  // The preview's label says what it draws (code review M10a): the plant, then its visitor, planter and keepsakes.
  const named = (id: string | undefined) => (id ? lookItem(id)?.name.toLowerCase() : undefined);
  const extras = [preview.visitor ? `a ${named(preview.visitor)}` : '', r.planter !== 'native' ? `in the ${named(r.planter)}` : '', ...r.keepsakes.map((k) => `the ${named(k)}`)].filter(Boolean);
  // Mobile 1.40: the style follows the name ("Kai, your oak, botanical style. Growth: …").
  // Mobile 1.50: before the form's name when there is one ("Kai, your oak, botanical style. Standard Oak form. Growth: …").
  const cut = view.formName ? view.label.indexOf(`. ${view.formName} form.`) : view.label.indexOf('. Growth:');
  const styled = cut > 0 ? `${view.label.slice(0, cut)}, ${STYLE_WORDS[r.style]}${view.label.slice(cut)}` : view.label;
  const previewLabel = `Preview: ${styled}${extras.length ? ` With ${extras.join(', ')}.` : ''}`;

  /** One group's rows: one column at every text size (PHASE4B 4.2), text wraps, no sideways rail. */
  const group = (label: string, multi: boolean, items: LookItem[], selected: (x: LookItem) => boolean, onPress: (x: LookItem) => void, opts: { art?: (x: LookItem) => ReactNode; line?: (x: LookItem) => string; full?: boolean } = {}) => (
    <View accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={label} style={{ marginTop: space.xs }}>
      {items.map((x, i) => {
        const locked = !open(x);
        return (
          <LookOption
            key={x.id}
            testID={`look-${x.id}`}
            name={x.name}
            line={locked ? how(x) : (opts.line?.(x) ?? lookCaption(x))}
            art={opts.art?.(x)}
            selected={selected(x)}
            locked={locked}
            multi={multi}
            full={opts.full}
            divider={i < items.length - 1}
            onPress={() => onPress(x)}
          />
        );
      })}
    </View>
  );

  const growth = Math.max(3, p.growth) as GrowthLevel;
  // This plant drawn small, in a look (a style, a ground, a visitor or a final form).
  const plantThumb = (lk: Parameters<typeof Plant>[0]['look'], face = false) => <Plant species={p.species} stage={growth} organs={view.scales} size={THUMB_ART} theme={theme} quietLook={!face} look={lk} />;
  const planterArt = (x: LookItem) => <PlanterIcon id={x.id} species={p.species} size={40} theme={theme} style={r.style === 'botanical' ? 'botanical' : 'storybook'} />;
  const keepsakeArt = (x: LookItem) => <KeepsakeIcon id={x.id} size={40} theme={theme} style={r.style === 'botanical' ? 'botanical' : 'storybook'} />;
  const plain = { ...look.art, visitor: undefined, keepsakes: [] };
  // Planter and Keepsakes list only what is open (UX review P1). The ribbon is never listed until
  // it is open, and stays out of More to find until the exam date has passed (PHASE4B 3.3).
  const examPassed = Boolean(examDate && examDate < today);
  const planters = plantersFor(p.species);
  const openPlanters = planters.filter(open);
  const openKeepsakes = KEEPSAKE_ITEMS.filter(open);
  const morePlanters = planters.filter((x) => !open(x));
  const moreKeepsakes = KEEPSAKE_ITEMS.filter((k) => !open(k) && (k.id !== 'ribbon' || examPassed));
  const shown = r.keepsakes;
  const fullUp = shown.length >= MAX_SHOWN_KEEPSAKES;

  const previewBed = (
    <View testID="look-preview-bed" style={{ paddingTop: space.sm, paddingBottom: space.md }}>
      <SoilBed size={previewSize} soilY={soilYFor(p.species, p.growth, preview, previewSize, theme)} bleed={space.gutter}>
        <LivePlant
          testID="look-preview"
          species={p.species}
          stage={p.growth}
          organs={view.scales}
          quietLook={!view.face}
          size={previewSize}
          fit={false}
          // A preview: the small detail level, so each tap rebuilds quickly on a low-end phone (code review M8b).
          lod="small"
          theme={theme}
          look={preview}
          accessibilityLabel={previewLabel}
        />
      </SoilBed>
    </View>
  );
  const title = (
    <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>
      Look
    </T>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader backLabel="Your plant" onBack={() => (router.canGoBack() ? router.back() : router.replace('/plant'))} />
        {/* The sticky preview: the title and the plant stay in view while the rows scroll. */}
        {sticky ? (
          <View style={{ borderBottomWidth: 1, borderBottomColor: c.line, marginHorizontal: -space.gutter, paddingHorizontal: space.gutter }}>
            {title}
            {previewBed}
          </View>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
        {sticky ? null : (
          <>
            {title}
            {previewBed}
          </>
        )}
        {/* With forms on, no readiness word near the form choice (UX review P3). */}
        <T v="meta" style={{ marginTop: space.md }}>{view.forms ? 'Looks never change your growth.' : 'Looks never change your growth or readiness.'}</T>

        <Section title="Style" />
        {group('Style', false, STYLES, (x) => x.id === r.style, (x) => choose('style', x.id), {
          // Each style shows THIS plant drawn that way (its growth and colours).
          art: (x) => plantThumb({ style: x.id as PlantStyle, palette: r.palette }, x.id === 'storybook-face'),
        })}

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
        {group('Ground', false, GROUNDS, (x) => x.id === r.ground, (x) => choose('ground', x.id), { art: (x) => plantThumb({ ...plain, ground: x.id }) })}

        <Section title="Planter" />
        {group('Planter', false, openPlanters, (x) => x.id === r.planter, (x) => choose('planter', x.id), { art: planterArt })}

        <Section title="Visitor" meta="Comes on days you clear your plan" />
        {group('Visitor', false, VISITORS, (x) => x.id === r.visitor, (x) => choose('visitor', x.id), {
          art: (x) => plantThumb({ ...plain, visitor: x.id === 'no-visitor' ? undefined : x.id }),
        })}

        {view.forms && p.growth >= 6 ? (
          <>
            <Section title="Its final form" meta="You choose" />
            <View accessibilityRole="radiogroup" accessibilityLabel="Its final form" style={{ marginTop: space.xs }}>
              {FINAL_IDS.map((id: FinalId, i) => (
                <LookOption
                  key={id}
                  testID={`look-final-${id}`}
                  name={finalName(p.species, id)}
                  // One line per choice: its look (the flavour's idea is already in it, UX review P6).
                  line={finalLook(p.species, id)}
                  art={<Plant species={p.species} stage={6} organs={view.scales} size={THUMB_ART} theme={theme} quietLook look={{ ...plain, final: id }} />}
                  selected={view.final === id}
                  locked={false}
                  multi={false}
                  divider={i < FINAL_IDS.length - 1}
                  onPress={() => {
                    haptic.selection();
                    useSeen.getState().setPlantFinal(certId, id);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* The Section meta is the only place the limit is said (PHASE4B 4.2). */}
        <Section title="Keepsakes" meta={fullUp ? 'Three on show' : `Show up to ${MAX_SHOWN_KEEPSAKES === 3 ? 'three' : MAX_SHOWN_KEEPSAKES}`} />
        {openKeepsakes.length && !fullUp ? (
          <View testID="look-keepsakes-help">
            <T v="meta">{badgesHidden ? 'Each one is kept by your plant.' : 'Each badge you earn leaves a keepsake here.'}</T>
          </View>
        ) : null}
        {openKeepsakes.length ? (
          group(
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
            { art: keepsakeArt, full: fullUp, line: (x) => (x.id === 'ribbon' ? 'You got the score you needed' : skillLine(x)) },
          )
        ) : (
          <View testID="look-keepsakes-help">
            <T v="meta">{badgesHidden ? 'Your plant keeps a small keepsake for each step you master.' : 'Each badge you earn leaves a keepsake here. Your first comes with the diagnostic.'}</T>
          </View>
        )}

        {morePlanters.length + moreKeepsakes.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
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
              {morePlanters.length ? <View key="planters">{group('Planters still to earn', false, morePlanters, () => false, () => {}, { art: planterArt })}</View> : null}
              {moreKeepsakes.length ? <View key="keepsakes">{group('Keepsakes still to earn', true, moreKeepsakes, () => false, () => {}, { art: keepsakeArt })}</View> : null}
            </Collapse>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
