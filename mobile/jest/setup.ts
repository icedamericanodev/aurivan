/**
 * Runs before every test file (package.json → jest.setupFiles).
 * One shared Reanimated mock for the whole suite: see jest/reanimated-mock.ts.
 */
import { AccessibilityInfo } from 'react-native';
import { isMockReducedMotion } from './reanimated-mock';

// jest.mock factories can't use `import`: they run lazily, when the module is first required.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('./reanimated-mock'));

// The phone's Reduce Motion, as React Native reports it, agrees with the mock
// above. components/motion.tsx re-checks it whenever the app comes back to
// the foreground; React Native's own jest mock would always answer "off".
AccessibilityInfo.isReduceMotionEnabled = () => Promise.resolve(isMockReducedMotion());

// Mobile 1.46: the home-screen widget library has a native part Jest doesn't have. Its layout
// primitives and tree builder are plain JavaScript (kept real, so layout tests build the true tree);
// everything that would talk to Android is a mock.
jest.mock('react-native-android-widget', () => {
  const actual = jest.requireActual('react-native-android-widget');
  return {
    ...actual,
    requestWidgetUpdate: jest.fn(async () => {}),
    requestWidgetUpdateById: jest.fn(async () => {}),
    getWidgetInfo: jest.fn(async () => []),
    requestPinWidget: jest.fn(async () => false),
    registerWidgetTaskHandler: jest.fn(),
    registerWidgetConfigurationScreen: jest.fn(),
  };
});
