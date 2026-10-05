/** Entry point: first-timers go to onboarding, everyone else to Home. */
import { Redirect } from 'expo-router';
import { useSettings } from '../store/settings';

export default function Index() {
  const onboarded = useSettings((s) => s.onboarded);
  return <Redirect href={onboarded ? '/home' : '/onboarding'} />;
}
