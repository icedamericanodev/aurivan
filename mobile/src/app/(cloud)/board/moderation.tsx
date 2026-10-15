/**
 * The staff queue (spec §4.2 "Moderation", B7), kaisip://board/moderation.
 * Staff only: the server is asked first (staff-action { whoami }); anyone
 * else gets Today's board back (a Redirect), and every action is checked by
 * the server again. This screen's gate is cosmetic.
 *
 * Held · Reported · Appeals · Members · Log. Each item: why it's here and
 * how long ago, its first lines, who and their history; then the actions
 * (Approve · Remove · Remove + warn · ⋯ for exam content, hiding and
 * folding). "Real exam content" reports sort first. At the foot,
 * "Posting: Open" and Pause posting (it asks first): the cover for a
 * 24-hour window nobody can watch (docs/support/PLAYBOOK.md §7).
 *
 * Fix round P8:
 * - The list on screen is always the selected tab's (CR B5): the staff
 *   check runs when the screen comes to the front (not on every tab
 *   change), the list loads when a tab is picked (or after an action, for
 *   the tab selected THEN), and an answer for any other tab, or a late
 *   staff check, is dropped.
 * - Suspend, Ban, Remove and Remove + warn ask why; Ban and "Delete exam
 *   content" ask again before anything happens (UX H5). Each action says
 *   "Done." to screen readers.
 * - A reported member can be dismissed, suspended or banned from the
 *   Reported tab; Members has Rename for an offensive name (CR N4, SEC B1).
 *
 * Re-review RR_P8 R1 (report, then edit): a reported item shows its words
 * as they are NOW. If they were edited after the first report, the row says
 * so and shows what was reported (the first report's words, and the latest
 * report's when they differ). Dismiss sends the edit time staff saw; if the
 * words changed since, the server refuses it, nothing is closed, and the
 * new words load with a note saying so.
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Alert, View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { ItemMenu, MenuButton, type MenuItem } from '../../../components/board';
import { ChoiceSheet } from '../../../components/settings';
import { Button, Chip, ChipRow, EmptyState, PushedHeader, Screen, T } from '../../../components/ui';
import type { ModReason, QueueItem, StaffAction, StaffQueue, StaffTab } from '../../../cloud/types';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
import { sayLater } from '../../../lib/a11y';
import { checkStaff, loadStaffQueue, staffAct, timeAgo } from '../../../lib/board';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

const TABS: StaffTab[] = ['held', 'reported', 'appeals', 'members', 'log'];
const MOD_REASONS: ModReason[] = ['exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic'];
const tabLabel = (t: StaffTab) => copy(`board.staff.tab.${t}` as AccountCopyKey);

/** "Held · exam recall · 2 h ago" / "Reported ×3 · spam · 40 min ago". */
function headline(tab: StaffTab, it: QueueItem): string {
  if (tab === 'held') return `${tabLabel('held')} · ${copy(`board.staff.label.${it.label}` as AccountCopyKey)} · ${timeAgo(it.at)}`;
  if (tab === 'reported') {
    const reasons = it.label
      .split(', ')
      .map((r) => copy(`board.report.reason.${r}` as AccountCopyKey).toLowerCase())
      .join(', ');
    return `${copy('board.staff.reports', { n: String(it.count) })} · ${reasons} · ${timeAgo(it.at)}`;
  }
  if (tab === 'appeals') return `${tabLabel('appeals')} · ${it.label} · ${timeAgo(it.at)}`;
  if (tab === 'members') return `${it.handle ?? ''} · ${it.label}`;
  return `${it.label}${it.title ? ` · ${it.title}` : ''} · ${timeAgo(it.at)}`;
}

/** Reported words on one line: a post's are "title\nbody", shown as "title · body". */
const oneLine = (s: string) => s.split('\n').filter(Boolean).join(' · ');

/** What a reason is asked for. */
type Asking = { item: QueueItem; action: 'remove' | 'remove_warn' | 'suspend' | 'ban' } | null;

export default function Moderation() {
  const { c } = useTheme();
  const signedIn = useAccount((s) => s.signedIn);
  const known = useAccount((s) => s.known);
  const [staff, setStaff] = useState<boolean | null>(null);
  const [tab, setTab] = useState<StaffTab>('held');
  const [queue, setQueue] = useState<StaffQueue | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState<Asking>(null);
  const [menuFor, setMenuFor] = useState<QueueItem | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  // The tab asked for last: an answer for any other tab is dropped (CR B5).
  const wanted = useRef<StaffTab>(tab);
  const load = useCallback(async (t: StaffTab) => {
    wanted.current = t;
    const r = await loadStaffQueue(t);
    if (wanted.current !== t) return;
    if (r.ok) {
      setProblem(null);
      setQueue(r.queue);
    } else setProblem(copy(r.code === 'offline' ? 'board.offline' : 'board.error'));
  }, []);
  // The staff check, each time the screen comes to the front; then the selected tab's list.
  // A late answer (after leaving) is dropped.
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      let live = true;
      void checkStaff().then((r) => {
        if (!live) return;
        const ok = r.ok && r.staff;
        setStaff(ok);
        if (ok) void load(wanted.current);
      });
      return () => {
        live = false;
      };
    }, [signedIn, load]),
  );
  /** A tab: its list (the staff check isn't asked again). */
  const chooseTab = (t: StaffTab) => {
    setTab(t);
    void load(t);
  };

  if (!known) return <Screen edges={['top', 'bottom']}><PushedHeader title={copy('board.staff.title')} onBack={back} /></Screen>;
  if (!signedIn || staff === false) return <Redirect href="/board" />;
  if (staff === null) return <Screen edges={['top', 'bottom']}><PushedHeader title={copy('board.staff.title')} onBack={back} /></Screen>;

  // The tab of the list on screen: until a new tab's answer arrives, the old
  // list stays, with its own labels and buttons (never another tab's).
  const shown = queue?.tab ?? tab;
  const act = async (a: StaffAction) => {
    setProblem(null);
    const r = await staffAct(a);
    // The list for the tab selected NOW (the learner may have moved on while this ran).
    await load(wanted.current);
    // After the reload, so a fresh list doesn't wipe the note. 'conflict': a Dismiss of
    // words edited since staff read them (RR_P8 R1); the reload just showed the new words.
    if (!r.ok) setProblem(copy(r.code === 'offline' ? 'board.offline' : r.code === 'conflict' ? 'board.staff.changed' : 'err.server'));
    else sayLater(copy('board.staff.done'));
  };
  const target = (it: QueueItem) => ({ targetKind: (it.kind === 'appeal' ? 'appeal' : it.kind) as StaffAction['targetKind'], targetId: it.id });
  /** "Approve: Timer keeps running…" (the button's spoken name says which item). */
  const named = (label: string, it: QueueItem) => `${label}: ${it.title ?? it.handle ?? it.label}`;
  const confirm = (title: string, body: string, go: string, run: () => void) =>
    Alert.alert(title, body, [
      { text: copy('board.menu.cancel'), style: 'cancel' },
      { text: go, style: 'destructive', onPress: run },
    ]);
  // With the edit time on the row staff read: words edited since are refused, not dismissed blind (RR_P8 R1).
  const dismiss = (it: QueueItem) => void act({ action: 'dismiss', targetKind: 'report', targetId: it.id, extra: { kind: it.kind, editedAt: it.editedAt ?? null } });
  const rename = (it: QueueItem) =>
    confirm(copy('board.staff.rename'), copy('board.staff.rename.confirm', { handle: it.handle ?? '' }), copy('board.staff.rename'), () => void act({ action: 'rename', targetKind: 'member', targetId: it.id }));

  const row = (children: ReactNode) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>{children}</View>;
  const actions = (it: QueueItem) => {
    if (shown === 'log') return null;
    if (shown === 'appeals') {
      return row(
        <>
          <Button kind="secondary" label={copy('board.staff.keep')} accessibilityLabel={named(copy('board.staff.keep'), it)} onPress={() => void act({ action: 'uphold', ...target(it) })} />
          <Button kind="secondary" label={copy('board.staff.putBack')} accessibilityLabel={named(copy('board.staff.putBack'), it)} onPress={() => void act({ action: 'restore_appeal', ...target(it) })} />
        </>,
      );
    }
    if (it.kind === 'member') {
      // Members tab, or a reported member: suspend or ban (each asks why), rename, or (reported) dismiss.
      const active = shown === 'reported' || it.label === 'active';
      return row(
        <>
          {active ? (
            <>
              <Button kind="secondary" label={copy('board.staff.suspend')} accessibilityLabel={named(copy('board.staff.suspend'), it)} onPress={() => setAsking({ item: it, action: 'suspend' })} />
              <Button kind="secondary" label={copy('board.staff.ban')} accessibilityLabel={named(copy('board.staff.ban'), it)} onPress={() => setAsking({ item: it, action: 'ban' })} />
            </>
          ) : (
            <Button kind="secondary" label={copy('board.staff.unban')} accessibilityLabel={named(copy('board.staff.unban'), it)} onPress={() => void act({ action: 'unban', targetKind: 'member', targetId: it.id })} />
          )}
          {shown === 'reported' ? (
            <Button kind="secondary" label={copy('board.staff.dismiss')} accessibilityLabel={named(copy('board.staff.dismiss'), it)} onPress={() => dismiss(it)} />
          ) : (
            <Button kind="secondary" label={copy('board.staff.rename')} accessibilityLabel={named(copy('board.staff.rename'), it)} onPress={() => rename(it)} />
          )}
        </>,
      );
    }
    if (it.kind !== 'post' && it.kind !== 'comment') return null;
    return row(
      <>
        <Button kind="secondary" label={copy('board.staff.approve')} accessibilityLabel={named(copy('board.staff.approve'), it)} onPress={() => void act({ action: 'approve', ...target(it) })} />
        <Button kind="secondary" label={copy('board.staff.remove')} accessibilityLabel={named(copy('board.staff.remove'), it)} onPress={() => setAsking({ item: it, action: 'remove' })} />
        <Button kind="secondary" label={copy('board.staff.removeWarn')} accessibilityLabel={named(copy('board.staff.removeWarn'), it)} onPress={() => setAsking({ item: it, action: 'remove_warn' })} />
        <MenuButton label={`${copy('board.menu.a11y')}, ${it.title ?? it.handle ?? copy('board.staff.title')}`} onPress={() => setMenuFor(it)} />
      </>,
    );
  };

  const menu: MenuItem[] = menuFor
    ? [
        {
          label: copy('board.staff.deleteExam'),
          onPress: () => {
            const it = menuFor;
            confirm(copy('board.staff.deleteExam'), copy('board.staff.deleteExam.confirm'), copy('board.staff.deleteExam'), () => void act({ action: 'delete_exam_content', ...target(it) }));
          },
          danger: true,
        },
        { label: copy('board.staff.hide'), onPress: () => void act({ action: 'hide', ...target(menuFor) }) },
        ...(menuFor.kind === 'post'
          ? [
              { label: copy('board.staff.spoiler'), onPress: () => void act({ action: 'spoiler', targetKind: 'post', targetId: menuFor.id, extra: { on: true } }) },
              { label: copy('board.staff.unspoiler'), onPress: () => void act({ action: 'spoiler', targetKind: 'post', targetId: menuFor.id, extra: { on: false } }) },
            ]
          : []),
        ...(shown === 'reported' ? [{ label: copy('board.staff.dismiss'), onPress: () => dismiss(menuFor) }] : []),
      ]
    : [];

  const pause = () => {
    if (!queue) return;
    if (!queue.postingOpen) return void act({ action: 'reopen', targetKind: 'board' });
    Alert.alert(copy('board.staff.pause'), copy('board.staff.pause.confirm'), [
      { text: copy('board.menu.cancel'), style: 'cancel' },
      { text: copy('board.staff.pause'), onPress: () => void act({ action: 'pause', targetKind: 'board' }) },
    ]);
  };

  /** A reason was chosen: act (a ban asks once more first). */
  const withReason = (a: NonNullable<Asking>, reason: ModReason) => {
    if (a.action === 'ban') {
      confirm(copy('board.staff.ban'), copy('board.staff.ban.confirm', { handle: a.item.handle ?? '' }), copy('board.staff.ban'), () => void act({ action: 'ban', targetKind: 'member', targetId: a.item.id, reason }));
    } else if (a.action === 'suspend') {
      void act({ action: 'suspend', targetKind: 'member', targetId: a.item.id, reason, extra: { days: 7 } });
    } else {
      void act({ action: a.action, ...target(a.item), reason });
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={copy('board.staff.title')} onBack={back} right={queue ? <T v="meta">{copy('board.staff.waiting', { n: String(queue.waiting) })}</T> : undefined} />
      <View style={{ marginTop: space.sm }}>
        <ChipRow>
          {TABS.map((t) => (
            <Chip key={t} label={tabLabel(t)} selected={tab === t} onPress={() => chooseTab(t)} />
          ))}
        </ChipRow>
      </View>
      {problem && <AccountNotice text={problem} />}
      {queue && queue.items.length === 0 && <EmptyState compact title={copy('board.staff.empty')} body={copy('board.staff.empty.body')} />}
      {queue?.items.map((it, i) => (
        <View key={`${it.kind}-${it.id}`} style={{ paddingVertical: space.md, borderBottomWidth: i === queue.items.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
          <T v="label">{headline(shown, it)}</T>
          {it.title ? <T v="body" numberOfLines={2}>{it.title}</T> : null}
          {it.body ? <T v="small" numberOfLines={2} color={c.ink}>{`“${it.body}”`}</T> : null}
          {shown === 'reported' && it.editedSinceReport ? (
            <>
              <T v="meta">{copy('board.staff.edited')}</T>
              {it.reportedFirst ? <T v="small" numberOfLines={3}>{copy('board.staff.reportedFirst', { text: oneLine(it.reportedFirst) })}</T> : null}
              {it.reportedLast && it.reportedLast !== it.reportedFirst ? (
                <T v="small" numberOfLines={3}>{copy('board.staff.reportedLast', { text: oneLine(it.reportedLast) })}</T>
              ) : null}
            </>
          ) : null}
          {shown !== 'log' && shown !== 'members' && it.handle ? (
            <T v="meta">{[it.handle, it.newMember ? copy('board.staff.newMember') : null, copy('board.staff.prior', { n: String(it.priorActions) })].filter(Boolean).join(' · ')}</T>
          ) : null}
          {actions(it)}
        </View>
      ))}

      {queue && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md, marginTop: space.xl }}>
          <T v="body">{copy(queue.postingOpen ? 'board.staff.posting.open' : 'board.staff.posting.paused')}</T>
          <Button kind={queue.postingOpen ? 'secondary' : 'primary'} label={copy(queue.postingOpen ? 'board.staff.pause' : 'board.staff.reopen')} onPress={pause} />
        </View>
      )}

      <ItemMenu visible={menuFor !== null} title={copy('board.staff.title')} items={menu} onClose={() => setMenuFor(null)} />
      <ChoiceSheet
        visible={asking !== null}
        title={copy('board.staff.reason')}
        value={null}
        options={MOD_REASONS.map((r) => ({ value: r, title: copy(`board.report.reason.${r}` as AccountCopyKey) }))}
        onChange={(reason) => {
          const a = asking;
          setAsking(null);
          if (a) withReason(a, reason);
        }}
        onClose={() => setAsking(null)}
      />
    </Screen>
  );
}
