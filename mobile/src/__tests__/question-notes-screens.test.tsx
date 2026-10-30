/**
 * "Your note" on screen:
 *  - the answer screen: "Add a note" only AFTER the answer is checked; mobile
 *    1.49: it is a row in the header's ⋯ "More on this question" sheet (before
 *    "Report a problem"), not a button in the page body; never in the first set;
 *  - the sheet: saves 600 ms after typing stops and on Done; deleting a saved
 *    note (Delete note, or Done on an emptied field) asks first, and typing
 *    never deletes; the counter shows only near the 1,000 limit; past the
 *    notes' total cap a change is not saved and the sheet says so; the sheet
 *    stays above the keyboard (its tallest size shrinks by the keyboard);
 *  - the saved note comes back as a plate with "Edit" when the question returns;
 *  - a LIVE mock never shows it; the mock review on Results does;
 *  - Saved → "Your notes": only once a note exists; stem + a "Your note" marker, NEVER the
 *    note's text (it could give the answer away before answering); a row opens the question;
 *  - privacy: no file outside the note's own places reads the notes (so they can't
 *    reach a report email, a share card or analytics).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { Alert, Keyboard, KeyboardAvoidingView, StyleSheet, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { getAllQuestions } from '../content/loader';
import { startFromIds, startMock } from '../lib/sessions';
import { startFirstSet } from '../lib/firstSet';
import { finishSession } from '../lib/finishSession';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { moreRowLabels, viaMore } from '../../jest/answerMore';
import SessionScreen from '../app/session';
import Results from '../app/results';
import Saved from '../app/saved';
import { ADD_NOTE, NOTE_INTRO, NOTE_INTRO_SYNC, NOTE_SAVE_MS } from '../components/questionNote';
import { CLOUD } from '../cloud/flag';
import { Sheet, sheetLayout } from '../components/settings';
import { NOTES_FULL_LINE, NOTES_TOTAL_MAX, QNOTE_MAX } from '../engine/questionNotes';
import { space } from '../theme/tokens';

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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));

const bank = getAllQuestions('cisa');
const [qa, qb, qc] = bank.slice(200, 203);

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const buttons = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function');
/** Is a button with this label on screen? (A Button and its pressable both carry the label, so no counts.) */
const has = (label: string) => buttons(label).length > 0;
const press = (label: string) => {
  const b = buttons(label)[0];
  if (!b) throw new Error(`no button "${label}"`);
  act(() => {
    b.props.onPress();
  });
};
/** Mobile 1.49: "Add a note" is a row in the ⋯ sheet. */
const addNote = () => viaMore(root(), ADD_NOTE);
const inMore = (label: string) => moreRowLabels(root()).includes(label);
const field = () => root().findAll((n) => n.props.accessibilityLabel === 'Your note on this question' && typeof n.props.onChangeText === 'function')[0];
const type = (text: string) =>
  act(() => {
    field().props.onChangeText(text);
  });
const noteOf = (id: string) => selectCert(useProgress.getState(), 'cisa').qNotes?.[id];
/** Pick the right (or a wrong) option on screen, by ORIGINAL letter. */
function pickBy(right: boolean) {
  const s = useSession.getState().active!;
  const qid = s.questionIds[s.index];
  const q = bank.find((x) => x.id === qid)!;
  const perm = s.perms[qid];
  const card = root().findAll((n) => n.props.letter !== undefined && n.props.state !== undefined && typeof n.props.text === 'string').find((n) => (perm[['A', 'B', 'C', 'D'].indexOf(n.props.letter)] === q.correct) === right)!;
  act(() => {
    card.props.onPress();
  });
}
/** A practice session on these ids, the first one answered and checked. */
function answerFirst(ids: string[], right = false) {
  startFromIds('cisa', ids, 'T');
  mount(<SessionScreen />);
  pickBy(right);
  press('Check answer');
}

beforeEach(() => {
  jest.useFakeTimers();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the answer screen', () => {
  it('never shows "Add a note" before the answer is checked', () => {
    startFromIds('cisa', [qa.id, qb.id], 'T');
    mount(<SessionScreen />);
    expect(has(ADD_NOTE)).toBe(false);
    pickBy(false);
    expect(has(ADD_NOTE)).toBe(false);
  });

  it('after a miss and after a right answer: "Add a note" is in ⋯, after the reading rows and before the report', () => {
    answerFirst([qa.id, qb.id], false);
    expect(has(ADD_NOTE)).toBe(false); // not in the page body any more
    const labels = moreRowLabels(root());
    const at = labels.indexOf(ADD_NOTE);
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(labels.indexOf('Report a problem with this question'));
    const note = labels.findIndex((l) => l.startsWith('Read the note'));
    if (note >= 0) expect(note).toBeLessThan(at);
    act(() => {
      r!.unmount();
    });
    useSession.getState().clear();
    answerFirst([qb.id, qc.id], true);
    expect(inMore(ADD_NOTE)).toBe(true);
  });

  it('the sheet saves as you type (600 ms) and on Done; the note comes back as a plate with Edit', () => {
    answerFirst([qa.id, qb.id]);
    addNote();
    // Builds that can sync (CI runs the suite a second time with the cloud on) say so.
    expect(allText()).toContain(CLOUD ? NOTE_INTRO_SYNC : NOTE_INTRO);
    type('Escalate first.');
    expect(noteOf(qa.id)).toBeUndefined();
    act(() => {
      jest.advanceTimersByTime(NOTE_SAVE_MS);
    });
    expect(noteOf(qa.id)?.text).toBe('Escalate first.');
    type('Escalate first. Then test.');
    press('Done, Your note'); // closing saves at once, without waiting
    expect(noteOf(qa.id)?.text).toBe('Escalate first. Then test.');
    expect(has(ADD_NOTE)).toBe(false);
    expect(has('Edit your note')).toBe(true);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Your note: Escalate first. Then test.').length).toBeGreaterThan(0);

    // The question comes back later (review, Mistakes, Saved): the plate is there after checking.
    act(() => {
      r!.unmount();
    });
    useSession.getState().clear();
    answerFirst([qa.id], true);
    expect(allText()).toContain('Escalate first. Then test.');
  });

  it('emptying a saved note never deletes it while typing; Done asks first, then deletes (a tombstone stays)', () => {
    useProgress.getState().setQuestionNote('cisa', qa.id, 'To be cleared');
    answerFirst([qa.id, qb.id]);
    press('Edit your note');
    type('');
    act(() => {
      jest.advanceTimersByTime(NOTE_SAVE_MS * 3);
    });
    expect(noteOf(qa.id)?.text).toBe('To be cleared'); // no autosaved deletion
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    press('Done, Your note');
    expect(alert).toHaveBeenCalledWith('Delete your note?', 'This can’t be undone.', expect.any(Array));
    const choices = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    // Cancel: the note is kept, and it is back in the field (the sheet stays open).
    act(() => {
      choices.find((b) => b.text === 'Cancel')!.onPress!();
    });
    expect(noteOf(qa.id)?.text).toBe('To be cleared');
    expect(field().props.value).toBe('To be cleared');
    // Empty it again, Done, Delete: gone.
    type('');
    press('Done, Your note');
    act(() => {
      (alert.mock.calls[1][2] as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Delete')!.onPress!();
    });
    expect(noteOf(qa.id)?.text).toBe('');
    expect(inMore(ADD_NOTE)).toBe(true);
  });

  it('a note typed and cleared in one sitting (never saved before) just closes, with nothing to confirm', () => {
    answerFirst([qa.id, qb.id]);
    addNote();
    type('Second thoughts');
    act(() => {
      jest.advanceTimersByTime(NOTE_SAVE_MS);
    });
    type('');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    press('Done, Your note');
    expect(alert).not.toHaveBeenCalled();
    expect(noteOf(qa.id)?.text ?? '').toBe('');
    expect(inMore(ADD_NOTE)).toBe(true);
  });

  it('past the total cap for all notes, a new note is not saved and the sheet says why', () => {
    // Fill this exam's notes to the cap with other questions' notes.
    const others = bank.filter((q) => q.id !== qa.id).slice(0, NOTES_TOTAL_MAX / QNOTE_MAX);
    act(() => {
      for (const q of others) useProgress.getState().setQuestionNote('cisa', q.id, 'x'.repeat(QNOTE_MAX));
    });
    answerFirst([qa.id, qb.id]);
    addNote();
    type('One more');
    act(() => {
      jest.advanceTimersByTime(NOTE_SAVE_MS);
    });
    expect(noteOf(qa.id)).toBeUndefined();
    expect(allText()).toContain(NOTES_FULL_LINE);
  });

  it('"Delete note" shows only for a saved note, and asks first', () => {
    answerFirst([qa.id, qb.id]);
    addNote();
    expect(has('Delete note')).toBe(false);
    press('Done, Your note');
    act(() => {
      useProgress.getState().setQuestionNote('cisa', qa.id, 'Keep or delete');
    });
    press('Edit your note');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    press('Delete note');
    expect(alert).toHaveBeenCalledWith('Delete your note?', 'This can’t be undone.', expect.any(Array));
    const del = (alert.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Delete')!;
    act(() => {
      del.onPress!();
    });
    expect(noteOf(qa.id)?.text).toBe('');
    expect(inMore(ADD_NOTE)).toBe(true);
  });

  it('the counter shows only near the 1,000-character limit', () => {
    answerFirst([qa.id, qb.id]);
    addNote();
    type('Short note');
    expect(allText()).not.toContain('/ 1000');
    type('n'.repeat(850));
    expect(allText()).toContain('850 / 1000');
  });

  it('not on the very first question set', () => {
    startFirstSet('cisa');
    expect(useSession.getState().active?.firstSet).toBe(true);
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    expect(allText()).toContain('Not quite');
    expect(has(ADD_NOTE)).toBe(false);
    expect(inMore(ADD_NOTE)).toBe(false);
  });
});

describe('mock exams', () => {
  it('a live mock never shows a note, even on a question that has one; the mock review on Results does', () => {
    startMock('cisa', 3);
    const ids = useSession.getState().active!.questionIds;
    useProgress.getState().setQuestionNote('cisa', ids[0], 'Mock note from before');
    mount(<SessionScreen />);
    pickBy(true);
    expect(has(ADD_NOTE)).toBe(false);
    expect(has('Edit your note')).toBe(false);
    expect(allText()).not.toContain('Mock note from before');
    act(() => {
      r!.unmount();
    });

    act(() => {
      finishSession({ celebrate: false });
    });
    mount(<Results />);
    expect(allText()).not.toContain('Mock note from before'); // folded rows show no note
    act(() => {
      root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Question 1,') && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(allText()).toContain('Mock note from before');
    expect(has('Edit your note')).toBe(true);
    act(() => {
      root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Question 2,') && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(has(ADD_NOTE)).toBe(true);
  });
});

describe('Saved → Your notes', () => {
  it('with saved questions but no notes: no "Your notes" group at all', () => {
    useProgress.getState().toggleBookmark('cisa', qb.id);
    mount(<Saved />);
    expect(allText()).not.toContain('Your notes');
  });

  it('lists the questions with a note (newest first) as a marker, never the note text; a row opens that question', () => {
    useProgress.getState().setQuestionNote('cisa', qa.id, 'Older note on A');
    jest.advanceTimersByTime(10);
    useProgress.getState().setQuestionNote('cisa', qc.id, 'Newer note on C');
    useProgress.getState().setQuestionNote('cisa', qb.id, 'Deleted');
    useProgress.getState().setQuestionNote('cisa', qb.id, ''); // a tombstone: never listed
    mount(<Saved />);
    const t = allText();
    expect(t).toContain('Your notes');
    // Not the empty screen (there are notes): its "Practice 10 questions" action is absent.
    expect(has('Practice 10 questions')).toBe(false);
    // The note's words never show here (seen or spoken): the question is not answered yet.
    expect(t).not.toContain('Newer note on C');
    expect(t).not.toContain('Older note on A');
    expect(t).not.toContain('Deleted');
    const labels = root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
    expect(labels.join(' ')).not.toMatch(/Older note on A|Newer note on C/);
    const rows = [...new Set(labels.filter((l) => l.startsWith('Question:')))];
    expect(rows).toHaveLength(2);
    for (const l of rows) expect(l).toMatch(/\. You have a note on it\.$/);
    // Newest first: C's stem comes before A's.
    expect(t.indexOf(qc.stem.slice(0, 30))).toBeLessThan(t.indexOf(qa.stem.slice(0, 30)));
    expect(t.match(/Your note(?!s)/g)!.length).toBe(2);
    const row = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`Question: ${qa.stem.slice(0, 30)}`) && typeof n.props.onPress === 'function')[0];
    act(() => {
      row.props.onPress();
    });
    expect(useSession.getState().active?.questionIds).toEqual([qa.id]);
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('nothing saved and no notes: the empty screen as before', () => {
    mount(<Saved />);
    expect(allText()).toContain('Nothing saved yet');
  });
});

describe('the bottom sheet and the keyboard', () => {
  it('its tallest size shrinks by the keyboard, and the home-indicator padding gives way to a small gap', () => {
    expect(sheetLayout(852, { top: 47, bottom: 34 }, 0)).toEqual({ maxHeight: 852 - 47 - space.lg, paddingBottom: 34 });
    expect(sheetLayout(852, { top: 47, bottom: 34 }, 336)).toEqual({ maxHeight: 852 - 47 - space.lg - 336, paddingBottom: space.sm });
  });

  it('uses "padding" (Android edge to edge too) and fits above a keyboard when it opens', () => {
    const handlers: Record<string, (e?: unknown) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, fn: (e?: unknown) => void) => {
      handlers[name] = fn;
      return { remove: () => {} };
    }) as never);
    mount(
      <Sheet visible onClose={() => {}} title="Your note">
        <Text>A long note</Text>
      </Sheet>,
    );
    expect(root().findByType(KeyboardAvoidingView).props.behavior).toBe('padding');
    const maxH = () =>
      root()
        .findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.maxHeight !== undefined)
        .map((n) => StyleSheet.flatten(n.props.style).maxHeight as number)[0];
    const before = maxH();
    const show = handlers.keyboardWillShow ?? handlers.keyboardDidShow;
    act(() => show({ endCoordinates: { height: 336 } }));
    expect(maxH()).toBe(before - 336);
    act(() => (handlers.keyboardWillHide ?? handlers.keyboardDidHide)());
    expect(maxH()).toBe(before);
  });
});

describe('privacy', () => {
  // The ONLY places that may read learners' notes. A report email, a share card or analytics must
  // never be one of them: adding a file here needs a privacy review.
  const ALLOWED = [
    'app/results.tsx', // mounts the note block in the review (passes ids only)
    'app/saved.tsx',
    'components/questionNote.tsx',
    'engine/backup.ts',
    'engine/questionNotes.ts',
    'engine/syncMerge.ts',
    'engine/webImport.ts', // mobile 1.42: brings the website's notes into the app (merged like a sync)
    'store/progress.ts',
    'webcloud/toWeb.ts', // accounts beta: carries the notes between the account and the website's own record (sync only)
  ];
  const src = join(__dirname, '..');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) return f === '__tests__' || f === 'generated' ? [] : files(p);
      return /\.tsx?$/.test(f) ? [p] : [];
    });

  it('notes are read only where they belong (never by support, share cards or analytics)', () => {
    const readers = files(src)
      .filter((p) => /qNotes|setQuestionNote|engine\/questionNotes|components\/questionNote/.test(readFileSync(p, 'utf8')))
      .map((p) => relative(src, p).split('\\').join('/'))
      .sort();
    // session.tsx mounts the block by question id; it never reads the text itself.
    expect(readers).toEqual([...ALLOWED, 'app/session.tsx'].sort());
    const session = readFileSync(join(src, 'app/session.tsx'), 'utf8');
    expect(session).not.toMatch(/qNotes|setQuestionNote/);
  });

  it('the report target on the answer screen carries no note text', () => {
    useProgress.getState().setQuestionNote('cisa', qa.id, 'PRIVATE-NOTE-TEXT');
    answerFirst([qa.id, qb.id]);
    // Mobile 1.49: the report opens from the ⋯ sheet.
    viaMore(root(), 'Report a problem with this question');
    const trust = root().findAll((n) => n.props.target !== undefined && n.props.certId === 'cisa');
    expect(trust.length).toBeGreaterThan(0);
    for (const t of trust) expect(JSON.stringify(t.props.target)).not.toContain('PRIVATE-NOTE-TEXT');
  });
});
