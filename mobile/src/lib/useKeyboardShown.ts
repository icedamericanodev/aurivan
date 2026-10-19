/**
 * True while the on-screen keyboard is up (UX review H2). Screens with a
 * sticky footer hide it then, so the footer never sits on top of the field
 * being typed in. iOS reports the keyboard as it starts to move; Android
 * only once it is shown.
 *
 * useKeyboardHeight: the keyboard's height in points (0 when it is down).
 * Bottom sheets subtract it from their tallest size, so their header ("Done")
 * and their last control stay on screen above the keyboard.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setHeight(Math.max(0, e?.endCoordinates?.height ?? 0)));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
