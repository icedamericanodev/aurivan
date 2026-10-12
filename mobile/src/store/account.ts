/**
 * Account store (Uplift Phase 6, built OFF; spec §2.6): facts ABOUT the
 * learner's account that the screens show at once, without asking the
 * server. NON-SECRET ONLY:
 * - no token, no code, no full email, no account id (the session lives in
 *   the phone's secure key store: cloud/secureSession.ts);
 * - `syncedAccountHash` is the SHA-256 of the account id (PR 7 uses it to
 *   notice a different account signing in on a shared phone).
 *
 * Saved as `aurivan.account.v1`. Never part of a backup file and never
 * synced (engine/backup.ts only reads the settings and progress stores).
 *
 * With the flag OFF nothing reads or writes it: `skipHydration` stops the
 * read on import, and only lib/account.ts (cloud builds) ever loads or sets
 * it, so an OFF build touches no new storage key at all.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Provider } from '../engine/account';
import { persistStorage } from './storage';

export interface AccountFacts {
  signedIn: boolean;
  /** "j•••@gmail.com"; null when signed out or for an Apple hidden address. */
  emailMasked: string | null;
  providers: Provider[];
  /** SHA-256 of the account id this phone last synced with (PR 7). */
  syncedAccountHash: string | null;
  /**
   * The phone was signed in, but the session is gone (a restored phone: the
   * secure key store isn't in backups). The row says "Sign in again to keep syncing".
   */
  expired: boolean;
}

interface AccountState extends AccountFacts {
  /**
   * The phone knows who is signed in: the saved facts were loaded and
   * compared with the session (lib/account.ts initAccount), or a screen set
   * them. Never saved. Until then a board screen opened from a link shows
   * nothing rather than send a signed-in learner to "Sign in" (fix round
   * P8, CR B1).
   */
  known: boolean;
  setFacts: (f: Partial<AccountFacts>) => void;
}

export const SIGNED_OUT: AccountFacts = { signedIn: false, emailMasked: null, providers: [], syncedAccountHash: null, expired: false };

export const useAccount = create<AccountState>()(
  persist(
    (set) => ({
      ...SIGNED_OUT,
      known: false,
      setFacts: (f) => set({ ...f, known: true }),
    }),
    {
      name: 'aurivan.account.v1',
      storage: persistStorage,
      version: 1,
      // Never read on import: lib/account.ts initAccount() reads it, in a cloud build only.
      skipHydration: true,
      partialize: (s): AccountFacts => ({
        signedIn: s.signedIn,
        emailMasked: s.emailMasked,
        providers: s.providers,
        syncedAccountHash: s.syncedAccountHash,
        expired: s.expired,
      }),
    },
  ),
);
