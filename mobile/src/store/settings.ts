/**
 * Settings store — learner preferences, saved on-device.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CERT_ID } from '../content/certifications';
import { DEFAULT_REMINDER, type ReminderPrefs } from '../engine/reminders';
import { SETTINGS_VERSION } from '../engine/saveMigrations';
import type { StudyMode } from '../engine/studyModes';
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
  /**
   * Build E study defaults, all optional (older saves have none):
   * - studyMode: the mode the learner last chose on Practice (also Settings →
   *   Study defaults → Default mode). Unset = follow the app's suggestion for
   *   the journey stage (engine/studyModes.ts suggestedMode). Once set, it
   *   always wins over the suggestion.
   * - studyDomain: the last domain chip ("1".."5"); unset = All domains. A
   *   domain the active cert doesn't have reads as All domains.
   * - studySize: the last session size (10, 20 or 50).
   */
  studyMode?: StudyMode;
  studyDomain?: string;
  studySize?: number;

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
  /** Save the study mode (undefined = back to "follow my stage"). */
  setStudyMode: (mode: StudyMode | undefined) => void;
  /** Save the domain chip (undefined = All domains). */
  setStudyDomain: (domainId: string | undefined) => void;
  setStudySize: (n: number) => void;
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
      // Choosing in Settings answers the one-time offer too, so the card never
      // asks about something the learner already decided (C5).
      setPracticeTimer: (practiceTimer) => set((s) => ({ practiceTimer, paceOffer: s.paceOffer ?? (practiceTimer ? 'accepted' : 'dismissed') })),
      answerPaceOffer: (choice) => set(choice === 'accepted' ? { paceOffer: choice, practiceTimer: true } : { paceOffer: choice }),
      // Build E: the last choice on Practice is remembered. JSON drops an
      // undefined key, so "unset" saves as no key at all (older shape).
      setStudyMode: (studyMode) => set({ studyMode }),
      setStudyDomain: (studyDomain) => set({ studyDomain }),
      setStudySize: (studySize) => set({ studySize }),
    }),
    { name: 'aurivan.settings.v1', storage: persistStorage, version: SETTINGS_VERSION },
  ),
);
