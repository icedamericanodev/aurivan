/**
 * Mobile 1.9 empty states (ui.md E1) and the bank grouping (E3): each empty
 * place has its own drawing and a "next" line from the learner's own data;
 * a lone bank row names its topic; "Next review: tomorrow · 6 questions".
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { BankQuestionRow } from '../components/bank';
import { EmptyState } from '../components/ui';
import { upcomingReview, upcomingReviewLine } from '../engine/srs';
import { shortDate } from '../lib/format';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const texts = () => r!.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('empty states (E1) and bank rows (E3)', () => {
  it('an empty state shows its own drawing and a "next" line, both read in order', () => {
    mount(<EmptyState art="fern" title="All caught up" body="Questions come back here." next="Next review: tomorrow · 6 questions" />);
    expect(texts()).toEqual(['All caught up', 'Questions come back here.', 'Next review: tomorrow · 6 questions']);
    // The drawing is decorative.
    const art = r!.root.findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && typeof n.type === 'string')[0];
    expect(art.findAll(() => true).length).toBeGreaterThan(1);
  });

  it('a lone bank row names its topic, in what it says too', () => {
    mount(<BankQuestionRow text="An IS auditor finds…" status="new" saved={false} difficulty="application" topic="Alternate site" onPress={() => {}} />);
    const row = r!.root.find((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string');
    expect(row.props.accessibilityLabel).toBe('Not yet answered · Application. Alternate site. An IS auditor finds…');
    expect(texts()[0]).toBe('Alternate site');
  });
});

describe('upcomingReview', () => {
  const at = (s: string) => new Date(s).getTime();
  const entry = (dueAt: number) => ({ box: 2, dueAt, lastSeen: 0, reps: 1 });
  it('finds the next due moment and counts the learner’s questions due by the end of that day', () => {
    const now = at('2026-10-11T20:00:00');
    const review = { a: entry(at('2026-10-12T09:00:00')), b: entry(at('2026-10-12T22:00:00')), c: entry(at('2026-10-14T09:00:00')), d: entry(at('2026-10-10T09:00:00')) };
    const next = upcomingReview(review, now)!;
    expect(next).toEqual({ at: at('2026-10-12T09:00:00'), count: 2 });
    expect(upcomingReviewLine(next, now, shortDate)).toBe('Next review: tomorrow · 2 questions');
    expect(upcomingReviewLine({ at: at('2026-10-11T23:00:00'), count: 1 }, now, shortDate)).toBe('Next review: later today · 1 question');
    expect(upcomingReviewLine({ at: at('2026-10-14T09:00:00'), count: 3 }, now, shortDate)).toBe('Next review: 14 Oct · 3 questions');
    expect(upcomingReview({}, now)).toBeNull();
  });
});

