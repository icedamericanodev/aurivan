/**
 * Mobile 1.49, the practice answer screen after a miss (premium pass §2.2–2.4):
 *  - ONE "Go deeper" row after a hairline: the lesson when it is not done yet,
 *    otherwise the note. Never two.
 *  - The page body no longer carries "Read the principle", "Add a note" or the
 *    "Report a problem" link; the source line stays as text.
 *  - A ⋯ IconButton ("More on this question") beside the bookmark opens a
 *    Sheet of that name: Read the note / Read the principle / Add a note /
 *    Report a problem with this question, in that order (rows that don't
 *    apply are left out). Before the answer is checked it holds only the report.
 *  - A row runs only once the sheet has gone (iOS can't open over a closing
 *    sheet). Closing the sheet, or the report sheet it opened, puts
 *    screen-reader focus back on ⋯.
 *  - No ⋯ in a mock.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { getAllQuestions } from '../content/loader';
import { lessonsFor, missLessons } from '../content/lessons';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { findPrinciple } from '../content/principles';
import { moveFocus } from '../lib/a11y';
import { startFromIds, startMock } from '../lib/sessions';
import { originalToDisplay } from '../engine/shuffle';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import { AnswerMore, SHEET_GONE_MS } from '../components/quiz';
import { moreButton, moreRowLabels } from '../../jest/answerMore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));

const bank = getAllQuestions('cisa');
// A question a lesson prepares for, that a note lists, and that a principle tags: every row applies.
const full = (() => {
  for (const l of lessonsFor('cisa'))
    for (const id of l.prepares ?? []) {
      const q = bank.find((x) => x.id === id);
      const sub = subtopicOfQuestion('cisa', id);
      if (q && sub && q.principleId && findPrinciple('cisa', q.principleId)) return { q, sub, lesson: l };
    }
  throw new Error('no question with a lesson, a note and a principle');
})();
const other = bank.find((q) => q.id !== full.q.id)!;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const pressables = (re: RegExp) => root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel) && typeof n.props.onPress === 'function');
/** What a screen reader meets: host elements with this label (one per control). */
const hosts = (re: RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel));
const press = (label: string) => {
  const b = root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  if (!b) throw new Error(`no button "${label}"`);
  act(() => {
    b.props.onPress();
  });
};

/** Start a set on these ids and check a WRONG (or right) answer on the first. */
function answer(ids: string[], right = false) {
  startFromIds('cisa', ids, 'T');
  act(() => {
    r = create(<SessionScreen />);
  });
  const s = useSession.getState().active!;
  const q = bank.find((x) => x.id === ids[0])!;
  const pick = right ? q.correct : (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && q.options[l])!;
  const display = originalToDisplay(pick, s.perms[q.id]);
  const card = root().findAll((n) => n.props.letter === display && typeof n.props.onPress === 'function' && n.props.state !== undefined)[0];
  act(() => {
    card.props.onPress();
  });
  press('Check answer');
}
/** The ⋯ button's ref, as AnswerMore got it (moveFocus is called with it). */
const moreRef = () => root().findByType(AnswerMore).props.buttonRef;

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(router.push).mockClear();
  jest.mocked(moveFocus).mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

describe('after a miss: one way on, in the body', () => {
  it('one "Go deeper" row (the lesson not done yet); no principle, note or report rows in the body', () => {
    answer([full.q.id, other.id]);
    const deeper = hosts(/^Go deeper, /);
    expect(deeper).toHaveLength(1);
    expect(deeper[0].props.accessibilityLabel).toMatch(/^Go deeper, take the lesson: /);
    expect(allText()).toContain('Go deeper · take the lesson');
    expect(hosts(/^Read the principle/)).toHaveLength(0);
    expect(hosts(/^Read the note/)).toHaveLength(0);
    expect(hosts(/^Add a note$/)).toHaveLength(0);
    expect(hosts(/^Report /)).toHaveLength(0);
    // The source line stays, as text.
    expect(allText()).toMatch(/Original · Reviewed /);
  });

  it('with every lesson done, the one row is the note', () => {
    act(() => {
      for (const l of missLessons('cisa', full.q.id, full.sub)) useProgress.getState().completeLesson('cisa', l.id);
      useProgress.getState().completeLesson('cisa', full.lesson.id);
    });
    answer([full.q.id, other.id]);
    const deeper = hosts(/^Go deeper, /);
    expect(deeper).toHaveLength(1);
    expect(deeper[0].props.accessibilityLabel).toMatch(new RegExp(`^Go deeper, read the note: ${findNote('cisa', full.sub)!.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`));
  });

  it('a right answer has no Go deeper row', () => {
    answer([full.q.id, other.id], true);
    expect(hosts(/^Go deeper, /)).toHaveLength(0);
  });
});

describe('the ⋯ "More on this question" sheet', () => {
  it('is a 48pt IconButton with its spoken name, beside the bookmark', () => {
    answer([full.q.id, other.id]);
    const btn = moreButton(root())!;
    expect(btn).toBeDefined();
    expect(btn.props.accessibilityRole).toBe('button');
    // The header order: bookmark, then ⋯.
    const labels = root()
      .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && /^(Save question|Remove from saved|More on this question)$/.test(n.props.accessibilityLabel))
      .map((n) => n.props.accessibilityLabel);
    expect(labels).toEqual(['Save question', 'More on this question']);
    const host = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'More on this question')[0];
    const style = Object.assign({}, ...[host.props.style].flat(5).filter(Boolean));
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  });

  it('holds the four rows in order after an answer, titled "More on this question"', () => {
    answer([full.q.id, other.id]);
    press('More on this question');
    expect(allText()).toContain('More on this question');
    const labels = moreRowLabels(root());
    expect(labels.map((l) => l.split(':')[0])).toEqual(['Read the note', 'Read the principle', 'Add a note', 'Report a problem with this question']);
    const report = root().findAll((n) => n.props.accessibilityLabel === 'Report a problem with this question' && typeof n.props.onPress === 'function')[0];
    expect(report).toBeUndefined(); // the sheet is closed again
  });

  it('before the answer is checked: only the report (the rest would give the answer away)', () => {
    startFromIds('cisa', [full.q.id, other.id], 'T');
    act(() => {
      r = create(<SessionScreen />);
    });
    expect(moreRowLabels(root())).toEqual(['Report a problem with this question']);
  });

  it('a row runs once the sheet has gone, and Back lands on the same answer', () => {
    answer([full.q.id, other.id]);
    press('More on this question');
    const row = pressables(/^Read the principle: /)[0];
    act(() => {
      row.props.onPress();
    });
    expect(router.push).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(SHEET_GONE_MS);
    });
    expect(router.push).toHaveBeenCalledWith(`/principles/${encodeURIComponent(full.q.principleId!)}`);
    expect(allText()).toContain('Not quite');
  });

  it('closing it puts screen-reader focus back on ⋯', () => {
    answer([full.q.id, other.id]);
    press('More on this question');
    jest.mocked(moveFocus).mockClear();
    press('Close, More on this question');
    expect(moveFocus).toHaveBeenCalledWith(moreRef(), expect.any(Number));
  });

  it('closing the report form it opened puts focus back on ⋯ too', () => {
    answer([full.q.id, other.id]);
    press('More on this question');
    act(() => {
      pressables(/^Report a problem with this question/)[0].props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(SHEET_GONE_MS);
    });
    jest.mocked(moveFocus).mockClear();
    press('Cancel');
    expect(moveFocus).toHaveBeenCalledWith(moreRef(), expect.any(Number));
  });

  it('"Add a note" opens the note sheet; its row says "Edit your note" once a note is saved', () => {
    answer([full.q.id, other.id]);
    press('More on this question');
    act(() => {
      pressables(/^Add a note$/)[0].props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(SHEET_GONE_MS);
    });
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Your note on this question').length).toBeGreaterThan(0);
    act(() => {
      useProgress.getState().setQuestionNote('cisa', full.q.id, 'Escalate first.');
    });
    expect(moreRowLabels(root())).toContain('Edit your note');
  });

  it('never in a mock', () => {
    startMock('cisa', 3);
    act(() => {
      r = create(<SessionScreen />);
    });
    expect(moreButton(root())).toBeUndefined();
  });
});
