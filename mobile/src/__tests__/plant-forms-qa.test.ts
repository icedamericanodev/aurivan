/**
 * QA pass on mobile 1.50 plant forms (commits ee01f24, e79d77e, 521bfad,
 * cdadb99). Engine, data and logic only (copy and colours are being changed
 * in parallel and are out of scope here).
 *
 * Each bug was first written as a failing test (the behaviour we want); its
 * fix has landed, so each is now a plain `it`. The `it`s next to them pin the
 * set-up (so a test can't pass for the wrong reason) and the parts that
 * checked out. QA-150-2 became a product decision (owner, 29 Oct): the
 * recall gate applies to every style; only the forms ART is botanical-only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';
import { buildPlant } from '../components/plant/art';
import { AppState, type AppStateStatus } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { getCertification } from '../content/certifications';
import { getDomainQuestions } from '../content/loader';
import { afterAnswer, type AnswerEvent, type CertMilestones } from '../engine/milestones';
import { crossesForm, delayedRecalls, formMoment, RECALL_FORM_III } from '../engine/plantForms';
import { addDays } from '../engine/examDay';
import { growthBefore, growthFor, plantNew, PLANT_SPECIES, type CertPlant } from '../engine/plant';
import { dayKey } from '../engine/streak';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { carryPlantIdentity, checkPlant, plantFactsFor, plantFor, plantSubtopics, plantView } from '../lib/plant';
import { selectCert, useProgress, type CertProgress, type MockResult } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';
import { legacy } from '../../jest/legacyPlant';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const DAY = 86_400_000;
const cert = getCertification('cisa')!;
const cp = () => selectCert(useProgress.getState(), 'cisa');
const byDomain = (d: string) => getDomainQuestions('cisa', d);

function mock(total: number, at: number, extra: Partial<MockResult> = {}): MockResult {
  return { id: `m${at}-${total}`, finishedAt: at, total, correct: Math.round(total * 0.8), minutesUsed: 10, byDomain: {}, timing: 'standard', unanswered: 0, ...extra };
}
function setCert(patch: Record<string, unknown>) {
  const c = cp();
  useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: { ...c, ...patch } } }));
}
/** Clean, correct answers: `perDomain[i]` questions in domain i+1, all on one day. */
function answerClean(perDomain: number[], at = T0 - 20 * DAY) {
  perDomain.forEach((n, i) => {
    for (const q of byDomain(String(i + 1)).slice(0, n)) useProgress.getState().recordAnswer('cisa', q.id, true, undefined, { at });
  });
}
/**
 * Study that opens Crown under the 1.49 rules, with NO delayed recalls: what a
 * learner's saved data looks like when the Long Memory list is short (it only
 * started counting with Build F, and many learners never come back to a
 * question a week later). Every outline subtopic mastered on two days.
 */
function crownStudyWithoutRecalls() {
  answerClean([40, 40, 40, 40, 40]);
  const mastery: Record<string, { firstDay: string; masteredAt: string }> = {};
  for (const s of plantSubtopics('cisa').flat()) mastery[s] = { firstDay: '2026-09-01', masteredAt: '2026-09-03' };
  setCert({ mastery, mocks: [mock(50, T0 - DAY)] });
}
/** The growth the same data opens without the delayed-recall gate (the 1.49 rules, and the restore clamp's reading). */
const ungated = (c: CertProgress) => growthFor({ ...plantFactsFor('cisa', c, T0)!, recalled: undefined });
const gated = (c: CertProgress) => growthFor(plantFactsFor('cisa', c, T0)!);

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, plantSettings: undefined, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSeen.setState({ plantForms: {}, plantFinal: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2027-06-01' } });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── QA-150-1 · Major: restoring an older backup lowers the phone's plant on the recall gate ──
describe('QA-150-1: a restore that carries the phone plant never lowers it on the recall gate', () => {
  it('set-up: the study opens Crown under the 1.49 rules, but only Shoot with the recall gate', () => {
    crownStudyWithoutRecalls();
    expect(delayedRecalls(cp().milestones?.longIds)).toBe(0);
    expect(ungated(cp())).toBeGreaterThanOrEqual(5);
    expect(gated(cp())).toBe(3);
  });

  it('an older file with no plant: the phone plant keeps the growth this study gave it before 1.50', () => {
    crownStudyWithoutRecalls();
    const restored: CertProgress = { ...cp(), plant: undefined };
    const want = ungated(restored);
    // The phone's plant grew to Crown on 1.49 from exactly this study.
    const phone = plantNew('oak', 'Kai', T0 - 30 * DAY, want);
    const carried = carryPlantIdentity('cisa', restored, phone, T0)!;
    // Was: Shoot. carryPlantIdentity -> plantFactsFor passed `recalled`, so the
    // carried plant was regrown on the STRICT gate. Now it is read generously,
    // like a file that has a plant (bestCaseFacts has no `recalled`).
    expect(carried.growth).toBe(want);
  });

  it('a FRESH plant planted on 1.50 is gated on its history (real recall data, so honest)', () => {
    crownStudyWithoutRecalls();
    plantFor('cisa', 'oak', 'Kai', T0);
    expect(cp().plant!.growth).toBe(gated(cp()));
    expect(cp().plant!.growth).toBe(3);
  });
});

// ── QA-150-2 · decided: the recall gate applies to every style; the storybook keeps its six-growth art ──
describe('QA-150-2: a storybook plant (no forms) meets the same recall gate, and keeps its six-growth art', () => {
  it('growth means the same learning in every style: a storybook plant without recalls stays at Shoot', () => {
    crownStudyWithoutRecalls();
    // A plant saved before 1.40: no style, so it keeps the storybook art and has no forms.
    setCert({ plant: legacy(plantNew('oak', 'Kai', T0 - 30 * DAY, 3)) });
    expect(plantView(cert, cp(), undefined, dayKey(T0)).forms).toBe(false);
    checkPlant('cisa', T0);
    expect(cp().plant!.growth).toBe(gated(cp()));
    expect(cp().plant!.growth).toBe(3);
  });

  it('the storybook art is byte-identical to 1.49 (every species, growth, theme, face and detail level)', () => {
    const h = createHash('sha256');
    for (const species of PLANT_SPECIES)
      for (let stage = 1; stage <= 6; stage++)
        for (const theme of ['light', 'dark'] as const)
          for (const quietLook of [true, false])
            for (const lod of ['full', 'small'] as const) {
              const b = buildPlant({ species, stage, quietLook, theme, lod, drift: false, mood: 'idle' });
              h.update(JSON.stringify({ root: b.root, frame: b.frame }));
            }
    // Computed from the same loop at 4310a6f (mobile 1.49, before forms), 29 Oct 2026.
    expect(h.digest('hex')).toBe('4d086ba9cda66f23bc371d8a8f4e7dc0930ff45385abb49bb34b754a4a82f829');
  });
});

// ── QA-150-3 · Minor: "own" can't be chosen back over a file's look.final ──
describe('QA-150-3: the Form IV choice on this phone against a look.final from a newer app', () => {
  const elder = (final?: string): CertPlant =>
    ({ ...plantNew('oak', 'Kai', T0 - 60 * DAY, 6), look: { style: 'botanical', ...(final ? { final } : {}) } }) as CertPlant;
  const viewFinal = (p: CertPlant) => plantView(cert, { answers: {}, plant: p, milestones: undefined }, undefined, dayKey(T0), false, useSeen.getState().plantFinal?.cisa).final;

  it('a flavour chosen on this phone wins and shows', () => {
    useSeen.getState().setPlantFinal('cisa', 'coppice');
    expect(viewFinal(elder('moot'))).toBe('coppice');
  });

  it('choosing the line’s own final on the Look screen draws the own final', () => {
    // A newer app's backup wrote look.final = 'moot' into the plant.
    useSeen.getState().setPlantFinal('cisa', 'coppice');
    // The learner taps "Broadcrown Oak" (look-final-own).
    useSeen.getState().setPlantFinal('cisa', 'own');
    // Was: 'moot'. setPlantFinal('own') deleted the phone entry, so the view
    // fell back to plant.look.final. 'own' is now kept as a choice.
    expect(useSeen.getState().plantFinal?.cisa).toBe('own');
    expect(viewFinal(elder('moot'))).toBe('own');
  });
});

// ── QA-150-4 · Minor: a restore keeps the phone's stale Form IV choice over the file's ──
describe('QA-150-4: a restore and the phone-only Form IV choice (§8.10: default unless the file carries look.final)', () => {
  /** A real Elder (P1a's study, with the recalls) whose plant carries a newer app's look.final. */
  function elderFileWith(final: string) {
    answerClean([40, 40, 12, 40, 40]);
    const mastery: Record<string, { firstDay: string; masteredAt: string }> = {};
    for (const s of plantSubtopics('cisa').flat()) mastery[s] = { firstDay: '2026-09-01', masteredAt: '2026-09-03' };
    setCert({
      mastery,
      milestones: { ...(cp().milestones ?? { earned: {} }), longIds: Object.keys(cp().answers).slice(0, 40) },
      mocks: [mock(150, T0 - DAY)],
      moments: { ...(cp().moments ?? {}), readySeenAt: T0 - 2 * DAY },
      plant: { ...plantNew('oak', 'Kai', T0 - 60 * DAY, 6), look: { style: 'botanical', final } },
    });
    const read = checkBackupText(JSON.stringify(currentBackup(T0)));
    if (read.kind !== 'ok') throw new Error(read.code);
    return read.data;
  }

  it('set-up: the file restores as an Elder with its look.final', async () => {
    const data = elderFileWith('holdfast');
    expect(data.progress.byCert.cisa.plant).toMatchObject({ growth: 6, look: { final: 'holdfast' } });
    useProgress.setState({ byCert: {} });
    await restoreBackup(data, { fresh: true });
    expect(cp().plant).toMatchObject({ growth: 6, look: { final: 'holdfast' } });
  });

  it('the file’s look.final shows after the restore, not the choice this phone made earlier', async () => {
    const data = elderFileWith('holdfast');
    useSeen.getState().setPlantFinal('cisa', 'coppice'); // chosen on this phone before the restore
    useProgress.setState({ byCert: {} });
    await restoreBackup(data, { fresh: true });
    // Was: 'coppice'. writeAll now forgets plantFinal too, so the file decides.
    expect(plantView(cert, cp(), undefined, dayKey(T0), false, useSeen.getState().plantFinal?.cisa).final).toBe('holdfast');
  });
});

// ── QA-150-5 · Minor: an unshown growth waiting at the update plays as history ──
describe('QA-150-5: a pending grow-up that crosses a form when 1.50 arrives', () => {
  /** Saved by 1.49: grew to Shoot yesterday, and Today hasn't shown it yet. */
  const waiting = (): CertPlant => ({ species: 'oak', name: 'Kai', plantedAt: T0 - 30 * DAY, growth: 3, reached: { sprout: T0 - 20 * DAY, shoot: T0 - DAY }, pending: 3, look: { style: 'botanical' } });

  it('set-up: Today will say "It grows into a new form: see it in Your plant"', () => {
    const p = waiting();
    expect(crossesForm(growthBefore(p, 3), 3)).toBe(true);
  });

  it('Your plant then plays the reveal for it (it was earned and never shown), not the quiet history note', () => {
    setCert({ plant: waiting() });
    checkPlant('cisa', T0); // Today's first check on 1.50
    // Was: { kind: 'note', form: 2 }. The baseline now reads the growth BEFORE
    // the unshown `pending`, so the earned moment keeps its reveal.
    expect(formMoment(3, useSeen.getState().plantForms?.cisa)).toEqual({ kind: 'reveal', from: 1, to: 2 });
  });
});

// ── Delayed-recall counting: the edges (all pass) ──
describe('delayed recall: edges', () => {
  const ev = (questionId: string, at: number, prevLastAt: number | undefined, o: Partial<AnswerEvent> = {}): AnswerEvent => ({ questionId, correct: true, assisted: false, game: false, at, prevLastAt, graduated: false, ...o });
  const run = (events: AnswerEvent[]) => events.reduce<CertMilestones | undefined>((m, e) => afterAnswer(m, e).milestones, undefined);

  it('exactly 7 × 24 h counts; one millisecond less does not', () => {
    expect(delayedRecalls(run([ev('a', T0 + 7 * DAY, T0)])?.longIds)).toBe(1);
    expect(delayedRecalls(run([ev('a', T0 + 7 * DAY - 1, T0)])?.longIds)).toBe(0);
  });

  it('on the store: a retest after a miss, a Coach me answer and a game answer never count; a game answer restarts the week', () => {
    const [q1, q2, q3, q4] = byDomain('1').slice(0, 4).map((q) => q.id);
    const rec = (id: string, ok: boolean, at: number, o: Record<string, unknown> = {}) => useProgress.getState().recordAnswer('cisa', id, ok, undefined, { at, ...o });
    for (const id of [q1, q2, q3, q4]) rec(id, true, T0);
    rec(q1, true, T0 + 8 * DAY, { assisted: true }); // Coach me
    rec(q2, false, T0 + 8 * DAY); // a miss…
    rec(q2, true, T0 + 8 * DAY + 60_000); // …then the retest minutes later
    rec(q3, true, T0 + 6 * DAY, { mastery: false }); // a game answer on day 6…
    rec(q3, true, T0 + 9 * DAY); // …so day 9 is only 3 days after it was last seen
    rec(q4, true, T0 + 8 * DAY); // the one honest delayed recall
    expect(cp().milestones?.longIds).toEqual([q4]);
  });

  it('the gate needs unique questions: one question recalled 15 times is one recall', () => {
    let m: CertMilestones | undefined;
    for (let k = 1; k <= RECALL_FORM_III; k++) m = afterAnswer(m, ev('same', T0 + k * 8 * DAY, T0 + (k - 1) * 8 * DAY)).milestones;
    expect(delayedRecalls(m?.longIds)).toBe(1);
  });
});

// ── The Form IV choice across a cert switch (passes) ──
it('the Form IV choice is per exam: another exam’s Elder keeps its own final', () => {
  useSeen.getState().setPlantFinal('cisa', 'moot');
  expect(useSeen.getState().plantFinal).toEqual({ cisa: 'moot' });
  const cc = getCertification('cc') ?? cert;
  const p = { ...plantNew('pine', 'Ari', T0 - 60 * DAY, 6), look: { style: 'botanical' } } as CertPlant;
  expect(plantView(cc, { answers: {}, plant: p, milestones: undefined }, undefined, dayKey(T0), false, useSeen.getState().plantFinal?.[cc.id]).final).toBe(cc.id === 'cisa' ? 'moot' : 'own');
});

// ── QA-150-6 · Minor: the widget doesn't redraw when the learner picks a final ──
describe('QA-150-6: Android widget and the Form IV choice', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const android = require('../lib/widgets.android') as typeof import('../lib/widgets.android');
  const NOW = new Date(2026, 9, 29, 9, 0).getTime();
  const settle = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };

  it('choosing a final redraws the plant widget (the snapshot carries the new final)', async () => {
    jest.useFakeTimers({ now: NOW });
    await AsyncStorage.clear();
    android.resetWidgetsForTest();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, _fn: (s: AppStateStatus) => void) => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>);
    useSettings.setState(useSettings.getInitialState(), true);
    useProgress.setState(useProgress.getInitialState(), true);
    useWidgetStore.setState(useWidgetStore.getInitialState(), true);
    useSettings.getState().completeOnboarding('cisa', addDays(dayKey(NOW), 40), { familiarity: 'some', dailyMinutes: 20 });
    useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'sure');
    setCert({ plant: { ...plantNew('oak', 'Kai', NOW - 60 * DAY, 6), look: { style: 'botanical' } } });
    const stop = android.startWidgetSync();
    await jest.advanceTimersByTimeAsync(3000);
    (requestWidgetUpdate as jest.Mock).mockClear();

    useSeen.getState().setPlantFinal('cisa', 'moot'); // the Look screen's "Moot Oak"
    await jest.advanceTimersByTimeAsync(3000);
    await settle();
    // Was: no redraw. startWidgetSync now also listens for useSeen's plantFinal.
    expect((requestWidgetUpdate as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const snap = JSON.parse((await AsyncStorage.getItem('aurivan.widget.v1')) ?? '{}') as { plant?: { final?: string } };
    expect(snap.plant?.final).toBe('moot');
    stop();
  });
});
