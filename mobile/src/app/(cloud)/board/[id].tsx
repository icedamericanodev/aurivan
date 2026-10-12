/**
 * One post (spec §4.2 "Post detail"), aurivan://board/<id>. The ⋯ menu in
 * the header (Report post · Block {handle} · Edit · Withdraw on your own),
 * the title and meta line, the body (a Content post about a practice
 * question's answer is folded: "Show it"), Vote and Follow, the team's
 * official response, the status history, the comments (each with its own
 * ⋯ menu; one level of replies) and the comment field.
 *
 * - Learners' words are plain Text: no links are made from them.
 * - Reporting hides the post or comment on this phone at once; blocking
 *   hides everything by that learner at once (they aren't told).
 * - Vote, Follow and Comment need an account, then the guidelines gate.
 * - A post you can't see (removed, withdrawn, someone else's waiting post)
 *   says so; a link to it changes nothing.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { BoardCard, ItemMenu, kindLabel, MenuButton, OfficialCard, ReportSheet, StatusTag, TeamBadge, VotePill, type MenuItem } from '../../../components/board';
import { Button, EmptyState, NoteField, PushedHeader, Screen, Section, T } from '../../../components/ui';
import type { Comment, PostDetail } from '../../../cloud/types';
import { copy } from '../../../content/cloud/copy';
import { block, comment, loadPost, needsGate, postProblem, report, setFollow, setVote, statusLabel, useBoard, useBoardSession, visibleComments, withdrawComment, withdrawPost } from '../../../lib/board';
import { shortDate } from '../../../lib/format';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

type Menu = { kind: 'post' } | { kind: 'comment'; c: Comment } | null;
type Reporting = { kind: 'post' | 'comment' | 'member'; id: string } | null;

export default function PostScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const signedIn = useAccount((s) => s.signedIn);
  const me = useBoard((s) => s.me);
  const settings = useBoard((s) => s.settings);
  // Opened directly (a link or a notice): load the session the board would have.
  useBoardSession(signedIn);
  const hiddenPosts = useBoard((s) => s.hiddenPosts);
  const hiddenComments = useBoard((s) => s.hiddenComments);
  const blockedIds = useBoard((s) => s.blockedIds);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'gone' | 'error' | 'offline'>('loading');
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [reporting, setReporting] = useState<Reporting>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  const load = useCallback(async () => {
    const r = typeof id === 'string' ? await loadPost(id) : ({ ok: false, code: 'not_found' } as const);
    if (r.ok) {
      setPost(r.post);
      setState('ready');
    } else setState(r.code === 'not_found' || r.code === 'forbidden' ? 'gone' : r.code === 'offline' ? 'offline' : 'error');
  }, [id]);
  // Each time the post comes to the front (after an edit, or a comment elsewhere).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const mine = !!post && !!me && post.authorId === me.userId;
  const gate = (): boolean => {
    if (!signedIn) {
      router.push('/account/sign-in');
      return false;
    }
    if (needsGate(me, settings)) {
      router.push({ pathname: '/board/guidelines', params: { then: 'back' } });
      return false;
    }
    return true;
  };

  // The Report sheet stays up to say thanks, even though the post it reported is already hidden here.
  const reportSheet = (
    <ReportSheet
      visible={reporting !== null}
      kind={reporting?.kind ?? 'post'}
      onClose={() => {
        const wasPost = reporting?.kind === 'post';
        setReporting(null);
        if (wasPost) back();
      }}
      onSend={(reason, note) => {
        if (reporting) void report(reporting.kind, reporting.id, reason, note);
      }}
    />
  );

  // A post reported from here stays on screen behind the Report sheet's thanks, then the screen goes back.
  const hiddenHere = !!post && ((hiddenPosts.includes(post.id) && reporting?.kind !== 'post') || blockedIds.includes(post.authorId));
  if (state !== 'ready' || !post || hiddenHere) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PushedHeader onBack={back} />
        {state === 'loading' ? null : state === 'offline' ? (
          <AccountNotice text={copy('board.offline')} />
        ) : state === 'error' ? (
          <>
            <AccountNotice text={copy('board.error')} />
            <Button kind="ghost" label={copy('board.retry')} onPress={() => void load()} style={{ alignSelf: 'flex-start' }} />
          </>
        ) : (
          <EmptyState compact title={copy('board.gone')} body={copy('board.empty.body')} />
        )}
        {reportSheet}
      </Screen>
    );
  }

  const vote = () => {
    if (!gate()) return;
    const on = !post.voted;
    setPost({ ...post, voted: on, voteCount: Math.max(0, post.voteCount + (on ? 1 : -1)) });
    void setVote(post.id, on);
  };
  const follow = () => {
    if (!gate()) return;
    setPost({ ...post, following: !post.following });
    void setFollow(post.id, !post.following);
  };
  const confirmBlock = (userId: string, handle: string) => {
    Alert.alert(copy('board.block.title', { handle }), copy('board.block.body'), [
      { text: copy('board.block.cancel'), style: 'cancel' },
      {
        text: copy('board.block.go'),
        style: 'destructive',
        onPress: () => {
          void block(userId);
          if (userId === post.authorId) back();
        },
      },
    ]);
  };
  const confirmWithdraw = (what: 'post' | 'comment', target: string) => {
    Alert.alert(copy(what === 'post' ? 'board.withdraw.confirm' : 'board.withdraw.comment'), undefined, [
      { text: copy('board.menu.cancel'), style: 'cancel' },
      {
        text: copy('board.withdraw.go'),
        style: 'destructive',
        onPress: async () => {
          const r = what === 'post' ? await withdrawPost(target) : await withdrawComment(target);
          if (!r.ok) setNotice(copy(r.code === 'offline' ? 'board.offline' : 'err.server'));
          else if (what === 'post') back();
          else void load();
        },
      },
    ]);
  };

  const postMenu: MenuItem[] = mine
    ? [
        { label: copy('board.menu.edit'), onPress: () => router.push({ pathname: '/board/new', params: { edit: post.id } }) },
        { label: copy('board.menu.withdraw'), onPress: () => confirmWithdraw('post', post.id), danger: true },
      ]
    : [
        { label: copy('board.menu.report.post'), onPress: () => (gate() ? setReporting({ kind: 'post', id: post.id }) : undefined) },
        ...(post.isTeam ? [] : [{ label: copy('board.menu.block', { handle: post.authorHandle }), onPress: () => (gate() ? confirmBlock(post.authorId, post.authorHandle) : undefined) }]),
      ];
  const commentMenu = (cm: Comment): MenuItem[] =>
    me && cm.authorId === me.userId
      ? [{ label: copy('board.menu.withdraw'), onPress: () => confirmWithdraw('comment', cm.id), danger: true }]
      : [
          { label: copy('board.menu.report.comment'), onPress: () => (gate() ? setReporting({ kind: 'comment', id: cm.id }) : undefined) },
          ...(cm.isTeam ? [] : [{ label: copy('board.menu.block', { handle: cm.authorHandle }), onPress: () => (gate() ? confirmBlock(cm.authorId, cm.authorHandle) : undefined) }]),
        ];

  const send = async () => {
    if (!gate() || !text.trim()) return;
    setSending(true);
    setNotice(null);
    const r = await comment(post.id, text, replyTo?.id);
    setSending(false);
    if (r.ok) {
      setText('');
      setReplyTo(null);
      if (r.visibility === 'pending') setNotice(copy('board.held.words'));
      void load();
    } else setNotice(postProblem(r.code, r.detail));
  };

  const comments = visibleComments(post.comments, { hiddenComments, blockedIds });
  const tops = comments.filter((x) => x.parentId === null);
  const repliesTo = (cid: string) => comments.filter((x) => x.parentId === cid);
  const folded = post.discussesAnswer && !showSpoiler;
  const author = (handle: string, team: boolean) => (team ? copy('board.team.badge') : handle);

  const renderComment = (cm: Comment, reply: boolean) => (
    <View key={cm.id} style={{ marginTop: space.md, marginLeft: reply ? space.lg : 0, paddingLeft: reply ? space.md : 0, borderLeftWidth: reply ? 1.5 : 0, borderLeftColor: c.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="meta">{`${author(cm.authorHandle, cm.isTeam)} · ${shortDate(cm.createdAt)}`}</T>
        </View>
        <MenuButton onPress={() => setMenu({ kind: 'comment', c: cm })} />
      </View>
      {/* Plain words: no links are made from a learner's text. */}
      <T v="body">{cm.body}</T>
      {cm.visibility === 'pending' && <T v="meta">{copy('board.yours.held')}</T>}
      {!reply && signedIn && !post.locked && (
        <Button kind="ghost" label={copy('board.reply')} onPress={() => setReplyTo(cm)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
      )}
      {!reply && repliesTo(cm.id).map((r) => renderComment(r, true))}
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader onBack={back} right={<MenuButton onPress={() => setMenu({ kind: 'post' })} />} />
      <T v="hero" accessibilityRole="header" style={{ marginTop: space.sm }}>{post.title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
        <T v="meta">{kindLabel(post.kind)}</T>
        <StatusTag status={post.status} shippedIn={post.shippedIn} />
        {post.isTeam ? <TeamBadge /> : <T v="meta">{post.authorHandle}</T>}
      </View>
      {post.visibility === 'pending' && mine && (
        <BoardCard title={copy('board.held.title')}>
          <T v="small" color={c.ink}>{copy('board.yours.held')}</T>
        </BoardCard>
      )}

      {folded ? (
        <BoardCard tone="soft">
          <T v="small" color={c.ink}>{copy('board.spoiler')}</T>
          <Button kind="ghost" label={copy('board.spoiler.show')} onPress={() => setShowSpoiler(true)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
        </BoardCard>
      ) : post.body ? (
        <T v="body" style={{ marginTop: space.md }}>{post.body}</T>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg }}>
        <VotePill title={post.title} count={post.voteCount} voted={post.voted} onPress={vote} disabled={post.visibility !== 'visible' || post.locked} />
        <Button kind="secondary" label={copy(post.following ? 'board.following' : 'board.follow')} selected={post.following} onPress={follow} style={{ flex: 1 }} />
      </View>

      {post.official && <OfficialCard body={post.official.body} />}

      {post.statusHistory.length > 0 && (
        <>
          <Section title={copy('board.history')} />
          {post.statusHistory.map((h, i) => (
            <View key={`${h.status}-${h.at}-${i}`} style={{ paddingVertical: space.xs }}>
              <T v="small">{`${statusLabel(h.status, h.status === 'shipped' ? post.shippedIn : null)} · ${shortDate(h.at)}`}</T>
              {h.note ? <T v="meta">{h.note}</T> : null}
            </View>
          ))}
        </>
      )}

      <Section title={tops.length === 1 ? copy('board.comments.one') : tops.length ? copy('board.comments.many', { n: String(comments.length) }) : copy('board.comments.none')} />
      {tops.map((cm) => renderComment(cm, false))}

      {post.locked ? (
        <T v="meta" style={{ marginTop: space.lg }}>{copy('board.locked')}</T>
      ) : post.visibility === 'visible' ? (
        <View style={{ marginTop: space.lg }}>
          {replyTo && <T v="meta">{copy('board.comment.reply', { handle: author(replyTo.authorHandle, replyTo.isTeam) })}</T>}
          <NoteField value={text} onChangeText={setText} placeholder={copy('board.comment.field')} accessibilityLabel={replyTo ? copy('board.comment.reply', { handle: replyTo.authorHandle }) : copy('board.comment.field')} maxLength={1000} />
          <Button label={sending ? copy('board.comment.sending') : copy('board.comment.send')} disabled={sending || !text.trim()} onPress={() => void send()} style={{ marginTop: space.sm }} />
          {replyTo && <Button kind="ghost" label={copy('board.menu.cancel')} onPress={() => setReplyTo(null)} style={{ alignSelf: 'center' }} />}
        </View>
      ) : null}
      {notice && <AccountNotice text={notice} />}

      <ItemMenu
        visible={menu !== null}
        title={copy('board.menu.a11y')}
        items={menu?.kind === 'comment' ? commentMenu(menu.c) : postMenu}
        onClose={() => setMenu(null)}
      />
      {reportSheet}
    </Screen>
  );
}
