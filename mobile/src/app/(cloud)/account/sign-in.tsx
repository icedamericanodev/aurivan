/**
 * The sign-in sheet as its own route, aurivan://account/sign-in (spec §2.2).
 * You and Settings open /account, which shows the same sheet while signed
 * out; this route is for places that only need "sign in first" (the
 * feedback board, PR 8). Once signed in it hands over to /account.
 *
 * Takes no link parameters, and starts nothing on its own: every sign-in
 * waits for the learner's tap (and the "16 or older" box).
 */
import { Redirect, router } from 'expo-router';
import { SignInContent } from '../../../components/account';
import { PushedHeader, Screen } from '../../../components/ui';
import { useAccount } from '../../../store/account';

export default function SignIn() {
  const signedIn = useAccount((s) => s.signedIn);
  if (signedIn) return <Redirect href="/account" />;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/you'));
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={close} />
      <SignInContent onClose={close} />
    </Screen>
  );
}
