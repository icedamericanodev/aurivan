/**
 * The screen-reader helpers' timers never outlive a test (lib/a11y.ts).
 *
 * Root cause of the new-games.test.ts flake (a suite reported "failed" with
 * every test passing): a focus move or backup announcement left waiting by
 * one test file fired while the NEXT file ran in the same Jest worker. Its
 * callback read react-native's lazy exports after its own environment was
 * torn down, Jest refused the require, and the TypeError was blamed on the
 * other file. Now every helper timer is tracked, and jest/after-env.ts
 * cancels what is still waiting after each test and each file.
 *
 * The two tests below run in order: the first leaves timers waiting on
 * purpose, the second checks the shared after-each hook cancelled them.
 */
import { AccessibilityInfo, Platform } from 'react-native';
import { a11yTimersWaitingForTest, cancelA11yTimersForTest, flushSayLaterForTest, moveFocus, sayLater } from '../lib/a11y';
import { announce } from '../lib/useRestoreFlow';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('a11y timers are tracked and cancelled', () => {
  it('a focus move, an announcement and a backup message all wait on tracked timers', () => {
    moveFocus({ current: { a: 'fake native node' } }, 300);
    sayLater('Hidden.');
    announce('Restored. Your progress from the backup is on this phone now.');
    expect(a11yTimersWaitingForTest()).toBe(3);
  });

  it('…and nothing from the test before is still waiting (jest/after-env.ts)', () => {
    expect(a11yTimersWaitingForTest()).toBe(0);
  });

  it('they still do their job when they fire: focus, then speech (queued on iOS for the backup message)', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const queued = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
    try {
      sayLater('Hidden.');
      announce('Restored.');
      jest.advanceTimersByTime(600);
      expect(said).toHaveBeenCalledWith('Hidden.');
      if (Platform.OS === 'ios') expect(queued).toHaveBeenCalledWith('Restored.', { queue: true });
      else expect(said).toHaveBeenCalledWith('Restored.');
      expect(a11yTimersWaitingForTest()).toBe(0);
      // A focus move on a ref with nothing mounted is a quiet no-op.
      moveFocus({ current: null }, 10);
      jest.advanceTimersByTime(10);
      expect(focus).not.toHaveBeenCalled();
    } finally {
      focus.mockRestore();
      said.mockRestore();
      queued.mockRestore();
      jest.useRealTimers();
    }
  });

  it('flushing says what was waiting and leaves nothing behind; cancelling drops it all', () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    try {
      sayLater('One.');
      moveFocus({ current: null });
      flushSayLaterForTest();
      expect(said).toHaveBeenCalledWith('One.');
      // The focus move is still waiting (flush only says things).
      expect(a11yTimersWaitingForTest()).toBe(1);
      cancelA11yTimersForTest();
      expect(a11yTimersWaitingForTest()).toBe(0);
    } finally {
      said.mockRestore();
    }
  });
});
