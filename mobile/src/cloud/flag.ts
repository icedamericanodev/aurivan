/**
 * The ONE switch for accounts, sync and the feedback board (Uplift Phases
 * 6–8, built OFF; spec PHASE6_8.md §1.1).
 *
 * `EXPO_PUBLIC_AURIVAN_CLOUD` is unset in every EAS environment today, and
 * unset means OFF. babel-preset-expo writes `EXPO_PUBLIC_*` values into the
 * bundle at build time, so in a store build `CLOUD` is the literal `false`.
 *
 * Never a remote switch: nothing on a server, in a deep link or in saved
 * data can turn the cloud on. Only a new build with the variable set can.
 *
 * Entry points are wrapped in `{CLOUD && …}`, so with the flag off every
 * screen is exactly what it was before. The cloud runtime itself is only
 * loaded behind an inline check in cloud/backend.ts, which the bundler
 * removes when the flag is off (CI guard G2 greps the bundle to prove it).
 */
import { parseProviders, type Provider } from '../engine/account';

export const CLOUD = process.env.EXPO_PUBLIC_AURIVAN_CLOUD === '1';

/** The sign-in methods this build offers ("email,apple,google" by default). Only read when CLOUD. */
export const PROVIDERS: readonly Provider[] = CLOUD ? parseProviders(process.env.EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS) : [];
