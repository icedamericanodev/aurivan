import { useState } from 'react';
import { View } from 'react-native';
import { DNA_COPY, type MistakeDNA } from '../engine/mistakeDNA';
import { shortDate } from '../lib/format';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, T } from './ui';

/** Counts accompany bars. No motion, fixed text heights or colour-only meaning. */
const sourceLabel = (p: MistakeDNA['patterns'][number]) => p.observed ? 'Answer evidence' : p.pattern === 'priority' ? 'Your tags and question wording' : 'Your tags';

export function MistakeDNASummary({ dna }: { dna: MistakeDNA }) {
  const { c } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const top = dna.top;
  const count = (w: MistakeDNA['recent']) => w.patterns.find((p) => p.pattern === top?.pattern)?.count ?? 0;
  return (
    <View style={{ marginTop: space.xl }}>
      <T v="headline" accessibilityRole="header">Your Mistake DNA</T>
      <T v="small" color={c.ink2}>Don’t just review what you got wrong. Understand why you got it wrong.</T>
      <T v="meta" style={{ marginTop: space.xs }}>{`${shortDate(dna.from)} – ${shortDate(dna.to)} · latest saved miss per question`}</T>
      <View style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
        <T v="caption" color={c.accentText}>{top ? (dna.tied ? 'One of your most common patterns' : 'A pattern worth reviewing') : 'Not enough evidence yet'}</T>
        <T v="title" accessibilityRole="header" style={{ marginTop: space.xs }}>{top ? DNA_COPY[top.pattern].label : 'Reflection starts with a few mistakes'}</T>
        <T v="small">{top ? DNA_COPY[top.pattern].explanation : 'As you review your mistakes, tag what may have happened. A summary needs at least 5 classified mistakes, including 3 showing the same pattern.'}</T>
        {top && <T v="meta" style={{ marginTop: space.xs }}>{`Seen in ${top.count} of ${dna.classified} classified mistakes in these 28 days.`}</T>}
      </View>
      <T v="meta" style={{ marginTop: space.sm }}>{`${dna.classified} classified · ${dna.unclassified} unclassified · ${dna.tagged} tagged by you`}</T>
      <Button kind="ghost" label={expanded ? 'Hide pattern evidence' : 'Explore pattern evidence'} expanded={expanded} onPress={() => setExpanded(!expanded)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
      {expanded && (
        <View>
          <T v="label" accessibilityRole="header">Thinking-pattern breakdown</T>
          <T v="small" color={c.ink2}>Tags are your reflections. Answer evidence describes your recorded pick or confidence, not your thought process. These are learning clues, not a diagnosis.</T>
          <T v="meta" style={{ marginTop: space.xs }}>Each bar shows the share of classified mistakes in these 28 days. A mistake can show several patterns, so shares do not add up to 100%.</T>
          {dna.patterns.slice(0, 5).map((p) => (
            <View key={p.pattern} accessible accessibilityLabel={`${DNA_COPY[p.pattern].label}: ${p.count} of ${dna.classified} classified mistakes, ${p.percent} percent. ${sourceLabel(p)}.`} style={{ marginTop: space.md }}>
              <T v="label">{DNA_COPY[p.pattern].label}</T>
              <T v="meta">{`${p.count} of ${dna.classified} · ${p.percent}% · ${sourceLabel(p)}`}</T>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 6, backgroundColor: c.line, marginTop: space.xs, borderRadius: 3 }}>
                <View style={{ width: `${p.percent}%`, height: 6, backgroundColor: c.accent, borderRadius: 3 }} />
              </View>
            </View>
          ))}
          {dna.patterns.length === 0 && <T v="small">No classified mistakes in this window yet.</T>}
          <T v="label" accessibilityRole="header" style={{ marginTop: space.lg }}>Progress over time</T>
          <T v="small">{dna.trend === 'insufficient' ? 'There isn’t enough comparable evidence to show a trend yet. Each 14-day window needs at least 5 classified mistakes.' : `${top ? DNA_COPY[top.pattern].label : 'This pattern'} appeared ${dna.trend === 'less' ? 'less often' : dna.trend === 'more' ? 'more often' : 'at a similar rate'} among your recent classified mistakes.`}</T>
          {top && <T v="meta" style={{ marginTop: space.xs }}>{`Recent 14 days: ${count(dna.recent)} of ${dna.recent.classified} classified mistakes. Previous 14 days: ${count(dna.previous)} of ${dna.previous.classified}.`}</T>}
          <T v="meta" style={{ marginTop: space.xs }}>This compares mistakes, not all practice answers or mastery. Changes within 10 percentage points are called similar. Question mix and which mistakes you tag can change these shares. Repeated misses replace the question’s earlier observation. Fixed mistakes remain in their original miss window. Untagged misses count only when answer evidence is available.</T>
        </View>
      )}
    </View>
  );
}
