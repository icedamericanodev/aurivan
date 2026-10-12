/**
 * Sync pieces (Uplift Phase 7, built OFF; spec PHASE6_8.md §3.2 and
 * DESIGN_SYSTEM.md §18). Only the (cloud) screens render these, so with the
 * flag off nothing here is ever shown.
 *
 * - SyncSection: Account → Sync. "Sync this phone" (on only after the
 *   first-sync preview), the status line, Sync now (Try again when paused),
 *   What syncs, Delete synced progress (its own confirmation sheet).
 * - PreviewRows: the first-sync preview's three columns (This phone ·
 *   Account · After), side by side, stacked at large text. Never the bank
 *   size: counts are "312 questions", like the restore preview.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../content/cloud/copy';
import { startFirstSync, statusLine, syncNow, turnSyncOff, type FirstPreview } from '../lib/sync';
import { useAccount } from '../store/account';
import { useSyncMeta, useSyncStatus } from '../store/sync';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AccountNotice } from './account';
import { SettingsRow } from './settings';
import { Button, Section, T, ToggleRow, useFontScale } from './ui';

/** The copy for a sync action that didn't work (the screens show it in an AccountNotice). */
export function syncProblem(code: string): string {
  if (code === 'offline') return copy('sync.offline');
  if (code === 'unauthorized' || code === 'gone') return copy('first.signin');
  if (code === 'newer_app') return copy('sync.paused.newer');
  if (code === 'unreadable') return copy('sync.paused.unreadable');
  if (code === 'too_big') return copy('sync.paused.toobig');
  return copy('first.fail');
}

/** "Now", refreshed every 30 s while the section is on screen (for "Synced 2 min ago"). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function SyncSection() {
  const enabled = useSyncMeta((s) => s.enabled);
  const pausedReason = useSyncMeta((s) => s.pausedReason);
  const lastSyncAt = useSyncMeta((s) => s.lastSyncAt);
  const busy = useSyncStatus((s) => s.busy);
  const offline = useSyncStatus((s) => s.offline);
  const signedIn = useAccount((s) => s.signedIn);
  const expired = useAccount((s) => s.expired);
  const now = useNow();
  const [working, setWorking] = useState<'start' | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'problem' } | null>(null);

  const line = statusLine({ enabled, signedIn, expired, busy: busy || working === 'start', offline, pausedReason, lastSyncAt, now });

  const toggle = async (on: boolean) => {
    setNotice(null);
    if (!on) {
      turnSyncOff();
      return;
    }
    // The preview (or the account-switch choice) decides; nothing changes until the learner confirms.
    setWorking('start');
    const r = await startFirstSync();
    setWorking(null);
    if (!r.ok) setNotice({ tone: 'problem', text: syncProblem(r.code) });
    else if (r.next === 'preview') router.push('/account/first-sync');
    else if (r.next === 'switch') router.push('/account/switch');
  };

  const paused = pausedReason !== null;
  return (
    <View>
      <Section title={copy('sync.section')} />
      <ToggleRow title={copy('sync.toggle')} subtitle={copy('sync.toggle.sub')} value={enabled} disabled={working !== null} onValueChange={toggle} last={!enabled} />
      {/* The status line: one quiet sentence, never a pop-up. */}
      <T v="meta" style={{ marginTop: space.sm }}>{line}</T>
      {enabled && (
        <Button
          kind="secondary"
          label={copy(paused ? 'sync.retry' : 'sync.now')}
          accessibilityHint={copy('hint.sync.now')}
          disabled={busy || working !== null}
          onPress={() => void syncNow()}
          style={{ marginTop: space.md }}
        />
      )}
      <View style={{ marginTop: space.sm }}>
        <SettingsRow title={copy('sync.what.title')} accessibilityHint={copy('hint.sync.what')} onPress={() => router.push('/account/what-syncs')} />
        <SettingsRow
          title={copy('sync.delete.row')}
          subtitle={copy('sync.delete.sub')}
          accessibilityHint={copy('hint.sync.delete')}
          disabled={working !== null}
          onPress={() => router.push('/account/delete-synced')}
          last
        />
      </View>
      {notice && <AccountNotice text={notice.text} tone={notice.tone} />}
    </View>
  );
}

/** The preview's rows: one fact each, three columns (stacked at large text so nothing is cut). */
export function PreviewRows({ rows }: { rows: FirstPreview['rows'] }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const cols = [copy('first.col.phone'), copy('first.col.account'), copy('first.col.after')];
  return (
    <View style={{ marginTop: space.lg }}>
      {rows.map((row, i) => (
        <View
          key={row.label}
          accessible
          accessibilityLabel={copy('first.row.spoken', { label: row.label, phone: row.phone, account: row.account, after: row.after })}
          style={{ paddingVertical: space.md, borderTopWidth: i === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: c.line }}
        >
          <T v="label">{row.label}</T>
          <View style={{ flexDirection: large ? 'column' : 'row', gap: large ? space.xs : space.md, marginTop: space.xs }}>
            {[row.phone, row.account, row.after].map((v, k) => (
              <View key={k} style={{ flex: large ? undefined : 1 }}>
                <T v="meta">{cols[k]}</T>
                {/* "After" is the result: in ink and bold. */}
                <T v={k === 2 ? 'label' : 'body'} color={k === 2 ? c.ink : c.ink2}>
                  {v}
                </T>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
