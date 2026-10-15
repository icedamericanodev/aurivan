/**
 * The feedback board (spec §4.2 "Board home"), kaisip://board. Reached from
 * You → Account → Feedback board and Settings → Feedback board. No What's
 * next tab: What's next isn't in the app (12 Oct addendum); statuses stay on
 * posts, for their authors and voters.
 *
 * - Top · New · Shipped, the kind chips, search, then the posts (vote pill,
 *   title, "Idea · ◑ Planned · Quiet Cedar 214", comments).
 * - Who reads it is the server's read scope: signed out, the board shows
 *   only when it is 'everyone'; otherwise the sign-in line. With
 *   'author_staff' the intro says only the learner and the team see their
 *   posts.
 * - Vote, Comment and Post need an account (the sign-in sheet), then the
 *   guidelines gate, before anything is sent.
 * - Reported posts and blocked learners disappear here at once.
 * - Staff see a "Moderation" row (the server checks every staff action).
 * - The foot: the published contact, the guidelines, the not-affiliated line.
 * Fix round P8: the session opens when the board comes to the front, not on
 * every tab or search change (CR N10); a slower answer for an earlier tab
 * or search is dropped; two quick taps on a vote pill count as two taps
 * (N11); at large text sizes "+ Post" moves out of the header into the page.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { BoardFooter, KINDS, PostRow } from '../../../components/board';
import { Button, Chip, ChipRow, EmptyState, ListRow, PushedHeader, Screen, SearchField, Segmented, T, useFontScale } from '../../../components/ui';
import type { BoardTab, PostCard, PostKind } from '../../../cloud/types';
import { getCertification } from '../../../content/certifications';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
import { loadFeed, needsGate, openBoard, setVote, useBoard, visibleCards } from '../../../lib/board';
import { useAccount } from '../../../store/account';
import { useSettings } from '../../../store/settings';
import { space } from '../../../theme/tokens';

const TABS: { value: BoardTab; label: string }[] = [
  { value: 'top', label: copy('board.tab.top') },
  { value: 'new', label: copy('board.tab.new') },
  { value: 'shipped', label: copy('board.tab.shipped') },
];

export default function BoardHome() {
  const certId = useSettings((s) => s.activeCertId);
  const cert = getCertification(certId) ?? getCertification('cisa')!;
  const signedIn = useAccount((s) => s.signedIn);
  const settings = useBoard((s) => s.settings);
  const me = useBoard((s) => s.me);
  const staff = useBoard((s) => s.staff);
  const unread = useBoard((s) => s.unread);
  const hiddenPosts = useBoard((s) => s.hiddenPosts);
  const blockedIds = useBoard((s) => s.blockedIds);
  const [tab, setTab] = useState<BoardTab>('top');
  const [kind, setKind] = useState<PostKind | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PostCard[]>([]);
  const [more, setMore] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'offline' | 'error'>('loading');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/you'));
  // At large text sizes (150% and up) the header has no room for "+ Post": it moves into the page.
  const bigText = useFontScale() >= 1.5;

  const scope = settings?.readScope ?? 'signed_in';
  const canRead = signedIn || scope === 'everyone';

  /** What the list shows now (kept for the search pause and the focus reload, which run later). */
  const shownQuery = useRef<{ tab: BoardTab; kind: PostKind | null; query: string }>({ tab: 'top', kind: null, query: '' });
  // The latest request wins: an older tab's or search's slower answer is dropped (CR N10).
  const request = useRef(0);
  /** One page of the board (the session is already open). */
  const loadList = useCallback(
    async (q: { tab: BoardTab; kind: PostKind | null; query: string }, next = false) => {
      shownQuery.current = q;
      const mine = ++request.current;
      // Signed out with a signed-in-only board: there is no list (the page shows the sign-in line).
      if (!signedIn && (useBoard.getState().settings?.readScope ?? 'signed_in') !== 'everyone') return;
      const r = await loadFeed({ cert: cert.id, tab: q.tab, kind: q.kind ?? undefined, search: q.query }, next);
      if (mine !== request.current) return;
      if (r.ok) {
        setItems(r.items);
        setMore(r.more);
        setState(r.offline ? 'offline' : 'ready');
      } else setState(r.code === 'offline' ? 'offline' : 'error');
    },
    [signedIn, cert.id],
  );
  // Each time the board comes to the front (a post or a vote elsewhere shows here), and when the
  // sign-in changes: the session (settings, member, staff, the outbox, the unread count), then the list.
  // A tab, kind or search change loads the list only (CR N10: no new session each time).
  const open = useCallback(async () => {
    const r = await openBoard(signedIn);
    if (!r.ok) setState(r.code === 'offline' ? 'offline' : 'error');
    else await loadList(shownQuery.current);
  }, [signedIn, loadList]);
  useFocusEffect(
    useCallback(() => {
      void open();
    }, [open]),
  );
  const chooseTab = (t: BoardTab) => {
    setTab(t);
    void loadList({ ...shownQuery.current, tab: t });
  };
  const chooseKind = (k: PostKind | null) => {
    setKind(k);
    void loadList({ ...shownQuery.current, kind: k });
  };
  // The search the list uses: a moment after the last key, not every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      if (search !== shownQuery.current.query) void loadList({ ...shownQuery.current, query: search });
    }, 300);
    return () => clearTimeout(t);
  }, [search, loadList]);

  /** Vote, Comment and Post: an account first, then the guidelines gate. */
  const gateThen = (then: 'back' | 'compose'): boolean => {
    if (!signedIn) {
      router.push('/account/sign-in');
      return false;
    }
    if (needsGate(me, settings)) {
      router.push({ pathname: '/board/guidelines', params: { then } });
      return false;
    }
    return true;
  };
  // The vote as last tapped, per post: two taps in one render each count (CR N11).
  const votedRef = useRef(new Map<string, boolean>());
  useEffect(() => {
    votedRef.current.clear();
  }, [items]);
  const vote = (p: PostCard) => {
    if (!gateThen('back')) return;
    const on = !(votedRef.current.get(p.id) ?? p.voted);
    votedRef.current.set(p.id, on);
    setItems((list) => list.map((x) => (x.id === p.id ? { ...x, voted: on, voteCount: Math.max(0, x.voteCount + (on === x.voted ? 0 : on ? 1 : -1)) } : x)));
    void setVote(p.id, on);
  };
  const compose = () => {
    if (gateThen('compose')) router.push('/board/new');
  };

  const shown = visibleCards(items, { hiddenPosts, blockedIds });
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader
        title={copy('board.title')}
        onBack={back}
        right={bigText ? undefined : <Button kind="ghost" label={`+ ${copy('board.new')}`} accessibilityLabel={copy('board.new.a11y')} accessibilityHint={copy('board.hint.compose')} onPress={compose} />}
      />
      <T v="body" style={{ marginTop: space.sm }}>{copy(scope === 'author_staff' ? 'board.sub.own' : 'board.sub')}</T>
      {bigText && (
        <Button kind="secondary" label={`+ ${copy('board.new')}`} accessibilityLabel={copy('board.new.a11y')} accessibilityHint={copy('board.hint.compose')} onPress={compose} style={{ marginTop: space.md }} />
      )}

      {!signedIn && (
        <View style={{ marginTop: space.md }}>
          <T v="small">{copy(scope === 'everyone' ? 'board.signin' : 'board.signin.read')}</T>
          <Button kind="secondary" label={copy('board.signin.go')} onPress={() => router.push('/account/sign-in')} style={{ marginTop: space.sm }} />
        </View>
      )}

      {signedIn && (
        <View style={{ marginTop: space.md }}>
          <ListRow
            title={copy('board.settings.activity')}
            subtitle={unread ? copy('board.activity.unread') : undefined}
            accessibilityLabel={`${copy('board.settings.activity')}${unread ? `, ${copy('board.activity.unread')}` : ''}`}
            onPress={() => router.push('/board/activity')}
            last={!staff}
          />
          {staff && <ListRow title={copy('board.settings.moderation')} onPress={() => router.push('/board/moderation')} last />}
        </View>
      )}

      {canRead && (
        <>
          <View style={{ marginTop: space.lg }}>
            <Segmented options={TABS} value={tab} onChange={chooseTab} accessibilityLabel={copy('board.title')} />
          </View>
          <View style={{ marginTop: space.md }}>
            <ChipRow>
              <Chip label={copy('board.filter.all')} selected={kind === null} onPress={() => chooseKind(null)} />
              {KINDS.map((k) => (
                <Chip key={k} label={copy(`board.filter.${k}` as AccountCopyKey)} selected={kind === k} onPress={() => chooseKind(kind === k ? null : k)} />
              ))}
            </ChipRow>
          </View>
          <View style={{ marginTop: space.md }}>
            <SearchField value={search} onChangeText={setSearch} placeholder={copy('board.search')} accessibilityLabel={copy('board.search')} />
          </View>
          {state === 'offline' && <AccountNotice text={copy('board.offline')} />}
          {state === 'error' && (
            <>
              <AccountNotice text={copy('board.error')} />
              <Button kind="ghost" label={copy('board.retry')} onPress={() => void open()} style={{ alignSelf: 'flex-start' }} />
            </>
          )}
          <View style={{ marginTop: space.sm }}>
            {shown.map((p, i) => (
              <PostRow key={p.id} post={p} onVote={() => vote(p)} last={i === shown.length - 1} />
            ))}
          </View>
          {state === 'ready' && shown.length === 0 && (
            query.trim() ? <T v="body" style={{ marginTop: space.lg }}>{copy('board.empty.search')}</T> : <EmptyState compact title={copy('board.empty.title')} body={copy('board.empty.body')} />
          )}
          {more && <Button kind="secondary" label={copy('board.more')} onPress={() => void loadList(shownQuery.current, true)} style={{ marginTop: space.md }} />}
        </>
      )}

      <BoardFooter trademarkNotice={cert.trademarkNotice} />
    </Screen>
  );
}
