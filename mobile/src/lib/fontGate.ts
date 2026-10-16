/**
 * "Never wait forever for the fonts" (mobile 1.24.1).
 *
 * Plain English: the app's two typefaces (Fraunces and Figtree) load as files
 * when it starts. Normally that takes a moment. If they never finish loading
 * (for example the development server's file link is unreachable from the
 * emulator), the old start-up waited for them for ever and showed a blank
 * white screen. Now, after FONT_TIMEOUT_MS, the app carries on with the
 * phone's own font instead, and says so in the developer log.
 */
import { useEffect, useState } from 'react';

/** How long the start-up waits for the font files before using the phone's own font. */
export const FONT_TIMEOUT_MS = 5000;

/** True once the fonts loaded, failed, or took longer than FONT_TIMEOUT_MS. */
export function useFontsSettled(loaded: boolean, error: Error | null | undefined): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const settled = loaded || Boolean(error);
  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => {
      // Shown in the Metro terminal during development; harmless in a store build.
      console.warn(`Fonts did not load within ${FONT_TIMEOUT_MS / 1000} s: continuing with the system font.`);
      setTimedOut(true);
    }, FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [settled]);
  return settled || timedOut;
}
