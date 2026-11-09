/**
 * Polish round 1: react-native-web's AccessibilityInfo.isScreenReaderEnabled()
 * always answers true, so on the web build every celebration (the Turning)
 * took its Reduce Motion path. The web counts the screen reader as off, never
 * asks and never listens; phones still ask the phone.
 */
import { AccessibilityInfo, Platform } from 'react-native';
import { screenReaderOn, setScreenReaderForTest, watchScreenReader, whenScreenReaderKnown } from '../lib/a11y';

const was = Platform.OS;
afterEach(() => {
  Platform.OS = was;
  setScreenReaderForTest(null);
  jest.restoreAllMocks();
});

describe('the screen reader question on the web build', () => {
  it('web: off from the start, never asked, no listener', async () => {
    const ask = jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    const listen = jest.spyOn(AccessibilityInfo, 'addEventListener');
    Platform.OS = 'web';
    expect(screenReaderOn()).toBe(false);
    watchScreenReader();
    await expect(whenScreenReaderKnown()).resolves.toBe(false);
    expect(screenReaderOn()).toBe(false);
    expect(ask).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it('a phone still asks, and follows the answer', async () => {
    const ask = jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    Platform.OS = 'ios';
    setScreenReaderForTest(null); // the test setup may have set an answer already
    expect(screenReaderOn()).toBeNull();
    await expect(whenScreenReaderKnown()).resolves.toBe(true);
    expect(ask).toHaveBeenCalled();
    expect(screenReaderOn()).toBe(true);
  });
});
