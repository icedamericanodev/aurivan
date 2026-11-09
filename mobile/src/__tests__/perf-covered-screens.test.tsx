/**
 * Release bug hunt round 4: screens left open under a quiz or the Look screen.
 * The Readiness report, the Question bank lists and Your plant stay mounted under a pushed
 * session (or the Look screen). On a large save, each answer redrew hundreds of their components
 * although nobody could see them. Like the badge case (round 3), a covered screen is now held
 * still, and it reads the live progress again when it is back in view.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts) and commits, never milliseconds.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler, type ReactElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { FocusEmitter, FocusScope, routeParams } from '../../jest/perf/focusRouter';
import { buildHeavySave } from '../../jest/perf/heavySave';
import BankDomain from '../app/bank/[domain]';
import BankDomains from '../app/bank/index';

import ReadinessReport from '../app/readiness';
import { getAllQuestions } from '../content/loader';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('expo-router', () => require('../../jest/perf/focusRouter').routerMock());
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {}, warning: () => {} } }));

let r: ReactTestRenderer | undefined;
let commits = 0;
const em = new FocusEmitter(true);

beforeAll(() => {
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true } as never);
  act(() => {
    buildHeavySave(Date.now(), 200);
  });
});
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const open = (el: ReactElement) => {
  em.set(true);
  commits = 0;
  act(() => {
    r = create(
      <FocusScope emitter={em}>
        <Profiler id="covered" onRender={() => commits++}>
          {el}
        </Profiler>
      </FocusScope>,
    );
  });
  act(() => {
    jest.runOnlyPendingTimers();
  });
};
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};

let next = 0;
/** Questions this test file has not answered yet (each answer must change progress). */
const fresh = (n: number) => {
  const all = getAllQuestions('cisa').filter((q) => !selectCert(useProgress.getState(), 'cisa').answers[q.id]);
  const out = all.slice(next, next + n).map((q) => q.id);
  next += n;
  return out;
};

/** The answers the Readiness report counts ("Based on N answers", summed over the domains). */
const basedOn = (t: string) => [...t.matchAll(/Based on (\d+) answers/g)].reduce((n, m) => n + Number(m[1]), 0);

/**
 * [name, screen, how "back in view" is checked]. 'fresh': the same words as a fresh open (the bank
 * lists). 'answers': the report counts the new answers. 'drawn': it redraws (Your plant shows a
 * one-time welcome line on a fresh open, so its words differ on purpose).
 */
type Check = 'fresh' | 'answers' | 'drawn';
const cases: [string, () => ReactElement, Check, (() => void)?][] = [
  ['the Readiness report', () => <ReadinessReport />, 'answers'],
  ['the Question bank index', () => <BankDomains />, 'fresh'],
  ['a Question bank domain list', () => <BankDomain />, 'fresh', () => Object.assign(routeParams, { domain: '4' })],
];

describe.each(cases)('%s on a large save', (_name, el, check, setup) => {
  it('covered: an answer redraws nothing; back in view it reads the live progress again', () => {
    setup?.();
    open(el());
    const before = allText();
    act(() => {
      em.set(false); // a session (or the Look screen) pushed on top
    });
    resetRenders();
    commits = 0;
    const ids = fresh(3);
    for (const id of ids) {
      act(() => {
        useProgress.getState().recordAnswer('cisa', id, false, 'sure');
      });
    }
    expect(renders().covered ?? 0).toBe(0);
    expect(commits).toBe(0);
    for (const id of ids) expect(selectCert(useProgress.getState(), 'cisa').answers[id]).toBeDefined();
    // Back in view: it draws again from the live store.
    act(() => {
      em.set(true);
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(commits).toBeGreaterThan(0);
    const back = allText();
    if (check === 'answers') expect(basedOn(back)).toBe(basedOn(before) + ids.length);
    if (check === 'fresh') {
      // It shows what a fresh open shows now (the live progress, answers included).
      act(() => r!.unmount());
      open(el());
      expect(back).toBe(allText());
    }
  });
});
