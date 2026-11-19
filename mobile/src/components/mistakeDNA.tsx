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
  pattern === 'knowledge' ? 'Read a related note, then try fresh practice.' : pattern === 'runner-up' ? 'Say why the best answer wins before you tap.' : PATTERN_COPY[pattern].coach;

const sourceLabel = (p: MistakeDNA['patterns'][number]) => p.observed ? 'Answer evidence' : p.pattern === 'priority' ? 'Tags + wording' : 'Your tags';

/** One shared explanation, using the app's accessible, scrollable help sheet. */
function DNAHelp({ dna }: { dna: MistakeDNA }) {
  const sections = [
    ['Learning clues', 'Your mistake patterns describe your retained mistakes, not a diagnosis of how you think or a measure of mastery. Tag why you slipped in the journal; “What do these mean?” gives examples.'],
    ['Your evidence', `Classified means a valid learner tag or usable answer evidence is available. Unclassified means neither is available. Your tags are reflections; answer evidence describes your recorded pick or confidence. Tags + wording combines a Misread tag with a priority word in the question. ${dna.tagged} mistakes in this window have your tags.`],
    ['The observation window', 'The last 28 days use each question’s latest saved miss. Repeated misses replace the earlier observation; saved tags can persist. Fixed mistakes remain in their original miss window. Untagged misses count only when usable answer evidence is available.'],
    ['Counts and bars', 'Each count is distinct mistakes showing that pattern out of all classified mistakes in these 28 days. A bar shows that same share. A mistake may show several patterns, so shares do not add up to 100%. These are not shares of all practice answers.'],
    ['When a pattern appears', 'A leading pattern needs at least 5 classified mistakes, including 3 showing that pattern. Equal counts share the lead. Below that sample, keep reflecting; the app does not guess a leading pattern.'],
    ['Comparing recent practice', 'The trend compares the same pattern’s share in the recent 14 days with the previous 14 days. Each window needs at least 5 classified mistakes. Changes within 10 percentage points are called similar. Question mix and which mistakes you tag can change the shares; a smaller share does not prove improved mastery.'],
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
        <T v="caption" color={c.accentText}>{top ? (dna.tied ? 'One of your most common patterns' : 'A pattern worth reviewing') : 'Not enough evidence yet'}</T>
        <T v="title" accessibilityRole="header" style={{ marginTop: space.xs }}>{top ? DNA_COPY[top.pattern].label : 'Keep reflecting'}</T>
        <T v="small" style={{ marginTop: space.xs }}>{top ? cue(top.pattern) : 'Tag a few mistakes to help reveal a pattern.'}</T>
      </View>
      <Button kind="ghost" label={expanded ? 'Hide pattern evidence' : 'Explore pattern evidence'} expanded={expanded} onPress={() => setExpanded(!expanded)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.sm }} />
      {expanded && (
        <View>
          <T v="label" accessibilityRole="header">Thinking-pattern breakdown</T>
          {top && <T v="small" style={{ marginTop: space.xs }}>{`${DNA_COPY[top.pattern].label}: ${top.count} of ${dna.classified} classified mistakes`}</T>}
          <T v="meta" style={{ marginTop: space.xs }}>{`${dna.classified} classified · ${dna.unclassified} unclassified`}</T>
          {dna.patterns.slice(0, 5).map((p) => (
            <View key={p.pattern} style={{ marginTop: space.md }}>
              <T v="label">{DNA_COPY[p.pattern].label}</T>
              <T v="meta" accessibilityLabel={`${p.count} of ${dna.classified} classified mistakes, ${p.percent} percent. ${sourceLabel(p)}.`}>{`${p.count} of ${dna.classified} · ${sourceLabel(p)}`}</T>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 6, backgroundColor: c.line, marginTop: space.xs, borderRadius: 3 }}>
                <View style={{ width: `${p.percent}%`, height: 6, backgroundColor: c.accent, borderRadius: 3 }} />
              </View>
            </View>
          ))}
          {dna.patterns.length === 0 && <T v="small">No classified mistakes yet.</T>}
          <T v="label" accessibilityRole="header" style={{ marginTop: space.lg }}>Progress over time</T>
          <T v="small" style={{ marginTop: space.xs }}>{dna.trend === 'insufficient' ? 'More evidence needed' : `${top ? DNA_COPY[top.pattern].label : 'Pattern'}: ${dna.trend === 'less' ? 'less frequent recently' : dna.trend === 'more' ? 'more frequent recently' : 'similar recently'}`}</T>
          {top && <T v="meta" style={{ marginTop: space.xs }}>{`Recent 14 days: ${count(dna.recent)} of ${dna.recent.classified} · Previous 14 days: ${count(dna.previous)} of ${dna.previous.classified}`}</T>}
          {top && dna.trend === 'more' && <T v="small" style={{ marginTop: space.xs }}>{`What helps: ${cue(top.pattern)}`}</T>}
        </View>
      )}
    </View>
  );
}
