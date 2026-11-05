/**
 * Your plant (mobile 1.13; Grove Phase 4b, "B. Paper garden, merged": design-notes/grove/phase4b/
 * PHASE4B.md section 4.1): "what is my plant, how has it grown, and what grows it next?"
 *
 * Top to bottom, one column at every text size:
 *   the back row ("You"), then the plant drawn on the page, standing on a soil line (no card, no
 *     disc), sized by its growth; a small state tag at its foot when one applies
 *   the name block: "YOUR OAK" over the name (display); the form's name, its one line, the visitor
 *   one calm line when there is one: the plant grew, the back-fill (once), the forms note, a rest line
 *   How it has grown: the stem, one leaf per growth, each with the date it was reached and the fact
 *     that earned it, keepsakes between them; "Earlier growth" folds the oldest once it is long
 *   What grows it next: the screen's one forest panel, on the stem's next row
 *   the later growths, dashed
 *   Your domains: each domain's part of the plant, as text rows
 *   Look: its final form (at Elder), change its look, change plant, rename; Plant settings
 *
 * Mobile 1.50 forms: a form reached since the last visit plays The Turning here, once
 * (components/plant/FormReveal.tsx): never on a study screen. A plant already past Form I when
 * forms arrived gets one quiet line instead. Phase 4b: the Turning fills the matching stem leaf
 * when its name lands; a growth with no new form fills its leaf once with "Kai grew to Bough."
 *
 * No needs, no guilt: the plant asks for nothing. Resting is a calm look that never counts the
 * days away. Settings, Show my plant off: this screen says the plant is hidden and how to show it.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { FieldText } from '../components/fieldguide';
import { MintPill } from '../components/groveHub';
import { Collapse } from '../components/motion';
import { DisclosureRow } from '../components/pathChooser';
import { FormReveal, type FormRevealHandle } from '../components/plant/FormReveal';
import { LivePlant } from '../components/plant/LivePlant';
import { FormTile, NextPanel, plantArtSize, SoilBed, soilYFor, StateTag, StemLeaf, StemRowView, StemWords, WrenGlyph } from '../components/plant/PlantPage';
import { BigNum, Button, DomainDot, ListRow, PushedHeader, Section, T, useFontScale } from '../components/ui';
import { BADGES } from '../engine/milestones';
import {
  backfillLine,
  FORM_FACTS,
  GROWTH_LOOKS,
  GROWTH_NAMES,
  grewLabel,
  growthShort,
  nextGrowthSteps,
  ORGAN_STEP_WORDS,
  organLabel,
  plantCallName,
  restLine,
  SPECIES_INFO,
  shownName,
  type GrowthLevel,
} from '../engine/plant';
import { lookItem, skillLine } from '../engine/plantLooks';
import { delayedRecalls, FORM_START, formMoment, formName, formsIntroLine, newFormLine, seeNewFormLabel, type FormMoment, type FormNumber } from '../engine/plantForms';
import { dayKey } from '../engine/streak';
import { shortDate } from '../lib/format';
import { haptic } from '../lib/haptics';
import { baselinePlantForms, plantFactsFor, seeGrowth, seePlantBackfill, usePlantView } from '../lib/plant';
import { FULLY_GROWN, LOOK_LINE, OUTLINE_NOTE, phoneRestLine, REAL_PROGRESS_NOTE } from '../lib/plantCopy';
import { foldStem, stemRows, type StemKeepsake, type StemRow } from '../lib/plantStem';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { LARGE_TEXT, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The growth each form's drawing is shown at when it is the OLD form of a reveal (its fullest growth). */
const OLD_FORM_GROWTH: Record<FormNumber, GrowthLevel> = { 1: 2, 2: 3, 3: 5, 4: 6 };

/** The time a badge was first earned on any exam (its first tier), or undefined. */
function badgeEarnedAt(byCert: ReturnType<typeof useProgress.getState>['byCert'], badge: string): number | undefined {
  let at: number | undefined;
  for (const cp of Object.values(byCert)) {
    for (const [k, t] of Object.entries(cp?.milestones?.earned ?? {})) {
      if ((k === badge || k.startsWith(`${badge}:`)) && typeof t === 'number' && (at === undefined || t < at)) at = t;
    }
  }
  return at;
}

export default function YourPlant() {
  const { c, isDark } = useTheme();
  const view = usePlantView();
  // `planted=1`: just planted from the picker (You or Today): the seed settles and the sprout pops once.
  const params = useLocalSearchParams<{ planted?: string }>();
  const [plantIn] = useState(() => params?.planted === '1');
  const scale = useFontScale();
  const large = scale >= LARGE_TEXT;
  const win = useWindowDimensions();
  const { readiness, progress } = useActiveCert();
  const badgesHidden = useSettings((s) => s.badgesHidden);
  const byCert = useProgress((s) => s.byCert);
  const p = view.plant;
  const certId = view.certId;
  const theme = isDark ? 'dark' : 'light';
  // "Now" is read once per visit (render stays pure).
  const [now] = useState(() => Date.now());
  const next = useMemo(() => {
    const facts = plantFactsFor(certId, progress, now);
    // With forms on, the readiness gates are worded as "Your study estimate…" (no readiness words by a form).
    return p && facts ? nextGrowthSteps(p.growth, facts, { forms: view.forms }) : null;
  }, [certId, progress, now, p, view.forms]);

  // The back-fill line shows ONCE: kept for this visit, marked seen at once.
  const backfill = p?.backfill;
  const [kept, setKept] = useState<{ at: number; line: string } | null>(null);
  if (p && backfill && !backfill.seen && kept?.at !== backfill.at) setKept({ at: backfill.at, line: backfillLine(p, backfill.growth, view.forms ? formName(p.species, backfill.growth, view.final) : undefined) });
  useEffect(() => {
    if (backfill && !backfill.seen) seePlantBackfill(certId);
  }, [backfill, certId]);

  // A grow-up Today applied silently (the exam-ready panel had that visit's
  // one moment, code review M1): one calm line here, once, kept for this visit.
  const quiet = useSeen((s) => s.quietGrowth?.[certId]);
  const [grewQuietly, setGrewQuietly] = useState<number | null>(null);
  if (p && quiet && grewQuietly !== quiet) setGrewQuietly(quiet);
  useEffect(() => {
    if (quiet) useSeen.getState().seeQuietGrowth(certId);
  }, [quiet, certId]);

  // Mobile 1.50 forms: the first sight of this plant on this release counts what it is as seen
  // (no reveal for history). Then a form reached since the last visit is revealed ONCE, kept
  // for this visit, and written down as shown at once (leaving mid-way still counts).
  const formsRec = useSeen((s) => s.plantForms?.[certId]);
  useEffect(() => {
    // A grow-up still pending is not history: it gets its reveal (lib/plant.ts baselinePlantForms).
    if (p) baselinePlantForms(certId, p);
  }, [p, certId]);
  const [formVisit, setFormVisit] = useState<{ cert: string; moment: NonNullable<FormMoment> } | null>(null);
  const momentNow = p && view.forms ? formMoment(p.growth, formsRec) : null;
  if (momentNow && formVisit?.cert !== certId) setFormVisit({ cert: certId, moment: momentNow });
  const formMomentKind = formVisit?.moment.kind;
  useEffect(() => {
    if (!p || !formMomentKind) return;
    if (formMomentKind === 'reveal') {
      useSeen.getState().seeFormReveal(certId, p.growth);
      // The Turning IS the grow-up's moment (QA-TURN-1, QA-TURN-4): clear its `pending`, so a
      // backup taken now can't replay it on restore, and the widget draws the new form at once.
      seeGrowth(certId);
    } else useSeen.getState().seeFormNote(certId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit's moment
  }, [formMomentKind, certId]);
  const reveal = formVisit?.moment.kind === 'reveal' ? formVisit.moment : null;

  // Phase 4b (4.1 item 5): a growth with no new form, first seen HERE (Today hasn't shown it yet):
  // one quiet line and its leaf fills once. It uses up the same saved mark (`pending`) Today's grew
  // line uses, so whichever screen shows the growth first spends it. One celebration per moment.
  const pending = p?.pending;
  const [grewHere, setGrewHere] = useState<GrowthLevel | null>(null);
  if (p && pending && !reveal && momentNow?.kind !== 'reveal' && grewHere !== pending) setGrewHere(pending);
  useEffect(() => {
    if (!grewHere) return;
    seeGrowth(certId);
    // The leaf's one light haptic (silent under the Haptics setting).
    haptic.light();
  }, [grewHere, certId]);

  // The Turning's name has landed: its stem leaf fills then (never during the swaps).
  const [named, setNamed] = useState(false);
  // At Elder the Turning ends with a few leaves drifting once.
  // A scroll drag ends the reveal (it dissolves to its end; the screen is never blocked).
  const revealRef = useRef<FormRevealHandle>(null);
  // The old drawing's look (no Form IV choice yet), kept by value, so a re-render never
  // rebuilds the Turning's two drawings (QA-TURN-3).
  const art = view.look?.art;
  const fromLook = useMemo(() => (art ? { ...art, final: undefined } : undefined), [art]);
  const [earlierOpen, setEarlierOpen] = useState(false);

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
  if (!p) {
    return (
      <EmptyScreen
        header="Your plant"
        fallback="/you"
        art="seedling"
        title="Nothing planted yet"
        body="It grows only from real progress, and never wilts."
        primary={{ label: 'Plant yours', onPress: () => router.replace('/plant-pick') }}
      />
    );
  }

  const cert = view.cert;
  const callName = plantCallName(p);
  const sp = SPECIES_INFO[p.species].lower;
  // The exam eve and exam day have their own calm line (UX review P2); resting and coming back keep theirs.
  const rawRest = restLine(p, progress.milestones?.lastDay, dayKey(now), view.exam) ?? (view.resting ? `${callName} is resting. Pick up whenever you like.` : null);
  const rest = rawRest ? phoneRestLine(rawRest) : null;
  // The state tag (4.7): exam day, resting (or back after a while), or plan cleared. Exam eve has none.
  const tag = view.exam === 'day' ? 'Exam day' : view.exam === 'eve' ? null : rest ? 'Resting' : view.look?.visiting ? 'Plan cleared' : null;
  const examHidesNext = view.exam === 'eve' || view.exam === 'day';
  // The art's state (4.7): resting draws the small moon (never a disc, see the plant below); exam day never rests.
  const artResting = view.resting && view.exam !== 'day';
  const lookMood = view.look?.mood;
  const artMood = !artResting && lookMood === 'resting' ? 'idle' : lookMood;

  // The art: its growth's size on the page, on its soil line.
  const pageW = win.width - space.gutter * 2;
  const size = plantArtSize(p.growth, scale, pageW, win.height);
  // The Turning draws its own soil line (and its two drawings are built once): only the still plant reads it here.
  const soilY = reveal || momentNow?.kind === 'reveal' ? 0 : soilYFor(p.species, p.growth, view.look?.art, size, theme);

  // The stem's keepsakes: the ones on show, with the date their badge was earned (never a guess).
  const keepsakes: StemKeepsake[] = [];
  if (!badgesHidden) {
    for (const id of view.look?.resolved.keepsakes ?? []) {
      const item = lookItem(id);
      if (!item || item.unlock.kind !== 'badge') continue;
      const badge = item.unlock.badge;
      const at = badgeEarnedAt(byCert, badge);
      const badgeName = BADGES.find((b) => b.id === badge)?.name;
      if (at === undefined || !badgeName) continue;
      keepsakes.push({ id, name: item.name, badgeName, line: skillLine(item), at });
    }
  }
  const rows = stemRows({ plant: p, forms: view.forms, final: view.final, keepsakes, recalled: delayedRecalls(progress.milestones?.longIds) });
  const { earlier, open } = foldStem(rows, p.growth);
  const nowIdx = open.findIndex((r) => r.kind === 'growth' && r.state === 'now');
  const past = open.slice(0, nowIdx + 1);
  const nextRow = open.find((r) => r.kind === 'growth' && r.growth === p.growth + 1);
  const panel = Boolean(next && nextRow && !examHidesNext);
  const after = open.slice(nowIdx + 1).filter((r) => !(panel && r === nextRow));
  // Keepsakes after "now" sit before the next growth.
  const afterKeeps = after.filter((r) => r.kind === 'keepsake');
  const later = after.filter((r) => r.kind !== 'keepsake');

  // Which leaf fills on this visit: the Turning's (when its name lands) or a quiet growth's.
  const turningGrowth = reveal ? p.growth : null;
  const fillGrowth = grewHere ?? turningGrowth;
  const leafFor = (r: StemRow, key: string) => {
    if (r.kind === 'keepsake') return <StemLeaf state="keepsake" testID={`plant-grown-leaf-${key}`} />;
    const filling = r.growth === fillGrowth && r.state === 'now';
    return <StemLeaf state={r.state} fill={filling} wait={filling && r.growth === turningGrowth && !named} testID={`plant-grown-leaf-${key}`} />;
  };
  const formTile = (r: StemRow) =>
    r.kind === 'growth' && r.form && r.state !== 'later' ? <FormTile species={p.species} growth={r.growth} look={{ style: 'botanical', palette: view.look?.art.palette }} theme={theme} /> : undefined;
  const words = (r: StemRow) => (
    <>
      <StemWords row={r} trailing={formTile(r)} />
      {r.kind === 'growth' && r.growth === 6 && r.state === 'now' ? (
        <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
          {FULLY_GROWN}
        </T>
      ) : null}
    </>
  );

  // The stem as one list: the fold, the past leaves, the panel, then the later growths.
  const items: { key: string; node: (above: boolean, below: boolean, first: boolean, last: boolean) => ReactNode; solidBelow: boolean }[] = [];
  if (earlier.length) {
    items.push({
      key: 'earlier',
      solidBelow: true,
      node: (above, below, first, last) => (
        <StemRowView key="earlier" leaf={<StemLeaf state="keepsake" />} above={above} below={below} first={first} last={last} leafTop={8} testID="plant-grown-earlier">
          <View style={{ marginTop: -12 }}>
            <DisclosureRow title="Earlier growth" expanded={earlierOpen} onPress={() => setEarlierOpen((o) => !o)} last />
          </View>
          <Collapse open={earlierOpen} rows>
            {earlier.map((r, i) => (
              <View key={r.key} accessible accessibilityLabel={r.spoken} style={{ paddingTop: i ? space.md : space.sm }} testID={`plant-grown-${r.key}`}>
                {words(r)}
              </View>
            ))}
          </Collapse>
        </StemRowView>
      ),
    });
  }
  past.forEach((r) =>
    items.push({
      key: r.key,
      solidBelow: !(r.kind === 'growth' && r.state === 'now'),
      node: (above, below, first, last) => (
        <StemRowView key={r.key} leaf={leafFor(r, r.key)} above={above} below={below} first={first} last={last} spoken={r.spoken} testID={`plant-grown-${r.key}`}>
          {words(r)}
        </StemRowView>
      ),
    }),
  );
  afterKeeps.forEach((r) =>
    items.push({
      key: r.key,
      solidBelow: false,
      node: (above, below, first, last) => (
        <StemRowView key={r.key} leaf={leafFor(r, r.key)} above={above} below={below} first={first} last={last} spoken={r.spoken} testID={`plant-grown-${r.key}`}>
          {words(r)}
        </StemRowView>
      ),
    }),
  );
  if (panel && next && nextRow) {
    items.push({
      key: 'next',
      solidBelow: false,
      node: (above, below, first, last) => (
        <StemRowView key="next" leaf={<StemLeaf state="later" />} above={above} below={below} first={first} last={last} leafTop={18} testID="plant-grown-next">
          <View style={{ marginTop: -22 }}>
            <NextPanel growthName={GROWTH_NAMES[next.growth]} formLine={nextRow.kind === 'growth' && nextRow.form ? nextRow.meta : undefined} gates={next.steps} notes={[OUTLINE_NOTE, REAL_PROGRESS_NOTE]} />
          </View>
        </StemRowView>
      ),
    });
  }
  later.forEach((r) =>
    items.push({
      key: r.key,
      solidBelow: false,
      node: (above, below, first, last) => (
        <StemRowView key={r.key} leaf={leafFor(r, r.key)} above={above} below={below} first={first} last={last} spoken={r.spoken} testID={`plant-grown-${r.key}`}>
          {words(r)}
        </StemRowView>
      ),
    }),
  );

  // The quiet line above the stem: the plant grew (once), or a growth Today applied silently.
  const grewLine = grewHere ? grewLabel(p, grewHere) : grewQuietly ? grewLabel(p, grewQuietly as GrowthLevel) : null;
  // The one small line under the name block (4.7): the back-fill once, the forms note once, or the rest line.
  const stateLine = kept ? kept.line : formVisit?.moment.kind === 'note' ? formsIntroLine(callName, view.formName) : rest;
  const stateLineID = kept ? 'plant-backfill' : formVisit?.moment.kind === 'note' ? 'plant-forms-note' : rest ? 'plant-rest' : undefined;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }} onScrollBeginDrag={reveal ? () => revealRef.current?.skip() : undefined}>
        <PushedHeader backLabel="You" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />

        <View style={{ marginTop: space.sm }}>
          {reveal ? (
            // Mobile 1.50: The Turning (once per form, ever): the learning fact first, then the form.
            <FormReveal
              testID="plant-form-reveal"
              species={p.species}
              from={OLD_FORM_GROWTH[reveal.from]}
              to={p.growth}
              organs={view.scales}
              look={view.look?.art}
              fromLook={fromLook}
              theme={theme}
              size={size}
              soilBleed={space.gutter}
              accessibilityLabel={view.label}
              fact={FORM_FACTS[FORM_START[reveal.to] as 3 | 4 | 6]}
              name={view.formName}
              announce={newFormLine(callName, view.formName)}
              playLabel={seeNewFormLabel(callName)}
              onName={() => setNamed(true)}
              drift={p.growth === 6}
              controlRef={revealRef}
            />
          ) : (
            <SoilBed testID="plant-bed" size={size} soilY={soilY} bleed={space.gutter} foot={tag ? <StateTag label={tag} /> : undefined}>
              {/* Mobile 1.14: dressed in its look; one slow breath the first time it opens this session, then still; one reaction per occasion. */}
              <LivePlant
                testID="plant-hero"
                species={p.species}
                stage={p.growth}
                organs={view.scales}
                quietLook={!view.face}
                // Phase 4b review (4.1 items 2 and 3, 4.7): resting keeps its small moon and settle, but on
                // paper there is no disc behind the art (`disc={false}` leaves out the engine's dusk disc).
                // Exam day is never drawn as resting: its tag says the state.
                resting={artResting}
                disc={false}
                size={size}
                fit={false}
                theme={theme}
                accessibilityLabel={view.label}
                look={view.look?.art}
                mood={artMood}
                breathe="plant"
                // Just planted: the one breath waits until the seed has settled and the sprout popped.
                breatheDelay={plantIn ? motion.dur.screen + motion.plant.plantIn : 0}
                plantIn={plantIn}
                reaction={!plantIn && view.look && view.reactionId ? { id: view.reactionId, mood: view.look.mood } : null}
              />
            </SoilBed>
          )}
          {reveal && tag ? (
            <View style={{ alignSelf: 'flex-end', marginTop: space.sm }}>
              <StateTag label={tag} />
            </View>
          ) : null}
        </View>

        {/* The name block (4.1 item 4): the species over the name, or just "Your oak" with no name. */}
        <View style={{ marginTop: space.lg }} testID="plant-name-block">
          {p.name ? (
            <FieldText v="head" accessibilityRole="text">
              {`Your ${sp}`}
            </FieldText>
          ) : null}
          <T v="display" accessibilityRole="header" accessibilityLabel={p.name ? `${shownName(p.name)}, your ${sp}` : undefined}>
            {callName}
          </T>
          {/* The form is a NAME under the plant's name, never a second number beside the growth. The Turning says it while it plays. */}
          {view.forms ? (
            reveal ? null : (
              <T v="quote" color={c.ink2} style={{ marginTop: space.xs }}>{`The ${view.formName}`}</T>
            )
          ) : (
            <T v="meta" style={{ marginTop: space.xs }}>
              {growthShort(p.growth)}
            </T>
          )}
          <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
            {view.forms ? view.formLook : GROWTH_LOOKS[p.growth]}
          </T>
          {view.look?.visiting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
              <WrenGlyph />
              <T v="meta" style={{ flexShrink: 1 }}>{`A ${view.look.resolved.visitor} came by: you cleared today’s plan.`}</T>
            </View>
          ) : null}
          {stateLine ? (
            <View testID={stateLineID} style={{ marginTop: space.sm }}>
              <T v="small">{stateLine}</T>
            </View>
          ) : null}
        </View>

        {/* The quiet grew line (4.1 item 5), once, above the stem. */}
        {grewLine ? (
          <View testID={grewHere ? 'plant-grew' : 'plant-grew-quietly'} style={{ marginTop: space.xl }}>
            <T v="aside">{grewLine}</T>
          </View>
        ) : null}

        <Section title="How it has grown" meta={`Planted ${shortDate(p.plantedAt)}`} />
        <View accessibilityRole="list" testID="plant-grown" style={{ marginTop: space.sm }}>
          {items.map((it, i) => it.node(i > 0 && items[i - 1].solidBelow, it.solidBelow, i === 0, i === items.length - 1))}
        </View>

        <Section title="Your domains" meta="One part of the plant each" />
        {cert.domains.map((d, i) => {
          const dm = readiness.domains[i];
          const o = view.organs[i];
          const mastery = dm?.mastery ?? 0;
          const isNext = i === view.next;
          const pc = Math.round(Math.max(0, Math.min(1, mastery)) * 100);
          return (
            <View
              key={d.id}
              accessible
              accessibilityLabel={organLabel(i, d.name, mastery, o.step, isNext)}
              testID={`plant-domain-${i}`}
              style={{ minHeight: 56, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: i === cert.domains.length - 1 ? 0 : 1, borderBottomColor: c.line }}
            >
              <DomainDot domain={d} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T v="label">{d.short}</T>
                {isNext ? (
                  <View style={{ alignSelf: 'flex-start' }}>
                    <MintPill label="Next to grow" />
                  </View>
                ) : null}
              </View>
              {o.step === 0 ? (
                <T v="meta">Not started yet</T>
              ) : (
                <View style={{ flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-end' : 'baseline', gap: large ? 0 : space.xs }}>
                  <BigNum value={String(pc)} pct size={20} />
                  <T v="meta">{`· ${ORGAN_STEP_WORDS[o.step]}`}</T>
                </View>
              )}
            </View>
          );
        })}

        <Section title="Look" />
        <T v="meta">{LOOK_LINE}</T>
        <View style={{ marginTop: space.sm }}>
          {view.forms && p.growth >= 6 ? (
            // Mobile 1.50: at Elder the learner chooses its final form (the strongest area never decides).
            <ListRow title="Its final form" subtitle={`Now: the ${view.formName}. You choose.`} onPress={() => router.push('/plant-look')} />
          ) : null}
          <ListRow title="Change its look" subtitle="Its style, colours and keepsakes" onPress={() => router.push('/plant-look')} />
          <ListRow title="Change plant" subtitle="Same growth, new look." onPress={() => router.push({ pathname: '/plant-pick', params: { mode: 'species' } })} />
          <ListRow title="Rename" subtitle={p.name ? `Now: ${shownName(p.name)}` : 'No name yet'} onPress={() => router.push({ pathname: '/plant-pick', params: { mode: 'name' } })} last />
        </View>
        <Button kind="ghost" label="Plant settings" accessibilityHint="Show my plant, in Settings" onPress={() => router.push({ pathname: '/settings', params: { section: 'plant' } })} style={{ alignSelf: 'flex-start', marginTop: space.md, marginLeft: -space.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}
