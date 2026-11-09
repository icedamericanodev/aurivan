import { useState } from 'react';
import { View } from 'react-native';
import { DNA_COPY, type MistakeDNA } from '../engine/mistakeDNA';
import { shortDate } from '../lib/format';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Info, ICON_STROKE } from './icons';
import { Button, IconButton, ICON_SIZE, T } from './ui';

const sourceLabel = (p: MistakeDNA['patterns'][number]) => p.observed ? 'Answer evidence' : p.pattern === 'priority' ? 'Your tags and question wording' : 'Your tags';

/** Explanations stay beside their label, available to touch and screen readers. */
function InfoLabel({ label, help, v = 'label', heading = false, color }: {
  label: string;
  help: string;
  v?: 'headline' | 'title' | 'label' | 'meta' | 'caption';
  heading?: boolean;
  color?: string;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <T v={v} color={color} accessibilityRole={heading ? 'header' : undefined} style={{ flex: 1 }}>{label}</T>
        <IconButton label={`About ${label}`} expanded={open} onPress={() => setOpen(!open)} icon={(col) => <Info size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />} />
      </View>
      {open && <View accessibilityLiveRegion="polite"><T v="small" color={c.ink2} style={{ marginBottom: space.sm }}>{help}</T></View>}
    </View>
  );
}

export function MistakeDNASummary({ dna }: { dna: MistakeDNA }) {
  const { c } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const top = dna.top;
  const count = (w: MistakeDNA['recent']) => w.patterns.find((p) => p.pattern === top?.pattern)?.count ?? 0;
  return (
    <View style={{ marginTop: space.xl }}>
      <InfoLabel label="Your Mistake DNA" v="headline" heading help="Understand patterns in your recent mistakes and find a useful next activity. These are learning clues, not a diagnosis of how you think." />
      <InfoLabel label={`${shortDate(dna.from)} – ${shortDate(dna.to)}`} v="meta" help="The last 28 days, using each question’s latest saved miss. Repeated misses replace the earlier observation. Fixed mistakes remain in their original miss window." />
      <View style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
        <InfoLabel label={top ? (dna.tied ? 'One of your most common patterns' : 'A pattern worth reviewing') : 'Not enough evidence yet'} v="caption" color={c.accentText} help="A leading pattern needs at least 5 classified mistakes, including 3 showing the same pattern. Equal counts share the lead." />
        <InfoLabel label={top ? DNA_COPY[top.pattern].label : 'Keep reflecting'} v="title" heading help={top ? DNA_COPY[top.pattern].explanation : 'As you review your mistakes, tag what may have happened. Untagged misses count only when a recorded pick or confidence provides usable evidence.'} />
        {top && <InfoLabel label={`${top.count} of ${dna.classified} classified mistakes`} v="meta" help="The number of distinct classified mistakes showing this pattern, out of all classified mistakes in these 28 days. This is not a share of all practice answers." />}
      </View>
      <InfoLabel label={`${dna.classified} classified · ${dna.unclassified} unclassified · ${dna.tagged} tagged by you`} v="meta" help="Classified means a valid learner tag or usable answer evidence is available. Unclassified means neither is available. Tagged counts your reflections; a mistake may also have answer evidence." />
      <Button kind="ghost" label={expanded ? 'Hide pattern evidence' : 'Explore pattern evidence'} expanded={expanded} onPress={() => setExpanded(!expanded)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
      {expanded && (
        <View>
          <InfoLabel label="Thinking-pattern breakdown" heading help="Tags are your reflections. Answer evidence describes your recorded pick or confidence, not your thought process. Each bar shows the share of classified mistakes in these 28 days. A mistake can show several patterns, so shares do not add up to 100%." />
          {dna.patterns.slice(0, 5).map((p) => (
            <View key={p.pattern} style={{ marginTop: space.sm }}>
              <InfoLabel label={DNA_COPY[p.pattern].label} help={`${DNA_COPY[p.pattern].explanation} Source: ${sourceLabel(p)}. ${p.count} of ${dna.classified} distinct classified mistakes in these 28 days (${p.percent}%).`} />
              <T v="meta" accessibilityLabel={`${p.count} of ${dna.classified} classified mistakes, ${p.percent} percent. ${sourceLabel(p)}.`}>{`${p.count} of ${dna.classified} · ${p.percent}% · ${sourceLabel(p)}`}</T>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 6, backgroundColor: c.line, marginTop: space.xs, borderRadius: 3 }}>
                <View style={{ width: `${p.percent}%`, height: 6, backgroundColor: c.accent, borderRadius: 3 }} />
              </View>
            </View>
          ))}
          {dna.patterns.length === 0 && <T v="small">No classified mistakes yet.</T>}
          <View style={{ marginTop: space.lg }}>
            <InfoLabel label="Progress over time" heading help="Compares the same pattern’s share of classified mistakes in the recent 14 days with the previous 14 days. Each window needs at least 5 classified mistakes. Changes within 10 percentage points are called similar. This is not a measure of mastery: question mix and which mistakes you tag can change these shares." />
          </View>
          <T v="small">{dna.trend === 'insufficient' ? 'More evidence needed' : `${top ? DNA_COPY[top.pattern].label : 'Pattern'}: ${dna.trend === 'less' ? 'less frequent recently' : dna.trend === 'more' ? 'more frequent recently' : 'similar recently'}`}</T>
          {top && <InfoLabel label={`Recent: ${count(dna.recent)} of ${dna.recent.classified} · Previous: ${count(dna.previous)} of ${dna.previous.classified}`} v="meta" help={`${DNA_COPY[top.pattern].label}: ${count(dna.recent)} of ${dna.recent.classified} classified mistakes in the recent 14 days; ${count(dna.previous)} of ${dna.previous.classified} in the preceding 14 days. These counts describe retained mistakes, not all practice answers.`} />}
        </View>
      )}
    </View>
  );
}
