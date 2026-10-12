/**
 * Your plant (mobile 1.13, Phase 4a) — "what is my plant, and what grows it?"
 *
 * Top to bottom:
 *   the plant at 200pt (the shared stage, so growth reads from one size to the next)
 *   its name, species and growth ("Bough · growth 4 of 6"; never "stage")
 *   one calm line when there is one: the back-fill (once), or resting
 *   What grows it next: the next growth's rule, step by step, with progress
 *   Your domains: each domain's part of the plant, as text rows
 *   Look: change plant (the species; the growth stays) and rename
 *
 * No needs, no guilt: the plant asks for nothing. Resting is a calm look
 * that never counts the days away. Settings → Show my plant off: this
 * screen says the plant is hidden and how to show it.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { LivePlant } from '../components/plant/LivePlant';
import { PlantNote } from '../components/plant/PlantUI';
import { Button, ListRow, ProgressBar, PushedHeader, Section, T, Tag, useFontScale } from '../components/ui';
import {
  backfillLine,
  grewLabel,
  GROWTH_LOOKS,
  GROWTH_NAMES,
  growthShort,
  nextGrowthSteps,
  ORGAN_STEP_WORDS,
  organLabel,
  plantCallName,
  restLine,
  SPECIES_INFO,
  shownName,
  SPREAD_EXPLAINER,
  type GrowthLevel,
} from '../engine/plant';
import { dayKey } from '../engine/streak';
import { plantFactsFor, seePlantBackfill, usePlantView } from '../lib/plant';
import { useActiveCert } from '../lib/useActiveCert';
import { useSeen } from '../store/seen';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function YourPlant() {
  const { c, isDark } = useTheme();
  const view = usePlantView();
  const large = useFontScale() >= LARGE_TEXT;
  const { readiness, progress } = useActiveCert();
  const p = view.plant;
  const certId = view.certId;
  // "Now" is read once per visit (render stays pure).
  const [now] = useState(() => Date.now());
  const next = useMemo(() => {
    const facts = plantFactsFor(certId, progress, now);
    return p && facts ? nextGrowthSteps(p.growth, facts) : null;
  }, [certId, progress, now, p]);

  // The back-fill line shows ONCE: kept for this visit, marked seen at once.
  const backfill = p?.backfill;
  const [kept, setKept] = useState<{ at: number; line: string } | null>(null);
  if (p && backfill && !backfill.seen && kept?.at !== backfill.at) setKept({ at: backfill.at, line: backfillLine(p, backfill.growth) });
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

  if (!view.shown) {
    return (
      <EmptyScreen
        header="Your plant"
        fallback="/you"
        art="seedling"
        title="Your plant is hidden"
        body="Its growth is kept. Turn on Show my plant in Settings to see it again."
        primary={{ label: 'Open Settings', onPress: () => router.push('/settings') }}
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
        body="Pick a plant and give it a name. It grows only from real progress across the exam outline, and it never wilts."
        primary={{ label: 'Plant yours', onPress: () => router.replace('/plant-pick') }}
      />
    );
  }

  // The exam eve and exam day have their own calm line (UX review P2).
  const rest = restLine(p, progress.milestones?.lastDay, dayKey(now), view.exam) ?? (view.resting ? `${plantCallName(p)} is resting. Pick up whenever you're ready.` : null);
  const cert = view.cert;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
        <PushedHeader title="Your plant" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />

        <View style={{ alignItems: 'center', marginTop: space.sm }}>
          {/* Mobile 1.14: dressed in its look; one slow breath the first time it opens this session, then still; one reaction per occasion. */}
          <LivePlant
            testID="plant-hero"
            species={p.species}
            stage={p.growth}
            organs={view.scales}
            quietLook={!view.face}
            resting={view.resting}
            size={200}
            fit={false}
            theme={isDark ? 'dark' : 'light'}
            accessibilityLabel={view.label}
            look={view.look?.art}
            mood={view.look?.mood}
            breathe="plant"
            reaction={view.look ? { id: `${certId}:${view.look.mood}:${dayKey(now)}`, mood: view.look.mood } : null}
          />
        </View>
        <T v="display" center accessibilityRole="header" style={{ marginTop: space.md }}>{plantCallName(p)}</T>
        <T v="meta" center style={{ marginTop: space.xs }}>{`${p.name ? `Your ${SPECIES_INFO[p.species].lower} · ` : ''}${growthShort(p.growth)}`}</T>
        <T v="quote" center color={c.ink2} style={{ marginTop: space.xs }}>{GROWTH_LOOKS[p.growth]}</T>
        {view.look?.visiting ? (
          <T v="meta" center style={{ marginTop: space.xs }}>{`A ${view.look.resolved.visitor} came by: you cleared today’s plan.`}</T>
        ) : null}

        {(kept || rest || grewQuietly) && (
          <View style={{ marginTop: space.xl, gap: space.lg }}>
            {grewQuietly ? <PlantNote caption="Your plant grew" line={grewLabel(p, grewQuietly as GrowthLevel)} testID="plant-grew-quietly" /> : null}
            {kept && <PlantNote caption="From your study so far" line={kept.line} testID="plant-backfill" />}
            {rest && <PlantNote caption={view.exam === 'day' ? 'Exam day' : 'Resting'} line={rest} testID="plant-rest" />}
          </View>
        )}

        <Section title="What grows it next" meta={next ? GROWTH_NAMES[next.growth] : undefined} />
        {next ? (
          <View style={{ gap: space.lg, marginTop: space.sm }}>
            {next.steps.map((st) => (
              <View key={st.label} accessible accessibilityLabel={`${st.label}. ${st.progress >= 1 ? 'Done' : st.progress <= 0 ? 'Not yet' : `${Math.round(st.progress * 100)} percent there`}.`}>
                {/* Side by side; stacked at large text, so the rule never squeezes into a narrow column. */}
                <View style={large ? { gap: 2 } : { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, alignItems: 'flex-start' }}>
                  <T v="body" style={large ? undefined : { flex: 1 }}>{st.label}</T>
                  <T v="meta" num color={st.progress >= 1 ? c.accentText : c.ink2}>{st.progress >= 1 ? 'Done' : st.progress <= 0 ? 'Not yet' : `${Math.round(st.progress * 100)}%`}</T>
                </View>
                <View style={{ marginTop: space.xs }}>
                  <ProgressBar value={st.progress} height={6} />
                </View>
              </View>
            ))}
            <T v="meta">{`“Know the outline” counts: ${SPREAD_EXPLAINER.charAt(0).toLowerCase()}${SPREAD_EXPLAINER.slice(1)}`}</T>
            <T v="meta">Only real progress grows it: never taps, minutes, streaks or games. It never shrinks.</T>
          </View>
        ) : (
          <T v="body" style={{ marginTop: space.sm }}>Fully grown, and in season. It keeps all of its growth.</T>
        )}

        <Section title="Your domains" meta="One part of the plant each" />
        {cert.domains.map((d, i) => {
          const dm = readiness.domains[i];
          const o = view.organs[i];
          const mastery = dm?.mastery ?? 0;
          const isNext = i === view.next;
          const pc = Math.round(Math.max(0, Math.min(1, mastery)) * 100);
          return (
            <ListRow
              key={d.id}
              title={d.short}
              // At large text the tag would squeeze the domain name: "Next to grow" joins the subtitle instead (UX review P7).
              subtitle={`${o.step === 0 ? 'Not started yet' : `${pc}% · ${ORGAN_STEP_WORDS[o.step]}`}${isNext && large ? ' · Next to grow' : ''}`}
              trailing={isNext && !large ? <Tag label="Next to grow" /> : undefined}
              accessibilityLabel={organLabel(i, d.name, mastery, o.step, isNext)}
              last={i === cert.domains.length - 1}
            />
          );
        })}
        {p.growth < 4 && <T v="meta" style={{ marginTop: space.sm }}>Each domain grows its own part of the plant from Bough.</T>}

        <Section title="Look" />
        <ListRow title="Change its look" subtitle="Colour, ground, planter, visitor and keepsakes" onPress={() => router.push('/plant-look')} />
        <ListRow title="Change plant" subtitle="Same growth, new look." onPress={() => router.push({ pathname: '/plant-pick', params: { mode: 'species' } })} />
        <ListRow title="Rename" subtitle={p.name ? `Now: ${shownName(p.name)}` : 'No name yet'} onPress={() => router.push({ pathname: '/plant-pick', params: { mode: 'name' } })} last />
        <Button kind="ghost" label="Plant settings" accessibilityHint="Show my plant and Quiet look, in Settings" onPress={() => router.push('/settings')} style={{ alignSelf: 'flex-start', marginTop: space.md, marginLeft: -space.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}
