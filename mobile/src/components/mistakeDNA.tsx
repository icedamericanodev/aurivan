import { useState } from 'react';
import { View } from 'react-native';
import { DNA_COPY, type MistakeDNA } from '../engine/mistakeDNA';
import { PATTERN_COPY, PATTERN_ORDER } from '../engine/slipCoach';
import { shortDate } from '../lib/format';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FeatureInfo } from './featureInfo';
import { Button, T } from './ui';

/** The one action for a pattern: shown on the card, and again beside a rising trend. */
const cue = (pattern: MistakeDNA['patterns'][number]['pattern']) =>
  pattern === 'knowledge' ? 'Read a related note, then try fresh practice.' : pattern === 'runner-up' ? 'Say why the best answer wins before you tap.' : pattern === 'priority' ? 'Look for FIRST, BEST or MOST in the question, then read the options.' : PATTERN_COPY[pattern].coach;

const sourceLabel = (p: MistakeDNA['patterns'][number]) => p.observed ? 'From the answers you chose' : p.pattern === 'priority' ? 'From your tags and the question wording' : 'From your tags';

/** One shared explanation, using the app's accessible, scrollable help sheet. */
function DNAHelp({ dna }: { dna: MistakeDNA }) {
  const sections = [
    ['What this is', 'These patterns describe your recent mistakes. They are not a diagnosis of how you think or a measure of mastery. Tag why you slipped in the journal; “What do these mean?” gives examples.'],
    ['Where a pattern comes from', `A mistake has a pattern when you tagged why you slipped, or when your answer or confidence shows one. “From your tags and the question wording” means you tagged Misread and the question had a word like FIRST or BEST. ${dna.tagged} mistakes here have your tags.`],
    ['Which mistakes count', 'Each question counts once, using its latest miss in the last 28 days. Fixed mistakes still count in the window where you missed them.'],
    ['Counts and bars', 'Each count is how many of your mistakes with a pattern show it. One mistake can show several patterns, so the bars do not add up to 100%.'],
    ['When a pattern appears', 'A pattern is named once 5 mistakes have a pattern and 3 of them share it. Until then, keep tagging; the app will not guess.'],
    ['Comparing recent practice', 'This compares the last 14 days with the 14 before, once each has 5 mistakes with a pattern. Small changes count as similar. A drop is a good sign, not proof of mastery.'],
  ];
  return (
    <>
      {sections.map(([title, body]) => <View key={title} style={{ marginBottom: space.lg }}>
        <T v="label" accessibilityRole="header">{title}</T>
        <T v="small" style={{ marginTop: space.xs }}>{body}</T>
      </View>)}
      <T v="label" accessibilityRole="header">Pattern meanings</T>
      {PATTERN_ORDER.map((pattern) => <View key={pattern} style={{ marginTop: space.md }}>
        <T v="label">{DNA_COPY[pattern].label}</T>
        <T v="small" style={{ marginTop: space.xs }}>{DNA_COPY[pattern].explanation}</T>
      </View>)}
    </>
  );
}

export function MistakeDNASummary({ dna }: { dna: MistakeDNA }) {
  const { c } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const top = dna.top;
  const caption = top ? (dna.tied ? 'One of your most common patterns' : 'A pattern worth reviewing') : 'Not enough evidence yet';
  const title = top ? DNA_COPY[top.pattern].label : 'Keep reflecting';
  const count = (w: MistakeDNA['recent']) => w.patterns.find((p) => p.pattern === top?.pattern)?.count ?? 0;
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        {/* Mobile 2.2 (expert review): "mistake patterns", not "Mistake DNA", which reads as a fixed trait. */}
        <T v="headline" accessibilityRole="header" style={{ flex: 1 }}>Your mistake patterns</T>
        <FeatureInfo title="How mistake patterns work" label="How mistake patterns work"><DNAHelp dna={dna} /></FeatureInfo>
      </View>
      <T v="meta">{`Last 28 days · ${shortDate(dna.from)} – ${shortDate(dna.to)}`}</T>
      <View style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
        {/* UX review (2.2): the caption is read as part of the heading (TalkBack's heading jump lands on the
            title and would skip it), and it is capped with the title so the hierarchy holds at 200% text. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <T v="caption" color={c.accentText} maxFontSizeMultiplier={1.6}>{caption}</T>
        </View>
        <T v="title" accessibilityRole="header" accessibilityLabel={`${caption}: ${title}`} style={{ marginTop: space.xs }}>{title}</T>
        <T v="small" style={{ marginTop: space.xs }}>
          {top
            ? cue(top.pattern)
            : dna.total === 0
              ? 'Patterns use the last 28 days, and your mistakes below are older. Practice them, or answer new questions to see a fresh pattern.'
              : 'Tag a few mistakes to help reveal a pattern.'}
        </T>
      </View>
      <Button kind="ghost" label={expanded ? 'Hide details' : 'Show details'} expanded={expanded} onPress={() => setExpanded(!expanded)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.sm }} />
      {expanded && (
        <View>
          <T v="label" accessibilityRole="header">Thinking-pattern breakdown</T>
          <T v="meta" style={{ marginTop: space.xs }}>{`${dna.classified} with a pattern · ${dna.unclassified} without one`}</T>
          {dna.patterns.slice(0, 5).map((p) => (
            <View key={p.pattern} style={{ marginTop: space.md }}>
              <T v="label">{DNA_COPY[p.pattern].label}</T>
              <T v="meta" accessibilityLabel={`${p.count} of ${dna.classified} mistakes with a pattern, ${p.percent} percent. ${sourceLabel(p)}.`}>{`${p.count} of ${dna.classified} · ${sourceLabel(p)}`}</T>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 6, backgroundColor: c.line, marginTop: space.xs, borderRadius: 3 }}>
                <View style={{ width: `${p.percent}%`, height: 6, backgroundColor: c.accent, borderRadius: 3 }} />
              </View>
            </View>
          ))}
          {dna.patterns.length === 0 && <T v="small">No mistakes with a pattern yet.</T>}
          <T v="label" accessibilityRole="header" style={{ marginTop: space.lg }}>Progress over time</T>
          <T v="small" style={{ marginTop: space.xs }}>{dna.trend === 'insufficient' ? 'More evidence needed' : `${top ? DNA_COPY[top.pattern].label : 'Pattern'}: ${dna.trend === 'less' ? 'less often than the 2 weeks before. Keep going.' : dna.trend === 'more' ? 'more often than the 2 weeks before.' : 'about the same as the 2 weeks before.'}`}</T>
          {top && <T v="meta" style={{ marginTop: space.xs }}>{`Recent 14 days: ${count(dna.recent)} of ${dna.recent.classified} · Previous 14 days: ${count(dna.previous)} of ${dna.previous.classified}`}</T>}
          {top && dna.trend === 'more' && <T v="small" style={{ marginTop: space.xs }}>{`What helps: ${cue(top.pattern)}`}</T>}
        </View>
      )}
    </View>
  );
}
