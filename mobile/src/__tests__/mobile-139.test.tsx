/**
 * Mobile 1.39 (pre-beta quality pass).
 *
 * Plain English for the founder:
 * - #5 The label above a question names only the domain and the count
 *   ("IS Audit · 1 of 5"). The subtopic used to sit there too, and it gave
 *   the answer away. It appears only after the answer, in "Read the note",
 *   and never in a mock.
 * - #15 The coach's italic voice ("The IS auditor’s lens", "Exam-day
 *   shortcut") is capped at two sentences and about four lines. Anything
 *   longer continues in plain body text under it. Every lesson is checked.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { COACH_HEADING, QUOTE_MAX_CHARS, QUOTE_MAX_SENTENCES, SceneView, sentencesOf, splitCoachText } from '../components/lesson';
import { CISA_LESSONS } from '../content/lessons/cisa';
import type { Scene } from '../content/lessons/types';
import { findQuestion, getAllQuestions } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { shortSubtopic } from '../lib/format';
import { startFromIds, startMock, startReview } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import SessionScreen from '../app/session';
import { OptionCard } from '../components/quiz';
import { Tag } from '../components/ui';
import { StyleSheet } from 'react-native';
import Results from '../app/results';
import { centreScene } from '../app/lesson/[id]';
import { DomainRings, PlanChecklist, thenLine } from '../components/journey';
import { EXAM_TRADEMARK_LINE } from '../content/brand';
import type { PlanItem } from '../engine/planner';
import { finishSession } from '../lib/finishSession';

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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const press = (label: string) =>
  act(() => {
    root()
      .findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0]
      .props.onPress();
  });

beforeEach(() => {
  jest.useFakeTimers();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ activeCertId: 'cisa', onboarded: true });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

// ── #5: no topic hint before the answer ───────────────────────────────────
// Questions whose subtopic has a study note (so "Read the note" can show after a miss).
const withNote = getAllQuestions('cisa').filter((q) => {
  const sub = subtopicOfQuestion('cisa', q.id);
  return Boolean(sub && findNote('cisa', sub) && shortSubtopic(q.subtopic));
});
const ids = withNote.slice(0, 3).map((q) => q.id);

/** The label above the stem, and the subtopic of the question on screen. */
const metaTag = () => String(root().findAllByType(Tag)[0]?.props.label ?? '');
const subtopicOnScreen = () => {
  const s = useSession.getState().active!;
  return shortSubtopic(findQuestion('cisa', s.questionIds[s.index])!.subtopic);
};
/** Picks a WRONG option (so a miss shows the note row), by original letter. */
const pickWrong = () => {
  const s = useSession.getState().active!;
  const q = findQuestion('cisa', s.questionIds[s.index])!;
  const wrong = root().findAllByType(OptionCard).find((card) => card.props.text !== q.options[q.correct])!;
  act(() => {
    wrong.props.onPress();
  });
};

describe('#5 the label above a question', () => {
  it('practice: "<domain> · n of N" only; the subtopic shows after the reveal, in Read the note', () => {
    startFromIds('cisa', ids, 'T');
    mount(<SessionScreen />);
    const sub = subtopicOnScreen();
    expect(metaTag()).toMatch(/^[^·]+ · 1 of 3$/);
    expect(metaTag()).not.toContain(sub);
    pickWrong();
    press('Check answer');
    // After the reveal: the note row names the idea the question tests.
    expect(allText()).toContain('Read the note');
    const s = useSession.getState().active!;
    const note = findNote('cisa', subtopicOfQuestion('cisa', s.questionIds[0])!)!;
    expect(allText()).toContain(note.name);
  });

  it('review: the same, domain and count only before the answer', () => {
    // Make the three questions due for review: answered wrong once.
    for (const id of ids) useProgress.getState().recordAnswer('cisa', id, false);
    jest.setSystemTime(Date.now() + 3 * 24 * 3600 * 1000);
    expect(startReview('cisa')).toBeTruthy();
    mount(<SessionScreen />);
    expect(useSession.getState().active!.mode).toBe('review');
    expect(metaTag()).toMatch(/^[^·]+ · 1 of \d+$/);
    expect(metaTag()).not.toContain(subtopicOnScreen());
  });

  it('mock: never the subtopic, before or after a pick, on any question', () => {
    startMock('cisa', 5);
    mount(<SessionScreen />);
    const total = useSession.getState().active!.questionIds.length;
    for (let i = 0; i < total; i++) {
      act(() => {
        useSession.getState().goTo(i);
      });
      const sub = subtopicOnScreen();
      expect(metaTag()).toMatch(new RegExp(`^[^·]+ · ${i + 1} of ${total}$`));
      act(() => {
        root().findAllByType(OptionCard)[0].props.onPress();
      });
      // A mock has no answer screen and no note row: the subtopic is nowhere on screen.
      expect(metaTag()).not.toContain(sub);
      expect(allText()).not.toContain('Read the note');
    }
  });
});

// ── #15: the coach's italic voice is capped ───────────────────────────────
const coachScenes = CISA_LESSONS.flatMap((l) =>
  l.scenes
    .filter((s): s is Extract<Scene, { type: 'idea' | 'tip' }> => (s.type === 'idea' && s.heading === COACH_HEADING) || s.type === 'tip')
    .map((s) => [`${l.id} · ${s.type === 'tip' ? 'Exam-day shortcut' : 'lens'}`, l, s] as const),
);
const over = coachScenes.filter(([, , s]) => s.body.length > QUOTE_MAX_CHARS || sentencesOf(s.body).length > QUOTE_MAX_SENTENCES);

describe('#15 the IS auditor’s lens and the Exam-day shortcut', () => {
  it('splits sentences without breaking "(information systems)" or "a.m." mid-sentence', () => {
    expect(sentencesOf('As the IS (information systems) auditor, you check. Then you report? Yes “really.” Done')).toEqual([
      'As the IS (information systems) auditor, you check.',
      'Then you report?',
      'Yes “really.”',
      'Done',
    ]);
    expect(sentencesOf('Not at 3 a.m. when tired. Plan.')).toEqual(['Not at 3 a.m. when tired.', 'Plan.']);
  });

  it('a short text stays whole in the quote', () => {
    expect(splitCoachText('One idea. Two ideas.')).toEqual({ quote: 'One idea. Two ideas.', rest: '' });
  });

  it('most lessons need the split (the reason for the cap)', () => {
    expect(over.length).toBeGreaterThan(30);
  });

  it.each(coachScenes)('%s: the italic part is at most two sentences, and nothing is lost', (_name, _l, scene) => {
    const { quote, rest } = splitCoachText(scene.body);
    expect(sentencesOf(quote).length).toBeLessThanOrEqual(QUOTE_MAX_SENTENCES);
    // Over the length cap only when the first sentence alone is longer (then the quote is that one sentence).
    if (quote.length > QUOTE_MAX_CHARS) expect(quote).toBe(sentencesOf(scene.body)[0]);
    // Every word is still there, in order.
    expect([quote, rest].filter(Boolean).join(' ')).toBe(scene.body.trim().replace(/\s+/g, ' '));
  });

  // Every lens and every Exam-day shortcut is held to the full cap: about four lines at most.
  it.each(coachScenes)('%s: the italic part fits about four lines', (_name, _l, scene) => {
    expect(splitCoachText(scene.body).quote.length).toBeLessThanOrEqual(QUOTE_MAX_CHARS);
  });

  // Review P4: the shortcuts that opened with one over-long sentence were rewritten; none is left.
  it('no shortcut opens with a sentence longer than the cap', () => {
    const long = coachScenes
      .filter(([, , s]) => s.type === 'tip' && sentencesOf(s.body)[0].length > QUOTE_MAX_CHARS)
      .map(([, l]) => l.id);
    expect(long).toEqual([]);
  });

  // Review P3: a question never ends the quote; its answer would sit apart, in the body.
  it('the quote never ends on a question', () => {
    expect(splitCoachText('Protect the conclusion. Missing a skill? Get it first.').quote).toBe('Protect the conclusion.');
    expect(splitCoachText('Follow the trust. “Who checked the identity?” Ask it first.').quote).toBe('Follow the trust.');
    // In every lesson: a two-sentence quote never ends on a question (a lone first sentence may be one,
    // e.g. "…did it act before the harm, after it, or to repair it?": it is the whole thought).
    for (const [, , scene] of coachScenes) {
      const { quote } = splitCoachText(scene.body);
      if (sentencesOf(quote).length > 1) expect(quote).not.toMatch(/\?[”’")\]]*$/);
    }
  });

  it.each(over)('%s: renders the quote in italic and the rest in body text', (_name, lesson, scene) => {
    mount(<SceneView scene={scene} lesson={lesson} />);
    const { quote, rest } = splitCoachText(scene.body);
    const texts = root().findAll((n) => typeof n.props.v === 'string' && typeof n.props.children === 'string');
    const quoteNodes = texts.filter((n) => n.props.v === 'quote');
    expect(quoteNodes.map((n) => n.props.children)).toEqual([quote]);
    expect(texts.some((n) => n.props.v === 'body' && n.props.children === rest)).toBe(true);
  });
});

// ── #7: the welcome's disclaimer ──────────────────────────────────────────
describe('#7 the welcome disclaimer names only what the app teaches', () => {
  it('ISACA and CISA only, never ISC2', () => {
    expect(EXAM_TRADEMARK_LINE).toBe('Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.');
    expect(EXAM_TRADEMARK_LINE).not.toMatch(/ISC2/);
  });
});

// ── #15: Today's "Then:" line and short lesson scenes ─────────────────────
describe('#15 the one next plan item is a "Then:" line, with no hollow circle', () => {
  it('words: never two colons', () => {
    expect(thenLine('Practice: IS Operations · 12 questions')).toBe('Then: IS Operations practice · 12\u00A0questions');
    expect(thenLine('Lesson · Business impact analysis')).toBe('Then: Lesson · Business impact analysis');
    expect(thenLine('Top-up: Info Protection · 8 questions')).toBe('Then: Top-up · Info Protection · 8\u00A0questions');
    // Review O5: the count and its unit never split across lines.
    expect(thenLine('Game · 5 min')).toBe('Then: Game · 5\u00A0min');
  });

  it('Day 1 (lesson, then practice): one sap line and no ring; once something is done the checklist keeps its marks', () => {
    const items: PlanItem[] = [
      { kind: 'lesson', lessonId: 'x', title: 'The audit charter', minutes: 3 },
      { kind: 'practice', count: 12, label: '12 questions · IS Operations', domainId: '4', why: 'learn' },
    ];
    mount(<PlanChecklist items={items} done={[false, false]} current={0} />);
    const line = root().findAll((n) => n.props.v === 'body' && typeof n.props.children === 'string')[0];
    expect(line.props.children).toBe('Then: IS Operations practice · 12\u00A0questions');
    // No 24pt ring before it (a hollow circle read as a radio button, spec §5).
    expect(root().findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.borderRadius === 12)).toHaveLength(0);
    act(() => {
      r!.unmount();
    });
    // The lesson done, the practice now current: the done lesson keeps its check-off row.
    mount(<PlanChecklist items={items} done={[true, false]} current={1} />);
    expect(allText()).not.toContain('Then:');
  });
});

describe('#15 short lesson scenes (1.39 centred them; 1.43 puts every scene on the anchor line)', () => {
  it('no scene is centred: every scene starts on the anchor line', () => {
    // Mobile 1.43: no scene is centred any more; every scene starts on the anchor line.
    expect(centreScene({ type: 'idea', heading: 'x', body: 'y' })).toBe(false);
    expect(centreScene({ type: 'tip', body: 'y' })).toBe(false);
    expect(centreScene({ type: 'title', kicker: 'k', title: 't', subtitle: 's' })).toBe(false);
    expect(centreScene({ type: 'check', question: 'q', options: ['a', 'b'], correctIndex: 0, explanation: 'e' })).toBe(false);
  });
});

// ── Results: the rings only where they tell something ─────────────────────
describe('Results rings: mixed-domain sets and mocks only', () => {
  const finish = () =>
    act(() => {
      const s = useSession.getState().active!;
      s.questionIds.forEach((id) => useSession.getState().answer(id, { display: 'A', correct: true, ms: 30_000 }));
      finishSession();
    });

  it('a mock shows the domain rings', () => {
    startMock('cisa', 10);
    finish();
    mount(<Results />);
    expect(root().findAllByType(DomainRings)).toHaveLength(1);
  });

  it('a one-domain practice set does not', () => {
    const one = getAllQuestions('cisa').filter((q) => q.domainId === '1').slice(0, 10).map((q) => q.id);
    startFromIds('cisa', one, 'Practice · IS Audit');
    finish();
    mount(<Results />);
    expect(root().findAllByType(DomainRings)).toHaveLength(0);
    // Mobile 1.43: its one line names the domain; the headline is the count (no percent, no "Correct" cell).
    expect(allText()).toContain('All IS Audit');
    expect(allText()).not.toMatch(/All IS Audit · \d+%/);
    expect(allText()).not.toMatch(/All IS Audit · \d+ of/);
  });
});
