/**
 * The feedback board (spec §4.2 "Board home"), aurivan://board. Reached from
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
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { BoardFooter, KINDS, PostRow } from '../../../components/board';
import { Button, Chip, ChipRow, EmptyState, ListRow, PushedHeader, Screen, SearchField, Segmented, T } from '../../../components/ui';
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
  // The search the list uses: a moment after the last key, not every keystroke.
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [items, setItems] = useState<PostCard[]>([]);
  const [more, setMore] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'offline' | 'error'>('loading');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/you'));

  const scope = settings?.readScope ?? 'signed_in';
  const canRead = signedIn || scope === 'everyone';

  const load = useCallback(
    async (next = false) => {
      const opened = await openBoard(signedIn);
      if (!opened.ok) {
        setState(opened.code === 'offline' ? 'offline' : 'error');
        return;
      }
      if (!signedIn && opened.settings.readScope !== 'everyone') {
        setItems([]);
        setState('ready');
        return;
      }
      const r = await loadFeed({ cert: cert.id, tab, kind: kind ?? undefined, search: query }, next);
      if (r.ok) {
        setItems(r.items);
        setMore(r.more);
        setState(r.offline ? 'offline' : 'ready');
      } else setState(r.code === 'offline' ? 'offline' : 'error');
    },
    [signedIn, cert.id, tab, kind, query],
  );
  // Each time the board comes to the front (a post or a vote elsewhere shows here).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
  const vote = (p: PostCard) => {
    if (!gateThen('back')) return;
    const on = !p.voted;
    setItems((list) => list.map((x) => (x.id === p.id ? { ...x, voted: on, voteCount: Math.max(0, x.voteCount + (on ? 1 : -1)) } : x)));
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
        right={<Button kind="ghost" label={`+ ${copy('board.new')}`} accessibilityLabel={copy('board.new.a11y')} accessibilityHint={copy('board.hint.compose')} onPress={compose} />}
      />
      <T v="body" style={{ marginTop: space.sm }}>{copy(scope === 'author_staff' ? 'board.sub.own' : 'board.sub')}</T>

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
            <Segmented options={TABS} value={tab} onChange={setTab} accessibilityLabel={copy('board.title')} />
          </View>
          <View style={{ marginTop: space.md }}>
            <ChipRow>
              <Chip label={copy('board.filter.all')} selected={kind === null} onPress={() => setKind(null)} />
              {KINDS.map((k) => (
                <Chip key={k} label={copy(`board.filter.${k}` as AccountCopyKey)} selected={kind === k} onPress={() => setKind(kind === k ? null : k)} />
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
              <Button kind="ghost" label={copy('board.retry')} onPress={() => void load()} style={{ alignSelf: 'flex-start' }} />
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
          {more && <Button kind="secondary" label={copy('board.more')} onPress={() => void load(true)} style={{ marginTop: space.md }} />}
        </>
      )}

      <BoardFooter trademarkNotice={cert.trademarkNotice} />
    </Screen>
  );
}
