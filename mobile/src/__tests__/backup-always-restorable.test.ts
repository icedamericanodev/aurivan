/**
 * Build D fix C1: the app can never export a backup it would refuse to restore.
 *
 * The bug: an untimed mock finished more than 24 h after it started saved
 * minutesUsed > 1440, the backup checker refuses that, so every backup
 * (and the undo snapshot a restore needs) became unrestorable.
 *
 * Two fixes, both tested here:
 * - at the source: minutesUsed is the answer time for untimed mocks and is
 *   always 1..1440; answer `ms` is clamped to the answer clock's cap;
 * - at export: buildBackup runs the phone's data through the SAME rules a
 *   restore checks, in "fit" mode (numbers clamped, lists cut to caps,
 *   broken totals repaired). A property-style test throws many random but
 *   plausible store states at it and checks every export reads back.
 */
import { getAllQuestions } from '../content/loader';
import { MAX_ANSWER_MS } from '../engine/answerClock';
import { cleanDone } from '../engine/examWeek';
import { readBackup } from '../engine/backup';
import { isValidPlantState } from '../engine/plant';
import { isCatalogLook, isKeepable, isLookOfSlot, resolveStyle } from '../engine/plantLooks';
import { originalToDisplay } from '../engine/shuffle';
import { checkBackupText, currentBackup } from '../lib/backup';
import { finishSession, MAX_SESSION_MINUTES } from '../lib/finishSession';
import { startMock } from '../lib/sessions';
import { selectCert, useProgress, type CertProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
// The random but plausible states live in jest/randomState.ts (shared with the sync merge tests).
import { DAY, ids, MIN, randomCert, randomPlant, randomReports, T0 } from '../../jest/randomState';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const restorable = () => checkBackupText(JSON.stringify(currentBackup(Date.now())));

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' }, practiceTimer: false, paceOffer: undefined });
});
afterEach(() => jest.useRealTimers());

describe('the source: minutes and answer times always fit', () => {
  it('an untimed mock started 2 days ago gives a result readBackup accepts', () => {
    startMock('cisa', 50, { timing: 'untimed' });
    const s = useSession.getState().active!;
    for (const id of s.questionIds.slice(0, 3)) {
      const q = getAllQuestions('cisa').find((x) => x.id === id)!;
      useSession.getState().answer(id, { display: originalToDisplay(q.correct, s.perms[id]), correct: true, ms: 80_000 });
    }
    jest.setSystemTime(T0 + 2 * DAY); // paused for two days, then submitted
    finishSession();
    const [m] = selectCert(useProgress.getState(), 'cisa').mocks;
    // The answer time (3 × 80 s), not two days of wall time.
    expect(m.minutesUsed).toBe(4);
    const file = JSON.stringify(currentBackup(Date.now()));
    expect(() => readBackup(file, ['cisa'])).not.toThrow();
    expect(restorable().kind).toBe('ok');
  });

  it('a timed mock reopened days later ends at its deadline (80 minutes)', () => {
    startMock('cisa', 50);
    jest.setSystemTime(T0 + 3 * DAY);
    finishSession();
    expect(selectCert(useProgress.getState(), 'cisa').mocks[0].minutesUsed).toBe(80);
    expect(useSession.getState().active!.finishedAt).toBe(T0 + 80 * MIN);
  });

  it('answer times are clamped to the 30-minute cap when recorded', () => {
    useProgress.getState().recordAnswer('cisa', ids[0], true, undefined, { ms: 3 * 60 * MIN, mastery: false });
    expect(selectCert(useProgress.getState(), 'cisa').answers[ids[0]].ms).toBe(MAX_ANSWER_MS);
  });
});

describe('export: every state the phone can hold reads back', () => {
  it('200 random plausible states: every export passes the restore check', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const plant = randomPlant(seed);
      useProgress.setState({
        byCert: { cisa: { ...randomCert(seed), ...(plant ? { plant } : {}) } },
        reports: randomReports(seed),
        plantSettings: seed % 3 === 0 ? undefined : { showPlant: seed % 2 === 0, quietLook: seed % 5 === 0, ...(seed % 7 === 0 ? { promptHidden: true } : {}) },
      });
      // Mobile 1.15: the fit, from none (an older save) to every key, odd counts included.
      const fams = [undefined, 'new', 'some', 'experienced'] as const;
      useSettings.setState({
        badgesHidden: seed % 2 === 0,
        familiarity: fams[seed % 4],
        dailyMinutes: seed % 5 === 0 ? undefined : ([10, 20, 30, 45] as const)[seed % 4],
        examFocused: seed % 3 === 0 ? undefined : seed % 2 === 0,
        fitPrompt: seed % 6 === 0 ? undefined : seed % 2 ? 'answered' : 'dismissed',
        fitChanges: seed % 7 === 0 ? undefined : seed * 97,
        // PR #45 review M4: the days the fit card showed (none to all three).
        fitAskDays: seed % 4 === 0 ? undefined : ['2026-10-01', '2026-10-02', '2026-10-03'].slice(0, seed % 4),
      });
      const read = restorable();
      if (read.kind !== 'ok') throw new Error(`seed ${seed}: ${read.code}`);
      // The fit survives exactly (a count past the cap is clamped, never refused).
      const st = useSettings.getState();
      const fit = read.data.settings;
      expect([fit.familiarity, fit.dailyMinutes, fit.examFocused, fit.fitPrompt, fit.fitChanges, fit.fitAskDays]).toEqual([
        st.familiarity,
        st.dailyMinutes,
        st.examFocused,
        st.fitPrompt,
        st.fitChanges === undefined ? undefined : Math.min(9999, st.fitChanges),
        st.fitAskDays,
      ]);
      // Mobile 1.16: the exam-week checklist survives, known ids once each, in order.
      const ew = useProgress.getState().byCert.cisa.moments?.examWeek;
      const ewBack = read.data.progress.byCert.cisa.moments?.examWeek;
      expect(ewBack).toEqual(ew ? { for: ew.for, done: cleanDone(ew.done), ...(ew.hidden ? { hidden: true } : {}) } : undefined);
      // The plant survives (repaired and clamped to the data), never dropped or invented.
      const back = read.data.progress.byCert.cisa.plant;
      expect(Boolean(back)).toBe(Boolean(plant));
      if (back) {
        expect(isValidPlantState(back)).toBe(true);
        expect(back.species).toBe(plant!.species);
        expect(back.growth).toBeLessThanOrEqual(plant!.growth);
        // Mobile 1.14: a look choice that is a catalogue id in its own slot survives exactly
        // (whether or not its unlock does: the art falls back, the choice is kept).
        const want = plant!.look;
        for (const [k, slot] of [['style', 'style'], ['colourway', 'colourway'], ['ground', 'ground'], ['planter', 'planter'], ['visitor', 'visitor']] as const)
          expect(back.look?.[k]).toBe(want && isLookOfSlot(want[k], slot) ? want[k] : undefined);
        const ks = [...new Set((want?.keepsakes ?? []).filter((x) => isLookOfSlot(x, 'keepsake')))].slice(0, 3);
        // An explicit list (even an empty one: "none on show") survives as such; unset stays unset (the default three).
        expect(back.look?.keepsakes).toEqual(want?.keepsakes === undefined ? undefined : ks);
        // Unlocks kept across a Reset survive too (keepable catalogue ids only, once each).
        expect(back.kept ?? []).toEqual([...new Set((plant!.kept ?? []).filter(isKeepable))]);
        expect((back.kept ?? []).every((id) => isCatalogLook(id) && id !== 'ribbon')).toBe(true);
      }
    }
  });

  it('fitting keeps good data exactly and only clamps what is out of range', () => {
    const good = randomCert(7);
    good.mocks = [{ id: 'a', finishedAt: T0, total: 50, correct: 30, minutesUsed: 2 * DAY / MIN, byDomain: {}, timing: 'untimed' }];
    useProgress.setState({ byCert: { cisa: good } });
    const read = restorable();
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.mocks![0]).toEqual({ ...good.mocks[0], minutesUsed: MAX_SESSION_MINUTES });
  });

  it('over-long rolling windows export their NEWEST results', () => {
    const cert = randomCert(3);
    const sure = [...Array.from({ length: 30 }, () => false), ...Array.from({ length: 50 }, () => true)];
    const myths = Array.from({ length: 40 }, (_, k) => ({ id: `r${k}`, ok: k >= 15 }));
    cert.milestones = { earned: {}, sure, myths };
    cert.gameGrowth = { trap: { tier: 'seedling', up: 0, down: 0, hits: [...Array.from({ length: 20 }, () => false), ...Array.from({ length: 30 }, () => true)] } };
    useProgress.setState({ byCert: { cisa: cert } });
    const read = restorable();
    if (read.kind !== 'ok') throw new Error(read.code);
    const back = read.data.progress.byCert.cisa;
    expect(back.milestones!.sure).toEqual(Array.from({ length: 50 }, () => true));
    expect(back.milestones!.myths).toHaveLength(25);
    expect(back.milestones!.myths![0].id).toBe('r15');
    expect(back.gameGrowth!.trap!.hits).toEqual(Array.from({ length: 30 }, () => true));
  });

  it('an old 1.1-shaped save (no new fields) exports and restores', () => {
    useProgress.setState({
      byCert: {
        cisa: {
          answers: { [ids[0]]: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: T0 } },
          review: {},
          bookmarks: [ids[1]],
          mocks: [{ id: 'mock-1', finishedAt: T0, total: 150, correct: 101, minutesUsed: 212, byDomain: { '1': { total: 27, correct: 19 } } }],
          lessonsDone: [],
          mistakes: {},
          gameBest: { trap: 8 },
        } as unknown as CertProgress,
      },
    });
    expect(restorable().kind).toBe('ok');
  });
});

// ── Mobile 1.40: the plant's style rides in backups, both ways ──────────────
describe('the plant style (look.style) in backups', () => {
  type FilePlant = { look?: Record<string, unknown> } & Record<string, unknown>;
  type File = { stores: { progress: { state: { byCert: { cisa: { plant?: FilePlant } } } } } };
  const plantBase = { species: 'oak' as const, name: 'Kai', plantedAt: T0 - 10 * DAY, growth: 3 as const };
  const setPhone = (plant: Record<string, unknown>, quietLook?: boolean) =>
    useProgress.setState({ byCert: { cisa: { ...randomCert(3), plant } as unknown as CertProgress }, plantSettings: quietLook === undefined ? {} : { quietLook } });
  const exported = (plant: Record<string, unknown>, quietLook?: boolean) => {
    setPhone(plant, quietLook);
    const read = restorable();
    if (read.kind !== 'ok') throw new Error(read.code);
    return read.data;
  };

  it('a file with look.style round-trips exactly', () => {
    for (const style of ['botanical', 'storybook', 'storybook-face']) {
      const back = exported({ ...plantBase, look: { style, colourway: 'oak-autumn' } }).progress.byCert.cisa.plant!;
      expect(back.look).toEqual({ style, colourway: 'oak-autumn' });
      expect(resolveStyle(back.look, undefined)).toBe(style);
    }
  });

  it('an old file without it restores, and the plant keeps its storybook art (the face, or none with Quiet look)', () => {
    const face = exported({ ...plantBase, look: { colourway: 'oak-autumn' } });
    expect(face.progress.byCert.cisa.plant!.look).toEqual({ colourway: 'oak-autumn' });
    expect(resolveStyle(face.progress.byCert.cisa.plant!.look, face.progress.plantSettings)).toBe('storybook-face');
    const quiet = exported({ ...plantBase }, true);
    expect(quiet.progress.byCert.cisa.plant!.look).toBeUndefined();
    expect(quiet.progress.plantSettings?.quietLook).toBe(true);
    expect(resolveStyle(quiet.progress.byCert.cisa.plant!.look, quiet.progress.plantSettings)).toBe('storybook');
  });

  it('a 1.40 file read the way an older build reads it (style unknown, so dropped) still restores', () => {
    setPhone({ ...plantBase, look: { style: 'botanical', ground: 'meadow' } });
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now()))) as File;
    const look = file.stores.progress.state.byCert.cisa.plant!.look!;
    expect(look).toEqual({ style: 'botanical', ground: 'meadow' });
    // An older checker has no `style`: obj() ignores the unknown key. Same as reading it without one.
    const { style: _dropped, ...older } = look;
    file.stores.progress.state.byCert.cisa.plant!.look = older;
    const read = checkBackupText(JSON.stringify(file));
    expect(read.kind).toBe('ok');
    // There the plant simply shows storybook until that phone updates: no refusal, no data loss.
    if (read.kind === 'ok') expect(resolveStyle(read.data.progress.byCert.cisa.plant!.look, undefined)).toBe('storybook-face');
  });

  it('a style that is an id of another slot is bad data (never silently another look)', () => {
    setPhone({ ...plantBase });
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now()))) as File;
    file.stores.progress.state.byCert.cisa.plant!.look = { style: 'meadow' };
    expect(checkBackupText(JSON.stringify(file)).kind).not.toBe('ok');
  });
});
