/** Search course terms, filter by area, and open the relevant study note. */
import { FeatureInfo } from '../components/featureInfo';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { CardDivider, CardHead, HubCard, PageTitle } from '../components/groveHub';
import { Chip, ChipRow, EmptyState, Enter, PushedHeader, Screen, SearchField, T } from '../components/ui';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { findNote, noteDomain } from '../content/notes';
import { getTerms, type KeyTerm } from '../content/terms';
import { glossaryGroups, matchTerms, type GlossaryGroup } from '../engine/glossary';
import { openTab } from '../lib/actions';
import { domainTitle } from '../engine/domainNaming';
import { useActiveCertId } from '../lib/activeCert';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

/** Open the study note that teaches a term: its subtopic page, else its domain's notes, else Study notes. */
function openTermNote(certId: string, note: KeyTerm['note']) {
  if (findNote(certId, note)) router.push({ pathname: '/notes/subtopic/[id]', params: { id: note } });
  else if (noteDomain(certId, note)) router.push({ pathname: '/notes/[domain]', params: { domain: note } });
  else router.push('/notes');
}

/**
 * The A to Z cards (release bug hunt round 2). Memoised, so a keystroke's urgent render (the search
 * field) skips the list: the list only redraws when the matching terms change (the deferred pass), and
 * then only the rows that are new are drawn (TermRow is memoised too).
 */
const GlossaryList = memo(function GlossaryList({ groups, certId }: { groups: GlossaryGroup[]; certId: string }) {
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  const shortOf = (id: string) => cert.domains.find((d) => d.id === id)?.short ?? domainTitle(id, cert);
  return (
    <>
      {groups.map((g) => (
        <HubCard key={g.letter} testID={`glossary-letter-${g.letter}`} style={{ marginTop: space.lg, paddingBottom: space.xs }}>
          <CardHead title={g.letter} />
          {g.terms.map((t, i) => (
            <TermRow key={t.id} name={t.term} short={t.short} meaning={t.meaning} note={t.note} first={i === 0} area={shortOf(t.domainId)} certId={certId} />
          ))}
        </HubCard>
      ))}
    </>
  );
});

/**
 * One term: its name, meta line and meaning (one screen-reader stop), then "Read the note". Plain
 * props (the search makes new term objects each time), so a row still shown is never drawn again.
 */
const TermRow = memo(function TermRow({
  name,
  short,
  meaning,
  note,
  first,
  area,
  certId,
}: {
  name: string;
  short?: string;
  meaning: string;
  note: KeyTerm['note'];
  first: boolean;
  area: string;
  certId: string;
}) {
  const { c } = useTheme();
  const t = { term: name, short, meaning };
  const meta = [t.short, area].filter(Boolean).join(' · ');
  return (
    <View>
      {!first && <CardDivider />}
      <View style={{ paddingTop: space.md }}>
        {/* The term, its meta and its meaning: one screen-reader stop. */}
        <View accessible accessibilityLabel={`${t.term}${t.short ? `, ${t.short}` : ''}, ${area}. ${t.meaning}`} testID="glossary-term">
          <T v="label">{t.term}</T>
          <T v="meta" style={{ marginTop: 2 }}>{meta}</T>
          <T v="small" color={c.ink} style={{ marginTop: space.xs }}>{t.meaning}</T>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Read the note: ${t.term}`}
          accessibilityHint="Opens the study note that teaches it"
          onPress={() => openTermNote(certId, note)}
          hitSlop={4}
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}
        >
          <T v="label" color={c.accentText}>Read the note</T>
        </Pressable>
      </View>
    </View>
  );
});

export default function Glossary() {
  const { c } = useTheme();
  // Release bug hunt round 2: only the exam's id, so a recorded answer (the glossary can stay open under a
  // practice set) never redraws it. The glossary shows no progress.
  const certId = useActiveCertId();
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  // ?q= from Final review week fills the search once.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const [area, setArea] = useState<string | undefined>(undefined);
  const deferred = useDeferredValue(query);
  const pack = useMemo(() => getTerms(cert.id), [cert.id]);
  // Only the domains that have terms, in the course's own order.
  const areas = cert.domains.filter((d) => (pack?.domains[d.id] ?? []).length > 0);
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1 }}><PageTitle title="Glossary" /></View><FeatureInfo title="Glossary"><T v="body">Search terms or acronyms, or filter by area. Open a term to read its definition and related study note.</T></FeatureInfo></View>
      <Enter i={0}>
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
          <GlossaryList groups={groups} certId={cert.id} />
        )}
        <T v="meta" style={{ marginTop: space.md }}>Original content, reviewed against public frameworks.</T>
      </Enter>
    </Screen>
  );
}
