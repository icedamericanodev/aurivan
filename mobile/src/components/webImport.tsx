/**
 * "Add your website progress?" (mobile 1.42): the sheet shown when the file
 * picked under "Restore from a backup" was exported from the KaiSip website.
 *
 * Plain English:
 * - It says what will be ADDED (only the learner's own counts), what is left
 *   out and why, and that nothing on this phone is replaced or deleted.
 * - A file with several profiles asks which one first (radio rows; the first
 *   with something new is chosen to start).
 * - "Add to my progress" merges it in (lib/webImport.ts); Cancel changes nothing.
 *   When everything is already on the phone it says so and offers only Close.
 * Same shape as the restore preview (components/yourData.tsx): a page sheet,
 * stacked rows that survive 200% text, and Reduce Motion's fade.
 */
import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { examDateLabel } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { UNDO_DAYS } from '../engine/backup';
import { webAddLines, webNotInFile, webSkipLines } from '../engine/webImport';
import type { WebReady } from '../lib/webImport';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useMotion } from './motion';
import { Button, RadioRow, T } from './ui';

/** "Progress 2 · last used 6 Oct 2026" when a profile has no name. */
function profileTitle(name: string, i: number): string {
  return name || `Progress ${i + 1}`;
}

export function WebImportPreview({
  web,
  busy,
  onConfirm,
  onCancel,
  onboarding,
}: {
  web: WebReady | null;
  busy: boolean;
  /** Opened from the welcome screen: say what comes next (the exam date and daily time). */
  onboarding?: boolean;
  onConfirm: (index: number) => void;
  onCancel: () => void;
}) {
  const { c } = useTheme();
  const { reduced: reduceMotion } = useMotion();
  // The first profile with something new is chosen to start (kept per file: the key changes with it).
  const firstNew = web ? Math.max(0, web.summaries.findIndex((s) => !s.nothingNew)) : 0;
  const [picked, setPicked] = useState<{ file: WebReady | null; index: number }>({ file: null, index: 0 });
  const index = picked.file === web ? picked.index : firstNew;
  const summary = web?.summaries[index];
  const profile = web?.profiles[index];
  const lines = summary ? webAddLines(summary) : [];
  const skips = summary ? webSkipLines(summary) : [];
  const several = (web?.profiles.length ?? 0) > 1;
  // Nothing new, or too large to save together: no Add button (Close only).
  const canAdd = Boolean(summary && !summary.nothingNew && !summary.tooBig);
  return (
    <Modal visible={web !== null} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={busy ? () => {} : onCancel}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.raised2 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xl }} testID="web-import">
          <T v="display" accessibilityRole="header">Add your website progress?</T>
          <T v="body" color={c.ink2} style={{ marginTop: space.md }}>
            {`This adds what you studied on the KaiSip website to this phone. Nothing here is replaced or deleted. You can undo it for ${UNDO_DAYS} days in Your data.`}
          </T>
          {several && web && (
            <>
              <T v="caption" color={c.accentText} accessibilityRole="header" style={{ marginTop: space.xl }}>Which progress?</T>
              <T v="meta" style={{ marginTop: space.xs }}>This file has more than one. Add one at a time.</T>
              <View accessibilityRole="radiogroup" style={{ marginTop: space.sm }}>
                {web.profiles.map((p, i) => (
                  <RadioRow
                    key={`${p.key}-${i}`}
                    title={profileTitle(p.name, i)}
                    subtitle={p.lastActive ? `Last used ${examDateLabel(dayKey(p.lastActive))}` : undefined}
                    checked={i === index}
                    onPress={() => setPicked({ file: web, index: i })}
                    last={i === web.profiles.length - 1}
                  />
                ))}
              </View>
            </>
          )}
          <T v="caption" color={c.accentText} accessibilityRole="header" style={{ marginTop: space.xl }}>
            {summary?.nothingNew ? 'Already on this phone' : 'What will be added'}
          </T>
          {summary?.nothingNew ? (
            <T v="body" style={{ marginTop: space.sm }}>Everything in this progress is already on this phone. Nothing needs adding.</T>
          ) : (
            <View style={{ marginTop: space.sm, gap: space.sm }}>
              {lines.map((line) => (
                // A hanging bullet, so a wrapped line lines up under its words. Read as one line.
                <View key={line} accessible accessibilityLabel={line} style={{ flexDirection: 'row', gap: space.sm }}>
                  <T v="body">•</T>
                  <T v="body" style={{ flex: 1 }}>{line}</T>
                </View>
              ))}
            </View>
          )}
          {skips.map((line) => (
            <T key={line} v="small" color={c.ink2} style={{ marginTop: space.md }}>{line}</T>
          ))}
          <T v="small" color={c.ink2} style={{ marginTop: space.md }}>{webNotInFile(profile ?? {})}</T>
          {onboarding && (
            <T v="small" color={c.ink2} style={{ marginTop: space.sm }}>
              {summary?.examDate ? 'Next, you choose your starting point and daily time, and check your exam date.' : 'Next, you choose your starting point, exam date and daily time.'}
            </T>
          )}
        </ScrollView>
        {/* The actions stay in reach under the scrolling list (UX review). */}
        <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: 1, borderColor: c.line, gap: space.sm }}>
          {canAdd && (
            <Button
              label={busy ? 'Adding…' : 'Add to my progress'}
              accessibilityHint="Adds the website progress to this phone. Nothing here is replaced."
              disabled={busy}
              onPress={() => onConfirm(index)}
            />
          )}
          <Button kind="secondary" label={canAdd ? 'Cancel' : 'Close'} disabled={busy} onPress={onCancel} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
