/**
 * Report a problem, from every place a learner reads content (mobile 1.7):
 * practice answers, the results review (practice and mock), the mistake
 * journal, study notes, lesson steps, a game's round recap, and the app
 * itself ("Something not working?"). Rendered against the real stores.
 *
 * Checked on the way:
 * - the sheet opens from each one, with that kind's reasons;
 * - the email that opens names the ORIGINAL letter of a shuffled pick;
 * - no report control during a live mock (the navigator says where to go);
 * - a lesson check's link waits until the check is answered;
 * - no email app: the address and the message as text, Share details;
 * - after reporting: "Finished in your email app?" and "Reported <date>".
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())`; use braces.
 */
import { Linking, Share } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { RoundEnd } from '../components/game';
import { OptionCard } from '../components/quiz';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { REASONS } from '../engine/support';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import SessionScreen from '../app/session';
import Results from '../app/results';
import Mistakes from '../app/mistakes';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import LessonPlayer from '../app/lesson/[id]';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.7.0' } } }));

const NOW = new Date(2026, 9, 11, 9, 0, 0).getTime();
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
const pressables = (label: string | RegExp) =>
  root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.type !== 'string' &&
      (typeof label === 'string' ? n.props.accessibilityLabel === label || n.props.label === label || n.props.title === label : label.test(n.props.accessibilityLabel ?? '')),
  );
const press = (label: string | RegExp) => act(() => { pressables(label)[0].props.onPress(); });
const pressAsync = async (label: string | RegExp) => {
  await act(async () => {
    await pressables(label)[0].props.onPress();
  });
};
const sheetOpen = () => allText().includes('What’s wrong?');
const openUrl = Linking.openURL as jest.Mock;
const lastBody = () => decodeURIComponent(String(openUrl.mock.calls.at(-1)![0]).split('&body=')[1]);

/** Choose a reason and press Write the email. */
async function sendReport(reason: string) {
  press(reason);
  await pressAsync('Write the email');
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  openUrl.mockReset();
  openUrl.mockResolvedValue(true);
  mockParams = {};
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', shuffleOptions: true });
  // `reports` isn't in the initial state (it's optional), and setState merges: clear it by hand.
  useProgress.setState({ ...useProgress.getInitialState(), reports: undefined });
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('practice: under the answer', () => {
  const q = getAllQuestions('cisa').find((x) => x.options.D)!;
  // Display slots A B C D show the bank's D C B A.
  const PERM = ['D', 'C', 'B', 'A'] as const;

  function answerShuffled(displayIndex: number) {
    startFromIds('cisa', [q.id], 'Quick 10');
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, perms: { [q.id]: [...PERM] } } }));
    });
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[displayIndex].props.onPress(); });
    press('Check answer');
  }

  it('opens the sheet with the question’s reasons, and the email names the ORIGINAL letter', async () => {
    answerShuffled(1); // the learner taps display B = the bank's C
    expect(sheetOpen()).toBe(false);
    press(`Report a problem with question ${q.id}`);
    expect(sheetOpen()).toBe(true);
    for (const reason of REASONS.question) expect(allText()).toContain(reason.label);
    // "Which answer do you think is best?" lists the options as shown, for key disputes.
    press('The marked answer looks wrong');
    expect(allText()).toContain('Which answer do you think is best?');
    press(`A. ${q.options.D}`); // display A = the bank's D
    await pressAsync('Write the email');

    expect(openUrl).toHaveBeenCalledTimes(1);
    const url = String(openUrl.mock.calls[0][0]);
    expect(url.startsWith('mailto:certprep.support@gmail.com?subject=')).toBe(true);
    expect(decodeURIComponent(url.split('subject=')[1].split('&body=')[0])).toBe(`Aurivan · Report · CISA · ${q.id} · key`);
    const body = lastBody();
    expect(body).toContain('Your pick: C (shown as B)');
    expect(body).toContain('Suggested answer: D (shown as A)');
    expect(body).toContain('Shown order (screen = bank): A=D, B=C, C=B, D=A');
    expect(body).toContain('Where: Practice · Quick 10');
    expect(body).toContain('App: Aurivan 1.7.0 (');
    // The question's own text never goes in the email.
    expect(body).not.toContain(q.stem.slice(0, 40));

    // Logged on the phone, the sheet closed, and the calm note shown in place.
    const [entry] = useProgress.getState().reports!;
    expect(entry).toMatchObject({ item: `q:${q.id}`, reason: 'key', cert: 'cisa', at: NOW });
    expect(sheetOpen()).toBe(false);
    expect(allText()).toContain('Finished in your email app?');
    expect(allText()).toContain('We read every report');
    expect(allText()).not.toMatch(/\bSent\b/);
    // The link now says it was reported, and still opens the sheet.
    expect(allText()).toContain('Reported 11 Oct');
    press(/^Reported 11 Oct\. Report a problem with question/);
    expect(allText()).toContain('You started a report about this on 11 Oct.');
  });

  it('Write the email waits for a reason', () => {
    answerShuffled(0);
    press(`Report a problem with question ${q.id}`);
    expect(pressables('Write the email')[0].props.disabled).toBe(true);
    press('Typo or grammar');
    expect(pressables('Write the email')[0].props.disabled).toBe(false);
  });

  it('Cancel keeps the note for next time', () => {
    answerShuffled(0);
    press(`Report a problem with question ${q.id}`);
    act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Add a note' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('B reads better'); });
    press('Cancel');
    expect(sheetOpen()).toBe(false);
    press(`Report a problem with question ${q.id}`);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Add a note' && typeof n.props.onChangeText === 'function')[0].props.value).toBe('B reads better');
  });

  it('“What we’ll send” shows the exact lines, and nothing about the learner', () => {
    answerShuffled(2);
    press(`Report a problem with question ${q.id}`);
    press('Typo or grammar');
    press('What we’ll send');
    const text = allText();
    expect(text).toContain(`Item: Question ${q.id}`);
    expect(text).toContain('Reason: Typo or grammar');
    expect(text).toContain('Your pick: B (shown as C)');
    expect(text).toContain('We’ll see your email address so we can reply. Nothing else about you is included.');
  });
});

describe('no email app: the fallback', () => {
  it('shows the address and the whole message as text, and Share details shares it', async () => {
    openUrl.mockRejectedValue(new Error('Unable to open URL: mailto:'));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const q = getAllQuestions('cisa')[3];
    startFromIds('cisa', [q.id], 'Quick 10');
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    press('Check answer');
    press(`Report a problem with question ${q.id}`);
    await sendReport('Outdated standard or reference');

    const text = allText();
    expect(text).toContain('We couldn’t open an email app.');
    expect(text).toContain('certprep.support@gmail.com');
    expect(text).toContain(`Subject: Aurivan · Report · CISA · ${q.id} · outdated`);
    expect(text).toContain('Reason: Outdated standard or reference');
    // Selectable, so it can be copied by hand too.
    expect(root().findAll((n) => n.props.selectable === true && typeof n.type === 'string').length).toBeGreaterThan(1);
    // Never a false "sent".
    expect(text).not.toContain('Finished in your email app?');
    // Still logged: the learner started a report.
    expect(useProgress.getState().reports).toHaveLength(1);

    await pressAsync('Share details');
    expect(share).toHaveBeenCalledTimes(1);
    const msg = share.mock.calls[0][0] as { message: string };
    expect(msg.message).toContain('To: certprep.support@gmail.com');
    expect(msg.message).toContain('Reason: Outdated standard or reference');
    press('Close');
    expect(allText()).not.toContain('We couldn’t open an email app.');
    share.mockRestore();
  });
});

describe('mock exams: report after, never during', () => {
  it('a live mock has no report control; the navigator says where to report', () => {
    startMock('cisa', 12);
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    expect(pressables(/^Report a problem/)).toHaveLength(0);
    expect(allText()).not.toContain('Report a problem');
    press('Question navigator');
    expect(allText()).toContain('To report a question, open it in the review after you submit.');
  });

  it('the mock review has the link on each opened question', async () => {
    startMock('cisa', 12);
    const s = useSession.getState().active!;
    act(() => { useSession.getState().answer(s.questionIds[0], { display: 'A', correct: false, ms: 1000 }); });
    act(() => { finishSession(); });
    mount(<Results />);
    press(/^Question 1, /);
    press(`Report a problem with question ${s.questionIds[0]}`);
    expect(sheetOpen()).toBe(true);
    await sendReport('Another option is also right');
    expect(lastBody()).toContain('Where: Mock review · ');
  });
});

describe('results: practice review and “Something not working?”', () => {
  beforeEach(() => {
    const ids = getAllQuestions('cisa').slice(5, 8).map((x) => x.id);
    startFromIds('cisa', ids, 'Quick 10');
    const s = useSession.getState().active!;
    for (const id of ids) act(() => { useSession.getState().answer(id, { display: 'A', correct: false, ms: 2000 }); });
    act(() => { finishSession(); });
    void s;
  });

  it('an opened review row has the report link', async () => {
    mount(<Results />);
    const first = useSession.getState().active!.questionIds[0];
    expect(pressables(`Report a problem with question ${first}`)).toHaveLength(0); // closed rows have none
    press(/^Question 1, /);
    press(`Report a problem with question ${first}`);
    await sendReport('The wording is unclear');
    expect(lastBody()).toContain('Where: Practice review · Quick 10');
  });

  it('the bug button opens the app’s reasons, with display details ticked', async () => {
    mount(<Results />);
    press('Something not working? Report a bug');
    for (const reason of REASONS.app) expect(allText()).toContain(reason.label);
    await sendReport('A score or result looks wrong');
    const body = lastBody();
    expect(body).toContain('Item: The app (Results)');
    expect(body).toContain('Display: Theme ');
    expect(body).toMatch(/Where: Results · practice, 3 questions/);
  });
});

describe('the mistake journal', () => {
  it('reports the original pick (no letters are on screen there)', async () => {
    const q = getAllQuestions('cisa')[12];
    const wrong = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && q.options[l])!;
    act(() => { useProgress.getState().recordMistake('cisa', q.id, wrong); });
    mount(<Mistakes />);
    press(`Report a problem with question ${q.id}`);
    expect(allText()).not.toContain('Which answer do you think is best?');
    await sendReport('The marked answer looks wrong');
    // With no letters on screen there's nothing to suggest by letter.
    expect(allText()).not.toContain('Which answer do you think is best?');
    expect(lastBody()).toContain(`Your pick: ${wrong}\n`);
    expect(lastBody()).toContain('Where: Mistake journal');
  });
});

describe('study notes', () => {
  it('a note has the link with its code, and the note’s reasons', async () => {
    const note = noteSubtopics('cisa')[0];
    mockParams = { id: encodeURIComponent(note.id) };
    mount(<NoteSubtopicScreen />);
    expect(allText()).toContain(`Code ${note.id}`);
    press(`Report a problem with note ${note.id}`);
    for (const reason of REASONS.note) expect(allText()).toContain(reason.label);
    await sendReport('A diagram is wrong or hard to read');
    expect(lastBody()).toContain(`Item: Note ${note.id} (${note.name})`);
    expect(useProgress.getState().reports![0].item).toBe(`note:${note.id}`);
  });
});

describe('lessons', () => {
  const lesson = CISA_LESSONS.find((l) => l.scenes.some((s) => s.type === 'check'))!;
  const checkAt = lesson.scenes.findIndex((s) => s.type === 'check');

  it('each step has the link; on a check it waits until the check is answered', async () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    expect(pressables('Report a problem with this lesson step')).toHaveLength(1);
    // Walk to the check scene.
    for (let i = 0; i < checkAt; i++) press('Next');
    expect(pressables('Report a problem with this lesson step')).toHaveLength(0);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    expect(pressables('Report a problem with this lesson step')).toHaveLength(1);
    press('Report a problem with this lesson step');
    for (const reason of REASONS.lesson) expect(allText()).toContain(reason.label);
    await sendReport('The check question’s answer looks wrong');
    const body = lastBody();
    expect(body).toContain(`Item: Lesson ${lesson.id}, step ${checkAt + 1} of ${lesson.scenes.length}`);
    // A check's pick is named by its ORIGINAL letter too.
    expect(body).toMatch(/Your pick: [A-D] \(shown as A\)/);
    expect(useProgress.getState().reports![0].item).toBe(`lesson:${lesson.id}#${checkAt + 1}`);
  });
});

describe('game recaps', () => {
  it('each miss has its own link: a question by its code, a card by its id', async () => {
    const q = getAllQuestions('cisa')[20];
    mount(
      <RoundEnd
        certId="cisa"
        game="rumor"
        score={3}
        max={8}
        onAgain={() => {}}
        misses={[
          { questionId: q.id, stem: 'A question…', tag: 'Snare: B', why: 'Why.', answerWrong: true },
          { questionId: 'rumor:4B1.2:k1x9', stem: 'A statement…', tag: 'Rumor', why: 'Why.', answerWrong: true },
        ]}
      />,
    );
    expect(pressables(`Report a problem with question ${q.id}`)).toHaveLength(1);
    press('Report a problem with this card');
    for (const reason of REASONS.card) expect(allText()).toContain(reason.label);
    await sendReport('The game marked me wrong, but I was right');
    expect(lastBody()).toContain('Item: Game card rumor:4B1.2:k1x9 (Root or Rumor)');
    expect(lastBody()).toContain('Where: Game recap · Root or Rumor');
  });
});
