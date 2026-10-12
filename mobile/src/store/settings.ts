/**
 * Settings store — learner preferences, saved on-device.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CERT_ID } from '../content/certifications';
import { FIT_ASK_DAYS, goalFromMinutes, minutesFromGoal, type DailyMinutes, type Familiarity, type FitPrompt } from '../engine/fit';
import { DEFAULT_REMINDER, type ReminderPrefs } from '../engine/reminders';
import { SETTINGS_VERSION } from '../engine/saveMigrations';
import type { StudyMode } from '../engine/studyModes';
import { persistStorage } from './storage';

export type ThemePref = 'system' | 'dark' | 'light';
/**
 * Motion (mobile 1.8): 'system' follows the phone's Reduce Motion setting;
 * 'reduced' asks for short cross-fades instead of slides, springs and growth
 * on this app only (WCAG 2.3.3). components/motion.tsx useMotion() reads it.
 */
export type MotionPref = 'system' | 'reduced';

interface SettingsState {
  onboarded: boolean;
  activeCertId: string;
  examDates: Record<string, string | undefined>; // certId → "YYYY-MM-DD"
  theme: ThemePref;
  /** Older saves have no key: persist merges the default ('system') in. */
  motion: MotionPref;
  shuffleOptions: boolean;
  /**
   * Questions per day (Settings before 1.15). Still written whenever the
   * minutes change (fit.ts goalFromMinutes), so an older app that restores a
   * 1.15 backup plans a sensible day. Nothing on screen sets it any more.
   */
  dailyGoal: number;
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
  /**
   * Mobile 1.10: Settings → Show badges, switched off. Hidden means no badge
   * moments, no Badges row on You and no "new" dot; badges are still earned
   * quietly, and switching back on shows one summary line. Off by default.
   */
  badgesHidden: boolean;
  /**
   * Mobile 1.15, "Fit the plan to each learner" (engine/fit.ts). All optional:
   * saves and backups from 1.14 and before have none of them.
   * - familiarity: where the learner is starting from. Unset = not asked or
   *   skipped; it plans like 'some'.
   * - dailyMinutes: minutes most days. Unset = from the old daily goal
   *   (dailyMinutesOf: 10 → 10, 20 → 20, 40 → 45).
   * - examFocused: the learner's own choice. Unset = on for 'experienced'.
   * - fitPrompt: the one "Fit your plan" card on Today was answered or
   *   dismissed. Onboarding sets 'answered' (a new learner already chose).
   * - fitChanges: how often the answers were changed later. A local count
   *   for the beta's "were the defaults wrong?" check; never sent anywhere.
   * - fitAskDays: the days the card was shown (at most FIT_ASK_DAYS). After
   *   that many separate days it is hidden for good, answered or not
   *   (code review M4: ask, never nag). Settings keeps the controls.
   */
  familiarity?: Familiarity;
  dailyMinutes?: DailyMinutes;
  examFocused?: boolean;
  fitPrompt?: FitPrompt;
  fitChanges?: number;
  fitAskDays?: string[];

  completeOnboarding: (certId: string, examDate?: string, fit?: { familiarity?: Familiarity; dailyMinutes: DailyMinutes }) => void;
  /**
   * Change the fit (Settings → Your study, the fit screen). `null` clears a
   * key: familiarity back to "not said", examFocused back to "follow
   * familiarity". It also marks the Today card answered.
   */
  setFit: (p: { familiarity?: Familiarity | null; dailyMinutes?: DailyMinutes; examFocused?: boolean | null }) => void;
  /** "Not now" on the Today card: it never shows again (Settings keeps the controls). */
  dismissFitPrompt: () => void;
  /** The card showed on `day` ("YYYY-MM-DD"): counted once per day, up to FIT_ASK_DAYS. */
  noteFitAsked: (day: string) => void;
  setActiveCert: (certId: string) => void;
  setExamDate: (certId: string, date?: string) => void;
  setTheme: (t: ThemePref) => void;
  setMotion: (m: MotionPref) => void;
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
  setBadgesHidden: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      onboarded: false,
      activeCertId: DEFAULT_CERT_ID,
      examDates: {},
      theme: 'system',
      motion: 'system',
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
      // Older saves have no key: persist merges this default in (badges shown).
      badgesHidden: false,

      completeOnboarding: (certId, examDate, fit) =>
        set((s) => ({
          onboarded: true,
          activeCertId: certId,
          examDates: { ...s.examDates, [certId]: examDate },
          // A new learner has chosen already (even with familiarity skipped): no Today card later.
          ...(fit
            ? { familiarity: fit.familiarity, dailyMinutes: fit.dailyMinutes, dailyGoal: goalFromMinutes(fit.dailyMinutes), fitPrompt: 'answered' as const }
            : {}),
        })),
      setFit: (p) =>
        set((s) => {
          const next: Partial<SettingsState> = {};
          if (p.familiarity !== undefined) next.familiarity = p.familiarity ?? undefined;
          if (p.examFocused !== undefined) next.examFocused = p.examFocused ?? undefined;
          if (p.dailyMinutes !== undefined) {
            next.dailyMinutes = p.dailyMinutes;
            next.dailyGoal = goalFromMinutes(p.dailyMinutes);
          }
          const changed = (Object.keys(next) as (keyof SettingsState)[]).some((k) => k !== 'dailyGoal' && next[k] !== s[k]);
          if (!changed) return s;
          // A change AFTER the first answer is the "change-away" count (PHASE5.md §4 guard rail).
          return { ...next, fitPrompt: 'answered', ...(s.fitPrompt === 'answered' ? { fitChanges: (s.fitChanges ?? 0) + 1 } : {}) };
        }),
      dismissFitPrompt: () => set((s) => (s.fitPrompt ? s : { fitPrompt: 'dismissed' })),
      noteFitAsked: (day) =>
        set((s) => {
          const days = s.fitAskDays ?? [];
          return days.includes(day) || days.length >= FIT_ASK_DAYS ? s : { fitAskDays: [...days, day] };
        }),
      setActiveCert: (certId) => set({ activeCertId: certId }),
      setExamDate: (certId, date) =>
        set((s) => ({ examDates: { ...s.examDates, [certId]: date } })),
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setShuffle: (shuffleOptions) => set({ shuffleOptions }),
      // Kept for older callers: it moves the minutes too, so it is never a silent no-op (code review M6).
      setDailyGoal: (dailyGoal) => set({ dailyGoal, dailyMinutes: minutesFromGoal(dailyGoal) }),
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
      setBadgesHidden: (badgesHidden) => set({ badgesHidden }),
    }),
    { name: 'aurivan.settings.v1', storage: persistStorage, version: SETTINGS_VERSION },
  ),
);

/** Minutes most days: the learner's choice, or (older saves) the old daily goal converted. */
export function dailyMinutesOf(s: Pick<SettingsState, 'dailyMinutes' | 'dailyGoal'>): DailyMinutes {
  return s.dailyMinutes ?? minutesFromGoal(s.dailyGoal);
}

/** The learner's minutes most days, live. */
export const useDailyMinutes = () => useSettings(dailyMinutesOf);
