/**
 * Settings store — learner preferences, saved on-device.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CERT_ID } from '../content/certifications';
import { DEFAULT_REMINDER, type ReminderPrefs } from '../engine/reminders';
import { SETTINGS_VERSION } from '../engine/saveMigrations';
import { persistStorage } from './storage';

export type ThemePref = 'system' | 'dark' | 'light';

interface SettingsState {
  onboarded: boolean;
  activeCertId: string;
  examDates: Record<string, string | undefined>; // certId → "YYYY-MM-DD"
  theme: ThemePref;
  shuffleOptions: boolean;
  dailyGoal: number; // questions per day
  /** `days` is optional: saves from before day chips have none, which means every day. */
  reminder: ReminderPrefs;
  /** Gentle vibrations on select, submit and milestones. On by default. */
  haptics: boolean;
  /** Games whose rules the learner has already seen (shown once, then behind an info button). */
  gameRulesSeen: string[];
  /**
   * Study defaults (Build D): the practice timer's starting state on Quick 10
   * and Build a set. Off by default; never switched on without the learner.
   */
  practiceTimer: boolean;
  /**
   * The one-time "Practice at exam pace?" card: how the learner answered it.
   * Unset = not answered yet. Once set, the card never shows again.
   */
  paceOffer?: 'accepted' | 'dismissed';

  completeOnboarding: (certId: string, examDate?: string) => void;
  setActiveCert: (certId: string) => void;
  setExamDate: (certId: string, date?: string) => void;
  setTheme: (t: ThemePref) => void;
  setShuffle: (v: boolean) => void;
  setDailyGoal: (n: number) => void;
  setReminder: (r: SettingsState['reminder']) => void;
  setHaptics: (v: boolean) => void;
  markRulesSeen: (gameId: string) => void;
  setPracticeTimer: (v: boolean) => void;
  /** Answer the "Practice at exam pace?" card: accepting turns the timer default on. */
  answerPaceOffer: (choice: 'accepted' | 'dismissed') => void;
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
      // Default: every day at 19:00, off until the learner turns it on.
      reminder: { ...DEFAULT_REMINDER },
      // Older saves have no `haptics` key: persist merges this default in, so it stays on.
      haptics: true,
      // Older saves have no key: persist merges this default in (rules show once).
      gameRulesSeen: [],
      // Older saves have no key: persist merges this default in (timer off).
      practiceTimer: false,

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
      setPracticeTimer: (practiceTimer) => set({ practiceTimer }),
      answerPaceOffer: (choice) => set(choice === 'accepted' ? { paceOffer: choice, practiceTimer: true } : { paceOffer: choice }),
    }),
    { name: 'aurivan.settings.v1', storage: persistStorage, version: SETTINGS_VERSION },
  ),
);
