/**
 * Exam-mindset principles: the pieces of a principle's page.
 *
 * Plain English: a principle page reads top to bottom as
 *   The rule (the coach's voice: 3px accent rule + serif italic)
 *   → Why it matters → Spot it in the question (the trigger words, as quiet
 *   pills) → The trap (the same tinted block as a study note's exam traps)
 *   → Worked example (the situation, then the right move) → Nuance (only
 *   when the principle has one).
 * The "Practice this principle" button lives on the screen
 * (app/principles/[id].tsx), because it starts a session.
 *
 * Grove rules kept: only <T> variants and theme tokens, no cards (nothing
 * here is a choice), and the trigger pills are NOT buttons: they use the
 * `soft` fill of the teaching tags, never the `control` outline that means
 * "tap me". The pills are one screen-reader stop that reads every trigger.
 */
import { View } from 'react-native';
import { Gap, Section, T } from './ui';
import { ExamTraps, IsacaRule } from './notes';
import type { Principle } from '../content/principles/types';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The first heading under the rule sits a little closer than a full section gap. */
const FIRST = { marginTop: space.xl };

/**
 * "Spot it in the question" (the schema calls it "Spot it in the stem"; the
 * app never says "stem" to learners, see copy-consistency.test.ts): each
 * trigger as a quiet pill; they wrap at large text.
 */
export function TriggerChips({ triggers }: { triggers: string[] }) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Words that signal it: ${triggers.join('; ')}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}
    >
      {triggers.map((t) => (
        <View
          key={t}
          style={{
            minHeight: 32,
            maxWidth: '100%',
            justifyContent: 'center',
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: radius.pill,
            backgroundColor: c.soft,
          }}
        >
          <T v="meta" color={c.ink}>{t}</T>
        </View>
      ))}
    </View>
  );
}

/** Worked example: the situation, then the right move (one stop each for screen readers). */
export function WorkedExample({ scenario, answer }: { scenario: string; answer: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: space.sm }}>
      <View accessible accessibilityLabel={`The situation: ${scenario}`}>
        <T v="caption" color={c.ink2}>The situation</T>
        <T v="body" style={{ marginTop: space.xs }}>{scenario}</T>
      </View>
      <Gap h={space.lg} />
      <View accessible accessibilityLabel={`The right move: ${answer}`}>
        <T v="caption" color={c.accentText}>The right move</T>
        <T v="body" style={{ marginTop: space.xs }}>{answer}</T>
      </View>
    </View>
  );
}

/** Every section of a principle, in the fixed order. Nuance is skipped when there is none. */
export function PrincipleBody({ principle }: { principle: Principle }) {
  return (
    <View>
      {/* The rule: the coach's voice (the one place the 3px accent rule means "the coach"). */}
      <View accessible accessibilityLabel={`The rule: ${principle.rule}`}>
        <IsacaRule text={principle.rule} />
      </View>

      <Section title="Why it matters" style={FIRST} />
      <T v="body">{principle.why}</T>

      {principle.triggers.length > 0 && (
        <>
          <Section title="Spot it in the question" />
          <TriggerChips triggers={principle.triggers} />
        </>
      )}

      <Section title="The trap" />
      <ExamTraps traps={[{ trap: principle.trap.move, why: principle.trap.whyWrong }]} />

      <Section title="Worked example" />
      <WorkedExample scenario={principle.example.scenario} answer={principle.example.answer} />

      {principle.nuance ? (
        <>
          <Section title="Nuance" />
          <T v="body">{principle.nuance}</T>
        </>
      ) : null}
    </View>
  );
}
