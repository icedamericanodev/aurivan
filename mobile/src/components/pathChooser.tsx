/**
 * Practice → "Your path" chooser (DESIGN_SYSTEM.md §11 "Practice").
 *
 * Plain English: under the Practice hero, one row says what the hero will
 * start ("Smart · All domains · 10 questions") with "Change" on the right.
 * Tapping it opens the choices right there, under the row, so the hero just
 * above changes as the learner taps: Mode (four radios), Domain (chips) and
 * Length (10 / 20 / 50). Every tap is saved at once; "Done" folds it away.
 *
 * DisclosureRow is the shared "row that opens a panel" (also Build a set).
 */
import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { DomainInfo } from '../content/types';
import { MODE_INFO, SESSION_SIZES, STUDY_MODES, type StudyMode } from '../engine/studyModes';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronDown, ICON_STROKE } from './icons';
import { Button, Chip, ChipRow, Gap, IconCircle, RadioRow, Segmented, T, useFontScale } from './ui';

// ── DisclosureRow: a list row that shows or hides the panel under it ──
export function DisclosureRow({
  title,
  subtitle,
  icon,
  action,
  expanded,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  last,
  ref,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** A word beside the chevron, e.g. "Change". */
  action?: string;
  expanded: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** No hairline (also hidden while open: the panel follows). */
  last?: boolean;
  /** For moving screen-reader focus back here (lib/a11y.ts moveFocus). */
  ref?: Ref<View>;
}) {
  const { c } = useTheme();
  // Large text: "Change ⌄" drops under the summary instead of squeezing it (spec §10.7).
  const large = useFontScale() >= LARGE_TEXT;
  const stack = !!action && large;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, stack && styles.rowStacked, pressed && { backgroundColor: c.soft }]}
    >
      {icon && <IconCircle>{icon}</IconCircle>}
      <View style={stack ? styles.textStacked : { flex: 1, minWidth: 0 }}>
        <T v="label">{title}</T>
        {subtitle ? <T v="meta">{subtitle}</T> : null}
      </View>
      <View style={styles.trail}>
        {action ? <T v="label" color={c.accentText}>{action}</T> : null}
        <View style={expanded ? styles.flip : undefined}>
          <ChevronDown size={18} color={action ? c.accentText : c.muted} strokeWidth={ICON_STROKE} />
        </View>
      </View>
      {!last && !expanded && <View style={[styles.hairline, { left: icon ? 54 : 0, backgroundColor: c.line }]} />}
    </Pressable>
  );
}

/** The visible name of a group of controls ("Mode", "Domain", "Length"). */
export function FieldLabel({ children }: { children: string }) {
  return (
    <T v="caption" style={styles.field}>
      {children}
    </T>
  );
}

/** What the hero will start, in one line: "Smart · All domains · 10 questions". */
export function pathSummary(mode: StudyMode, domain: DomainInfo | undefined, size: number): string {
  const parts = [MODE_INFO[mode].name, domain ? domain.short : 'All domains'];
  if (mode !== 'guided') parts.push(`${size} questions`);
  return parts.join(' · ');
}

// ── PathChooser: the opened panel ─────────────────────────────────────
export function PathChooser({
  mode,
  suggested,
  domains,
  domainId,
  size,
  onMode,
  onDomain,
  onSize,
  onDone,
}: {
  mode: StudyMode;
  suggested: StudyMode;
  domains: DomainInfo[];
  domainId: string | undefined;
  size: number;
  onMode: (m: StudyMode) => void;
  onDomain: (id: string | undefined) => void;
  onSize: (n: number) => void;
  onDone: () => void;
}) {
  const { c } = useTheme();
  return (
    <View testID="path-chooser" style={[styles.panel, { borderBottomColor: c.line }]}>
      <FieldLabel>Mode</FieldLabel>
      <View accessibilityRole="radiogroup" accessibilityLabel="Study mode">
        {STUDY_MODES.map((m, i) => (
          <RadioRow
            key={m}
            title={MODE_INFO[m].name}
            subtitle={MODE_INFO[m].why}
            badge={m === suggested ? 'Suggested' : undefined}
            checked={m === mode}
            // P2: re-tapping the chosen mode saves nothing, so "Follow my stage" survives.
            onPress={() => {
              if (m !== mode) onMode(m);
            }}
            last={i === STUDY_MODES.length - 1}
          />
        ))}
      </View>
      <FieldLabel>Domain</FieldLabel>
      <View accessibilityLabel="Domain for your path">
        <ChipRow>
          <Chip label="All domains" selected={!domainId} onPress={() => onDomain(undefined)} />
          {domains.map((d) => (
            <Chip key={d.id} label={d.short} selected={domainId === d.id} onPress={() => onDomain(d.id)} />
          ))}
        </ChipRow>
      </View>
      <FieldLabel>Length</FieldLabel>
      {mode === 'guided' ? (
        <T v="meta">Guided goes one topic at a time, so each step has its own length.</T>
      ) : (
        <Segmented
          accessibilityLabel="Questions per session"
          value={size}
          onChange={onSize}
          options={SESSION_SIZES.map((n) => ({ value: n, numeral: String(n), label: 'questions' }))}
        />
      )}
      <Gap h={space.md} />
      <Button kind="secondary" label="Done" accessibilityHint="Closes the path choices." onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 12 },
  rowStacked: { flexWrap: 'wrap', rowGap: space.xs },
  textStacked: { flexBasis: '100%', minWidth: 0 },
  trail: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  flip: { transform: [{ rotate: '180deg' }] },
  hairline: { position: 'absolute', right: 0, bottom: 0, height: 1 },
  field: { marginTop: space.md, marginBottom: space.xs },
  panel: { paddingBottom: space.lg, borderBottomWidth: 1 },
});
