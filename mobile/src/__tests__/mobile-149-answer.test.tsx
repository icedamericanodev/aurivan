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
 *  - §2.1: the answer opens with "Question" and the stem in two lines; the recap
 *    is one stop that says the whole question.
 *  - Phone 2.2 (owner direction, 19 Nov 2026): ONE switch, "Show question &
 *    choices" (its expanded state spoken), replaces the stem-only "Show question"
 *    AND More's "Show all options" sheet: open, it shows the whole question and
 *    all four choices in DISPLAY order, read-only. More no longer has that row.
 *    It is the recap's ONLY switch: no reason is shown under any choice there.
 */
import { ScrollView } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { getAllQuestions } from '../content/loader';
import { lessonsFor, missLessons } from '../content/lessons';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { findPrinciple } from '../content/principles';
import { moveFocus } from '../lib/a11y';
import { startFromIds, startMock } from '../lib/sessions';
import { displayToOriginal, originalToDisplay } from '../engine/shuffle';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import { AnswerMore, QuestionRecap, SHEET_GONE_MS, STEM_RECAP_CHARS, StemRecap, type RecapChoice } from '../components/quiz';
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
  it('one "Go deeper" row (the lesson not done yet); no principle or note rows in the body; Report a problem is the source row link', () => {
    answer([full.q.id, other.id]);
    const deeper = hosts(/^Go deeper, /);
    expect(deeper).toHaveLength(1);
    expect(deeper[0].props.accessibilityLabel).toMatch(/^Go deeper, take the lesson: /);
    expect(allText()).toContain('Go deeper · take the lesson');
    expect(hosts(/^Read the principle/)).toHaveLength(0);
    expect(hosts(/^Read the note/)).toHaveLength(0);
    expect(hosts(/^Add a note$/)).toHaveLength(0);
    // Grove Phase 4 (4.2 step 7): the report is the source row's text link (and still in ⋯), never a row.
    expect(hosts(/^Report /).map((n) => n.props.testID)).toEqual(['answer-report-link']);
    // The source line stays.
    expect(allText()).toMatch(/Original · Checked /);
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
    // Phone 2.2: "Show all options" left More (the choices are under "Show question & options" on the page).
    expect(labels.map((l) => l.split(':')[0])).toEqual(['Read the note', 'Read the principle', 'Add a note', 'Report a problem with this question']);
    expect(labels.some((l) => /all options/i.test(l))).toBe(false);
    // The sheet is closed again: the only report entry left is the source row's own link.
    const report = root().findAll((n) => n.props.accessibilityLabel === 'Report a problem with this question' && typeof n.props.onPress === 'function' && n.props.testID !== 'answer-report-link');
    expect(report).toHaveLength(0);
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

describe('the question recap at the top of the answer (premium pass §2.1; phone 2.2: one switch)', () => {
  // A long stem with no scenario (the bank has no scenario questions today: those are rendered directly below).
  const long = bank.find((q) => !q.scenario && q.stem.length > STEM_RECAP_CHARS && q.id !== other.id)!;
  // Each row is handed a reason on purpose: the recap must never show one (they live on the look-back page).
  const choices: (RecapChoice & { why: string })[] = [
    { letter: 'A', text: 'First', pick: false, best: false, why: 'Not A.' },
    { letter: 'B', text: 'Second', pick: true, best: false, why: 'Not B.' },
    { letter: 'C', text: 'Third', pick: false, best: true, why: 'C it is.' },
    { letter: 'D', text: 'Fourth', pick: false, best: false, why: 'Not D.' },
  ];

  it('"Question", the stem in two lines, then ONE switch, "Show question & options" (48pt), that opens it in place', () => {
    answer([long.id, other.id]);
    // Practice no longer mounts the stem-only recap, and nothing is labelled "Show question" exactly.
    expect(root().findAllByType(StemRecap)).toHaveLength(0);
    expect(hosts(/^(Show|Hide) question$/)).toHaveLength(0);
    const recap = root().findByType(QuestionRecap);
    const t = textOf(recap);
    expect(t.startsWith('Question')).toBe(true);
    // Closed: shortened at a whole word with one "…" (engine/textClip.ts), two lines kept as a safety stop.
    const stemText = recap.findAll((n) => typeof n.props.children === 'string' && n.props.numberOfLines !== undefined);
    expect(stemText[0].props.numberOfLines).toBe(2);
    const shown = stemText[0].props.children as string;
    expect(shown.endsWith('…')).toBe(true);
    expect(long.stem.replace(/\s+/g, ' ').startsWith(shown.slice(0, -1))).toBe(true);
    expect(shown).not.toMatch(/\s…$/);
    const toggles = hosts(/^Show question and options$/);
    expect(toggles.map((n) => n.props.testID)).toEqual(['recap-toggle']);
    const toggle = toggles[0];
    expect(toggle.props.accessibilityRole).toBe('button');
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    expect(textOf(toggle).trim()).toBe('Show question &\u00a0options');
    const style = Object.assign({}, ...[toggle.props.style].flat(5).filter(Boolean));
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    press('Show question and options');
    expect(hosts(/^Hide question and options$/)[0].props.accessibilityState).toMatchObject({ expanded: true });
    // Open: the whole stem, with no line limit.
    expect(recap.findAll((n) => typeof n.type === 'string' && textOf(n) === long.stem).length).toBeGreaterThan(0);
    expect(recap.findAll((n) => typeof n.props.children === 'string' && typeof n.props.numberOfLines === 'number')).toHaveLength(0);
    press('Hide question and options');
    expect(hosts(/^Show question and options$/)).toHaveLength(1);
    expect(recap.findAll((n) => typeof n.props.children === 'string' && n.props.numberOfLines === 2).length).toBeGreaterThan(0);
  });

  it('comes before the verdict, and a screen reader hears the whole question in one stop', () => {
    answer([long.id, other.id]);
    // In the page (the header's recap also says "Not quite" once the verdict scrolls away).
    const t = textOf(root().findByType(ScrollView));
    expect(t.indexOf('Question')).toBeGreaterThan(-1);
    expect(t.indexOf('Question')).toBeLessThan(t.indexOf('Not quite'));
    expect(hosts(/^Question: /).map((n) => n.props.accessibilityLabel)).toEqual([`Question: ${long.stem}`]);
  });

  // The bank has no stem this short, so the part is rendered on its own (was a check that never ran).
  it('a short stem is never cut, and still has the switch (it opens the choices)', () => {
    const short = 'Which control is MOST effective?';
    act(() => {
      r = create(<QuestionRecap stem={short} choices={choices} />);
    });
    expect(allText()).toContain(short);
    expect(allText()).not.toContain('…');
    expect(hosts(/^Question: /).map((n) => n.props.accessibilityLabel)).toEqual([`Question: ${short}`]);
    expect(hosts(/^Show question and options$/)).toHaveLength(1);
    press('Show question and options');
    expect(allText()).toContain(short);
    expect(root().findAll((n) => typeof n.type === 'string' && /^recap-choice-[A-D]$/.test(n.props.testID ?? ''))).toHaveLength(4);
    // The four choices and nothing more: no reason (shown or spoken) and no second switch.
    expect(root().findAll((n) => /^recap-why/.test(n.props.testID ?? ''))).toHaveLength(0);
    for (const ch of choices) {
      expect(allText()).toContain(ch.text);
      expect(allText()).not.toContain(ch.why);
      expect(hosts(new RegExp(ch.why.replace('.', '\\.')))).toHaveLength(0);
    }
    expect(allText()).not.toMatch(/Why (not )?[A-D]\b/);
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button').map((n) => n.props.testID)).toEqual(['recap-toggle']);
  });

  // The bank has no scenario question today, so the part is rendered on its own (was a check that never ran).
  it('a scenario opens with the stem, and is in the spoken question', () => {
    const scenario = 'A retail bank moved its payments platform to a new provider last quarter.';
    act(() => {
      r = create(<QuestionRecap stem={long.stem} scenario={scenario} choices={choices} />);
    });
    expect(hosts(/^Question: /)[0].props.accessibilityLabel).toBe(`Question: ${scenario} ${long.stem}`);
    // Closed: the scenario is not on screen (it is in the spoken question only).
    expect(allText()).not.toContain(scenario);
    expect(hosts(/^Show question and options$/)).toHaveLength(1);
    press('Show question and options');
    const t = allText();
    expect(t).toContain(scenario);
    expect(t).toContain(long.stem);
    expect(t.indexOf(scenario)).toBeLessThan(t.indexOf(long.stem));
    press('Hide question and options');
    expect(allText()).not.toContain(scenario);
  });
});

// Grove Phase 4 (PHASE4.md 4.2 step 2, 4.5 "must not be lost"): the answer card shows only the pick
// and the best answer, so every option stays one tap away, read-only, in DISPLAY order. Phone 2.2: that
// tap is "Show question & options" on the page (it was More's "Show all options" sheet).
describe('Show question & options: every option, one tap away (was More: Show all options)', () => {
  const rowsOf = () => root().findAll((n) => typeof n.type === 'string' && /^recap-choice-[A-D]$/.test(n.props.testID ?? ''));

  it('lists every option in display order, looked up by original letter, with the pick and the best marked', () => {
    answer([full.q.id, other.id]);
    const perm = useSession.getState().active!.perms[full.q.id];
    const pick = (['A', 'B', 'C', 'D'] as const).find((l) => l !== full.q.correct && full.q.options[l])!;
    // Closed until asked for.
    expect(rowsOf()).toHaveLength(0);
    press('Show question and options');
    const rows = rowsOf();
    const shown = rows.map((n) => n.props.testID.replace('recap-choice-', ''));
    expect(shown).toEqual(['A', 'B', 'C', 'D'].slice(0, perm.length));
    for (const n of rows) {
      const d = n.props.testID.replace('recap-choice-', '') as 'A';
      const original = displayToOriginal(d, perm);
      const text = full.q.options[original];
      // Each row is ONE stop, with its display letter and (for the pick and the best) the words.
      const stops = n.findAll((x) => typeof x.type === 'string' && x.props.accessible === true);
      expect(stops).toHaveLength(1);
      const label = stops[0].props.accessibilityLabel as string;
      expect(label.endsWith(`: ${text}`)).toBe(true);
      if (original === full.q.correct) {
        expect(label.startsWith(`${d}, best answer`)).toBe(true);
        expect(textOf(n)).toContain('✓ Best answer');
      } else if (original === pick) {
        expect(label.startsWith(`${d}, your answer, not the best`)).toBe(true);
        expect(textOf(n)).toContain('✗ Your answer');
      } else {
        expect(label).toBe(`${d}: ${text}`);
        expect(textOf(n)).not.toMatch(/Your answer|Best answer/);
      }
    }
    // Read-only: no option in the recap can be tapped. Its ONE button is its own switch (no "why" switch).
    const tappable = root()
      .findByType(QuestionRecap)
      .findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button')
      .map((n) => n.props.testID);
    expect(tappable).toEqual(['recap-toggle']);
    expect(root().findAll((n) => /^recap-why/.test(n.props.testID ?? ''))).toHaveLength(0);
    for (const n of rows) expect(n.findAll((x) => typeof x.props.onPress === 'function')).toHaveLength(0);
  });

  it('is not offered before the answer is checked, in More or on the page', () => {
    startFromIds('cisa', [full.q.id, other.id], 'T');
    act(() => {
      r = create(<SessionScreen />);
    });
    expect(moreRowLabels(root()).some((l) => /all options|choices/i.test(l))).toBe(false);
    expect(root().findAllByType(QuestionRecap)).toHaveLength(0);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('recap-'))).toHaveLength(0);
  });

  it('after the answer, More has no "Show all options" row: one surface for the choices, not two', () => {
    answer([full.q.id, other.id]);
    expect(moreRowLabels(root()).some((l) => /all options/i.test(l))).toBe(false);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('all-options'))).toHaveLength(0);
    expect(root().findAll((n) => n.props.title === 'All options')).toHaveLength(0);
  });
});
