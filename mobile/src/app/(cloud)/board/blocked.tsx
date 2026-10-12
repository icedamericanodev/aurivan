/**
 * Blocked learners (spec §4.1 B5), aurivan://board/blocked, from Settings →
 * Feedback board. Each blocked learner's name and "Unblock". Blocking hides
 * their posts and comments for you everywhere, and they can't comment on
 * your posts; they aren't told either way.
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { Button, EmptyState, PushedHeader, Screen, T } from '../../../components/ui';
import type { Member } from '../../../cloud/types';
import { copy } from '../../../content/cloud/copy';
import { loadBlocked, unblock } from '../../../lib/board';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

export default function Blocked() {
  const { c } = useTheme();
  const signedIn = useAccount((s) => s.signedIn);
  const known = useAccount((s) => s.known);
  const [members, setMembers] = useState<Member[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'problem'>('loading');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      void loadBlocked().then((r) => {
        if (r.ok) setMembers(r.members);
        setState(r.ok ? 'ready' : 'problem');
      });
    }, [signedIn]),
  );
  // Until the phone knows who is signed in, nothing (never "Sign in" to a signed-in learner: CR B1).
  if (!known) return <Screen edges={['top', 'bottom']}><PushedHeader title={copy('board.blocked.title')} onBack={back} /></Screen>;
  if (!signedIn) return <Redirect href="/account/sign-in" />;

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={copy('board.blocked.title')} onBack={back} />
      {state === 'problem' && <AccountNotice text={copy('board.error')} />}
      {state === 'ready' && members.length === 0 && <EmptyState compact title={copy('board.blocked.title')} body={copy('board.blocked.empty')} />}
      {members.map((m, i) => (
        <View
          key={m.memberId}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: i === members.length - 1 ? 0 : 1, borderBottomColor: c.line }}
        >
          <T v="body" style={{ flex: 1 }}>{m.handle}</T>
          <Button
            kind="secondary"
            label={copy('board.unblock')}
            accessibilityLabel={`${copy('board.unblock')} ${m.handle}`}
            onPress={() => {
              setMembers((list) => list.filter((x) => x.memberId !== m.memberId));
              void unblock(m.memberId);
            }}
          />
        </View>
      ))}
    </Screen>
  );
}
