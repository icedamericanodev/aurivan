/**
 * Runs in every test file's environment, before its tests
 * (package.json → jest.setupFilesAfterEnv).
 */
import { cancelSayLaterForTest } from '../src/lib/a11y';

// An announcement still waiting for its pause (lib/a11y.ts sayLater) must not
// fire after its test has ended: it would reach into a torn-down environment.
afterEach(() => {
  cancelSayLaterForTest();
});
