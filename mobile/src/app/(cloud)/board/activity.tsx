/**
 * Your activity (spec §4.2), aurivan://board/activity: your posts and their
 * statuses (a waiting one says so), then the notices (status changes, the
 * team's replies, replies, and moderation: a removal with its reason and
 * "Ask us to look again" for 14 days, a warning, a suspension, an appeal's
 * outcome). New notices have a dot; opening the screen marks them read.
 * No push notifications: this is the only place they appear.
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { BoardCard, PostRow } from '../../../components/board';
import { Sheet } from '../../../components/settings';
import { Button, EmptyState, NoteField, PushedHeader, Screen, Section, T } from '../../../components/ui';
import type { Notice, PostCard } from '../../../cloud/types';
import { copy } from '../../../content/cloud/copy';
import { appeal, loadInbox, loadMyPosts, markRead, noticeText } from '../../../lib/board';
import { shortDate } from '../../../lib/format';
import { useAccount } from '../../../store/account';
import { radius, space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

export default function Activity() {
  const { c } = useTheme();
  const signedIn = useAccount((s) => s.signedIn);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline' | 'error'>('loading');
  const [appealFor, setAppealFor] = useState<Notice | null>(null);
  const [note, setNote] = useState('');
  const [appealDone, setAppealDone] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  const load = useCallback(async () => {
    const [p, n] = await Promise.all([loadMyPosts(), loadInbox()]);
    if (p.ok) setPosts(p.items);
    if (n.ok) {
      setNotices(n.notices);
      void markRead(n.notices.filter((x) => !x.read).map((x) => x.id));
    }
    setState(p.ok && n.ok ? 'ready' : !p.ok && p.code === 'offline' ? 'offline' : 'error');
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (signedIn) void load();
    }, [load, signedIn]),
  );

  if (!signedIn) return <Redirect href="/account/sign-in" />;

  const sendAppeal = async () => {
    if (!appealFor) return;
    const kind = appealFor.targetKind === 'comment' ? 'comment' : 'post';
    const id = kind === 'comment' ? appealFor.commentId : appealFor.postId;
    if (!id) return;
    const r = await appeal(kind, id, note);
    setAppealDone(r.ok ? copy('board.appeal.done') : copy(r.code === 'offline' ? 'board.offline' : 'err.server'));
    if (r.ok) setNotices((list) => list.map((n) => (n.id === appealFor.id ? { ...n, canAppeal: false } : n)));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={copy('board.activity.title')} onBack={back} />
      {state === 'offline' && <AccountNotice text={copy('board.offline')} />}
      {state === 'error' && <AccountNotice text={copy('board.error')} />}

      <Section title={copy('board.activity.notices')} />
      {notices.length === 0 && state === 'ready' ? (
        <EmptyState compact title={copy('board.empty.title')} body={copy('board.activity.empty')} />
      ) : (
        notices.map((n, i) => (
          <View key={n.id} style={{ paddingVertical: space.md, borderBottomWidth: i === notices.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              {!n.read && <View accessibilityLabel={copy('board.activity.unread')} style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: c.accentText }} />}
              <T v="meta">{shortDate(n.at)}</T>
            </View>
            <T v="body" style={{ marginTop: space.xs }}>{noticeText(n)}</T>
            {n.canAppeal && <Button kind="secondary" label={copy('board.appeal.button')} onPress={() => setAppealFor(n)} style={{ marginTop: space.sm }} />}
            {n.postId && n.kind !== 'removed' && n.kind !== 'appeal' && (
              <Button kind="ghost" label={copy('board.activity.open')} onPress={() => router.push({ pathname: '/board/[id]', params: { id: n.postId! } })} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
            )}
          </View>
        ))
      )}

      <Section title={copy('board.activity.posts')} />
      {posts.map((p, i) => (
        <View key={p.id}>
          <PostRow post={p} last={i === posts.length - 1 && p.visibility !== 'pending'} />
          {p.visibility === 'pending' && (
            <BoardCard title={copy('board.held.title')}>
              <T v="small" color={c.ink}>{p.holdReason === 'recall' ? copy('board.held.recall') : p.holdReason === 'new_member' ? copy('board.held.body') : copy('board.held.words')}</T>
            </BoardCard>
          )}
        </View>
      ))}

      <Sheet
        visible={appealFor !== null}
        onClose={() => {
          setAppealFor(null);
          setAppealDone(null);
          setNote('');
        }}
        title={copy('board.appeal.title')}
        closeLabel={appealDone ? copy('board.held.done') : copy('board.menu.cancel')}
        footer={appealDone ? null : <Button label={copy('board.appeal.send')} onPress={() => void sendAppeal()} />}
      >
        {appealDone ? (
          <T v="body">{appealDone}</T>
        ) : (
          <>
            {appealFor && <T v="small" style={{ marginBottom: space.sm }}>{noticeText(appealFor)}</T>}
            <NoteField value={note} onChangeText={setNote} placeholder={copy('board.appeal.field')} accessibilityLabel={copy('board.appeal.field')} maxLength={1000} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
