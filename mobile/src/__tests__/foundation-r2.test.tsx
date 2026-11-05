/**
 * Premium round 2, "1 · Foundation" (DESIGN_SYSTEM.md §21.7): one button, one list, one surface.
 *  - Button: the plate shape is the default (54 tall, 16pt corners since Grove) in every kind but ghost.
 *  - Section variant="head": tracked caps drawn, the sentence-case words spoken, still a header.
 *  - IconButton outline (the lesson's "Previous step"): a 54×54 square with 16pt corners (Grove).
 *  - KeyList without numbers, and with a testID per row.
 *  - Learn's reference rows: an index list, spoken as before.
 *  - The clearing's growth line: "IS Audit ↑3", said "up 3 points"; no ring wording.
 *  - The You tab's specimen tag; the welcome's seed plate is hidden from screen readers.
 */
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { KeyList, SeedSketch } from '../components/fieldguide';
import { SpecimenTag } from '../components/glyphs';
import { clearingGrowth } from '../components/journey';
import { Button, IconButton, Section } from '../components/ui';
import { lookUpItems, tileRows } from '../app/(tabs)/learn';
import { getCertification } from '../content/certifications';
import { WELCOME_HEADLINE, WELCOME_LINE } from '../content/brand';
import { fieldType } from '../theme/tokens';
import { grovePlate as plate } from '../theme/grove';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const host = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.type === 'string' && pred(n));

afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('Button: the plate is the default shape', () => {
  it.each(['primary', 'secondary', 'danger', 'forest'] as const)('%s: 54 tall with 16pt corners (Grove), with no shape asked for', (kind) => {
    mount(<Button kind={kind} label="Continue" onPress={() => {}} />);
    const btn = host((n) => n.props.accessibilityRole === 'button')[0];
    const st = StyleSheet.flatten(btn.props.style);
    expect(st.minHeight).toBe(plate.button);
    expect(st.borderRadius).toBe(plate.buttonRadius);
  });

  it('ghost stays text alone (no plate corners or height)', () => {
    mount(<Button kind="ghost" label="Not now" onPress={() => {}} />);
    const st = StyleSheet.flatten(host((n) => n.props.accessibilityRole === 'button')[0].props.style);
    expect(st.borderRadius).toBeUndefined();
    expect(st.minHeight).toBe(48);
  });

  it('a caller can still ask for the old pill', () => {
    mount(<Button label="Continue" shape="pill" onPress={() => {}} />);
    const st = StyleSheet.flatten(host((n) => n.props.accessibilityRole === 'button')[0].props.style);
    expect(st.minHeight).toBe(56);
  });
});

describe('Section variant="head"', () => {
  it('draws tracked caps in ink and says the sentence-case words as one header', () => {
    mount(<Section variant="head" title="Look it up" meta="3 read" />);
    const headers = host((n) => n.props.accessibilityRole === 'header');
    expect(headers).toHaveLength(1);
    expect(headers[0].props.accessibilityLabel).toBe('Look it up');
    const words = host((n) => (n.type as unknown) === 'Text' && textOf(n) === 'Look it up')[0];
    const st = StyleSheet.flatten(words.props.style);
    expect(st.textTransform).toBe(fieldType.head.textTransform);
    expect(st.letterSpacing).toBe(fieldType.head.letterSpacing);
    expect(textOf(root())).toContain('3 read');
  });

  it('the default stays the headline (no caps)', () => {
    mount(<Section title="Mock exams" />);
    const words = host((n) => (n.type as unknown) === 'Text' && textOf(n) === 'Mock exams')[0];
    expect(StyleSheet.flatten(words.props.style).textTransform).toBeUndefined();
  });
});

describe('the lesson footer’s back button', () => {
  it('is a 54×54 square outline with 16pt corners (Grove; a 56pt circle before)', () => {
    mount(<IconButton outline label="Previous step" onPress={() => {}} icon={() => null} />);
    const st = StyleSheet.flatten(host((n) => n.props.accessibilityRole === 'button')[0].props.style);
    expect(st.width).toBe(plate.button);
    expect(st.height).toBe(plate.button);
    expect(st.borderRadius).toBe(plate.buttonRadius);
    expect(st.borderWidth).toBe(1.5);
  });
});

describe('KeyList as a navigation list', () => {
  it('numbered={false} drops the italic numbers; each row keeps its testID, label and hint', () => {
    const onPress = jest.fn();
    mount(<KeyList numbered={false} items={[{ key: 'n', kicker: 'Next note', title: 'Segregation of duties', spoken: 'Next note: Segregation of duties', hint: 'Opens the next note', onPress, testID: 'next-note' }]} />);
    expect(textOf(root())).not.toMatch(/\b1\b/);
    const row = host((n) => n.props.testID === 'next-note')[0];
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('Next note: Segregation of duties');
    expect(row.props.accessibilityHint).toBe('Opens the next note');
  });
});

describe('Learn: the reference tiles (Grove Phase 4, the kit order)', () => {
  const cert = getCertification('cisa')!;
  const all = { showNotes: true, showGlossary: true, showPrinciples: true, showGuide: true, showWeek: true };

  it('Study notes, Glossary, Principles, The CISA exam, then Final review week, each with its kit line', () => {
    const items = lookUpItems(cert, 0, all);
    expect(items.map((i) => i.title)).toEqual(['Study notes', 'Glossary', 'Principles', `The ${cert.name} exam`, 'Final review week']);
    expect(items.map((i) => i.line)).toEqual(['Every topic, with traps', 'Key terms, plain words', 'How the exam thinks', 'Booking to results', 'Your last seven days']);
    expect(items[0].spoken).toBe('Study notes, Every topic, with traps');
    expect(items[1].spoken).toBe('Glossary, key terms in plain words');
    expect(items[3].spoken).toBe(`About the ${cert.name} exam, booking to results`);
    for (const i of items) expect(i.onPress).toBeDefined();
  });

  it('once notes are read, the line counts them ("1 note read", "12 notes read"); never a total', () => {
    expect(lookUpItems(cert, 1, all)[0].line).toBe('1 note read · with traps');
    const [notes] = lookUpItems(cert, 12, all);
    expect(notes.line).toBe('12 notes read · with traps');
    expect(notes.spoken).toBe('Study notes, 12 notes read, with traps');
    expect(notes.line).not.toMatch(/ of /);
  });

  it('a tile shows only when the exam has it', () => {
    expect(lookUpItems(cert, 0, { showNotes: false, showPrinciples: true, showGuide: false, showWeek: false }).map((i) => i.key)).toEqual(['principles']);
  });

  it('tiles pair up two by two; an odd last tile is alone in its row (it spans the width); one per row otherwise', () => {
    expect(tileRows(['a', 'b', 'c'], true)).toEqual([['a', 'b'], ['c']]);
    expect(tileRows(['a', 'b', 'c', 'd'], true)).toEqual([['a', 'b'], ['c', 'd']]);
    expect(tileRows(['a', 'b', 'c'], false)).toEqual([['a'], ['b'], ['c']]);
  });
});

describe('the clearing’s growth line (item 11: no ring wording)', () => {
  it('names the area and its gain with an arrow, and says it in words', () => {
    expect(clearingGrowth({ area: 'IS Audit', points: 3 })).toEqual({ words: 'IS Audit ↑3', spoken: 'IS Audit, up 3 points' });
    expect(clearingGrowth({ area: 'IS Audit', points: 1 }).spoken).toBe('IS Audit, up 1 point');
  });

  it('with nothing to name: "Every answer feeds your five areas"', () => {
    expect(clearingGrowth(null).words).toBe('Every answer feeds your five areas');
    expect(clearingGrowth(null, 4).words).toBe('Every answer feeds your four areas');
    expect(clearingGrowth(null).words).not.toMatch(/ring/i);
  });
});

describe('the You tab’s specimen tag and the welcome’s seed', () => {
  it('the tag is a stroke-only glyph on the 24 grid (no fill, so no leaf)', () => {
    mount(<SpecimenTag color="#000" />);
    const svg = root().findAll((n) => n.props?.viewBox === '0 0 24 24')[0];
    expect(svg.props.fill).toBe('none');
  });

  it('the seed sketch is decorative: hidden from screen readers', () => {
    mount(<SeedSketch testID="seed" />);
    const box = host((n) => n.props.testID === 'seed')[0];
    expect(box.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(box.props.accessibilityElementsHidden).toBe(true);
  });

  it('the welcome line names the guide, with ® on first use, and never a forbidden word', () => {
    expect(WELCOME_HEADLINE).toBe('Think like an IS auditor.');
    expect(WELCOME_LINE).toBe('A field guide to your CISA® exam study.');
    expect(WELCOME_LINE).not.toMatch(/\b(pass|guarantee|official|evolve)\b|you're ready/i);
  });
});
