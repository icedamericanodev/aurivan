/**
 * Study notes, home: the five domains and a search box.
 *
 * Each domain row: domain dot · name · "26% of the exam · 3 of 24 read".
 * Typing in the search box swaps the list for matching subtopics across
 * every domain (engine/notesSearch.ts). Domain names and weights come from
 * content/certifications.ts, the single source of exam facts.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ReadMark } from '../../components/notes';
import { DomainDot, EmptyState, Enter, ListRow, PushedHeader, Screen, SearchField, Section, T } from '../../components/ui';
import { getNotes, noteSubtopics } from '../../content/notes';
import { readCount, searchNotes } from '../../engine/notesSearch';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

export default function NotesHome() {
  const { cert, progress } = useActiveCert();
  const [query, setQuery] = useState('');
  const pack = getNotes(cert.id);
  const read = progress.notesRead;

  // Only the domains that have notes, in the cert's domain order.
  const domains = cert.domains.filter((d) => pack?.domains.some((n) => n.id === d.id));
  // getNotes is cached per cert, so this only re-searches when the query changes.
  const hits = useMemo(() => searchNotes(getNotes(cert.id), query), [cert.id, query]);
  const searching = query.trim().length >= 2;
  const total = noteSubtopics(cert.id).length;

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Study notes" onBack={goBack} />
      <Enter i={0}>
        <T v="meta" style={{ marginTop: space.xs }}>
          Every exam topic in plain English, with examples and exam traps.
        </T>
        <View style={{ marginTop: space.lg }}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search the notes"
            accessibilityLabel="Search the study notes"
          />
        </View>
      </Enter>

      {searching ? (
        <Enter i={1}>
          <Section title="Results" meta={hits.length ? `${hits.length}${hits.length === 30 ? '+' : ''} found` : undefined} />
          {hits.length === 0 ? (
            <EmptyState compact title="No matches" body="Try a shorter word, or an acronym like RTO or SoD." />
          ) : (
            hits.map((h, i) => {
              const d = cert.domains.find((x) => x.id === h.subtopic.domainId);
              return (
                <ListRow
                  key={h.subtopic.id}
                  title={h.subtopic.name}
                  subtitle={
                    <View>
                      <T v="meta" numberOfLines={2}>{h.snippet}</T>
                      {d && <T v="caption" style={{ marginTop: 2 }}>{d.short}</T>}
                    </View>
                  }
                  accessibilityLabel={`${h.subtopic.name}. ${d?.short ?? ''}. ${h.snippet}`}
                  onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(h.subtopic.id)}`)}
                  last={i === hits.length - 1}
                />
              );
            })
          )}
        </Enter>
      ) : (
        <Enter i={1}>
          <Section title="By domain" meta={`${readCount(noteSubtopics(cert.id).map((s) => s.id), read)} of ${total} read`} />
          {domains.map((d, i) => {
            const ids = noteSubtopics(cert.id, d.id).map((s) => s.id);
            const done = readCount(ids, read);
            const state = done === ids.length ? 'All read' : `${done} of ${ids.length} read`;
            return (
              <ListRow
                key={d.id}
                lead={
                  <View style={{ width: 16, alignItems: 'center' }}>
                    <DomainDot domain={d} />
                  </View>
                }
                title={d.name}
                subtitle={`${d.weight}% of the exam · ${state}`}
                trailing={<ReadMark read={done === ids.length && ids.length > 0} />}
                accessibilityLabel={`${d.name}. ${d.weight} percent of the exam. ${state}.`}
                onPress={() => router.push(`/notes/${d.id}`)}
                last={i === domains.length - 1}
              />
            );
          })}
          <T v="meta" style={{ marginTop: space.md }}>Original content, reviewed against public frameworks.</T>
        </Enter>
      )}
    </Screen>
  );
}
