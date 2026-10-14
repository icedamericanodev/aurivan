/**
 * Mobile 1.20: lessons and study notes point at each other.
 *
 * - lessonsForSubtopic: by a lesson's `notes` first, else by its outline
 *   topic; noteIdsForLesson / lessonNotes: the notes a lesson leads into;
 *   missedSubtopics: Results' "most-missed first, each once, at most 3".
 * - Session, after a miss (practice, review, Guided; never a mock): "Read
 *   the note" whenever a note lists the question, then "Review the lesson"
 *   only while that lesson is not done. Nothing after a right answer.
 * - Results: "Read the notes for what you missed" reveals the note rows,
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
import { Collapse } from '../components/motion';
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const push = router.push as jest.Mock;
const navigate = router.navigate as jest.Mock;

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

beforeEach(() => {
  jest.useFakeTimers();
  push.mockClear();
  navigate.mockClear();
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
    const lesson = lessonsFor('cisa').find((l) => l.topics?.length && !l.notes)!;
    const topic = lesson.topics![0];
    const sub = noteDomain('cisa', lesson.domainId)!.topics.find((t) => t.id === topic)!.subtopics[0].id;
    expect(lessonsForSubtopic('cisa', sub).map((l) => l.id)).toEqual(topicLessons('cisa', topic).map((l) => l.id));
    expect(lessonsForSubtopic('cisa', sub).map((l) => l.id)).toContain(lesson.id);
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
const lessonRows = () => pressables(/^Review the lesson: /);

describe('session: the note first, the lesson when there is one', () => {
  it('a practice miss offers the note, then the lesson; Back returns to the same answer', () => {
    startFromIds('cisa', [both.qid], 'T');
    answerOnScreen(false);
    mount(<SessionScreen />);
    const name = findNote('cisa', both.sub)!.name;
    expect(noteRows()).toHaveLength(1);
    expect(noteRows()[0].props.accessibilityLabel).toBe(`Read the note: ${name}, about 2 minutes, the concept this question tests`);
    expect(allText()).toContain('About 2 min · the concept this question tests');
    expect(lessonRows()).toHaveLength(1);
    expect(lessonRows()[0].props.accessibilityLabel).toBe(`Review the lesson: ${both.lesson.title}, ${both.lesson.minutes} minutes`);
    // Note first, then the lesson.
    const text = allText();
    expect(text.indexOf(`Read the note: ${name}`)).toBeLessThan(text.indexOf('Review the lesson:'));
    // Both are pushed, so Back lands on this same answer screen.
    press(/^Read the note: /);
    expect(push).toHaveBeenLastCalledWith(`/notes/subtopic/${encodeURIComponent(both.sub)}`);
    press(/^Review the lesson: /);
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
    expect(lessonRows()).toHaveLength(0); // no lesson prepares this one
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
describe('results: Read the notes for what you missed', () => {
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
    const toggle = pressables('Read the notes for what you missed');
    expect(toggle).toHaveLength(1);
    expect(toggle[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(pressables(/^Read the note: /)).toHaveLength(0);
    press('Read the notes for what you missed');
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
    expect(pressables('Read the notes for what you missed')).toHaveLength(0);
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
    expect(allText()).toContain(`${lesson.minutes} min · Not done yet`);
    act(() => {
      row().props.onPress();
    });
    expect(push).toHaveBeenLastCalledWith(`/lesson/${lesson.id}`);
    act(() => {
      useProgress.getState().completeLesson('cisa', lesson.id);
    });
    expect(allText()).toContain(`${lesson.minutes} min · Done`);
  });

  it('no "Practice this domain"; "Practice this concept" marks the note read (the toggle undoes it)', () => {
    mockParams = { id: both.sub };
    mount(<NoteSubtopicScreen />);
    expect(allText()).not.toContain('Practice this domain');
    press('Practice this concept');
    expect(push).toHaveBeenLastCalledWith('/session');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([both.sub]);
    press('Marked as read');
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

  it('once a topic is all read, the next unread topic is the one open', () => {
    mockParams = { domain: '1' };
    mount(<NotesDomain />);
    const [firstId] = openIds();
    const secondId = (headers()[1].props.accessibilityLabel as string).split(' ')[0];
    const t = topics.find((x) => x.id === firstId)!;
    act(() => {
      for (const st of t.subtopics) useProgress.getState().setNoteRead('cisa', st.id, true);
    });
    expect(header(firstId).props.accessibilityLabel).toMatch(/, All read$/);
    expect(openIds()).toEqual([secondId]);
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

// ── Readiness report ──────────────────────────────────────────────────
describe('readiness report: Lessons and notes ›', () => {
  it('each domain row opens Learn on that domain', () => {
    const cisa = getCertification('cisa')!;
    const row = domainBreakdown(cisa, computeReadiness(cisa, {}), [])[0];
    const onLearn = jest.fn();
    mount(<DomainReportRow row={row} onLearn={onLearn} />);
    const btn = pressables(`Lessons and notes for ${row.domain.name}`);
    expect(btn).toHaveLength(1);
    expect(allText()).toContain('Lessons and notes ›');
    act(() => {
      btn[0].props.onPress();
    });
    expect(onLearn).toHaveBeenCalled();
  });

  it('without onLearn there is no link (the row stays one stop)', () => {
    const cisa = getCertification('cisa')!;
    const row = domainBreakdown(cisa, computeReadiness(cisa, {}), [])[0];
    mount(<DomainReportRow row={row} />);
    expect(allText()).not.toContain('Lessons and notes');
  });
});

describe('readiness report screen', () => {
  it('"Lessons and notes ›" switches to the Learn tab on that domain', () => {
    mount(<ReadinessReport />);
    const cisa = getCertification('cisa')!;
    const d = cisa.domains[1];
    press(`Lessons and notes for ${d.name}`);
    expect(navigate).toHaveBeenLastCalledWith({ pathname: '/learn', params: { domain: d.id } });
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
    expect(allText()).toContain(`Goes deeper in the notes: ${names.join(' · ')}`);
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
    const at = [text.indexOf('Practice this topic'), text.indexOf(`Read the note: ${note.name}`), text.indexOf('Next lesson')];
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    press(`Read the note: ${note.name}`);
    expect(push).toHaveBeenLastCalledWith(`/notes/subtopic/${encodeURIComponent(note.id)}`);
  });
});

// Sanity: the fixture lesson really exists (guards a content rename).
it('fixtures resolve', () => {
  expect(findLesson(both.lesson.id)).toBeDefined();
});
