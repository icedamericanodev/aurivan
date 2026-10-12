/**
 * "Post publicly instead ›" (Uplift Phase 8, built OFF; spec §4.6): one line
 * in the Send feedback sheet for "An idea", and in an app problem's report
 * sheet, in a cloud build, signed in. What the learner typed goes with it
 * into the composer's details (it only prefills: nothing is posted without
 * a tap; fix round P8, CR nit 10). Never on a question's report: those stay
 * private.
 *
 * Its own small file on purpose: the feedback sheet (components/support.tsx)
 * is reachable from question, mock, lesson and game screens, which must not
 * import the account, sync or board glue (the transitive-import guards in
 * plant-proud-118.test.tsx). This file needs only the flag, the account
 * facts and the words: "signed in" is only ever true in a cloud build that
 * has a backend (lib/account.ts sets it), so the flag and the facts say
 * enough.
 */
import { router } from 'expo-router';
import { CLOUD } from '../cloud/flag';
import { copy } from '../content/cloud/copy';
import { useAccount } from '../store/account';
import { space } from '../theme/tokens';
import { Button } from './ui';

export function PostPubliclyLine({ onGo, kind = 'idea', text = '' }: { onGo: () => void; kind?: 'idea' | 'app'; text?: string }) {
  const signedIn = useAccount((s) => s.signedIn);
  if (!CLOUD || !signedIn) return null;
  const body = text.trim().slice(0, 2000);
  return (
    <Button
      kind="ghost"
      label={copy('board.publicInstead')}
      accessibilityHint={copy('board.hint.publicInstead')}
      onPress={() => {
        onGo();
        router.push({ pathname: '/board/new', params: { kind, ...(body ? { body } : {}) } });
      }}
      style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
    />
  );
}
