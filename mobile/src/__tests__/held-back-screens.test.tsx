/**
 * The held-back full form on screen (docs/content/CIA_BANK_PLAN.md section 11, item 7, second half).
 *
 * - Today: one calm card once the form is due (here: the exam is 10 days away), Hide keeps it hidden;
 *   never for CISA, never once the form is taken.
 * - Practice: a "Full exam" row under the mock tiles, "Full exam (seen)" once taken; never for CISA.
 * - The start sheet: the intro; before the form is due, Start asks "Most useful in your last 2 to 3
 *   weeks." with Take it now (starts it) and Not yet (back out); a retake says it was seen.
 * - Results: percent and counts by section; never a scaled score, 600, "pass" or "likely"; a retake
 *   says first that it was seen and is not counted, and nothing grows.
 *
 * The fixture is neutral: CISA's own descriptor with the setting (and a lettered section style)
 * switched on, and 30 of its questions per domain tagged as a held-back form, for one test.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Practice from '../app/(tabs)/practice';
import MockStart from '../app/mock-start';
import Mistakes from '../app/mistakes';
import Saved from '../app/saved';
import Results from '../app/results';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { findQuestion, getDomainQuestions } from '../content/loader';
import { clearContentCaches } from '../content/packs';
import type { Certification } from '../content/types';
import { addDays } from '../engine/examDay';
import { CARD_LINE, EARLY_LINE, FORM_INTRO, SEEN_LINE } from '../engine/heldBack';
import { dayKey } from '../engine/streak';
import { flushSayLaterForTest } from '../lib/a11y';
import { finishSession } from '../lib/finishSession';
import { startHeldBack, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
  initNotifications: () => {},
}));

const cisa = getCertification('cisa')! as Certification;
const FORM = '2026-11-27';

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textIn = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textIn(root());
/** Results' own words: everything above the answer review (the questions' stems may say anything). */
const resultsOwnText = () => allText().split('Review answers')[0];
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const press = (label: string) => {
  const btn = root().find((n) => typeof n.props.onPress === 'function' && (n.props.accessibilityLabel === label || textIn(n) === label));
  act(() => btn.props.onPress());
};

let tagged: string[] = [];
/** Opt in, letter the sections, and tag a 150-question held-back form on CISA's questions. */
function withForm() {
  cisa.readinessRule = 'firstTry';
  cisa.domainStyle = { noun: 'Section', numbering: 'letter' };
  tagged = cisa.domains.flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, 30).map((q) => q.id));
  for (const id of tagged) findQuestion('cisa', id)!.heldBack = FORM;
  clearContentCaches();
}

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: addDays(dayKey(Date.now()), 60) } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.back).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  for (const id of tagged) delete findQuestion('cisa', id)!.heldBack;
  tagged = [];
  delete cisa.readinessRule;
  delete cisa.domainStyle;
  clearContentCaches();
  jest.restoreAllMocks();
});

const examIn = (days: number) => useSettings.setState({ examDates: { cisa: addDays(dayKey(Date.now()), days) } });
const take = () => {
  act(() => {
    startHeldBack('cisa');
    finishSession({ celebrate: false });
    useSession.getState().clear();
  });
};

describe('Today: one card once it is due', () => {
  it('CISA: no card, even 10 days out', () => {
    examIn(10);
    mount(<Today />);
    expect(byTestID('held-back-card')).toHaveLength(0);
  });

  it('a course with a form, 60 days out and no practice: not yet', () => {
    withForm();
    mount(<Today />);
    expect(byTestID('held-back-card')).toHaveLength(0);
  });

  it('10 days out: the card, calm words, Open goes to the start sheet, Hide keeps it hidden', () => {
    withForm();
    examIn(10);
    mount(<Today />);
    expect(byTestID('held-back-card')).toHaveLength(1);
    expect(allText()).toContain(CARD_LINE);
    expect(textIn(byTestID('held-back-card')[0])).not.toMatch(/\d+ days?|last chance|hurry|left/i);
    press('See the full exam');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/mock-start', params: { form: 'held' } });
    press('Hide this card. The full exam stays in Practice.');
    act(() => flushSayLaterForTest());
    expect(byTestID('held-back-card')).toHaveLength(0);
  });

  it('once taken: no card', () => {
    withForm();
    examIn(10);
    take();
    mount(<Today />);
    expect(byTestID('held-back-card')).toHaveLength(0);
  });
});

describe('Practice: the row under the mock tiles', () => {
  it('CISA: none', () => {
    mount(<Practice />);
    expect(byTestID('practice-held-back')).toHaveLength(0);
  });

  it('"Full exam", then "Full exam (seen)" once taken (never hidden)', () => {
    withForm();
    mount(<Practice />);
    expect(textIn(byTestID('practice-held-back')[0])).toMatch(/^Full exam 150 questions · 4 hours · the same for everyone/);
    act(() => r!.unmount());
    take();
    mount(<Practice />);
    expect(textIn(byTestID('practice-held-back')[0])).toContain('Full exam (seen)');
  });
});

describe('review fix 5: Mistakes and Saved wait for the form to be taken', () => {
  it('an older mistake and a saved question from the form are not listed or counted until it is taken', () => {
    withForm();
    const id = tagged[0];
    const stem = findQuestion('cisa', id)!.stem;
    // A save from before the form was frozen: the question missed and saved.
    act(() => {
      useProgress.getState().recordMistake('cisa', id, 'B');
      useProgress.getState().toggleBookmark('cisa', id);
    });
    mount(<Mistakes />);
    expect(allText()).not.toContain('Practice this one');
    act(() => r!.unmount());
    mount(<Saved />);
    expect(allText()).not.toContain(stem);
    act(() => r!.unmount());
    take();
    mount(<Mistakes />);
    expect(allText()).toContain('Practice this one');
    act(() => r!.unmount());
    mount(<Saved />);
    expect(allText()).toContain(stem);
  });
});

describe('the start sheet', () => {
  const openForm = () => jest.mocked(useLocalSearchParams).mockReturnValue({ form: 'held' });

  it('CISA: ?form=held is just the full mock (no intro, no ask)', () => {
    openForm();
    mount(<MockStart />);
    expect(byTestID('held-back-intro')).toHaveLength(0);
    expect(allText()).toContain('Full mock');
  });

  it('the intro, and an early Start asks first: Not yet goes back, nothing starts', () => {
    withForm();
    openForm();
    mount(<MockStart />);
    expect(textIn(byTestID('held-back-intro')[0])).toBe(FORM_INTRO);
    expect(allText()).toContain('Full exam');
    press('Start exam');
    expect(textIn(byTestID('held-back-early')[0])).toContain(EARLY_LINE);
    expect(useSession.getState().active).toBeNull();
    press('Not yet');
    expect(router.back).toHaveBeenCalled();
    expect(useSession.getState().active).toBeNull();
  });

  it('Take it now starts the form (never a lock)', () => {
    withForm();
    openForm();
    mount(<MockStart />);
    press('Start exam');
    press('Take it now');
    expect(useSession.getState().active?.heldBack).toEqual({ form: FORM, seen: false });
    expect(router.replace).toHaveBeenCalledWith('/session');
  });

  it('once due (3 weeks out), Start starts it straight away', () => {
    withForm();
    examIn(21);
    openForm();
    mount(<MockStart />);
    press('Start exam');
    expect(byTestID('held-back-early')).toHaveLength(0);
    expect(useSession.getState().active?.title).toBe('Full exam');
  });

  it('a retake: titled "Full exam (seen)", says it was seen and is not counted, no ask', () => {
    withForm();
    take();
    openForm();
    mount(<MockStart />);
    expect(allText()).toContain('Full exam (seen)');
    expect(textIn(byTestID('held-back-intro')[0])).toBe(SEEN_LINE);
    press('Start exam');
    expect(useSession.getState().active?.heldBack).toEqual({ form: FORM, seen: true });
  });
});

describe('Results', () => {
  const finishForm = (seen: boolean) => {
    act(() => {
      if (seen) {
        startHeldBack('cisa');
        finishSession({ celebrate: false });
      }
      const s = startHeldBack('cisa')!;
      // About 70% right, the rest wrong; a few left blank.
      s.questionIds.slice(0, 140).forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i % 10 < 7 }));
      finishSession();
    });
  };

  it('CISA: a full mock is as before (no section block)', () => {
    act(() => {
      startMock('cisa');
      finishSession({ celebrate: false });
    });
    mount(<Results />);
    expect(byTestID('held-back-result')).toHaveLength(0);
    expect(allText()).toContain('Practice scores are not scaled exam scores.');
  });

  it('the form: percent and counts by section; never a scaled score, 600, "pass" or "likely"', () => {
    withForm();
    finishForm(false);
    mount(<Results />);
    const block = byTestID('held-back-result')[0];
    expect(textIn(block)).toContain('By section');
    for (const d of cisa.domains) expect(byTestID(`held-back-row-${d.id}`)).toHaveLength(1);
    expect(textIn(block)).toMatch(/Section A · [^ ]+.* \d+ of 30 right \(\d+%\)/);
    expect(byTestID('held-back-seen')).toHaveLength(0);
    expect(resultsOwnText()).not.toMatch(/scaled|\b600\b|\bpass|likely/i);
    expect(resultsOwnText()).toContain('Full exam');
    expect(selectCert(useProgress.getState(), 'cisa').heldBackTaken).toEqual({ [FORM]: expect.any(Number) });
  });

  it('a retake: "Full exam (seen)", the seen line first, no milestone moment', () => {
    withForm();
    finishForm(true);
    mount(<Results />);
    expect(allText()).toContain('Full exam (seen)');
    expect(textIn(byTestID('held-back-seen')[0])).toBe(SEEN_LINE);
    expect(useSession.getState().active?.milestone).toBeUndefined();
    expect(resultsOwnText()).not.toMatch(/scaled|\b600\b|\bpass|likely/i);
  });
});
