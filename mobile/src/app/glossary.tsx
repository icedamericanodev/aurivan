/**
 * Glossary (Learn → Glossary): the course's key terms, read-only.
 *
 * Grove Phase 4 (design-notes/grove/PHASE4.md 7.3 phone and section 8). Sky answered O2 YES on
 * 5 Nov 2026: "Build the phone Glossary now: read-only, search, area chips, A to Z rows, each meaning
 * and Read the note. No flashcards or mastered mark this round." Top to bottom:
 *   1. "Glossary" (display, the page's heading, where screen-reader focus starts) with the plant
 *      figure at its right: the oak at stage 2 in the quiet look, the same for every learner, never
 *      the learner's own plant. Decoration only (hidden from screen readers), and not drawn when
 *      Show my plant is off, on a phone narrower than 360pt or from text scale 1.3, so it never
 *      pushes text.
 *   2. One short line, then the search ("Search terms or acronyms", as on the website).
 *   3. The area chips: "All" and each domain's short name (one selected look, PHASE4.md section 5).
 *   4. "{n} terms match" with "Clear filters" once a search or a chip narrows the list.
 *   5. One card per first letter, A to Z. Each term: its name, a meta line with its short form and
 *      area ("RTO · Info Protection"), its meaning in full, and "Read the note" (48pt), which opens
 *      the study note that teaches it (or its domain's notes).
 *
 * Content: the terms pack (content/terms.ts, the study notes' domain glossaries). No new saved store:
 * the mastered mark ships later with backup, sync and the website import (PHASE4.md O2).
 * ?q=RTO (Final review week's "Look up" tasks) opens with that search filled in.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, useWindowDimensions, View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { CardDivider, CardHead, HubCard, PageTitle } from '../components/groveHub';
import { Plant } from '../components/plant/Plant';
import { Chip, ChipRow, EmptyState, Enter, PushedHeader, Screen, SearchField, T, useFontScale } from '../components/ui';
import { findNote, noteDomain } from '../content/notes';
import { getTerms, type KeyTerm } from '../content/terms';
import { glossaryGroups, matchTerms } from '../engine/glossary';
import { openTab } from '../lib/actions';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

/** The plant figure is not drawn on a phone narrower than this (PHASE4.md section 8). */
const PLANT_MIN_WIDTH = 360;
/** The figure's size in points (section 8, phone). */
const PLANT_SIZE = 56;

/** Open the study note that teaches a term: its subtopic page, else its domain's notes, else Study notes. */
function openTermNote(certId: string, term: KeyTerm) {
  if (findNote(certId, term.note)) router.push({ pathname: '/notes/subtopic/[id]', params: { id: term.note } });
  else if (noteDomain(certId, term.note)) router.push({ pathname: '/notes/[domain]', params: { domain: term.note } });
  else router.push('/notes');
}

export default function Glossary() {
  const { c, isDark } = useTheme();
  const { cert } = useActiveCert();
  const { width } = useWindowDimensions();
  const large = useFontScale() >= LARGE_TEXT;
  const plantOn = useProgress((p) => p.plantSettings?.showPlant !== false);
  const showFigure = plantOn && !large && width >= PLANT_MIN_WIDTH;
  // ?q= from Final review week fills the search once.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const [area, setArea] = useState<string | undefined>(undefined);
  const deferred = useDeferredValue(query);
  const pack = getTerms(cert.id);
  // Only the domains that have terms, in the course's own order.
  const areas = cert.domains.filter((d) => (pack?.domains[d.id] ?? []).length > 0);
  const shortOf = (id: string) => cert.domains.find((d) => d.id === id)?.short ?? `Domain ${id}`;
  const shown = useMemo(() => matchTerms(pack, deferred, area), [pack, deferred, area]);
  const groups = useMemo(() => glossaryGroups(shown), [shown]);
  const filtered = deferred.trim().length > 0 || area !== undefined;
  const countLine = shown.length === 0 ? 'No terms match' : `${shown.length} ${shown.length === 1 ? 'term matches' : 'terms match'}`;

  // Screen readers hear how many terms match once typing (or a chip) settles, never on every keystroke.
  useEffect(() => {
    if (!filtered) return;
    const t = setTimeout(() => AccessibilityInfo.announceForAccessibility(countLine), 700);
    return () => clearTimeout(t);
  }, [filtered, countLine]);

  if (!pack || areas.length === 0) {
    return (
      <EmptyScreen
        header="Glossary"
        title="The glossary is on the way"
        body="Key terms for this exam aren't in the app yet. Study notes and practice are ready now."
        primary={{ label: 'Back to Learn', onPress: () => openTab('/learn') }}
      />
    );
  }

  const clear = () => {
    setQuery('');
    setArea(undefined);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Glossary" showTitle={false} onBack={goBack} />
      {/* The title, with the plant figure at its right, top-aligned; the title wraps first. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PageTitle title="Glossary" />
        </View>
        {showFigure && (
          <View testID="glossary-plant" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Plant species="oak" stage={2} size={PLANT_SIZE} quietLook theme={isDark ? 'dark' : 'light'} />
          </View>
        )}
      </View>
      <Enter i={0}>
        <T v="meta" style={{ marginTop: space.xs }}>Key terms in plain words.</T>
        <View style={{ marginTop: space.lg }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search terms or acronyms" accessibilityLabel="Search the glossary" accessibilityHint="Matching terms show below as you type" />
        </View>
        {/* The area chips: one group, each chip's selected state spoken. */}
        <View accessibilityLabel="Area" style={{ marginTop: space.md }}>
          <ChipRow>
            <Chip label="All" accessibilityLabel="All areas" selected={area === undefined} onPress={() => setArea(undefined)} />
            {areas.map((d) => (
              <Chip key={d.id} label={d.short} selected={area === d.id} onPress={() => setArea(area === d.id ? undefined : d.id)} />
            ))}
          </ChipRow>
        </View>
        {filtered && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.md, marginTop: space.sm }}>
            <View testID="glossary-count">
              <T v="meta">{countLine}</T>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
              accessibilityHint="Shows every term again"
              onPress={clear}
              hitSlop={4}
              style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
            >
              <T v="label" color={c.accentText}>Clear filters</T>
            </Pressable>
          </View>
        )}
      </Enter>

      <Enter i={1}>
        {groups.length === 0 ? (
          <EmptyState compact art="fieldbook" title="No terms match your filters." body="Try a shorter word, an acronym like RTO, or All areas." />
        ) : (
          groups.map((g) => (
            <HubCard key={g.letter} testID={`glossary-letter-${g.letter}`} style={{ marginTop: space.lg, paddingBottom: space.xs }}>
              <CardHead title={g.letter} />
              {g.terms.map((t, i) => {
                const meta = [t.short, shortOf(t.domainId)].filter(Boolean).join(' · ');
                return (
                  <View key={t.id}>
                    {i > 0 && <CardDivider />}
                    <View style={{ paddingTop: space.md }}>
                      {/* The term, its meta and its meaning: one screen-reader stop. */}
                      <View accessible accessibilityLabel={`${t.term}${t.short ? `, ${t.short}` : ''}, ${shortOf(t.domainId)}. ${t.meaning}`} testID="glossary-term">
                        <T v="label">{t.term}</T>
                        <T v="meta" style={{ marginTop: 2 }}>{meta}</T>
                        <T v="small" color={c.ink} style={{ marginTop: space.xs }}>{t.meaning}</T>
                      </View>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`Read the note: ${t.term}`}
                        accessibilityHint="Opens the study note that teaches it"
                        onPress={() => openTermNote(cert.id, t)}
                        hitSlop={4}
                        style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}
                      >
                        <T v="label" color={c.accentText}>Read the note</T>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </HubCard>
          ))
        )}
        <T v="meta" style={{ marginTop: space.md }}>Original content, reviewed against public frameworks.</T>
      </Enter>
    </Screen>
  );
}
