/**
 * Mobile 1.43, the lesson's idea scene (board 6):
 *  - a scene's `list` is the same words as its body, only split (content test);
 *  - only a few scenes opt in (the charter and a handful of others);
 *  - the figure is one spoken list, never "Step 1 of 4", with no path between items;
 *  - every scene starts on the anchor line (no centring).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { ideaListSpoken, ideaListText, itemParts, leadText } from '../content/lessons/ideaList';
import type { Scene } from '../content/lessons/types';
import { lastPart, SceneView } from '../components/lesson';
import { centreScene } from '../app/lesson/[id]';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));

type Idea = Extract<Scene, { type: 'idea' }>;
const listed = CISA_LESSONS.flatMap((l) => l.scenes.filter((s): s is Idea => s.type === 'idea' && Boolean(s.list)).map((s) => ({ lesson: l, scene: s })));
const charterLesson = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
const charter = charterLesson.scenes.find((s): s is Idea => s.type === 'idea' && s.heading === 'What a charter does')!;

let r: ReactTestRenderer | undefined;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('idea scenes that list parallel items (content)', () => {
  it('the joined parts equal the scene’s original body, word for word', () => {
    expect(listed.length).toBeGreaterThan(0);
    for (const { scene } of listed) expect(ideaListText(scene.list!)).toBe(scene.body);
  });

  it('opt-in for a handful only (3 to 5 parallel items each), starting with the charter', () => {
    expect(listed.length).toBeLessThanOrEqual(6);
    expect(listed.some((x) => x.scene === charter)).toBe(true);
    for (const { scene } of listed) {
      expect(scene.list!.items.length).toBeGreaterThanOrEqual(3);
      expect(scene.list!.items.length).toBeLessThanOrEqual(5);
    }
  });

  it('the charter: four labels, the notes from the same words, the lead running into the list', () => {
    expect(charter.list!.items.map((i) => itemParts(i))).toEqual([
      { label: 'Purpose' },
      { label: 'Responsibility' },
      { label: 'Authority', note: 'to access people and records' },
      { label: 'Accountability', note: 'including where it reports' },
    ]);
    expect(leadText(charter.list!)).toBe('An audit charter is the founding document of the audit function. It sets out the function’s…');
    expect(ideaListSpoken(charter.list!)).toBe('A list of 4: Purpose; Responsibility; Authority, to access people and records; Accountability, including where it reports.');
  });
});

describe('the scene', () => {
  it('draws the lead, one spoken list (never "Step"), and the closing line on its own', () => {
    act(() => {
      r = create(<SceneView scene={charter} lesson={charterLesson} />);
    });
    const t = textOf(r!.root);
    expect(t).toContain('What a charter does');
    expect(t).toContain('Purpose');
    expect(t).toContain('to access people and records');
    expect(t).toContain('Without it, an auditor is a guest who can be shown the door.');
    const lists = r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('A list of 4: '));
    expect(lists).toHaveLength(1);
    expect(r!.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && /Step \d of/.test(n.props.accessibilityLabel))).toHaveLength(0);
    // The report link arrives with the closing line (the last part).
    expect(lastPart(charter)).toBe(charter.list!.items.length + 2);
  });

  it('a plain idea is unchanged', () => {
    const plain = CISA_LESSONS.flatMap((l) => l.scenes).find((s): s is Idea => s.type === 'idea' && !s.list && s.heading !== 'The IS auditor’s lens')!;
    expect(lastPart(plain)).toBe(1);
  });

  it('every scene starts on the anchor line (1.39’s centring of short scenes is undone)', () => {
    for (const s of charterLesson.scenes) expect(centreScene(s)).toBe(false);
  });
});
