/**
 * Report a problem, from every place a learner reads content (mobile 1.7):
 * practice answers, the results review (practice and mock), the mistake
 * journal, study notes, lesson steps, a game's round recap, and the app
 * itself ("Something not working?"). Rendered against the real stores.
 *
 * Mobile 1.49: on the practice answer screen the report opens from the
 * header's ⋯ "More on this question" sheet (premium pass §2.3).
 *
 * Checked on the way:
 * - the sheet opens from each one, with that kind's reasons;
 * - the email that opens names the ORIGINAL letter of a shuffled pick;
 * - no report control during a live mock (the navigator says where to go);
 * - a lesson check's link waits until the check is answered;
 * - no email app: the address and the message as text, Share details;
 * - after reporting: "Finished in your email app?" and "Report started <date>".
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())`; use braces.
 */
import { Linking, Share } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { moreRowLabels, viaMore } from '../../jest/answerMore';
import { RoundEnd } from '../components/game';
import { OptionCard } from '../components/quiz';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { getRoleDeck, getStepSequences } from '../content/games';
import { canopyCardId } from '../engine/games/canopyCall';
import { stonesCardId } from '../engine/games/steppingStones';
import { REASONS } from '../engine/support';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import SessionScreen from '../app/session';
import Results from '../app/results';
import Mistakes from '../app/mistakes';
import Reports from '../app/reports';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import LessonPlayer from '../app/lesson/[id]';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
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
const unmount = () =>
  act(() => {
    r?.unmount();
    r = undefined;
  });
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
// Mail links use CRLF line ends (RFC 6068); read them as plain \n lines.
const lastBody = () => decodeURIComponent(String(openUrl.mock.calls.at(-1)![0]).split('&body=')[1]).replace(/\r\n/g, '\n');

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

// A practice question with a known shuffle (used by the practice and "other ways out" tests).
const q = getAllQuestions('cisa').find((x) => x.options.D)!;
// Display slots A B C D show the bank's D C B A.
const PERM = ['D', 'C', 'B', 'A'] as const;

/** Mobile 1.49: the answer screen's ⋯ row that opens the report form. */
const REPORT_ROW = 'Report a problem with this question';

function answerShuffled(displayIndex: number) {
  startFromIds('cisa', [q.id], 'Quick 10');
  act(() => {
    useSession.setState((s) => ({ active: { ...s.active!, perms: { [q.id]: [...PERM] } } }));
  });
  mount(<SessionScreen />);
  act(() => { root().findAllByType(OptionCard)[displayIndex].props.onPress(); });
  press('Check answer');
}

describe('practice: from the answer screen’s ⋯ sheet (mobile 1.49)', () => {

  it('opens the sheet with the question’s reasons, and the email names the ORIGINAL letter', async () => {
    answerShuffled(1); // the learner taps display B = the bank's C
    expect(sheetOpen()).toBe(false);
    viaMore(root(), REPORT_ROW);
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
    // Line ends in the link are CRLF (RFC 6068), never a bare %0A.
    expect(url).toContain('%0D%0A');
    expect(url).not.toMatch(/(?<!%0D)%0A/);
    expect(decodeURIComponent(url.split('subject=')[1].split('&body=')[0])).toBe(`KaiSip · Report · CISA · ${q.id} · key`);
    const body = lastBody();
    expect(body).toContain('Your pick: C (shown as B)');
    expect(body).toContain('Suggested answer: D (shown as A)');
    expect(body).toContain('Shown order (screen = bank): A=D, B=C, C=B, D=A');
    expect(body).toContain('Where: Practice · Quick 10');
    expect(body).toContain('App: KaiSip 1.7.0 (');
    // The question's own text never goes in the email.
    expect(body).not.toContain(q.stem.slice(0, 40));

    // Logged on the phone, the sheet closed, and the calm note shown in place.
    const [entry] = useProgress.getState().reports!;
    // The app version is kept, so a later fix can credit it by version.
    expect(entry).toMatchObject({ item: `q:${q.id}`, reason: 'key', cert: 'cisa', at: NOW, version: '1.7.0' });
    expect(sheetOpen()).toBe(false);
    expect(allText()).toContain('Finished in your email app?');
    expect(allText()).toContain('We read every report');
    expect(allText()).not.toMatch(/\bSent\b/);
    // The ⋯ row says a report was STARTED (we can't know it was sent), and still opens the sheet.
    expect(moreRowLabels(root())).toContain(`${REPORT_ROW}. Report started 11 Oct`);
    expect(allText()).not.toMatch(/(^|\s)Reported\b/);
    viaMore(root(), REPORT_ROW);
    expect(allText()).toContain('You started a report about this on 11 Oct.');
  });

  it('Write the email waits for a reason', () => {
    answerShuffled(0);
    viaMore(root(), REPORT_ROW);
    expect(pressables('Write the email')[0].props.disabled).toBe(true);
    press('Typo or grammar');
    expect(pressables('Write the email')[0].props.disabled).toBe(false);
  });

  it('Cancel keeps the note for next time', () => {
    answerShuffled(0);
    viaMore(root(), REPORT_ROW);
    act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Add a note' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('B reads better'); });
    press('Cancel');
    expect(sheetOpen()).toBe(false);
    viaMore(root(), REPORT_ROW);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Add a note' && typeof n.props.onChangeText === 'function')[0].props.value).toBe('B reads better');
  });

  it('“What we’ll send” shows the exact lines, and nothing about the learner', () => {
    answerShuffled(2);
    viaMore(root(), REPORT_ROW);
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
    viaMore(root(), REPORT_ROW);
    await sendReport('Outdated standard or reference');

    const text = allText();
    expect(text).toContain('We couldn’t open an email app.');
    expect(text).toContain('certprep.support@gmail.com');
    expect(text).toContain(`Subject: KaiSip · Report · CISA · ${q.id} · outdated`);
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
    press('Questions, question navigator');
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

  it('no report row in a step’s body; the header flag reports an answered check (mobile 1.49)', async () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    expect(pressables('Report a problem with this lesson step')).toHaveLength(0);
    // Walk to the check scene.
    for (let i = 0; i < checkAt; i++) press('Next');
    expect(pressables('Report a problem with this lesson step')).toHaveLength(0);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    expect(pressables('Report a problem with this lesson step')).toHaveLength(0);
    press('Report a problem with this step');
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
  // Mobile 1.40: ONE "Report a problem" at the foot of the recap, not one under every miss.
  it('one link at the foot: with several misses it reports the round and names the missed items', async () => {
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
    expect(pressables(/^Report a problem/)).toHaveLength(1);
    expect(pressables(`Report a problem with question ${q.id}`)).toHaveLength(0);
    // It sits at the foot: after "Done".
    const t = allText();
    expect(t.lastIndexOf('Report a problem')).toBeGreaterThan(t.indexOf('Done'));
    press('Report a problem with the app');
    for (const reason of REASONS.app) expect(allText()).toContain(reason.label);
    await sendReport('A score or result looks wrong');
    expect(lastBody()).toContain(`Where: Game recap · Root or Rumor · missed ${q.id}, rumor:4B1.2:k1x9`);
  });

  it('one link at the foot: with one miss it reports that question by its code', async () => {
    const q = getAllQuestions('cisa')[20];
    mount(<RoundEnd certId="cisa" game="trap" score={4} max={5} onAgain={() => {}} misses={[{ questionId: q.id, stem: 'A question…', tag: 'Snare: B', why: 'Why.', answerWrong: true }]} />);
    expect(pressables(/^Report a problem/)).toHaveLength(1);
    expect(pressables(`Report a problem with question ${q.id}`)).toHaveLength(1);
  });

  it('one link at the foot: a single card miss reports the card by its id', async () => {
    mount(<RoundEnd certId="cisa" game="rumor" score={7} max={8} onAgain={() => {}} misses={[{ questionId: 'rumor:4B1.2:k1x9', stem: 'A statement…', tag: 'Rumor', why: 'Why.', answerWrong: true }]} />);
    press('Report a problem with this card');
    for (const reason of REASONS.card) expect(allText()).toContain(reason.label);
    await sendReport('The game marked me wrong, but I was right');
    expect(lastBody()).toContain('Item: Game card rumor:4B1.2:k1x9 (Root or Rumor)');
    expect(lastBody()).toContain('Where: Game recap · Root or Rumor');
  });

  it('Canopy Call and Stepping Stones misses report the STABLE card id, and Your reports names the game', async () => {
    const card = getRoleDeck('cisa')!.cards[0];
    const seq = getStepSequences('cisa').find((x) => !x.lessonId)!;
    mount(
      <RoundEnd
        certId="cisa"
        game="canopy"
        score={8}
        max={10}
        onAgain={() => {}}
        // As canopy.tsx and stones.tsx build them: the deck id as the key, the stable id to report.
        misses={[{ questionId: card.id, reportId: canopyCardId(card), stem: 'A decision…', tag: 'Decides: Board', why: 'Why.', answerWrong: true }]}
      />,
    );
    press('Report a problem with this card');
    await sendReport('Something on this card is wrong');
    expect(lastBody()).toContain(`Item: Game card ${canopyCardId(card)} (Canopy Call)`);
    expect(useProgress.getState().reports![0].item).toBe(`card:role:${card.subtopicId}:${card.id}`);
    unmount();

    mount(
      <RoundEnd
        certId="cisa"
        game="stones"
        score={1}
        max={3}
        onAgain={() => {}}
        misses={[{ questionId: seq.id, reportId: stonesCardId(seq), stem: seq.title, tag: 'Order', why: 'Why.', answerWrong: true }]}
      />,
    );
    press('Report a problem with this card');
    await sendReport('Something on this card is wrong');
    expect(useProgress.getState().reports![0].item).toBe(`card:seq:${seq.subtopicId}:${seq.id}`);
    unmount();

    // Your reports names each game, Root or Rumor's "root:" cards included.
    act(() => {
      useProgress.getState().logReport({ ref: 'R-7K2Q', item: 'card:root:4B1.2:2kku2i', reason: 'incorrect', cert: 'cisa' });
    });
    mount(<Reports />);
    const text = allText();
    expect(text).toContain('Game card: Canopy Call');
    expect(text).toContain('Game card: Stepping Stones');
    expect(text).toContain('Game card: Root or Rumor');
    expect(text).not.toContain('Game card: a game');
  });
});

describe('the report sheet’s other ways out', () => {
  it('no email app: Try again goes back to the form, and after Close the ⋯ row opens a fresh form, not the old panel', async () => {
    openUrl.mockRejectedValue(new Error('no mail app'));
    answerShuffled(0);
    viaMore(root(), REPORT_ROW);
    await sendReport('Typo or grammar');
    expect(allText()).toContain('We couldn’t open an email app.');
    // Try again: the form is back, the reason still chosen; logged once only.
    press('Try again');
    expect(sheetOpen()).toBe(true);
    expect(pressables('Write the email')[0].props.disabled).toBe(false);
    await pressAsync('Write the email');
    expect(useProgress.getState().reports).toHaveLength(1);
    press('Close');
    expect(moreRowLabels(root())).toContain(`${REPORT_ROW}. Report started 11 Oct`);
    viaMore(root(), REPORT_ROW);
    expect(allText()).toContain('You started a report about this on 11 Oct.');
    expect(allText()).not.toContain('We couldn’t open an email app.');
  });

  it('“Copy or share instead” shows the whole message to copy or share, with no email app needed', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    answerShuffled(0);
    viaMore(root(), REPORT_ROW);
    expect(pressables('Copy or share instead')[0].props.disabled).toBe(true); // a reason first
    press('Typo or grammar');
    press('Copy or share instead');
    expect(openUrl).not.toHaveBeenCalled();
    expect(allText()).toContain('Send it your own way');
    expect(allText()).not.toContain('We couldn’t open an email app.');
    expect(allText()).toContain(`Item: Question ${q.id}`);
    await pressAsync('Share details');
    expect((share.mock.calls[0][0] as { message: string }).message).toContain('Reason: Typo or grammar');
    expect(useProgress.getState().reports).toHaveLength(1);
    share.mockRestore();
  });

  it('a sighted learner sees why “Write the email” waits', () => {
    answerShuffled(0);
    viaMore(root(), REPORT_ROW);
    expect(allText()).toContain('Choose what’s wrong to continue.');
    press('Typo or grammar');
    expect(allText()).not.toContain('Choose what’s wrong to continue.');
  });
});
