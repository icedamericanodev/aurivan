import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { Stem, T } from '../components/ui';
import { useSettings } from '../store/settings';
import { dark, light, STEM_LONG_CHARS, stemLong } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const question = "An IS auditor led the engineering of a company's IAM system before moving to audit six months ago and is now assigned to audit it. What is the MOST appropriate action?";
let r: ReactTestRenderer;
const render = (text = question, highlight: string | null = 'MOST', ink = false, color?: string) => {
  act(() => { r = create(<Stem highlight={highlight} ink={ink} color={color}>{text}</Stem>); });
};
const update = (text = question, highlight: string | null = 'MOST') => {
  act(() => { r.update(<Stem highlight={highlight}>{text}</Stem>); });
};
const flattenedText = (node: ReturnType<ReactTestRenderer['toJSON']>): string => {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(flattenedText).join('');
  return (node.children ?? []).map((child) => typeof child === 'string' ? child : flattenedText(child)).join('');
};
afterEach(() => { if (r) act(() => { r.unmount(); }); });
describe.each(['light', 'dark'] as const)('Coach me readable stem in %s', (theme) => {
  const palette = theme === 'dark' ? dark : light;
  beforeEach(() => { useSettings.setState({ theme, motion: 'reduced' }); });
  it('renders the full question exactly once without transparent overlaid glyphs', () => {
    render();
    expect(flattenedText(r.toJSON())).toBe(question);
    expect(r.root.findAllByType(T)).toHaveLength(1);
    for (const text of r.root.findAllByType(Text)) {
      expect(StyleSheet.flatten(text.props.style)?.color).not.toBe('transparent');
    }
    const word = r.root.findAllByType(Text).find((n) => n.props.children === 'MOST')!;
    expect(StyleSheet.flatten(word.props.style).color).toBe(palette.tip);
  });
  it('opens Coach me repeatedly and clears it for the next question', () => {
    render(question, null); update(); update();
    expect(flattenedText(r.toJSON())).toBe(question);
    update('Which control is BEST?', null);
    expect(flattenedText(r.toJSON())).toBe('Which control is BEST?');
    expect(r.root.findAllByType(T)).toHaveLength(1);
  });
  it('preserves a custom color and long-stem sizing', () => {
    render('Context. '.repeat(STEM_LONG_CHARS) + 'MOST?', 'MOST', false, palette.ink2);
    expect(r.root.findByType(T).props.color).toBe(palette.ink2);
    expect(r.root.findByType(T).props.style).toEqual(stemLong);
  });
  it('keeps Signpost underlined with ink rather than coached colour', () => {
    render(question, 'MOST', true);
    const word = r.root.findAllByType(Text).find((n) => n.props.children === 'MOST')!;
    expect(StyleSheet.flatten(word.props.style)).toMatchObject({ color: palette.ink, textDecorationLine: 'underline' });
    expect(flattenedText(r.toJSON())).toBe(question);
  });
  it('marks only the last whole priority word and leaves absent matches plain', () => {
    render('MOST or ALMOST: which is MOST?');
    expect(r.root.findAllByType(Text).filter((n) => n.props.children === 'MOST')).toHaveLength(1);
    expect(flattenedText(r.toJSON())).toBe('MOST or ALMOST: which is MOST?');
    update('ALMOST there', 'MOST');
    expect(r.root.findAllByType(T)).toHaveLength(1);
    expect(flattenedText(r.toJSON())).toBe('ALMOST there');
  });
});
