/**
 * Runs in every test file's environment, before its tests
 * (package.json → jest.setupFilesAfterEnv).
 */
import { cancelA11yTimersForTest, setScreenReaderForTest } from '../src/lib/a11y';
import { cancelSheetWaitsForTest } from '../src/lib/sheetWait';
import { setMockHoldAnimations } from './reanimated-mock';

// The screen reader starts known and off in every test (React Native's own mock answers "off"
// too, but only asynchronously). A test turns it on with setScreenReaderForTest(true).
beforeEach(() => {
  setScreenReaderForTest(false);
});

// A focus move or announcement still waiting for its pause (lib/a11y.ts:
// moveFocus, sayLater, the backup messages) must not fire after its test has
// ended. Fired after the FILE ended, it reaches into a torn-down environment
// and the error lands on whichever file the worker runs next (the
// new-games.test.ts "failed suite with no failing test"). After each test,
// and once more after the file's own hooks (an unmount can schedule one).
// The same for a sheet row's action waiting for its sheet to go (lib/sheetWait.ts).
afterEach(() => {
  setMockHoldAnimations(false);
  cancelA11yTimersForTest();
  cancelSheetWaitsForTest();
});
afterAll(() => {
  cancelA11yTimersForTest();
  cancelSheetWaitsForTest();
});
