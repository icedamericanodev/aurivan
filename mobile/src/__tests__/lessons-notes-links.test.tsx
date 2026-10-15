/**
 * Mobile 1.20: lessons and study notes point at each other.
 *
 * - lessonsForSubtopic: by a lesson's `notes` first, else by its outline
 *   topic; noteIdsForLesson / lessonNotes: the notes a lesson leads into;
 *   missedSubtopics: Results' "most-missed first, each once, at most 3".
 * - Session, after a miss (practice, review, Guided; never a mock): "Read
 *   the note" whenever a note lists the question, then the lesson row
 *   only while that lesson is not done. Nothing after a right answer.
 * - Results: "Notes for what you missed" reveals the note rows,
 *   for a mock too.
 * - Note subtopic page: the "Lesson: …" row (Done / Not done yet);
 *   "Practice this concept" marks the note read; no "Practice this domain".
 * - Notes domain page: each topic collapses; only the first topic with
 *   something unread starts open; a tap opens or closes one.
 * - Readiness report: each domain row's "Lessons and notes ›" opens Learn.
 * - Lesson complete: "Read the note: …" between Practice and Next lesson.
 *
 * Real content (the bundled notes pack and lessons), real stores.
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())`, use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { findLesson, lessonPreparing, lessonsFor, lessonsForSubtopic, noteIdsForLesson } from '../content/lessons';
import { CISA_LESSONS } from '../content/lessons/cisa';
import type { Lesson } from '../content/lessons/types';
import { findQuestion } from '../content/loader';
import { findNote, noteDomain, subtopicOfQuestion } from '../content/notes';
import { LETTERS } from '../content/types';
import { missedSubtopics } from '../engine/outline';
import { displayToOriginal } from '../engine/shuffle';
import { lessonNotes, topicLessons } from '../lib/outline';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import Results from '../app/results';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import NotesDomain from '../app/notes/[domain]';
import { DomainReportRow } from '../components/readinessReport';
import { computeReadiness } from '../engine/readiness';
import { domainBreakdown } from '../engine/readinessReport';
import { getCertification } from '../content/certifications';
import * as motion from '../components/motion';
import { Collapse } from '../components/motion';
import { Alert, Dimensions, ScrollView } from 'react-native';
import ReadinessReport from '../app/readiness';
import LessonPlayer from '../app/lesson/[id]';
import { OptionCard } from '../components/quiz';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
    canDismiss: jest.fn(() => false),
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  // The session's focus backstop reads this (true unless a test says otherwise).
  useIsFocused: () => mockFocused,
}));
let mockFocused = true;
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const push = router.push as jest.Mock;
const navigate = router.navigate as jest.Mock;
const dismissAll = router.dismissAll as jest.Mock;
const dismissTo = router.dismissTo as jest.Mock;
const canDismiss = router.canDismiss as jest.Mock;
/** push('/session') came after dismissAll(): the new set starts on top of the tabs. */
const freshSessionPushed = () => {
  const pushAt = push.mock.calls.findIndex((c) => c[0] === '/session');
  expect(pushAt).toBeGreaterThanOrEqual(0);
  expect(dismissAll).toHaveBeenCalledTimes(1);
  expect(dismissAll.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[pushAt]);
};

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
/**
 * Pressables whose spoken label matches, one per control: a row passes its
 * props down (ListRow → AnimatedPressable → Pressable), so only the
 * OUTERMOST match counts.
 */
const pressables = (label: string | RegExp) => {
  const hits = root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel)),
  );
  const set = new Set(hits);
  const inside = (n: ReactTestInstance) => {
    for (let p = n.parent; p; p = p.parent) if (set.has(p)) return true;
    return false;
  };
  return hits.filter((n) => !inside(n));
};
const press = (label: string | RegExp) =>
  act(() => {
    pressables(label)[0].props.onPress();
  });

const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockFocused = true;
  setFontScale(1);
  push.mockClear();
  navigate.mockClear();
  dismissAll.mockClear();
  dismissTo.mockClear();
  (router.replace as jest.Mock).mockClear();
  canDismiss.mockReset();
  canDismiss.mockReturnValue(false);
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

// ── Fixtures from the real content ──────────────────────────────────────
/** A question a lesson prepares for AND a study note lists. */
const both = (() => {
  for (const l of lessonsFor('cisa'))
    for (const q of l.prepares ?? []) {
      const sub = subtopicOfQuestion('cisa', q);
      if (sub && findQuestion('cisa', q)) return { qid: q, lesson: l, sub };
    }
  throw new Error('no question with both a lesson and a note');
})();
/** A question a note lists but no lesson prepares for. */
const noteOnly = (() => {
  for (const d of ['1', '2', '3', '4', '5'])
    for (const t of noteDomain('cisa', d)?.topics ?? [])
      for (const s of t.subtopics)
        for (const q of s.practiceIds ?? []) if (!lessonPreparing('cisa', q) && findQuestion('cisa', q)) return { qid: q, sub: s.id };
  throw new Error('no note-only question');
})();

describe('lessonsForSubtopic (content/lessons)', () => {
  it('falls back to the outline topic: the same lessons as topicLessons', () => {
    // Every shipped lesson lists its notes, so clear them for this test to
    // exercise the fallback a lesson without `notes` takes; restored after.
    const saved = CISA_LESSONS.map((l) => l.notes);
    try {
      for (const l of CISA_LESSONS) l.notes = undefined;
      const lesson = lessonsFor('cisa').find((l) => l.topics?.length)!;
      const topic = lesson.topics![0];
      const sub = noteDomain('cisa', lesson.domainId)!.topics.find((t) => t.id === topic)!.subtopics[0].id;
      expect(lessonsForSubtopic('cisa', sub).map((l) => l.id)).toEqual(topicLessons('cisa', topic).map((l) => l.id));
      expect(lessonsForSubtopic('cisa', sub).map((l) => l.id)).toContain(lesson.id);
    } finally {
      CISA_LESSONS.forEach((l, i) => (l.notes = saved[i]));
    }
  });

  it('with notes listed, a subtopic resolves to the lessons that name it', () => {
    const lesson = lessonsFor('cisa').find((l) => l.notes?.length)!;
    expect(lessonsForSubtopic('cisa', lesson.notes![0]).map((l) => l.id)).toContain(lesson.id);
  });

  it('a lesson that lists the subtopic in `notes` wins over the topic join', () => {
    const lesson = CISA_LESSONS[CISA_LESSONS.length - 1];
    const saved = lesson.notes;
    try {
      lesson.notes = ['9Z9.1'];
      expect(lessonsForSubtopic('cisa', '9Z9.1').map((l) => l.id)).toEqual([lesson.id]);
    } finally {
      lesson.notes = saved;
    }
  });

  it('nothing for a subtopic no lesson teaches, and other certs see nothing', () => {
    expect(lessonsForSubtopic('cisa', '9Z9.9')).toEqual([]);
    expect(lessonsForSubtopic('cism', '4B1.2')).toEqual([]);
  });
});

describe('noteIdsForLesson / lessonNotes', () => {
  const base = { topics: ['4B1', '4B2'] } as Lesson;
  const subs = (t: string) => ({ '4B1': ['4B1.1', '4B1.2'], '4B2': ['4B2.1'] })[t] ?? [];
  it('the lesson\'s own notes first; else each topic\'s first subtopic', () => {
    expect(noteIdsForLesson({ ...base, notes: ['4B1.2'] }, subs)).toEqual(['4B1.2']);
    expect(noteIdsForLesson(base, subs)).toEqual(['4B1.1', '4B2.1']);
    expect(noteIdsForLesson({ ...base, topics: undefined }, subs)).toEqual([]);
  });
  it('lessonNotes resolves real notes and drops unknown ids', () => {
    const lesson = lessonsFor('cisa').find((l) => l.topics?.length)!;
    const notes = lessonNotes('cisa', lesson);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].topicId).toBe(lesson.topics![0]);
    expect(lessonNotes('cisa', { ...lesson, notes: ['9Z9.9'] })).toEqual([]);
  });
});

describe('missedSubtopics (engine/outline)', () => {
  const map: Record<string, string> = { a: 'S1', b: 'S2', c: 'S2', d: 'S3', e: 'S4', f: 'S3' };
  it('most-missed first, ties in miss order, each once, at most three', () => {
    expect(missedSubtopics(['a', 'b', 'c', 'd', 'e', 'f', 'x'], (q) => map[q])).toEqual([
      { id: 'S2', missed: 2 },
      { id: 'S3', missed: 2 },
      { id: 'S1', missed: 1 },
    ]);
    expect(missedSubtopics(['x', 'y'], (q) => map[q])).toEqual([]);
    expect(missedSubtopics(['a', 'e'], (q) => map[q], 1)).toEqual([{ id: 'S1', missed: 1 }]);
  });
});

// ── Session: after a miss ─────────────────────────────────────────────
/** Answer the question on screen, right or wrong, by its ORIGINAL letter. */
const answerOnScreen = (right: boolean) => {
  const a = useSession.getState().active!;
  const qid = a.questionIds[a.index];
  const q = findQuestion('cisa', qid)!;
  const display = LETTERS.find((d) => {
    const orig = displayToOriginal(d, a.perms[qid]);
    return q.options[orig] !== undefined && (orig === q.correct) === right;
  })!;
  act(() => {
    useSession.getState().answer(qid, { display, correct: right });
  });
};
const noteRows = () => pressables(/^Read the note: /);
const lessonRows = () => pressables(/^Lesson: /);

describe('session: the note first, the lesson when there is one', () => {
  it('a practice miss offers the note, then the lesson; Back returns to the same answer', () => {
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(false);
    mount(<SessionScreen />);
    const name = findNote('cisa', both.sub)!.name;
    expect(noteRows()).toHaveLength(1);
    const min = findNote('cisa', both.sub)!.minutes!;
    expect(min).toBeGreaterThanOrEqual(1); // the build sets each note's reading time
    expect(noteRows()[0].props.accessibilityLabel).toBe(`Read the note: ${name}, about ${min} minute${min === 1 ? '' : 's'}, the idea this question tests`);
    // On screen (mobile 1.22): the verb as a kicker, the note's own name, then "About N min · the idea
    // this question tests" (no double colon).
    expect(allText()).toContain(`Read the note ${name} About ${min} min · the idea this question tests`);
    expect(allText()).not.toContain('Read the note:');
    expect(lessonRows()).toHaveLength(1);
    expect(lessonRows()[0].props.accessibilityLabel).toBe(`Lesson: ${both.lesson.title}, ${both.lesson.minutes} minutes, not done yet`);
    expect(allText()).toContain(`Replay the lesson ${both.lesson.title} ${both.lesson.minutes} min · Not done yet`);
    expect(allText()).not.toContain('Review the lesson');
    // Note first, then the lesson.
    const text = allText();
    expect(text.indexOf('Read the note')).toBeLessThan(text.indexOf('Replay the lesson'));
    // Both are pushed, so Back lands on this same answer screen.
    press(/^Read the note: /);
    expect(push).toHaveBeenLastCalledWith(`/notes/subtopic/${encodeURIComponent(both.sub)}`);
    press(/^Lesson: /);
    expect(push).toHaveBeenLastCalledWith(`/lesson/${both.lesson.id}`);
    expect(router.replace).not.toHaveBeenCalled();
    expect(allText()).toContain('Why '); // the explanation is still on screen
  });

  it('no Smart gate any more: a plain practice miss with no "weak" reason still offers the note', () => {
    startFromIds('cisa', [noteOnly.qid], 'T');
    expect(useSession.getState().active!.support).toBeUndefined();
    answerOnScreen(false);
    mount(<SessionScreen />);
    expect(noteRows()).toHaveLength(1);
    // No lesson prepares this one; mobile 1.22: the lesson that teaches its note is offered instead, if any.
    const teaches = lessonsForSubtopic('cisa', noteOnly.sub)[0];
    expect(lessonRows()).toHaveLength(teaches ? 1 : 0);
  });

  it('mobile 1.22: with no lesson preparing the question, the lesson that teaches its note (d4_062 → 4B1.2)', () => {
    expect(lessonPreparing('cisa', 'd4_062')).toBeUndefined();
    expect(subtopicOfQuestion('cisa', 'd4_062')).toBe('4B1.2');
    const teaches = lessonsForSubtopic('cisa', '4B1.2')[0];
    expect(teaches?.id).toBe('cisa-l-d4-rpo-rto');
    startFromIds('cisa', ['d4_062'], 'T');
    answerOnScreen(false);
    mount(<SessionScreen />);
    expect(lessonRows()).toHaveLength(1);
    expect(lessonRows()[0].props.accessibilityLabel).toBe(`Lesson: ${teaches.title}, ${teaches.minutes} minutes, not done yet`);
    press(/^Lesson: /);
    expect(push).toHaveBeenLastCalledWith('/lesson/cisa-l-d4-rpo-rto');
  });

  it('the lesson row hides once that lesson is done; the note stays', () => {
    act(() => {
      useProgress.getState().completeLesson('cisa', both.lesson.id);
    });
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(false);
    mount(<SessionScreen />);
    expect(noteRows()).toHaveLength(1);
    expect(lessonRows()).toHaveLength(0);
  });

  it('review sessions offer it too', () => {
    startFromIds('cisa', [both.qid], 'T');
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, mode: 'review' } }));
    });
    answerOnScreen(false);
    mount(<SessionScreen />);
    expect(noteRows()).toHaveLength(1);
  });

  it('nothing after a right answer', () => {
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(true);
    mount(<SessionScreen />);
    expect(noteRows()).toHaveLength(0);
    expect(lessonRows()).toHaveLength(0);
  });

  it('backstop: a session screen out of view never opens Results; back in view, it does', () => {
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(false);
    mockFocused = false; // e.g. a second session screen left in the stack
    mount(<SessionScreen />);
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, finishedAt: Date.now() } }));
    });
    expect(router.replace).not.toHaveBeenCalledWith('/results');
    mockFocused = true;
    act(() => {
      r!.update(<SessionScreen />);
    });
    expect((router.replace as jest.Mock).mock.calls.filter((c) => c[0] === '/results')).toHaveLength(1);
  });

  it('never inside a mock', () => {
    startFromIds('cisa', [both.qid, noteOnly.qid], 'T');
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, mode: 'mock' } }));
    });
    answerOnScreen(false);
    mount(<SessionScreen />);
    expect(noteRows()).toHaveLength(0);
    expect(lessonRows()).toHaveLength(0);
  });
});

// ── Results ───────────────────────────────────────────────────────────
describe('results: Notes for what you missed', () => {
  const finishWith = (mode: 'practice' | 'mock', ids: string[], wrong: string[]) => {
    startFromIds('cisa', ids, 'T');
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, mode } }));
    });
    for (const id of ids) {
      act(() => {
        useSession.getState().goTo(ids.indexOf(id));
      });
      answerOnScreen(!wrong.includes(id));
    }
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, finishedAt: Date.now() } }));
    });
  };

  it.each(['practice', 'mock'] as const)('%s: folded until tapped, then up to three note rows that open the note', (mode) => {
    finishWith(mode, [both.qid, noteOnly.qid], [both.qid, noteOnly.qid]);
    mount(<Results />);
    const toggle = pressables('Notes for what you missed');
    expect(toggle).toHaveLength(1);
    expect(toggle[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(pressables(/^Read the note: /)).toHaveLength(0);
    press('Notes for what you missed');
    expect(pressables('Notes for what you missed')[0].props.accessibilityState).toMatchObject({ expanded: true });
    expect(allText()).toMatch(/\d+ miss(es)? · about \d+ min/);
    const rows = pressables(/^Read the note: /);
    const subs = [...new Set([both.sub, noteOnly.sub])];
    expect(rows).toHaveLength(subs.length);
    expect(rows.length).toBeLessThanOrEqual(3);
    act(() => {
      rows[0].props.onPress();
    });
    expect(push).toHaveBeenLastCalledWith(`/notes/subtopic/${encodeURIComponent(subs[0])}`);
  });

  it('no misses (or none a note covers): no notes action', () => {
    finishWith('practice', [both.qid], []);
    mount(<Results />);
    expect(pressables('Notes for what you missed')).toHaveLength(0);
  });
});

// ── Note subtopic page ────────────────────────────────────────────────
describe('note subtopic page: the lesson row', () => {
  const lesson = lessonsForSubtopic('cisa', both.sub)[0];

  it('names the lesson, says Not done yet / Done, and opens the player', () => {
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    const row = () => pressables(new RegExp(`^Lesson: `))[0];
    expect(row().props.accessibilityLabel).toBe(`Lesson: ${lesson.title}, ${lesson.minutes} minutes, not done yet`);
    expect(allText()).toContain(`Lesson · ${lesson.minutes} min · Not done yet`);
    act(() => {
      row().props.onPress();
    });
    expect(push).toHaveBeenLastCalledWith(`/lesson/${lesson.id}`);
    act(() => {
      useProgress.getState().completeLesson('cisa', lesson.id);
    });
    expect(allText()).toContain(`Lesson · ${lesson.minutes} min · Done`);
  });

  it('no "Practice this domain"; "Practice this concept" marks the note read (the toggle undoes it)', () => {
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    expect(allText()).not.toContain('Practice this domain');
    press('Practice this concept');
    expect(push).toHaveBeenLastCalledWith('/session');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([both.sub]);
    press('Mark as not read');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([]);
  });

  it('a note no lesson teaches shows no lesson row', () => {
    const lonely = ['1', '2', '3', '4', '5']
      .flatMap((d) => noteDomain('cisa', d)?.topics ?? [])
      .flatMap((t) => t.subtopics)
      .find((s) => lessonsForSubtopic('cisa', s.id).length === 0);
    if (!lonely) return; // every subtopic has a lesson: nothing to check
    mockParams = { id: lonely.id };
    mount(<NoteSubtopicScreen />);
    expect(pressables(/^Lesson: /)).toHaveLength(0);
  });
});

// ── Notes domain page ─────────────────────────────────────────────────
describe('notes domain page: collapsible topics', () => {
  const topics = noteDomain('cisa', '1')!.topics;
  /** Topic headers ("1A1 Name, 0 of 4 read"), one per topic, in page order. */
  const headers = () => pressables(/^\d[A-Z]\d+ /).filter((n) => n.props.accessibilityState?.expanded !== undefined);
  const header = (id: string) => headers().find((n) => (n.props.accessibilityLabel as string).startsWith(`${id} `))!;
  const openIds = () => headers().filter((n) => n.props.accessibilityState.expanded).map((n) => (n.props.accessibilityLabel as string).split(' ')[0]);
  const subRow = (name: string) => pressables(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, (not read yet|read)$`));

  it('only the first topic with something unread starts open, and a tap toggles one', () => {
    mockParams = { domain: '1' };
    mount(<NotesDomain />);
    expect(headers()).toHaveLength(topics.length);
    // Nothing read yet: the first topic on the page is the one open.
    const firstId = (headers()[0].props.accessibilityLabel as string).split(' ')[0];
    expect(openIds()).toEqual([firstId]);
    expect(headers()[0].props.accessibilityLabel).toMatch(/, 0 of \d+ read$/);
    expect(headers()[0].props.accessibilityHint).toBe('Hides this topic');
    const openTopic = topics.find((t) => t.id === firstId)!;
    const closedTopic = topics.find((t) => t.id !== firstId)!;
    // Its subtopics are on screen, another topic's are not.
    expect(subRow(openTopic.subtopics[0].name)).toHaveLength(1);
    expect(subRow(closedTopic.subtopics[0].name)).toHaveLength(0);
    // Open the closed one, then close the first.
    act(() => {
      header(closedTopic.id).props.onPress();
    });
    expect(header(closedTopic.id).props.accessibilityState).toMatchObject({ expanded: true });
    expect(subRow(closedTopic.subtopics[0].name)).toHaveLength(1);
    act(() => {
      header(openTopic.id).props.onPress();
    });
    expect(header(openTopic.id).props.accessibilityState).toMatchObject({ expanded: false });
    expect(subRow(openTopic.subtopics[0].name)).toHaveLength(0);
    expect(root().findAllByType(Collapse).filter((n) => n.props.open).length).toBeGreaterThanOrEqual(1);
  });

  it('the open topic is chosen once: reading its last note keeps it open; the next visit opens the next one', () => {
    mockParams = { domain: '1' };
    mount(<NotesDomain />);
    const [firstId] = openIds();
    const secondId = (headers()[1].props.accessibilityLabel as string).split(' ')[0];
    const t = topics.find((x) => x.id === firstId)!;
    // The learner reads every note of the open topic and comes back to this page.
    act(() => {
      for (const st of t.subtopics) useProgress.getState().setNoteRead('cisa', st.id, true);
    });
    expect(header(firstId).props.accessibilityLabel).toMatch(/, All read$/);
    expect(openIds()).toEqual([firstId]); // it did not snap shut under them
    // A hand toggle still wins.
    act(() => {
      header(firstId).props.onPress();
    });
    expect(openIds()).toEqual([]);
    // Opening the page again: the next unread topic is the one open.
    act(() => {
      r?.unmount();
    });
    mount(<NotesDomain />);
    expect(openIds()).toEqual([secondId]);
  });

  it('"Practice this topic" goes back to the tabs before opening the set', () => {
    canDismiss.mockReturnValue(true);
    mockParams = { domain: '1' };
    mount(<NotesDomain />);
    const btn = pressables(/^Practice this topic: /)[0];
    act(() => {
      btn.props.onPress();
    });
    freshSessionPushed();
  });

  it('an open topic with a lesson shows "Lesson: …" that opens the player', () => {
    mockParams = { domain: '1' };
    mount(<NotesDomain />);
    const [openId] = openIds();
    const lesson = topicLessons('cisa', openId)[0];
    if (!lesson) return; // the first topic has no lesson: nothing to check
    const row = pressables(`Lesson: ${lesson.title}, ${lesson.minutes} minutes, not done yet`);
    expect(row).toHaveLength(1);
    act(() => {
      row[0].props.onPress();
    });
    expect(push).toHaveBeenLastCalledWith(`/lesson/${lesson.id}`);
  });
});

// ── A set started from a pushed screen never stacks on an old one ─────
describe('starting a set from a note, deep in the stack (mobile 1.20 review)', () => {
  it('Results → note → Practice this concept: back to the tabs, then the session; the old Results shows nothing', () => {
    const once = jest.spyOn(motion, 'useOncePerDay');
    // A finished practice set, its Results open, then a note opened from it.
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(false);
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, finishedAt: Date.now() } }));
    });
    canDismiss.mockReturnValue(true);
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    press('Practice this concept');
    freshSessionPushed();
    const fresh = useSession.getState().active!;
    expect(fresh.finishedAt).toBeUndefined();
    act(() => {
      r?.unmount();
    });
    // Were a Results still mounted, it would see the NEW unfinished set: the empty
    // state, and it never uses up that set's once-per-day growth key.
    once.mockClear();
    mount(<Results />);
    expect(allText()).toContain('No results to show.');
    expect(allText()).not.toContain('Review answers');
    expect(once.mock.calls.map((c) => c[0])).not.toContain(`results:${fresh.id}`);
    once.mockRestore();
  });

  it('a finished set keys its growth by its own id', () => {
    const once = jest.spyOn(motion, 'useOncePerDay');
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(false);
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, finishedAt: Date.now() } }));
    });
    mount(<Results />);
    expect(once.mock.calls.map((c) => c[0])).toContain(`results:${useSession.getState().active!.id}`);
    once.mockRestore();
  });

  it('Session → miss → note → Practice → "Discard and start": one session screen, not two', () => {
    startFromIds('cisa', [both.qid, noteOnly.qid], 'T');
    answerOnScreen(false);
    // The replace-session alert: the learner taps "Discard and start".
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Discard and start')?.onPress?.();
    });
    canDismiss.mockReturnValue(true);
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    press('Practice this concept');
    expect(alert).toHaveBeenCalledTimes(1);
    freshSessionPushed();
    expect(push.mock.calls.filter((c) => c[0] === '/session')).toHaveLength(1);
    alert.mockRestore();
  });

  it('"Keep it" starts nothing and goes nowhere', () => {
    startFromIds('cisa', [both.qid], 'T');
    const before = useSession.getState().active!.id;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Keep it')?.onPress?.();
    });
    canDismiss.mockReturnValue(true);
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    press('Practice this concept');
    expect(useSession.getState().active!.id).toBe(before);
    expect(dismissAll).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalledWith('/session');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([]); // not marked read either
    alert.mockRestore();
  });
});

// ── Readiness report ──────────────────────────────────────────────────
describe('readiness report: Lessons and notes ›', () => {
  it('each domain row opens Learn on that domain', () => {
    const cisa = getCertification('cisa')!;
    const row = domainBreakdown(cisa, computeReadiness(cisa, {}), [])[0];
    const onLearn = jest.fn();
    const link = { label: 'Lessons and notes ›', accessibilityLabel: `Lessons and notes for ${row.domain.name}`, hint: 'Opens Learn on this domain', onPress: onLearn };
    mount(<DomainReportRow row={row} link={link} />);
    const btn = pressables(`Lessons and notes for ${row.domain.name}`);
    expect(btn).toHaveLength(1);
    expect(allText()).toContain('Lessons and notes ›');
    act(() => {
      btn[0].props.onPress();
    });
    expect(onLearn).toHaveBeenCalled();
  });

  it('without a link there is none (the row stays one stop)', () => {
    const cisa = getCertification('cisa')!;
    const row = domainBreakdown(cisa, computeReadiness(cisa, {}), [])[0];
    mount(<DomainReportRow row={row} />);
    expect(allText()).not.toContain('Lessons and notes');
  });
});

describe('readiness report screen', () => {
  it('a domain whose lessons are all done offers its study notes instead', () => {
    const cisa = getCertification('cisa')!;
    const d = cisa.domains[0];
    act(() => {
      for (const l of lessonsFor('cisa', d.id)) useProgress.getState().completeLesson('cisa', l.id);
    });
    mount(<ReadinessReport />);
    expect(pressables(`Lessons and notes for ${d.name}`)).toHaveLength(0);
    const btn = pressables(`Study notes for ${d.name}`);
    expect(btn).toHaveLength(1);
    expect(btn[0].props.accessibilityHint).toBe('Every lesson here is done. Opens the study notes for this domain');
    act(() => {
      btn[0].props.onPress();
    });
    expect(push).toHaveBeenLastCalledWith(`/notes/${d.id}`);
    // The other domains still lead to Learn.
    expect(pressables(`Lessons and notes for ${cisa.domains[1].name}`)).toHaveLength(1);
  });

  it('"Lessons and notes ›" switches to the Learn tab on that domain', () => {
    mount(<ReadinessReport />);
    const cisa = getCertification('cisa')!;
    const d = cisa.domains[1];
    // Under it sits the (tabs) navigator: dismiss back to it (never push a second one).
    canDismiss.mockReturnValue(true);
    press(`Lessons and notes for ${d.name}`);
    expect(dismissTo).toHaveBeenLastCalledWith({ pathname: '/learn', params: { domain: d.id } });
    expect(navigate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // Opened with nothing under it (a deep link): replace with Learn.
    canDismiss.mockReturnValue(false);
    press(`Lessons and notes for ${d.name}`);
    expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/learn', params: { domain: d.id } });
  });
});

// ── Lesson player ─────────────────────────────────────────────────────
describe('lesson player: the notes bridge and where Report a problem lives', () => {
  const lesson = lessonsFor('cisa').find((l) => l.topics?.length && l.scenes.some((x) => x.type === 'check'))!;
  const reportLinks = () => pressables(/^Report a problem with this lesson/);
  /** Walk to the end, answering each check, and finish. */
  const finish = () => {
    for (let i = 0; i < lesson.scenes.length; i++) {
      if (lesson.scenes[i].type === 'check') {
        act(() => {
          root().findAllByType(OptionCard)[0].props.onPress();
        });
      }
      press(i === lesson.scenes.length - 1 ? 'Finish lesson' : 'Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
  };

  it('the cover names the notes that go deeper (one stop)', () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    const names = lessonNotes('cisa', lesson).map((n) => n.name);
    // A caption, then one line per note (P4).
    expect(allText()).toContain('Goes deeper in the notes');
    for (const name of names) expect(allText()).toContain(name);
    expect(root().findAll((n) => n.props.accessibilityLabel === `Goes deeper in the notes: ${names.join('; ')}.`).length).toBeGreaterThan(0);
  });

  it('Report a problem: not on plain scenes, on an answered check, and on Lesson complete', () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    expect(lesson.scenes[0].type).not.toBe('check');
    expect(reportLinks()).toHaveLength(0);
    finish();
    expect(allText()).toContain('Lesson complete');
    expect(pressables('Report a problem with this lesson')).toHaveLength(1);
  });

  it('Lesson complete: Practice this topic, then Read the note, then Next lesson', () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    finish();
    const note = lessonNotes('cisa', lesson)[0];
    const text = allText();
    const at = [text.indexOf('Practice this topic'), text.indexOf('Read the note'), text.indexOf('Next lesson')];
    // Short on screen, the note named when spoken (H1).
    expect(text).not.toContain(`Read the note: ${note.name}`);
    expect(pressables(`Read the note: ${note.name}`)[0].props.accessibilityHint).toBe('Opens the study note that goes deeper on this lesson');
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    press(`Read the note: ${note.name}`);
    expect(push).toHaveBeenLastCalledWith(`/notes/subtopic/${encodeURIComponent(note.id)}`);
  });

  it('Lesson complete → Practice this topic: back to the tabs, then the session (it may sit on a session)', () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    finish();
    canDismiss.mockReturnValue(true);
    press('Practice this topic');
    freshSessionPushed();
    expect(router.replace).not.toHaveBeenCalledWith('/session');
  });
});

describe('lesson complete at very large text, and Back to Learn', () => {
  const lesson = lessonsFor('cisa').find((l) => l.topics?.length && l.scenes.some((x) => x.type === 'check'))!;
  const finishIt = () => {
    for (let i = 0; i < lesson.scenes.length; i++) {
      if (lesson.scenes[i].type === 'check') {
        act(() => {
          root().findAllByType(OptionCard)[0].props.onPress();
        });
      }
      press(i === lesson.scenes.length - 1 ? 'Finish lesson' : 'Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
  };
  const inScroll = (label: string) => {
    const scroll = root().findAllByType(ScrollView)[0];
    return scroll.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').length > 0;
  };

  it('at 200 % the actions scroll with the page (none pinned off-screen); at 100 % they are pinned', () => {
    mockParams = { id: lesson.id };
    setFontScale(2);
    mount(<LessonPlayer />);
    finishIt();
    expect(pressables('Next lesson')).toHaveLength(1);
    expect(inScroll('Next lesson')).toBe(true);
    expect(inScroll(`Read the note: ${lessonNotes('cisa', lesson)[0].name}`)).toBe(true);
    act(() => {
      r?.unmount();
    });
    setFontScale(1);
    mount(<LessonPlayer />);
    finishIt();
    expect(pressables('Next lesson')).toHaveLength(1);
    expect(inScroll('Next lesson')).toBe(false);
  });

  it('"Back to Learn" goes to the Learn tab, not back to wherever the lesson was opened', () => {
    // Every other lesson done, so this is the last one: no "Next lesson".
    act(() => {
      for (const l of lessonsFor('cisa')) if (l.id !== lesson.id) useProgress.getState().completeLesson('cisa', l.id);
    });
    canDismiss.mockReturnValue(true);
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    finishIt();
    press('Back to Learn');
    expect(dismissTo).toHaveBeenLastCalledWith('/learn');
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('note page: the one primary action', () => {
  const kinds = () => root().findAll((n) => typeof n.props.label === 'string' && n.props.kind !== undefined && typeof n.props.onPress === 'function');
  it('practice is the one primary when the note lists questions; the read toggle is a quiet text button (mobile 1.22)', () => {
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    expect(pressables('Practice this concept')[0].props.accessibilityHint).toMatch(/ and marks this note as read$/);
    // No second pill: "Mark as read" lives in the source row, beside the code.
    expect(kinds().map((n) => n.props.label)).not.toContain('Mark as read');
    expect(pressables('Mark as read')).toHaveLength(1);
    expect(allText()).toContain(`Code ${both.sub} · Mark as read`);
    // And no "Next: …" ghost: the next note is one quiet row with a kicker.
    expect(allText()).not.toMatch(/Next: /);
    act(() => {
      r?.unmount();
    });
    const bare = ['1', '2', '3', '4', '5']
      .flatMap((d) => noteDomain('cisa', d)?.topics ?? [])
      .flatMap((t) => t.subtopics)
      .find((x) => !(x.practiceIds ?? []).some((q) => findQuestion('cisa', q)));
    if (!bare) return; // every note lists questions today
    mockParams = { id: bare.id };
    mount(<NoteSubtopicScreen />);
    expect(pressables('Practice this concept')).toHaveLength(0);
    expect(pressables('Mark as read')).toHaveLength(1);
  });
});

// Sanity: the fixture lesson really exists (guards a content rename).
it('fixtures resolve', () => {
  expect(findLesson(both.lesson.id)).toBeDefined();
});
