/**
 * The staff queue (spec §4.2 "Moderation", B7), aurivan://board/moderation.
 * Staff only: the server is asked first (staff-action { whoami }); anyone
 * else gets Today's board back (a Redirect), and every action is checked by
 * the server again. This screen's gate is cosmetic.
 *
 * Held · Reported · Appeals · Members · Log. Each item: why it's here and
 * how long ago, its first lines, who and their history; then the actions
 * (Approve · Remove · Remove + warn · ⋯ for exam content). "Real exam
 * content" reports sort first. At the foot, "Posting: Open" and Pause
 * posting (it asks first): the cover for a 24-hour window nobody can watch
 * (docs/support/PLAYBOOK.md §7).
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { ItemMenu, MenuButton, type MenuItem } from '../../../components/board';
import { ChoiceSheet } from '../../../components/settings';
import { Button, Chip, ChipRow, EmptyState, PushedHeader, Screen, T } from '../../../components/ui';
import type { ModReason, QueueItem, StaffAction, StaffQueue, StaffTab } from '../../../cloud/types';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
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

export default function Moderation() {
  const { c } = useTheme();
  const signedIn = useAccount((s) => s.signedIn);
  const [staff, setStaff] = useState<boolean | null>(null);
  const [tab, setTab] = useState<StaffTab>('held');
  const [queue, setQueue] = useState<StaffQueue | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ item: QueueItem; action: 'remove' | 'remove_warn' } | null>(null);
  const [menuFor, setMenuFor] = useState<QueueItem | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  // The tab asked for last: a slower answer for an earlier tab is dropped.
  const wanted = useRef<StaffTab>(tab);
  const load = useCallback(async (t: StaffTab) => {
    wanted.current = t;
    const r = await loadStaffQueue(t);
    if (wanted.current !== t) return;
    if (r.ok) setQueue(r.queue);
    else setProblem(copy(r.code === 'offline' ? 'board.offline' : 'board.error'));
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      void checkStaff().then((r) => {
        const ok = r.ok && r.staff;
        setStaff(ok);
        if (ok) void load(tab);
      });
    }, [signedIn, load, tab]),
  );

  if (!signedIn || staff === false) return <Redirect href="/board" />;
  if (staff === null) return <Screen edges={['top', 'bottom']}><PushedHeader title={copy('board.staff.title')} onBack={back} /></Screen>;

  // The tab of the list on screen: until a new tab's answer arrives, the old
  // list stays, with its own labels and buttons (never another tab's).
  const shown = queue?.tab ?? tab;
  const act = async (a: StaffAction) => {
    setProblem(null);
    const r = await staffAct(a);
    if (!r.ok) setProblem(copy(r.code === 'offline' ? 'board.offline' : 'err.server'));
    await load(tab);
  };
  const target = (it: QueueItem) => ({ targetKind: (it.kind === 'appeal' ? 'appeal' : it.kind) as StaffAction['targetKind'], targetId: it.id });

  const actions = (it: QueueItem) => {
    if (shown === 'log') return null;
    if (shown === 'appeals') {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
          <Button kind="secondary" label={copy('board.staff.keep')} onPress={() => void act({ action: 'uphold', ...target(it) })} />
          <Button kind="secondary" label={copy('board.staff.putBack')} onPress={() => void act({ action: 'restore_appeal', ...target(it) })} />
        </View>
      );
    }
    if (shown === 'members') {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
          {it.label === 'active' ? (
            <>
              <Button kind="secondary" label={copy('board.staff.suspend')} onPress={() => void act({ action: 'suspend', targetKind: 'member', targetId: it.id, extra: { days: 7 } })} />
              <Button kind="secondary" label={copy('board.staff.ban')} onPress={() => void act({ action: 'ban', targetKind: 'member', targetId: it.id })} />
            </>
          ) : (
            <Button kind="secondary" label={copy('board.staff.unban')} onPress={() => void act({ action: 'unban', targetKind: 'member', targetId: it.id })} />
          )}
        </View>
      );
    }
    if (it.kind !== 'post' && it.kind !== 'comment') return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
        <Button kind="secondary" label={copy('board.staff.approve')} onPress={() => void act({ action: 'approve', ...target(it) })} />
        <Button kind="secondary" label={copy('board.staff.remove')} onPress={() => setAsking({ item: it, action: 'remove' })} />
        <Button kind="secondary" label={copy('board.staff.removeWarn')} onPress={() => setAsking({ item: it, action: 'remove_warn' })} />
        <MenuButton label={`${copy('board.menu.a11y')}, ${copy('board.staff.title')}`} onPress={() => setMenuFor(it)} />
      </View>
    );
  };

  const menu: MenuItem[] = menuFor
    ? [
        { label: copy('board.staff.deleteExam'), onPress: () => void act({ action: 'delete_exam_content', ...target(menuFor) }), danger: true },
        { label: copy('board.staff.hide'), onPress: () => void act({ action: 'hide', ...target(menuFor) }) },
        ...(shown === 'reported' ? [{ label: copy('board.staff.dismiss'), onPress: () => void act({ action: 'approve', ...target(menuFor) }) }] : []),
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

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={copy('board.staff.title')} onBack={back} right={queue ? <T v="meta">{copy('board.staff.waiting', { n: String(queue.waiting) })}</T> : undefined} />
      <View style={{ marginTop: space.sm }}>
        <ChipRow>
          {TABS.map((t) => (
            <Chip key={t} label={tabLabel(t)} selected={tab === t} onPress={() => setTab(t)} />
          ))}
        </ChipRow>
      </View>
      {problem && <AccountNotice text={problem} />}
      {queue && queue.items.length === 0 && <EmptyState compact title={copy('board.staff.empty')} body={copy('board.staff.posting.open')} />}
      {queue?.items.map((it, i) => (
        <View key={`${it.kind}-${it.id}`} style={{ paddingVertical: space.md, borderBottomWidth: i === queue.items.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
          <T v="label">{headline(shown, it)}</T>
          {it.title ? <T v="body" numberOfLines={2}>{it.title}</T> : null}
          {it.body ? <T v="small" numberOfLines={2} color={c.ink}>{`“${it.body}”`}</T> : null}
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
          if (a) void act({ action: a.action, ...target(a.item), reason });
        }}
        onClose={() => setAsking(null)}
      />
    </Screen>
  );
}
