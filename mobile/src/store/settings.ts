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

  completeOnboarding: (certId: string, examDate?: string) => void;
  setActiveCert: (certId: string) => void;
  setExamDate: (certId: string, date?: string) => void;
  setTheme: (t: ThemePref) => void;
  setShuffle: (v: boolean) => void;
  setDailyGoal: (n: number) => void;
  setReminder: (r: SettingsState['reminder']) => void;
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
    }),
    { name: 'aurivan.settings.v1', storage: persistStorage, version: 1 },
  ),
);
