/**
 * The final review week's cheat sheet: the must-remember points per domain
 * (each linking to its study note), the principles by title with their
 * one-line rule, the priority words, the answering routine and the pace.
 *
 * Opened from Final review week (the whole sheet, or only the parts a day's
 * task asks for: /cheat-sheet?parts=4,5 or ?parts=focus). "focus" and
 * "next_focus" become the learner's own domains (engine/finalWeek.ts). An
 * unknown part is ignored; nothing known left → the whole sheet.
 *
 * "Cover the points" (schema "App hooks wanted"): the plan asks the learner
 * to recall first, then check. With it on, each domain point is hidden
 * behind a 48pt "Show point 3" row; one tap shows it. The covering is only
 * for this visit (nothing saved).
 *
 * Principles are listed by title from the principles pack (never copied
 * into the exam file); a row opens the principle's page.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { Bullets, Steps } from '../components/examGuide';
import { Button, Enter, ListRow, PushedHeader, Screen, Section, T, ToggleRow } from '../components/ui';
import { getFinalWeek } from '../content/exam';
import type { CheatSheet } from '../content/exam/types';
import { findNote } from '../content/notes';
import { findPrinciple } from '../content/principles';
import type { Certification } from '../content/types';
import { sheetParts, weekFocus } from '../engine/finalWeek';
import { moveFocus } from '../lib/a11y';
import { useActiveCert } from '../lib/useActiveCert';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/exam-week'));

/** The other parts, in the order the whole sheet shows them (after the domains). */
const OTHER_PARTS = ['principles', 'priority_words', 'routine', 'pace'] as const;

/** The parts asked for, resolved and known; empty = the whole sheet. Exported for tests. */
export function askedParts(raw: string | undefined, sheet: CheatSheet, focus: { focus: string; next: string }): string[] {
  if (!raw) return [];
  const known = new Set<string>([...sheet.domains.map((d) => d.id), ...OTHER_PARTS]);
  return sheetParts(raw.split(',').map((x) => x.trim()), focus).filter((p) => known.has(p));
}

export default function CheatSheetScreen() {
  const { cert, readiness } = useActiveCert();
  const week = getFinalWeek(cert.id);
  const { parts } = useLocalSearchParams<{ parts?: string }>();
  const [whole, setWhole] = useState(false);
  const [cover, setCover] = useState(false);

  if (!week) {
    return (
      <EmptyScreen
        header="Cheat sheet"
        art="fieldbook"
        title="Not in the app yet"
        body="A cheat sheet for this exam isn't ready yet. The study notes cover every topic."
        primary={{ label: 'Open the notes', onPress: () => router.replace('/notes') }}
      />
    );
  }
  const sheet = week.cheatSheet;
  const asked = whole ? [] : askedParts(typeof parts === 'string' ? parts : undefined, sheet, weekFocus(cert.domains, readiness));
  const shows = (p: string) => asked.length === 0 || asked.includes(p);
  const domains = sheet.domains.filter((d) => shows(d.id));
  const label = (p: string) =>
    /^\d+$/.test(p) ? `Domain ${p}` : p === 'priority_words' ? 'Priority words' : p === 'routine' ? 'Answering routine' : p === 'pace' ? 'Pace' : 'Principles';

  return (
    <Screen edges={['top', 'bottom']} header={<PushedHeader title="Cheat sheet" onBack={goBack} />}>
      <Enter i={0}>
        <T v="hero" accessibilityRole="header">Cheat sheet</T>
        <T v="meta" style={{ marginTop: space.xs }}>Recall it first, then check it here.</T>
        {asked.length > 0 && (
          <View style={{ marginTop: space.sm }}>
            <T v="small">{`Showing ${asked.map(label).join(', ')}`}</T>
            <Button
              kind="ghost"
              label="Show the whole sheet"
              onPress={() => setWhole(true)}
              style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
            />
          </View>
        )}
      </Enter>

      {domains.length > 0 && (
        <Enter i={1} style={{ marginTop: space.md }}>
          <ToggleRow
            title="Cover the points"
            subtitle="Say each one from memory, then tap to check"
            value={cover}
            onValueChange={setCover}
            last
          />
        </Enter>
      )}

      {domains.map((d) => (
        <DomainPoints key={`${d.id}-${cover ? 'c' : 'o'}`} cert={cert} domain={d} cover={cover} />
      ))}

      {shows('principles') && sheet.principles.ids.length > 0 && (
        <View testID="sheet-principles">
          <Section title="Principles" />
          {sheet.principles.intro ? <T v="small">{sheet.principles.intro}</T> : null}
          {sheet.principles.ids.map((id, i, all) => {
            const p = findPrinciple(cert.id, id);
            if (!p) return null;
            return (
              <ListRow
                key={id}
                title={p.title}
                subtitle={p.rule}
                accessibilityHint="Opens this principle"
                onPress={() => router.push({ pathname: '/principles/[id]', params: { id: p.id } })}
                last={i === all.length - 1}
              />
            );
          })}
        </View>
      )}

      {shows('priority_words') && sheet.priorityWords.length > 0 && (
        <View testID="sheet-priority-words">
          <Section title="Priority words" />
          {sheet.priorityWords.map((w) => (
            <View key={w.word} accessible accessibilityLabel={`${w.word}. ${w.meaning} ${w.cue}`} style={{ marginTop: space.md }}>
              <T v="label">{w.word}</T>
              <T v="small" style={{ marginTop: 2 }}>{w.meaning}</T>
              <T v="meta" style={{ marginTop: 2 }}>{w.cue}</T>
            </View>
          ))}
        </View>
      )}

      {shows('routine') && sheet.routine.length > 0 && (
        <View testID="sheet-routine">
          <Section title="Answering routine" />
          <Steps steps={sheet.routine.map((s) => s.text)} titles={sheet.routine.map((s) => s.title)} />
        </View>
      )}

      {shows('pace') && sheet.pace.length > 0 && (
        <View testID="sheet-pace">
          <Section title="Pace" />
          <Bullets items={sheet.pace} v="small" />
        </View>
      )}
    </Screen>
  );
}

/**
 * One domain's must-remember points. A point with a note is a row that opens
 * it; with "Cover the points" on, each starts hidden behind "Show point N".
 */
function DomainPoints({ cert, domain, cover }: { cert: Certification; domain: CheatSheet['domains'][number]; cover: boolean }) {
  const { c } = useTheme();
  const [shown, setShown] = useState<number[]>([]);
  const info = cert.domains.find((x) => x.id === domain.id);
  const n = domain.points.length;
  // The point just shown: screen-reader focus moves onto it (UX review H2), so the
  // learner hears the point instead of losing their place when the button goes.
  const justShown = useRef<View>(null);
  const reveal = (i: number) => {
    setShown((s) => [...s, i]);
    moveFocus(justShown, 150);
  };
  return (
    <View testID={`sheet-domain-${domain.id}`}>
      <Section title={`Domain ${domain.id} · ${info?.short ?? domain.name}`} />
      <T v="meta">{domain.name}</T>
      {domain.points.map((p, i) => {
        const last = i === n - 1;
        if (cover && !shown.includes(i)) {
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Point ${i + 1} of ${n}, covered. Show it`}
              onPress={() => reveal(i)}
              style={({ pressed }) => ({
                minHeight: 48,
                justifyContent: 'center',
                marginTop: space.sm,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: c.control,
                backgroundColor: pressed ? c.soft : 'transparent',
              })}
            >
              <T v="meta" color={c.ink}>{`Show point ${i + 1}`}</T>
            </Pressable>
          );
        }
        const note = p.note ? findNote(cert.id, p.note) : undefined;
        // Only the most recently shown point holds the focus ref.
        const ref = cover && shown[shown.length - 1] === i ? justShown : undefined;
        return note ? (
          <ListRow
            key={i}
            ref={ref}
            reading
            full
            title={p.text}
            subtitle={`Note: ${note.name}`}
            accessibilityLabel={`${p.text} Read the note: ${note.name}`}
            accessibilityHint="Opens the study note"
            onPress={() => router.push({ pathname: '/notes/subtopic/[id]', params: { id: note.id } })}
            last={last}
          />
        ) : (
          // A point without a note is one read-only stop, so it can still take focus.
          <ListRow key={i} ref={ref} reading full title={p.text} accessibilityLabel={p.text} last={last} />
        );
      })}
    </View>
  );
}
