/**
 * Runs before every test file (package.json → jest.setupFiles).
 * One shared Reanimated mock for the whole suite: see jest/reanimated-mock.ts.
 */
// jest.mock factories can't use `import`: they run lazily, when the module is first required.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('./reanimated-mock'));
