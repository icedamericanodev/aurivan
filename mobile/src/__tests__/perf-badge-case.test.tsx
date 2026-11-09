/**
 * Release bug hunt round 3: the badge case (You → badges) on a large save.
 * - Opening it drew the whole case twice (a timer set state right after the first draw): now once.
 * - Left open under a "Study for this" session or drill, every answer rebuilt every badge and redrew
 *   the hidden case (about 670 components and a full badgeCase() per Check answer). Now a covered
 *   case is held still, and it reads the live progress once when it is back in view.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts) and commits, never milliseconds.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FocusEmitter, FocusScope } from '../../jest/perf/focusRouter';
import { buildHeavySave } from '../../jest/perf/heavySave';
import Badges from '../app/milestones';
import { getAllQuestions } from '../content/loader';
import * as milestones from '../lib/milestones';
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
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

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

const open = () => {
  em.set(true);
  commits = 0;
  act(() => {
    r = create(
      <FocusScope emitter={em}>
        <Profiler id="case" onRender={() => commits++}>
          <Badges />
        </Profiler>
      </FocusScope>,
    );
  });
  act(() => {
    jest.runOnlyPendingTimers();
  });
};

describe('the badge case on a large save', () => {
  it('draws once when it opens', () => {
    open();
    expect(commits).toBe(1);
  });

  it('covered by a session: an answer redraws nothing and rebuilds no badge; back in view it rebuilds once', () => {
    open();
    act(() => {
      em.set(false); // "Study for this" pushed a session on top
    });
    const spy = jest.spyOn(milestones, 'badgeCase');
    resetRenders();
    commits = 0;
    const ids = getAllQuestions('cisa').slice(0, 4).map((q) => q.id);
    for (const id of ids) {
      act(() => {
        useProgress.getState().recordAnswer('cisa', id, false, 'sure');
      });
    }
    expect(renders().case ?? 0).toBe(0);
    expect(commits).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    // The answers were saved all the same.
    for (const id of ids) expect(selectCert(useProgress.getState(), 'cisa').answers[id]).toBeDefined();
    act(() => {
      em.set(true);
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
