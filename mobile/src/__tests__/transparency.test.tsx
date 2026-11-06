/**
 * Transparency (owner request, 5 Nov 2026; spec: design-notes/grove/TRANSPARENCY.md, phone part):
 * - the short and long AI disclaimers are the spec's words, and every claim stays true
 *   (no "experts", "verified", "accurate", no question count, no AI vendor, no banned words);
 * - P2 Settings → About: the short line, then "How questions are made" (opens the Help answer)
 *   and the public page on kaisip.com;
 * - P3 Help → Common questions: the long disclaimer, right after the ISACA answer, 10 entries;
 * - P4 the welcome screen: the short line, directly above the not-affiliated line;
 * - P5 the Report a problem sheet: the report line on content reports, not on app-bug reports.
 */
import { Linking, ScrollView } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import {
  AI_DISCLAIMER_LINE,
  AI_LONG_DISCLAIMER,
  AI_LONG_DISCLAIMER_PARAGRAPHS,
  EXAM_TRADEMARK_LINE,
  HOW_MADE_TITLE,
  PROVENANCE_LINE,
  REPORT_AI_LINE,
} from '../content/brand';
import { FAQ } from '../content/support';
import { HOW_MADE_URL } from '../lib/config';
import { ReportSheet } from '../components/support';
import Faq from '../app/faq';
import * as a11y from '../lib/a11y';
import Onboarding from '../app/onboarding';
import Settings from '../app/settings';
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
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams.current,
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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const button = (label: string) =>
  r!.root.findAll((n) => typeof n.props.onPress === 'function' && typeof n.type !== 'string' && String(n.props.accessibilityLabel ?? '').startsWith(label))[0];

afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  mockParams.current = {};
  jest.clearAllMocks();
});

// The spec's text (straight apostrophes there; the app writes ’).
const curly = (s: string) => s.replace(/'/g, '’');
const SPEC_SHORT = curly("KaiSip's questions and notes are written with AI help and can contain mistakes. Check anything important against ISACA's own materials and your own judgment.");
const SPEC_REPORT = 'Written with AI help, so mistakes can slip through. Thanks for telling us.';
const SPEC_LONG = curly(
  "KaiSip's questions, explanations and study notes are original. They are drafted with AI tools, directed by a CISA-certified founder, and each question is mapped to ISACA's current CISA exam content outline. Before a question is added, it goes through automated checks and AI review checks (exam question style, technical accuracy, a blind answer test, sources and how current they are, consistency across domains, grammar, and whether the longest option gives the answer away). Then the founder reads the review reports and decides what to fix; not every question has been checked by hand yet. There is no outside panel of human reviewers yet. AI tools make mistakes, and so do people, so check anything important against ISACA's own materials and your own judgment. If something looks wrong, use Report a problem; fixes ship in app updates. A readiness range is a study estimate, not a prediction of your exam result. KaiSip is not affiliated with or endorsed by ISACA.",
);

describe('the disclaimer strings', () => {
  it('are the spec’s words', () => {
    expect(AI_DISCLAIMER_LINE).toBe(SPEC_SHORT);
    expect(REPORT_AI_LINE).toBe(SPEC_REPORT);
    expect(AI_LONG_DISCLAIMER).toBe(SPEC_LONG);
    expect(AI_LONG_DISCLAIMER_PARAGRAPHS.join(' ')).toBe(SPEC_LONG);
    expect(HOW_MADE_TITLE).toBe('How questions are made');
    expect(HOW_MADE_URL).toBe('https://kaisip.com/how-questions-are-made');
  });

  it('never overclaim, never name a vendor or the bank size, and use no banned words or dashes', () => {
    for (const s of [AI_DISCLAIMER_LINE, REPORT_AI_LINE, AI_LONG_DISCLAIMER, HOW_MADE_TITLE]) {
      expect(s).not.toMatch(/[–—]/);
      expect(s).not.toMatch(/\b(pass(es|ed)?|guarantee\w*|official|you[’']re ready|evolve\w*|runner-up|experts?|verified|accurate|auditors?)\b/i);
      expect(s).not.toMatch(/Claude|ChatGPT|OpenAI|Anthropic|Gemini|uses AI/i);
      expect(s).not.toMatch(/\d/);
    }
    // The facts that must stay said: AI help, the founder, AI checks, no outside panel, not ISACA.
    expect(AI_LONG_DISCLAIMER).toMatch(/AI review checks/);
    expect(AI_LONG_DISCLAIMER).toMatch(/no outside panel of human reviewers/);
    expect(AI_LONG_DISCLAIMER).toMatch(/not a prediction/);
    expect(AI_LONG_DISCLAIMER).toMatch(/not affiliated with or endorsed by ISACA/);
  });

  it('leave the provenance line as it was', () => {
    expect(PROVENANCE_LINE).toBe('Original questions and notes, written with AI assistance and checked against ISACA’s published exam outline and standards.');
  });
});

describe('P3 Help → Common questions', () => {
  it('answers “How are the questions made and checked?” with the long disclaimer, right after the ISACA answer', () => {
    const i = FAQ.findIndex((f) => f.id === 'how-made');
    expect(i).toBeGreaterThan(0);
    expect(FAQ[i - 1].id).toBe('isaca');
    expect(FAQ[i].question).toBe('How are the questions made and checked?');
    expect(FAQ[i].answer.join(' ')).toBe(SPEC_LONG);
    expect(FAQ).toHaveLength(10);
  });

  it('faq?open=how-made opens that answer; an unknown id opens none', () => {
    mockParams.current = { open: 'how-made' };
    mount(<Faq />);
    for (const p of AI_LONG_DISCLAIMER_PARAGRAPHS) expect(allText()).toContain(p);
    act(() => {
      r!.unmount();
    });
    mockParams.current = { open: 'nope' };
    mount(<Faq />);
    expect(allText()).not.toContain(AI_LONG_DISCLAIMER_PARAGRAPHS[0]);
  });

  // Release bug hunt round 1: the opened entry is the last of ten, below the fold on a small phone.
  it('faq?open=how-made scrolls that entry into view and moves the screen reader to it, once; a plain visit does neither', () => {
    const scroll = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const focus = jest.spyOn(a11y, 'moveFocus').mockImplementation(() => {});
    const question = FAQ.find((f) => f.id === 'how-made')!.question;
    const laidOut = () => r!.root.findAll((n) => typeof n.props.onLayout === 'function' && n.findAll((x) => x.props.title === question).length > 0);
    mockParams.current = { open: 'how-made' };
    mount(<Faq />);
    const layout = { nativeEvent: { layout: { x: 0, y: 653, width: 390, height: 60 } } };
    act(() => laidOut()[0].props.onLayout(layout));
    act(() => laidOut()[0].props.onLayout(layout)); // a second layout (the answer opening) does not scroll again
    expect(scroll).toHaveBeenCalledTimes(1);
    expect((scroll.mock.calls[0][0] as { y: number }).y).toBeGreaterThan(0);
    expect(focus).toHaveBeenCalledTimes(1);
    act(() => r!.unmount());
    scroll.mockClear();
    focus.mockClear();
    mockParams.current = {};
    mount(<Faq />);
    expect(laidOut()).toHaveLength(0);
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    scroll.mockRestore();
    focus.mockRestore();
  });
});

describe('P2 Settings → About', () => {
  beforeEach(() => useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' }));

  const openAbout = () => {
    mockParams.current = { category: 'help' };
    mount(<Settings />);
    expect(allText()).not.toContain(AI_DISCLAIMER_LINE);
    act(() => {
      button('About KaiSip').props.onPress();
    });
  };

  it('shows the short line under the provenance line, then the two ways to read more', () => {
    openAbout();
    const t = allText();
    expect(t.indexOf(AI_DISCLAIMER_LINE)).toBeGreaterThan(t.indexOf(PROVENANCE_LINE));
    expect(t.indexOf(HOW_MADE_TITLE)).toBeGreaterThan(t.indexOf(AI_DISCLAIMER_LINE));
    expect(button(HOW_MADE_TITLE).props.accessibilityRole).toBe('button');
    expect(button('Read it on kaisip.com').props.accessibilityRole).toBe('button');
  });

  it('“How questions are made” opens the bundled Help answer', () => {
    openAbout();
    act(() => {
      button(HOW_MADE_TITLE).props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/faq', params: { open: 'how-made' } });
  });

  it('“Read it on kaisip.com” opens the public page in the browser', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    openAbout();
    act(() => {
      button('Read it on kaisip.com').props.onPress();
    });
    expect(spy).toHaveBeenCalledWith('https://kaisip.com/how-questions-are-made');
    spy.mockRestore();
  });
});

describe('P4 the welcome screen', () => {
  it('shows the short line directly above the not-affiliated line', () => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: false });
    mount(<Onboarding />);
    const t = allText();
    const ai = t.indexOf(AI_DISCLAIMER_LINE);
    expect(ai).toBeGreaterThan(-1);
    // Nothing between the two lines.
    expect(t.slice(ai + AI_DISCLAIMER_LINE.length, t.indexOf(EXAM_TRADEMARK_LINE)).trim()).toBe('');
  });
});

describe('P5 the Report a problem sheet', () => {
  const sheet = (target: React.ComponentProps<typeof ReportSheet>['target']) =>
    mount(<ReportSheet visible certId="cisa" target={target} onClose={() => {}} onOpened={() => {}} />);

  it('says it on a question, a note and a lesson step', () => {
    sheet({ kind: 'question', id: 'd1_001', name: 'IS Audit Process' } as never);
    expect(allText()).toContain(REPORT_AI_LINE);
    act(() => {
      r!.unmount();
    });
    sheet({ kind: 'note', id: 'n1', name: 'Audit planning' } as never);
    expect(allText()).toContain(REPORT_AI_LINE);
    act(() => {
      r!.unmount();
    });
    sheet({ kind: 'lesson', id: 'l1', name: 'Risk', step: 1, steps: 3 } as never);
    expect(allText()).toContain(REPORT_AI_LINE);
  });

  it('does not say it on an app-bug report', () => {
    sheet({ kind: 'app', where: 'Settings' } as never);
    expect(allText()).not.toContain(REPORT_AI_LINE);
  });
});
