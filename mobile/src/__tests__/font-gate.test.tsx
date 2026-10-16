/**
 * Mobile 1.24.1: the start-up never waits for ever on the font files
 * (a blank white screen on the emulator when they never finished loading).
 */
import { act, create } from 'react-test-renderer';
import { FONT_TIMEOUT_MS, useFontsSettled } from '../lib/fontGate';

let seen: boolean[] = [];
function Probe({ loaded, error }: { loaded: boolean; error?: Error | null }) {
  seen.push(useFontsSettled(loaded, error ?? null));
  return null;
}
const last = () => seen[seen.length - 1];

describe('useFontsSettled', () => {
  beforeEach(() => {
    seen = [];
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('is settled at once when the fonts loaded or failed', () => {
    act(() => {
      create(<Probe loaded />);
    });
    expect(last()).toBe(true);
    act(() => {
      create(<Probe loaded={false} error={new Error('x')} />);
    });
    expect(last()).toBe(true);
  });

  it('gives up waiting after the timeout, with a warning in the developer log', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    act(() => {
      create(<Probe loaded={false} />);
    });
    expect(last()).toBe(false);
    act(() => {
      jest.advanceTimersByTime(FONT_TIMEOUT_MS - 1);
    });
    expect(last()).toBe(false);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(last()).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('system font'));
    warn.mockRestore();
  });

  it('never fires the timeout once the fonts arrive in time', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let r: ReturnType<typeof create>;
    act(() => {
      r = create(<Probe loaded={false} />);
    });
    act(() => {
      r.update(<Probe loaded />);
    });
    act(() => {
      jest.advanceTimersByTime(FONT_TIMEOUT_MS * 2);
    });
    expect(last()).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
