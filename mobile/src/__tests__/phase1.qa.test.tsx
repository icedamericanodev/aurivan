/**
 * QA for Uplift Phase 1 "Ask and fix" (mobile 1.7.0, PR #37), walked as a
 * learner would, on REAL content (the built CISA pack, notes and lessons).
 *
 * Journeys:
 *  1. Report a shuffled practice question ("answer looks wrong" + a
 *     suggested answer): original letters, right ids and version, nothing
 *     personal.
 *  2. Report from the mock review after submitting; nothing during a live mock.
 *  3. Report from a note, a lesson step (a check only once answered) and a
 *     game recap miss.
 *  4. No email app: the fallback shows the address and message, Share works,
 *     nothing claims "sent".
 *  5. Your reports: fills, keeps the newest 200, survives a backup round trip,
 *     a pre-1.7 save loads, and a reset keeps it.
 *  6. A fix dated after a report: "Updated after your report", What's new
 *     "Your report helped" once, Today's line once.
 *  7. Settings and You → Help: Contact support, Send feedback, Suggest an
 *     idea, and the aurivan://help?open=… deep link (good and bad values).
 *  8. What's new, What's next and Common questions render; no bank size.
 *
 * Real bugs are pinned with `it.failing` (they pass while the bug exists and
 * start failing once it is fixed; then switch them to `it`).
 *
 * Gotcha (session-screen.regression.test.tsx): never write
 * `act(() => store.action())`; use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Share } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { RoundEnd } from '../components/game';
import { OptionCard } from '../components/quiz';
import { getCertification } from '../content/certifications';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { getAllQuestions } from '../content/loader';
import { getNotes, noteSubtopics } from '../content/notes';
import { FAQ, WHATS_NEW, WHATS_NEXT } from '../content/support';
import type { Letter, PackQuestion } from '../content/types';
import { readBackup } from '../engine/backup';
import { rumorStatements } from '../engine/games/rootOrRumor';
import { displayToOriginal, isCorrect, originalToDisplay } from '../engine/shuffle';
import { MAX_MAILTO, MAX_REPORTS, REF_RE, type Fix, type ReportEntry } from '../engine/support';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { finishSession } from '../lib/finishSession';
import { startMock, startPractice } from '../lib/sessions';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import SessionScreen from '../app/session';
import Results from '../app/results';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import LessonPlayer from '../app/lesson/[id]';
import Settings from '../app/settings';
import Help from '../app/help';
import Faq from '../app/faq';
import WhatsNext from '../app/whats-next';
import WhatsNew from '../app/whats-new';
import Reports from '../app/reports';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';

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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
const mockPush = jest.fn();
let mockParams: Record<string, string | string[] | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.7.0' } } }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class { list() { return []; } }, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));
// The bundled fixes.json is empty until the first fix ships: journeys supply their own.
let mockFixes: Fix[] = [];
jest.mock('../content/support', () => {
  const actual = jest.requireActual('../content/support');
  return new Proxy(actual, { get: (t, k: string) => (k === 'FIXES' ? mockFixes : t[k]) });
});

// 11 Oct 2026, 09:00 local.
const NOW = new Date(2026, 9, 11, 9, 0, 0).getTime();
const DAY = 86_400_000;
const EXAM_DATE = '2026-12-20';

// ── Rendering helpers ────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () =>
  act(() => {
    r?.unmount();
    r = undefined;
  });
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
      (typeof label === 'string'
        ? n.props.accessibilityLabel === label || n.props.label === label || n.props.title === label
        : label.test(n.props.accessibilityLabel ?? '') || label.test(String(n.props.label ?? '')) || label.test(String(n.props.title ?? ''))),
  );
const press = (label: string | RegExp) =>
  act(() => {
    const found = pressables(label);
    if (!found.length) throw new Error(`Nothing to press: ${String(label)}\n${allText().slice(0, 600)}`);
    found[0].props.onPress();
  });
const pressAsync = async (label: string | RegExp) => {
  await act(async () => {
    await pressables(label)[0].props.onPress();
  });
};
const sheetOpen = () => allText().includes('What’s wrong?');
const openUrl = Linking.openURL as jest.Mock;
const lastEmail = () => {
  const url = String(openUrl.mock.calls.at(-1)![0]);
  return {
    url,
    to: url.slice('mailto:'.length, url.indexOf('?')),
    subject: decodeURIComponent(url.split('subject=')[1].split('&body=')[0]),
    // Mail links use CRLF line ends (RFC 6068); read them as plain \n lines.
    body: decodeURIComponent(url.split('&body=')[1]).replace(/\r\n/g, '\n'),
  };
};
/** The block the learner is asked to keep: one "Key: value" per line. */
const keptLines = (body: string) =>
  body.split('-- Please keep the lines below. They tell us exactly what you saw. --\n')[1].split('\n\n')[0].split('\n');

/** Copy that would claim the email went out ("Sent.", "Report sent", "was sent"). "If you sent it" is honest. */
const SENT_CLAIM = /\bSent\b|\b(report|message|email)\s+(was\s+|has\s+been\s+)?sent\b|\bwas sent\b/;

const domainShort = (q: PackQuestion) => getCertification('cisa')!.domains.find((d) => d.id === q.domainId)!.short;

/** Everything that would identify or profile a learner: none of it may be in an email. */
function expectNothingPersonal(body: string, subject: string) {
  const text = `${subject}\n${body}`;
  for (const bad of [EXAM_DATE, '20 Dec', 'Dec 2026', '07:45', '7:45', 'streak', 'Streak', 'readiness', 'Readiness', 'score', 'Score', 'locale', 'en-US', 'en-GB', 'device', 'Device', 'name:', 'Name:']) {
    expect(text).not.toContain(bad);
  }
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  openUrl.mockReset();
  openUrl.mockResolvedValue(true);
  mockPush.mockClear();
  mockParams = {};
  mockFixes = [];
  // A learner with personal-ish data on the phone: an exam date, a reminder time and a streak.
  useSettings.setState({
    ...useSettings.getInitialState(),
    onboarded: true,
    activeCertId: 'cisa',
    shuffleOptions: true,
    examDates: { cisa: EXAM_DATE },
    reminder: { enabled: true, hour: 7, minute: 45, days: [1, 2, 3, 4, 5] },
  });
  // `reports` is optional (not in the initial state) and setState merges: clear it by hand.
  useProgress.setState({ ...useProgress.getInitialState(), reports: undefined, streak: { current: 37, best: 41, lastDay: '2026-10-10' } });
  useSession.getState().clear();
  useBackup.setState({ lastBackupAt: null, undo: null });
});
afterEach(() => {
  unmount();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 1: report a shuffled practice question', () => {
  /** A real Quick 10 with shuffle on; moves to the first question whose order really changed. */
  function openShuffledQuestion() {
    startPractice('cisa', { count: 10, title: 'Quick 10' });
    const s = useSession.getState().active!;
    const index = s.questionIds.findIndex((id) => {
      const p = s.perms[id];
      return p.length === 4 && p.some((l, i) => l !== 'ABCD'[i]) && originalToDisplay('A', p) !== 'A';
    });
    expect(index).toBeGreaterThanOrEqual(0);
    act(() => {
      useSession.setState((x) => ({ active: { ...x.active!, index } }));
    });
    const id = s.questionIds[index];
    const q = getAllQuestions('cisa').find((x) => x.id === id)!;
    return { q, perm: s.perms[id] };
  }

  it('the email names the ORIGINAL letters the grader used, the right ids and version, and nothing personal', async () => {
    const { q, perm } = openShuffledQuestion();
    mount(<SessionScreen />);
    // Pick a WRONG option by what is on screen.
    const wrongDisplay = (['A', 'B', 'C', 'D'] as Letter[]).find((d) => displayToOriginal(d, perm) !== q.correct)!;
    const wrongOriginal = displayToOriginal(wrongDisplay, perm);
    act(() => { root().findAllByType(OptionCard)['ABCD'.indexOf(wrongDisplay)].props.onPress(); });
    press('Check answer');
    // Graded on the original letter.
    expect(isCorrect(q, wrongDisplay, perm)).toBe(false);
    expect(useSession.getState().active!.responses[q.id].correct).toBe(false);
    expect(useProgress.getState().byCert.cisa.mistakes[q.id].picked).toBe(wrongOriginal);

    press(`Report a problem with question ${q.id}`);
    expect(sheetOpen()).toBe(true);
    press('The marked answer looks wrong');
    // The suggestion list shows options in the order on screen.
    const keyDisplay = originalToDisplay(q.correct, perm);
    const suggestDisplay = (['A', 'B', 'C', 'D'] as Letter[]).find((d) => d !== keyDisplay && d !== wrongDisplay)!;
    const suggestOriginal = displayToOriginal(suggestDisplay, perm);
    press(`${suggestDisplay}. ${q.options[suggestOriginal]}`);
    await pressAsync('Write the email');

    expect(openUrl).toHaveBeenCalledTimes(1);
    const { to, subject, body, url } = lastEmail();
    expect(to).toBe('certprep.support@gmail.com');
    expect(subject).toBe(`Aurivan · Report · CISA · ${q.id} · key`);
    const lines = keptLines(body);
    expect(lines).toContain(`Item: Question ${q.id} (${domainShort(q)})`);
    expect(lines).toContain('Reason: The marked answer looks wrong');
    expect(lines).toContain(`Your pick: ${wrongOriginal} (shown as ${wrongDisplay})`);
    expect(lines).toContain(`Suggested answer: ${suggestOriginal} (shown as ${suggestDisplay})`);
    expect(lines).toContain(`Shown order (screen = bank): ${perm.map((o, i) => `${'ABCD'[i]}=${o}`).join(', ')}`);
    expect(lines).toContain('Where: Practice · Quick 10');
    expect(lines).toContain('Certification: CISA');
    expect(lines.some((l) => /^App: Aurivan 1\.7\.0 \((iOS|Android|Web)[^)]*\)$/.test(l))).toBe(true);
    expect(lines).toContain('Content reviewed: Oct 2026');
    // The same reference in the email and in Your reports.
    const [entry] = useProgress.getState().reports!;
    expect(entry).toMatchObject({ item: `q:${q.id}`, reason: 'key', cert: 'cisa', at: NOW });
    expect(entry.ref).toMatch(REF_RE);
    expect(lines).toContain(`Ref: ${entry.ref}`);
    // Every kept line is one of the known, non-personal fields.
    for (const l of lines) expect(l).toMatch(/^(Item|Part|Reason|Your pick|Suggested answer|Shown order \(screen = bank\)|Where|Certification|App|Content reviewed|Ref): /);
    // No question text, no option text, no explanation; nothing about the learner.
    expect(body).not.toContain(q.stem.slice(0, 30));
    for (const l of ['A', 'B', 'C', 'D'] as Letter[]) if (q.options[l] && q.options[l]!.length > 12) expect(body).not.toContain(q.options[l]!);
    expect(body).not.toContain(q.explanation.slice(0, 30));
    expectNothingPersonal(body, subject);
    expect(url.length).toBeLessThan(MAX_MAILTO);
    // Calm, honest confirmation: never claims it was sent (the mail app can't tell us).
    expect(allText()).toContain('Finished in your email app?');
    expect(allText()).not.toMatch(SENT_CLAIM);
  });

  it('a 1,000-character note still fits the link cap, and the email keeps it whole', async () => {
    const { q } = openShuffledQuestion();
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    press('Check answer');
    press(`Report a problem with question ${q.id}`);
    const note = 'The explanation says one thing and the key says another. '.repeat(30).slice(0, 1000);
    act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Add a note' && typeof n.props.onChangeText === 'function')[0].props.onChangeText(note); });
    press('The wording is unclear');
    await pressAsync('Write the email');
    const { body, url } = lastEmail();
    expect(url.length).toBeLessThanOrEqual(MAX_MAILTO);
    expect(body).toContain(note.trimEnd());
  });

  it('the “Reported” state belongs to that question only: the next question starts fresh', async () => {
    startPractice('cisa', { count: 10, title: 'Quick 10' });
    const ids = useSession.getState().active!.questionIds;
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    press('Check answer');
    press(`Report a problem with question ${ids[0]}`);
    press('Typo or grammar');
    await pressAsync('Write the email');
    expect(allText()).toContain('Reported 11 Oct');
    press('Next question');
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    press('Check answer');
    expect(pressables(`Report a problem with question ${ids[1]}`)).toHaveLength(1);
    expect(allText()).not.toContain('Reported 11 Oct');
    expect(allText()).not.toContain('Finished in your email app?');
  });

  // BUG (Minor): the busy guard reads React state from the press handler's
  // closure, so two taps that land before the next render both pass it.
  it.failing('a quick double tap on “Write the email” opens one email and logs one report', async () => {
    const { q } = openShuffledQuestion();
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
    press('Check answer');
    press(`Report a problem with question ${q.id}`);
    press('Typo or grammar');
    await act(async () => {
      const tap = pressables('Write the email')[0].props.onPress as () => Promise<void>;
      await Promise.all([tap(), tap()]);
    });
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(useProgress.getState().reports).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 2: mocks — report after submitting, never during', () => {
  it('a live mock has no report control on any question, answered, flagged or not', () => {
    startMock('cisa', 12);
    mount(<SessionScreen />);
    for (let i = 0; i < 4; i++) {
      act(() => { root().findAllByType(OptionCard)[i % 4].props.onPress(); });
      if (i === 1) press('Flag question');
      expect(pressables(/Report a problem/)).toHaveLength(0);
      expect(allText()).not.toContain('Report a problem');
      press('Next');
    }
    press('Question navigator');
    expect(allText()).toContain('To report a question, open it in the review after you submit.');
    expect(pressables(/Report a problem/)).toHaveLength(0);
  });

  it('the mock review reports with original letters; an unanswered question has no pick line', async () => {
    startMock('cisa', 12);
    const s = useSession.getState().active!;
    // Answer the first question with a display letter whose original differs.
    const id0 = s.questionIds[0];
    const p0 = s.perms[id0];
    const disp: Letter = (['A', 'B', 'C', 'D'] as Letter[]).find((d) => displayToOriginal(d, p0) !== d) ?? 'A';
    const q0 = getAllQuestions('cisa').find((x) => x.id === id0)!;
    act(() => { useSession.getState().answer(id0, { display: disp, correct: isCorrect(q0, disp, p0), ms: 9000 }); });
    act(() => { finishSession(); });
    mount(<Results />);

    press(/^Question 1, /);
    press(`Report a problem with question ${id0}`);
    press('Another option is also right');
    await pressAsync('Write the email');
    let lines = keptLines(lastEmail().body);
    expect(lines).toContain(`Your pick: ${displayToOriginal(disp, p0)} (shown as ${disp})`);
    expect(lines).toContain('Where: Mock review · Mini mock');
    expect(lastEmail().subject).toBe(`Aurivan · Report · CISA · ${id0} · two-right`);

    // Question 2 was never answered: no pick, and never "undefined".
    press(/^Question 2, /);
    const id1 = s.questionIds[1];
    press(`Report a problem with question ${id1}`);
    press('Typo or grammar');
    await pressAsync('Write the email');
    lines = keptLines(lastEmail().body);
    expect(lines.some((l) => l.startsWith('Your pick'))).toBe(false);
    // (The App line's OS version comes from the test renderer's Platform, so it is left out here.)
    expect(lastEmail().body.split('\n').filter((l) => !l.startsWith('App: ')).join('\n')).not.toContain('undefined');
    expect(useProgress.getState().reports!.map((x) => x.item)).toEqual([`q:${id1}`, `q:${id0}`]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 3: notes, lesson steps and game recaps', () => {
  it('a real study note: the email names the note, and Your reports titles it by name', async () => {
    const notes = noteSubtopics('cisa');
    const note = notes[Math.floor(notes.length / 2)];
    mockParams = { id: encodeURIComponent(note.id) };
    mount(<NoteSubtopicScreen />);
    press(`Report a problem with note ${note.id}`);
    press('Something important is missing');
    await pressAsync('Write the email');
    const { subject, body } = lastEmail();
    expect(subject).toBe(`Aurivan · Report · CISA · note:${note.id} · missing`);
    expect(keptLines(body)).toContain(`Item: Note ${note.id} (${note.name})`);
    expect(keptLines(body)).toContain('Where: Study note');
    expectNothingPersonal(body, subject);
    unmount();
    mount(<Reports />);
    expect(allText()).toContain(`Note: ${note.name}`);
    expect(allText()).toContain(`Code ${note.id}`);
  });

  it('a lesson: plain steps have the link at once; a check only once answered, and again hidden after Back/Next', async () => {
    const lesson = CISA_LESSONS.find((l) => {
      const at = l.scenes.findIndex((x) => x.type === 'check');
      return at > 0 && l.scenes[at].type === 'check' && (l.scenes[at] as { options: string[] }).options.length >= 3;
    })!;
    const checkAt = lesson.scenes.findIndex((s) => s.type === 'check');
    const check = lesson.scenes[checkAt] as Extract<(typeof lesson.scenes)[number], { type: 'check' }>;
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    expect(pressables('Report a problem with this lesson step')).toHaveLength(1);
    for (let i = 0; i < checkAt; i++) press('Next');
    expect(pressables('Report a problem with this lesson step')).toHaveLength(0);
    // Answer by what is on screen (shuffle is on).
    act(() => { root().findAllByType(OptionCard)[1].props.onPress(); });
    expect(pressables('Report a problem with this lesson step')).toHaveLength(1);

    // Back, then Next: the check is unanswered again, so the link hides again.
    press('Back');
    press('Next');
    expect(pressables('Report a problem with this lesson step')).toHaveLength(0);
    act(() => { root().findAllByType(OptionCard)[1].props.onPress(); });
    // How the screen graded display B (the card's own state).
    const gradedRight = root().findAllByType(OptionCard)[1].props.state === 'correct';

    press('Report a problem with this lesson step');
    // Opened from a check: "Check question" is preselected.
    expect(pressables('Check question')[0].props.selected).toBe(true);
    press('The check question’s answer looks wrong');
    await pressAsync('Write the email');
    const lines = keptLines(lastEmail().body);
    expect(lines).toContain(`Item: Lesson ${lesson.id}, step ${checkAt + 1} of ${lesson.scenes.length} (${lesson.title})`);
    expect(lines).toContain('Part: Check question');
    // The pick is named by the ORIGINAL letter, consistent with how the check was graded.
    const pick = lines.find((l) => l.startsWith('Your pick: '))!;
    const [, orig, shown] = /^Your pick: ([A-D]) \(shown as ([A-D])\)$/.exec(pick)!;
    expect(shown).toBe('B');
    expect(check.correctIndex === 'ABCD'.indexOf(orig)).toBe(gradedRight);
    expect(useProgress.getState().reports![0].item).toBe(`lesson:${lesson.id}#${checkAt + 1}`);
    unmount();
    mount(<Reports />);
    expect(allText()).toContain(`Lesson: ${lesson.title}, step ${checkAt + 1}`);
  });

  it('a game recap: a real Root or Rumor card and a real question each report as themselves', async () => {
    const card = rumorStatements(getNotes('cisa'))[5];
    const q = getAllQuestions('cisa')[40];
    mount(
      <RoundEnd
        certId="cisa"
        game="rumor"
        score={4}
        max={12}
        onAgain={() => {}}
        misses={[
          { questionId: card.id, stem: card.text, tag: 'Rumor', why: 'Why.', answerWrong: true },
          { questionId: q.id, stem: 'A question…', tag: 'Snare: B', why: 'Why.', answerWrong: true },
        ]}
      />,
    );
    press('Report a problem with this card');
    press('Something on this card is wrong');
    await pressAsync('Write the email');
    let email = lastEmail();
    expect(email.subject).toBe(`Aurivan · Report · CISA · card:${card.id} · incorrect`);
    expect(keptLines(email.body)).toContain(`Item: Game card ${card.id} (Root or Rumor)`);
    // The card's own text is not sent.
    expect(email.body).not.toContain(card.text.slice(0, 30));

    press(`Report a problem with question ${q.id}`);
    // No letters were on screen in the recap: nothing to suggest by letter.
    press('The marked answer looks wrong');
    expect(allText()).not.toContain('Which answer do you think is best?');
    await pressAsync('Write the email');
    email = lastEmail();
    expect(email.subject).toBe(`Aurivan · Report · CISA · ${q.id} · key`);
    expect(keptLines(email.body)).toContain('Where: Game recap · Root or Rumor');
    unmount();
    mount(<Reports />);
    expect(allText()).toContain('Game card: Root or Rumor');
    expect(allText()).toContain(`Question in ${domainShort(q)}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 4: no email app', () => {
  beforeEach(() => {
    openUrl.mockRejectedValue(new Error('Unable to open URL: mailto:'));
  });

  async function failReport() {
    startPractice('cisa', { count: 10, title: 'Quick 10' });
    const id = useSession.getState().active!.questionIds[0];
    mount(<SessionScreen />);
    act(() => { root().findAllByType(OptionCard)[2].props.onPress(); });
    press('Check answer');
    press(`Report a problem with question ${id}`);
    press('The wording is unclear');
    await pressAsync('Write the email');
    return id;
  }

  it('a report shows the address and the whole message as selectable text; Share works; nothing says sent', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const id = await failReport();
    const text = allText();
    expect(text).toContain('We couldn’t open an email app.');
    expect(text).toContain('certprep.support@gmail.com');
    expect(text).toContain(`Subject: Aurivan · Report · CISA · ${id} · unclear`);
    expect(text).not.toMatch(/\bsent\b/i); // not even "If you sent it": nothing was opened
    expect(text).not.toContain('Finished in your email app?');
    expect(text).not.toContain('Thank you');
    const selectable = root().findAll((n) => n.props.selectable === true && typeof n.type === 'string').map((n) => n.children.join(''));
    expect(selectable).toContain('certprep.support@gmail.com');
    expect(selectable.some((s) => s.includes(`Item: Question ${id}`))).toBe(true);
    await pressAsync('Share details');
    const msg = share.mock.calls[0][0] as { message: string };
    expect(msg.message.startsWith('To: certprep.support@gmail.com\nSubject: Aurivan · Report · CISA · ')).toBe(true);
    expect(msg.message).toContain('Reason: The wording is unclear');
    share.mockRestore();
  });

  it('a Share sheet that throws (dismissed or unavailable) is harmless', async () => {
    const share = jest.spyOn(Share, 'share').mockRejectedValue(new Error('dismissed'));
    await failReport();
    await pressAsync('Share details');
    expect(allText()).toContain('We couldn’t open an email app.');
    share.mockRestore();
  });

  it('Contact support and Send feedback fall back the same way', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mount(<Settings />);
    press('Contact support');
    press('Your data and privacy');
    await pressAsync('Write the email');
    expect(allText()).toContain('We couldn’t open an email app.');
    expect(allText()).toContain('Subject: Aurivan · Support · Privacy · CISA');
    expect(allText()).not.toMatch(/\bsent\b/i);
    press('Close');
    press('Suggest an idea');
    await pressAsync('Write the email');
    expect(allText()).toContain('Subject: Aurivan · Feedback · Idea · CISA');
    await pressAsync('Share details');
    expect((share.mock.calls.at(-1)![0] as { message: string }).message).toContain('Kind: An idea');
    expect(allText()).not.toMatch(/\bsent\b/i);
    share.mockRestore();
  });

  // BUG (Minor): after the fallback, the sheet is stuck on it for that item.
  // support.md §4.4: tapping "Reported <date>" reopens the FORM with "You
  // started a report about this on <date>. Send another if something else is
  // wrong." Here it reopens the old fallback panel, so a second report about
  // the same question can't be started without leaving the screen.
  it.failing('after the fallback is closed, “Reported” reopens the form so another report can be started', async () => {
    const id = await failReport();
    press('Close');
    expect(allText()).toContain('Reported 11 Oct');
    press(new RegExp(`^Reported 11 Oct\\. Report a problem with question ${id}$`));
    expect(allText()).toContain('You started a report about this on 11 Oct.');
    expect(sheetOpen()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 5: Your reports', () => {
  const entry = (i: number): Omit<ReportEntry, 'at' | 'creditSeen'> => ({
    ref: `R-${'ABCDEFGH'[i % 8]}${'23456789'[Math.floor(i / 8) % 8]}${'JKMNPQRS'[Math.floor(i / 64) % 8]}Q`,
    item: `q:${getAllQuestions('cisa')[i % 50].id}`,
    reason: i % 2 ? 'key' : 'typo',
    cert: 'cisa',
  });

  it('fills newest first and keeps the newest 200 at most', () => {
    for (let i = 0; i < MAX_REPORTS + 7; i++) {
      jest.setSystemTime(NOW + i * 60_000);
      useProgress.getState().logReport(entry(i));
    }
    const list = useProgress.getState().reports!;
    expect(list).toHaveLength(200);
    expect(list[0].ref).toBe(entry(MAX_REPORTS + 6).ref);
    expect(list.at(-1)!.at).toBe(NOW + 7 * 60_000);
    mount(<Reports />);
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && / reference R-/.test(n.props.accessibilityLabel) && typeof n.type !== 'string')).toHaveLength(200);
  });

  it('survives a backup round trip exactly, with credit flags, and a 250-entry store exports its newest 200', async () => {
    const reports: ReportEntry[] = Array.from({ length: 250 }, (_, i) => ({ ...entry(i), at: NOW - i * DAY / 10, ...(i === 3 ? { creditSeen: true } : {}) }));
    useProgress.setState({ reports });
    const file = currentBackup(NOW);
    expect(file.stores.progress.state.reports).toHaveLength(200);
    const text = JSON.stringify(file);
    // The file holds only codes, never question text.
    expect(text).not.toContain(getAllQuestions('cisa')[0].stem.slice(0, 30));
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(read.code);
    // Another phone with its own (different) list.
    useProgress.setState({ reports: [{ ...entry(999), at: NOW }] });
    const out = await restoreBackup(read.data, NOW);
    expect(out.kind).toBe('ok');
    expect(useProgress.getState().reports).toEqual(reports.slice(0, 200));
    expect(useProgress.getState().reports![3].creditSeen).toBe(true);
  });

  it('a 1.7 backup on a 1.6 phone is refused as “newer”, not silently stripped of reports', () => {
    useProgress.setState({ reports: [{ ...entry(1), at: NOW }] });
    const text = JSON.stringify(currentBackup(NOW));
    expect(() => readBackup(text, ['cisa'], undefined, '1.6.1')).toThrow(expect.objectContaining({ code: 'newer' }));
  });

  it('a pre-1.7 save loads: no list, Your reports is empty, Settings says “None yet”, and reporting then works', async () => {
    jest.useRealTimers();
    await new Promise((done) => setTimeout(done, 0));
    await AsyncStorage.clear();
    const { name, version } = useProgress.persist.getOptions();
    const save16 = {
      state: {
        byCert: { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, gameRecent: {}, notesRead: [] } },
        streak: { current: 2, best: 5, lastDay: '2026-10-10' },
        today: { day: '2026-10-10', answered: 3 },
        days: {},
      },
      version,
    };
    // Reset the live store FIRST: a setState is written straight back to storage.
    useProgress.setState({ ...useProgress.getInitialState(), reports: undefined });
    await new Promise((done) => setTimeout(done, 0));
    await AsyncStorage.setItem(name!, JSON.stringify(save16));
    await useProgress.persist.rehydrate();
    expect(useProgress.getState().reports).toBeUndefined();
    expect(useProgress.getState().streak.best).toBe(5);
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });

    mount(<Reports />);
    expect(allText()).toContain('No reports yet');
    unmount();
    mount(<Settings />);
    expect(allText()).toContain('None yet. They’re listed here once you report one.');
    press('Report a problem');
    press('Something didn’t load or froze');
    await pressAsync('Write the email');
    expect(useProgress.getState().reports).toHaveLength(1);
    expect(allText()).toContain('1 started on this phone');
  });

  it('Settings → Reset keeps Your reports (they are messages, not study progress)', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useProgress.setState({ reports: [{ ...entry(2), at: NOW - DAY }] });
    act(() => { useProgress.getState().recordMistake('cisa', getAllQuestions('cisa')[0].id, 'A'); });
    mount(<Settings />);
    press('Reset CISA progress');
    const buttons = alert.mock.calls.at(-1)![2]!;
    act(() => { buttons.find((b) => b.text === 'Reset')!.onPress!(); });
    expect(Object.keys(useProgress.getState().byCert.cisa?.mistakes ?? {})).toHaveLength(0);
    expect(useProgress.getState().reports).toHaveLength(1);
    expect(allText()).toContain('1 started on this phone');
    alert.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 6: a fix shipped after a report', () => {
  const q = getAllQuestions('cisa')[77];
  const fix = (over: Partial<Fix> = {}): Fix => ({ ref: `q:${q.id}`, cert: 'cisa', date: '2026-10-12', kind: 'corrected', publicNote: 'The answer key was corrected.', ...over });
  const reported = (over: Partial<ReportEntry> = {}): ReportEntry => ({ ref: 'R-7K2Q', item: `q:${q.id}`, reason: 'key', at: NOW, cert: 'cisa', ...over });

  it('only a fix dated AFTER the report, for the same exam and item, credits it', () => {
    useProgress.setState({ reports: [reported()] });
    for (const f of [fix({ date: '2026-10-11' }), fix({ date: '2026-10-01' }), fix({ cert: 'cism' }), fix({ ref: 'q:d1_001' })]) {
      mockFixes = [f];
      mount(<Reports />);
      expect(allText()).not.toContain('Updated after your report');
      expect(allText()).toContain('Started 11 Oct');
      unmount();
    }
    mockFixes = [fix()];
    mount(<Reports />);
    expect(allText()).toContain('Updated after your report · 12 Oct 2026');
    expect(allText()).toContain('The answer key was corrected.');
  });

  it('What’s new says “Your report helped” once, lists the general note (no codes), then never again', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [reported()] });
    mount(<WhatsNew />);
    const text = allText();
    expect(text).toContain('Your report helped');
    expect(text).toContain('Fixed after learner reports');
    expect(text).toContain('The answer key was corrected.');
    expect(text).not.toContain(q.id);
    unmount();
    mount(<WhatsNew />);
    expect(allText()).not.toContain('Your report helped');
    // Your reports still says it was updated (that state is permanent).
    unmount();
    mount(<Reports />);
    expect(allText()).toContain('Updated after your report');
  });

  it('You’s row says something was updated, until What’s new is opened', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [reported()] });
    mount(<You />);
    expect(allText()).toContain('Something you reported was updated');
    unmount();
    mount(<WhatsNew />);
    unmount();
    mount(<You />);
    expect(allText()).not.toContain('Something you reported was updated');
  });

  // BUG (Minor, spec deviation): support.md §7.3 / PHASE1 — Today's "Your
  // report helped" line shows ONCE ("dismissible and disappears after it is
  // seen"). It actually shows on every visit to Today, with no way to dismiss
  // it, until the learner happens to open What's new.
  it.failing('Today shows “Your report helped” once, not on every visit', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [reported()] });
    mount(<Today />);
    expect(allText()).toContain('Your report helped');
    unmount();
    mount(<Today />);
    expect(allText()).not.toContain('Your report helped');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 7: Help and feedback from Settings and You, and the deep link', () => {
  it('Settings: Contact support writes a tagged email, from Settings, nothing personal', async () => {
    mount(<Settings />);
    expect(allText()).toContain('Write to us any time at certprep.support@gmail.com. Aurivan is independent and not affiliated with ISACA.');
    press('Contact support');
    expect(pressables('Write the email')[0].props.disabled).toBe(true);
    press('Reminders');
    await pressAsync('Write the email');
    const { subject, body, to } = lastEmail();
    expect(to).toBe('certprep.support@gmail.com');
    expect(subject).toBe('Aurivan · Support · Reminders · CISA');
    expect(body).toContain('Topic: Reminders');
    expect(body).toContain('From: Settings');
    expect(body).toContain('App: Aurivan 1.7.0 (');
    expect(body).not.toMatch(/backup file/i);
    expectNothingPersonal(body, subject);
    expect(allText()).toContain('If you sent it, thank you. We read every message.');
  });

  it('Settings: Suggest an idea opens Send feedback; another kind and display details go in only when chosen', async () => {
    mount(<Settings />);
    press('Suggest an idea');
    expect(allText()).toContain('Send feedback');
    expect(pressables('An idea')[0].props.selected).toBe(true);
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Feedback · Idea · CISA');
    expect(lastEmail().body).not.toContain('Display:');

    press('Suggest an idea');
    press('Something I like');
    act(() => { root().findAll((n) => n.props.title === 'Include display details' && typeof n.props.onValueChange === 'function')[0].props.onValueChange(true); });
    act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Your message' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('The lessons are great.'); });
    await pressAsync('Write the email');
    const { subject, body } = lastEmail();
    expect(subject).toBe('Aurivan · Feedback · Like · CISA');
    expect(body.split('\n')[2]).toBe('The lessons are great.');
    expect(body).toMatch(/Display: Theme (light|dark) · Text size \d+% · Reduce Motion (on|off)/);
    expectNothingPersonal(body, subject);
  });

  it('You → Help → the same rows, tagged “From: Help”', async () => {
    mount(<You />);
    press('Get help or send feedback');
    expect(mockPush).toHaveBeenCalledWith('/help');
    unmount();
    mount(<Help />);
    for (const row of ['Common questions', 'Report a problem', 'Suggest an idea', 'Contact support', 'Your reports', 'What’s new', 'What’s next']) {
      expect(pressables(row).length).toBeGreaterThan(0);
    }
    press('Contact support');
    press('A study question or topic');
    await pressAsync('Write the email');
    expect(lastEmail().body).toContain('From: Help');
    press('Suggest an idea');
    await pressAsync('Write the email');
    expect(lastEmail().body).toContain('From: Help');
  });

  it.each([
    ['support', 'What’s it about?'],
    ['feedback', 'What kind?'],
    ['idea', 'What kind?'],
    ['report', 'What’s wrong?'],
  ])('deep link open=%s opens its sheet', (open, marker) => {
    mockParams = { open };
    mount(<Help />);
    expect(allText()).toContain(marker);
  });

  it('deep link open=feedback preselects “Something else”; open=idea preselects “An idea”', () => {
    mockParams = { open: 'feedback' };
    mount(<Help />);
    expect(pressables('Something else').find((n) => n.props.selected !== undefined)!.props.selected).toBe(true);
    unmount();
    mockParams = { open: 'idea' };
    mount(<Help />);
    expect(pressables('An idea')[0].props.selected).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['upper case', 'SUPPORT'],
    ['padded', ' support'],
    ['prototype key', '__proto__'],
    ['constructor', 'constructor'],
    ['script', 'javascript:alert(1)'],
    ['url', 'https://evil.example/'],
    ['missing', undefined],
  ])('deep link with a bad value (%s) only shows the screen', (_name, open) => {
    mockParams = { open };
    mount(<Help />);
    expect(allText()).toContain('Help and feedback');
    for (const marker of ['What’s it about?', 'What kind?', 'What’s wrong?']) expect(allText()).not.toContain(marker);
  });

  it('deep link repeated (?open=support&open=idea) opens nothing', () => {
    mockParams = { open: ['support', 'idea'] };
    mount(<Help />);
    for (const marker of ['What’s it about?', 'What kind?', 'What’s wrong?']) expect(allText()).not.toContain(marker);
  });

  // BUG (Minor): the deep link is read only on the Help screen's FIRST render.
  // If Help is already open (or kept in the stack) and a second link arrives
  // (a support reply's "aurivan://help?open=support"), the params change but
  // no sheet opens. Confirm on a device: open Help, background the app, tap
  // aurivan://help?open=support from Notes/Mail.
  it.failing('a new deep link while Help is already open still opens its sheet', () => {
    mockParams = {};
    mount(<Help />);
    mockParams = { open: 'support' };
    act(() => {
      r!.update(<Help />);
    });
    expect(allText()).toContain('What’s it about?');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Journey 8: What’s new, What’s next and Common questions; no bank size anywhere', () => {
  const bank = getAllQuestions('cisa').length;
  const perDomain = getCertification('cisa')!.domains.map((d) => getAllQuestions('cisa').filter((q) => q.domainId === d.id).length);
  const sizeForms = [bank, ...perDomain].flatMap((n) => [String(n), n.toLocaleString('en-US')]).concat([
    `${Math.floor(bank / 100) * 100}+`,
    `${Math.floor(bank / 1000)},000+`,
    `${Math.floor(bank / 1000)}k`,
  ]);
  /** "1,073 questions", "1000+ practice questions": a count of questions is the bank size in disguise. */
  const COUNTED = /\b\d[\d,]*\+?\s+(practice\s+|original\s+|exam[- ]style\s+)?questions\b/i;
  const expectNoBankSize = (text: string) => {
    for (const f of sizeForms) expect(text).not.toMatch(new RegExp(`(^|[^\\w.])${f.replace(/[+.]/g, '\\$&')}(?![\\w])`));
    expect(text).not.toMatch(COUNTED);
  };

  it('What’s new: the latest is 1.7 with New/Improved, plus Fixed after learner reports; every release is plain', () => {
    mount(<WhatsNew />);
    const text = allText();
    expect(text).toContain('Version 1.7');
    expect(text).toContain('Latest');
    for (const g of ['New', 'Improved', 'Fixed after learner reports']) expect(text).toContain(g);
    for (const e of WHATS_NEW) expect(text).toContain(`Version ${e.version.replace(/\.0$/, '')}`);
    expectNoBankSize(text);
    // No internal codes in learner copy.
    expect(text).not.toMatch(/\bd\d_\d{3}\b|\b[1-5][A-Z]\d\.\d\b/);
  });

  it('What’s next: three lists, no dates, no promises', () => {
    mount(<WhatsNext />);
    const text = allText();
    for (const t of ['In progress', 'Planned', 'Recently shipped', 'Suggest an idea']) expect(text).toContain(t);
    for (const item of WHATS_NEXT) expect(text).toContain(item.title);
    expect(text).not.toMatch(/\b(20\d\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Q[1-4]|next week|next month|soon|guarantee)\b/);
    expectNoBankSize(text);
  });

  it('Common questions: every answer opens, ends with “Still stuck? Email us”, and ISACA is answered “No.”', () => {
    mount(<Faq />);
    expect(FAQ.length).toBeGreaterThanOrEqual(6);
    expect(FAQ.length).toBeLessThanOrEqual(10);
    let all = '';
    for (const f of FAQ) {
      press(f.question);
      all += ` ${allText()}`;
      expect(root().findAll((n) => n.props.label === 'Still stuck? Email us' && typeof n.type !== 'string')).toHaveLength(1);
    }
    const isaca = FAQ.find((f) => /affiliated with ISACA/.test(f.question))!;
    expect(isaca.answer[0].startsWith('No.')).toBe(true);
    expectNoBankSize(all);
  });

  it('Help, Settings’ Help section, Your reports and every email carry no bank size', async () => {
    mount(<Help />);
    expectNoBankSize(allText());
    unmount();
    mount(<Settings />);
    for (const f of sizeForms.filter((x) => x.length >= 3)) expect(allText()).not.toContain(f);
    press('Report a problem');
    press('A score or result looks wrong');
    await pressAsync('Write the email');
    expectNoBankSize(lastEmail().body);
    unmount();
    mount(<Reports />);
    expectNoBankSize(allText());
  });
});
