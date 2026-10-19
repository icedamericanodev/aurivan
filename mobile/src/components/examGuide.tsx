/**
 * Pieces shared by "About the exam" (app/exam-guide.tsx), "Final review
 * week" (app/exam-week.tsx) and its cheat sheet (app/cheat-sheet.tsx).
 *
 * Grove rules kept: only <T> variants and theme tokens; no cards for things
 * you don't choose between (a `plate` surface at most); every pressable is a
 * 48pt+ row with a role and a spoken label; text wraps at 200% (no fixed
 * heights, no cut lines). Nothing here animates.
 */
import type { ReactNode } from 'react';
import { Linking, Pressable, View } from 'react-native';
import type { GuideSource } from '../content/exam/types';
import { isoLongDate } from '../lib/format';
import { maxScale, radius, space, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T, useFontScale } from './ui';

/** A plain bulleted list: a small accent dot, then the text (one screen-reader stop per item). */
export function Bullets({ items, v = 'body' }: { items: readonly string[]; v?: 'body' | 'small' }) {
  const { c } = useTheme();
  // The dot sits on the first line's middle at any text size: the variant's line
  // height, grown with the learner's font scale (capped where the variant caps it).
  const line = type[v].lineHeight! * Math.min(Math.max(useFontScale(), 1), maxScale[v]);
  const dotTop = Math.round((line - 6) / 2);
  return (
    <View style={{ marginTop: space.sm, gap: space.sm }}>
      {items.map((text, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <View accessible={false} importantForAccessibility="no" style={{ width: 6, height: 6, borderRadius: 3, marginTop: dotTop, backgroundColor: c.accent }} />
          <T v={v} style={{ flex: 1, minWidth: 0 }}>{text}</T>
        </View>
      ))}
    </View>
  );
}

/** Numbered steps: "1", "2" in the accent, the text beside. Spoken "Step 1 of 4. …". */
export function Steps({ steps, titles }: { steps: readonly string[]; titles?: readonly string[] }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: space.sm, gap: space.md }}>
      {steps.map((text, i) => (
        <View
          key={i}
          accessible
          accessibilityLabel={`Step ${i + 1} of ${steps.length}. ${titles?.[i] ? `${titles[i]}. ` : ''}${text}`}
          style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}
        >
          <T v="label" num color={c.accentText} style={{ minWidth: 18 }}>{String(i + 1)}</T>
          <View style={{ flex: 1, minWidth: 0 }}>
            {titles?.[i] ? <T v="label">{titles[i]}</T> : null}
            <T v={titles?.[i] ? 'small' : 'body'} color={titles?.[i] ? c.ink2 : undefined}>{text}</T>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Opens a source in the learner's browser. Only https ever reaches here (the content build checks). */
export function openSource(url: string): void {
  if (!/^https:\/\//.test(url)) return;
  void Linking.openURL(url).catch(() => {});
}

/**
 * A section's quiet "Sources" line: each link its own 48pt row (green text,
 * underlined), spoken as a link that opens in the browser, then when the
 * facts were checked.
 */
export function SourcesLine({ sources, asOf }: { sources: readonly GuideSource[]; asOf?: string }) {
  const { c } = useTheme();
  if (sources.length === 0) return null;
  return (
    <View style={{ marginTop: space.md }}>
      <T v="caption" color={c.ink2}>{sources.length === 1 ? 'Source' : 'Sources'}</T>
      {sources.map((s) => (
        <Pressable
          key={s.url}
          accessibilityRole="link"
          accessibilityLabel={s.label}
          accessibilityHint="Opens in your browser"
          onPress={() => openSource(s.url)}
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <T v="meta" color={c.accentText} style={{ textDecorationLine: 'underline' }}>{s.label}</T>
        </Pressable>
      ))}
      {asOf ? <T v="meta" color={c.muted}>{`Checked ${isoLongDate(asOf)}`}</T> : null}
    </View>
  );
}

/** A quiet tonal panel for a calm notice (never a choice): the `raised2` plate. */
export function Plate({ children, testID }: { children: ReactNode; testID?: string }) {
  const { c } = useTheme();
  return (
    <View testID={testID} style={{ backgroundColor: c.raised2, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: c.line }}>
      {children}
    </View>
  );
}
