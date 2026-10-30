/**
 * Exam-mindset principles screens, rendered with react-test-renderer against
 * the real stores and the real principles pack.
 *
 * - Every principle's page renders every section, in light and dark, and at
 *   about 200% text (nothing cut to a few lines).
 * - The list shows the six families in order, each principle once, and a
 *   row opens its page.
 * - The detail page: the family, the title, and "Practice this principle"
 *   starts a practice set drawn from every question that tests it (1.31). An old id opens the
 *   principle that replaced it; an unknown id says "Principle not found".
 * - Learn shows the Principles row; the Mistake journal's "Your pattern"
 *   links to the principle that coaches it (none for "Didn't know it").
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { PrincipleBody } from '../components/principles';
import { findQuestion, getAllQuestions } from '../content/loader';
import { getPrinciples, principleFamilies } from '../content/principles';
import { questionsForPrinciple } from '../lib/principleQuestions';
import { runnerUp } from '../engine/tips';
import { useProgress, type ThinkingSlip } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import PrinciplesHome from '../app/principles';
import PrincipleScreen from '../app/principles/[id]';
import Learn from '../app/(tabs)/learn';
import Mistakes from '../app/mistakes';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: (...a: unknown[]) => mockReplace(...a),
    back: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => false,
    dismissAll: jest.fn(),
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
/** Every string rendered, joined (what a sighted learner can read). */
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') out.push(n);
    else n.children.forEach(walk);
  };
  walk(root());
  return out.join(' ');
};
const pressables = (label: string | RegExp) =>
  root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel)),
  );
const press = (label: string | RegExp) => {
  const n = pressables(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 390, fontScale }, screen: { ...w, width: 390, fontScale } });
  });
};

const pack = getPrinciples('cisa')!;

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockParams = {};
  setFontScale(1);
  act(() => {
    useProgress.getState().resetCert('cisa');
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
});
afterEach(() => unmount());

describe('every principle renders', () => {
  it.each(['light', 'dark'] as const)('every section of every principle, in %s', (theme) => {
    useSettings.setState({ theme });
    for (const p of pack.principles) {
      mount(<PrincipleBody principle={p} />);
      const text = allText();
      for (const heading of ['Why it matters', 'Spot it in the question', 'The trap', 'Worked example', 'The situation', 'The right move']) {
        expect([p.id, text.includes(heading)]).toEqual([p.id, true]);
      }
      for (const part of [p.rule, p.why, p.trap.move, p.trap.whyWrong, p.example.scenario, p.example.answer, ...p.triggers]) {
        expect([p.id, text.includes(part)]).toEqual([p.id, true]);
      }
      // Nuance only when the principle has one.
      expect([p.id, text.includes('Nuance')]).toEqual([p.id, Boolean(p.nuance)]);
      if (p.nuance) expect(text).toContain(p.nuance);
      // Screen readers: the rule and the triggers are one stop each.
      expect(root().findAll((n) => n.props.accessibilityLabel === `The rule: ${p.rule}`).length).toBeGreaterThan(0);
      expect(root().findAll((n) => n.props.accessibilityLabel === `Words that signal it: ${p.triggers.join('; ')}`).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('the trigger pills are not buttons (nothing to tap)', () => {
    mount(<PrincipleBody principle={pack.principles[0]} />);
    const chips = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Words that signal it'))[0];
    expect(chips.findAll((n) => typeof n.props.onPress === 'function')).toEqual([]);
  });
});

describe('Principles list', () => {
  it('shows the families in order, each principle once, and its rule', () => {
    mount(<PrinciplesHome />);
    const text = allText();
    const groups = principleFamilies('cisa');
    let last = -1;
    for (const g of groups) {
      const at = text.indexOf(g.family.title);
      expect([g.family.id, at > last]).toEqual([g.family.id, true]);
      last = at;
      expect(text).toContain(g.family.question);
      for (const p of g.principles) {
        // One row each (the animated pressable shows up as a wrapper and its host, so "at least one").
        expect([p.id, pressables(`${p.title}. ${p.rule}`).length > 0]).toEqual([p.id, true]);
        expect([p.id, text.split(p.rule).length - 1]).toEqual([p.id, 1]);
      }
    }
  });

  it('a row opens that principle', () => {
    mount(<PrinciplesHome />);
    const p = pack.principles[3];
    press(`${p.title}. ${p.rule}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/principles/[id]', params: { id: p.id } });
  });

  it('at about 200% text the rule is shown whole (never cut to two lines)', () => {
    setFontScale(2);
    mount(<PrinciplesHome />);
    const rule = pack.principles[0].rule;
    const nodes = root().findAll((n) => n.props.children === rule);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.map((n) => n.props.numberOfLines)).toEqual(nodes.map(() => undefined));
    // At normal size it is cut to two lines (the page has the whole rule).
    setFontScale(1);
    unmount();
    mount(<PrinciplesHome />);
    expect(root().findAll((n) => n.props.children === rule).some((n) => n.props.numberOfLines === 2)).toBe(true);
  });
});

describe('Principle page', () => {
  // Mobile 1.31: the count is every question that tests it (lib/principleQuestions.ts), and
  // the set keeps the hand-picked size, drawn from all of them.
  it('shows the family and title, and "Practice this principle" draws from all its questions', () => {
    const p = pack.principles.find((x) => x.practiceIds.length >= 3)!;
    const all = questionsForPrinciple('cisa', p);
    mockParams = { id: p.id };
    mount(<PrincipleScreen />);
    const text = allText();
    const family = pack.families.find((f) => f.id === p.family)!;
    expect(text).toContain(`Principle · ${family.title}`);
    expect(text).toContain(p.title);
    expect(text).toContain(
      all.length > 10
        ? `${all.length} questions on this idea. Each set asks 10, new and missed ones first.`
        : `${all.length} questions on this idea. Your answers count toward your progress.`,
    );
    press('Practice this principle');
    const active = useSession.getState().active!;
    expect(active.mode).toBe('practice');
    expect(active.title).toBe(p.title);
    expect(active.questionIds).toHaveLength(Math.min(10, all.length));
    for (const id of active.questionIds) expect(all).toContain(id);
    // Every one of them is a real question.
    for (const id of active.questionIds) expect(findQuestion('cisa', id)).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith('/session');
  });

  it('renders in dark and at about 200% text', () => {
    useSettings.setState({ theme: 'dark' });
    setFontScale(2);
    const p = pack.principles.find((x) => x.nuance)!;
    mockParams = { id: p.id };
    mount(<PrincipleScreen />);
    expect(allText()).toContain(p.nuance!);
  });

  it('an old id opens the principle that replaced it', () => {
    mockParams = { id: 'CONTAIN-FIRST' };
    mount(<PrincipleScreen />);
    expect(allText()).toContain(pack.principles.find((x) => x.id === 'people-contain-preserve')!.title);
  });

  it('ends with its code and Report a problem: a principle report with its id and title only', () => {
    const p = pack.principles[0];
    mockParams = { id: p.id };
    mount(<PrincipleScreen />);
    expect(allText()).toContain(`Code ${p.id}`);
    const report = pressables(`Report a problem with principle ${p.id}`);
    expect(report.length).toBeGreaterThan(0);
    // The target names the principle; none of its text goes along.
    const row = root().findAll((n) => n.props.target?.kind === 'principle')[0];
    expect(row.props.target).toEqual({ kind: 'principle', id: p.id, name: p.title, where: 'Principle' });
  });

  it('a malformed link id (a lone "%") shows "not found" instead of crashing', () => {
    mockParams = { id: '%' };
    mount(<PrincipleScreen />);
    expect(allText()).toContain('Principle not found');
  });

  it('an unknown id says so, with a way to the list', () => {
    mockParams = { id: 'no-such-principle' };
    mount(<PrincipleScreen />);
    expect(allText()).toContain('Principle not found');
    press('All principles');
    expect(mockReplace).toHaveBeenCalledWith('/principles');
  });
});

describe('entry points', () => {
  it('Learn: Principles is the second row of "Look it up", under Study notes (no separate section)', () => {
    mount(<Learn />);
    const text = allText();
    expect(text).not.toContain('Exam mindset');
    // (The page's own subtitle also says "Study notes", so the rows are found by their subtitles.)
    const notesRow = text.indexOf('Every topic, with traps and key terms');
    expect(text.indexOf('Look it up')).toBeLessThan(notesRow);
    expect(notesRow).toBeLessThan(text.indexOf('The thinking the exam rewards'));
    expect(text.indexOf('The thinking the exam rewards')).toBeLessThan(text.indexOf('In exam order. Each ends with a quick check.'));
    // Premium round 2: one index list (KeyList), numbered in order: notes 1, Principles 2, the exam
    // guide and the final review week after (exam-guide-screens.test.tsx), the week row last.
    const [lookup] = root().findAll((n) => n.props.testID === 'learn-lookup' && typeof n.type === 'string');
    const order = lookup.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string').map((n) => n.props.accessibilityLabel as string);
    expect(order[0]).toMatch(/^Study notes, /);
    expect(order[1]).toBe('Principles, the thinking the exam rewards');
    expect(order[order.length - 1]).toMatch(/^Final review week/);
    press('Principles, the thinking the exam rewards');
    expect(mockPush).toHaveBeenCalledWith('/principles');
  });

  // Five tagged mistakes with one slip, picked so the runner-up never ties with it.
  const tagFive = (slip: ThinkingSlip) =>
    act(() => {
      const qs = getAllQuestions('cisa').slice(0, 5);
      for (const q of qs) {
        const ru = runnerUp(q.tips, q.correct);
        const wrong = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== ru)!;
        useProgress.getState().recordMistake('cisa', q.id, wrong);
        useProgress.getState().tagMistake('cisa', q.id, slip);
      }
    });

  it('the Mistake journal’s "Your pattern" links to the principle that coaches it', () => {
    tagFive('role');
    mount(<Mistakes />);
    expect(allText()).toContain('You answer as the wrong person');
    const title = pack.principles.find((x) => x.id === 'recommend-dont-implement')!.title;
    press(`Read the principle: ${title}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/principles/[id]', params: { id: 'recommend-dont-implement' } });
  });

  it('no principle link for "Didn’t know it" (a content gap, not a thinking slip)', () => {
    tagFive('knowledge');
    mount(<Mistakes />);
    expect(allText()).toContain('Most misses are content gaps');
    expect(pressables(/^Read the principle/)).toEqual([]);
  });
});
