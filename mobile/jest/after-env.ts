/**
 * Runs in every test file's environment, before its tests
 * (package.json → jest.setupFilesAfterEnv).
 */
import { cancelA11yTimersForTest } from '../src/lib/a11y';

// A focus move or announcement still waiting for its pause (lib/a11y.ts:
// moveFocus, sayLater, the backup messages) must not fire after its test has
// ended. Fired after the FILE ended, it reaches into a torn-down environment
// and the error lands on whichever file the worker runs next (the
// new-games.test.ts "failed suite with no failing test"). After each test,
// and once more after the file's own hooks (an unmount can schedule one).
afterEach(() => {
  cancelA11yTimersForTest();
});
afterAll(() => {
  cancelA11yTimersForTest();
});
