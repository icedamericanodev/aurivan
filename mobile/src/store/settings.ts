/**
 * Settings store — learner preferences, saved on-device.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CERT_ID } from '../content/certifications';
import { persistStorage } from './storage';

export type ThemePref = 'system' | 'dark' | 'light';

interface SettingsState {
  onboarded: boolean;
  activeCertId: string;
  examDates: Record<string, string | undefined>; // certId → "YYYY-MM-DD"
  theme: ThemePref;
  shuffleOptions: boolean;
  dailyGoal: number; // questions per day
  reminder: { enabled: boolean; hour: number; minute: number };
  /** Gentle vibrations on select, submit and milestones. On by default. */
  haptics: boolean;
  /** Games whose rules the learner has already seen (shown once, then behind an info button). */
  gameRulesSeen: string[];

  completeOnboarding: (certId: string, examDate?: string) => void;
  setActiveCert: (certId: string) => void;
  setExamDate: (certId: string, date?: string) => void;
  setTheme: (t: ThemePref) => void;
  setShuffle: (v: boolean) => void;
  setDailyGoal: (n: number) => void;
  setReminder: (r: SettingsState['reminder']) => void;
  setHaptics: (v: boolean) => void;
  markRulesSeen: (gameId: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      onboarded: false,
      activeCertId: DEFAULT_CERT_ID,
      examDates: {},
      theme: 'system',
      shuffleOptions: true,
      dailyGoal: 20,
      reminder: { enabled: false, hour: 19, minute: 0 },
      // Older saves have no `haptics` key: persist merges this default in, so it stays on.
      haptics: true,
      // Older saves have no key: persist merges this default in (rules show once).
      gameRulesSeen: [],

      completeOnboarding: (certId, examDate) =>
        set((s) => ({
          onboarded: true,
          activeCertId: certId,
          examDates: { ...s.examDates, [certId]: examDate },
        })),
      setActiveCert: (certId) => set({ activeCertId: certId }),
      setExamDate: (certId, date) =>
        set((s) => ({ examDates: { ...s.examDates, [certId]: date } })),
      setTheme: (theme) => set({ theme }),
      setShuffle: (shuffleOptions) => set({ shuffleOptions }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setReminder: (reminder) => set({ reminder }),
      setHaptics: (haptics) => set({ haptics }),
      markRulesSeen: (gameId) =>
        set((s) => (s.gameRulesSeen.includes(gameId) ? s : { gameRulesSeen: [...s.gameRulesSeen, gameId] })),
    }),
    { name: 'aurivan.settings.v1', storage: persistStorage, version: 1 },
  ),
);
