/**
 * Perf harness: a stand-in for expo-router whose screens can gain and lose
 * focus like the real tab navigator, where all visited tabs stay mounted.
 *
 * Faithful to React Navigation on the points that matter for re-renders:
 * - `useFocusEffect` runs its callback on focus and its cleanup on blur,
 *   through a subscription (it never re-renders the screen by itself);
 * - `useIsFocused` re-renders its component when focus changes;
 * - a screen outside any <FocusScope> counts as focused (a pushed screen).
 *
 * Use it from a test with:
 *   jest.mock('expo-router', () => require('../../jest/perf/focusRouter').routerMock());
 */
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';

type Listener = { on: () => void; off: () => void };
export class FocusEmitter {
  focused: boolean;
  private effects = new Set<Listener>();
  private subs = new Set<() => void>();
  constructor(focused = false) {
    this.focused = focused;
  }
  addEffect(l: Listener) {
    this.effects.add(l);
    return () => this.effects.delete(l);
  }
  subscribe = (cb: () => void) => {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  };
  /**
   * React Navigation 7, in two steps like the real thing:
   * 1. the navigation state changes and the screen's IsFocusedContext with it
   *    (`useIsFocused` re-renders in that same commit);
   * 2. after that commit, the focus / blur events fire (`useFocusEffect`).
   * Call `set` (both at once) or `setContext` then `fireEvents` from separate act()s.
   */
  set(focused: boolean) {
    this.setContext(focused);
    this.fireEvents();
  }
  private eventsFor: boolean | null = null;
  setContext(focused: boolean) {
    if (this.focused === focused) return;
    this.focused = focused;
    this.eventsFor = focused;
    for (const s of [...this.subs]) s();
  }
  fireEvents() {
    if (this.eventsFor === null) return;
    const focused = this.eventsFor;
    this.eventsFor = null;
    for (const l of [...this.effects]) (focused ? l.on : l.off)();
  }
}

const Ctx = createContext<FocusEmitter | null>(null);
export function FocusScope({ emitter, children }: { emitter: FocusEmitter; children: ReactNode }) {
  return <Ctx.Provider value={emitter}>{children}</Ctx.Provider>;
}

function useFocusEffect(cb: () => void | (() => void)) {
  const em = useContext(Ctx);
  useEffect(() => {
    // Like React Navigation: never runs twice in a row for one focus.
    let active = false;
    let cleanup: void | (() => void);
    const on = () => {
      if (active) return;
      active = true;
      cleanup = cb();
    };
    const off = () => {
      if (!active) return;
      active = false;
      if (typeof cleanup === 'function') cleanup();
      cleanup = undefined;
    };
    if (!em) {
      on();
      return off;
    }
    if (em.focused) on();
    const remove = em.addEffect({ on, off });
    return () => {
      remove();
      off();
    };
  }, [cb, em]);
}

const always = () => () => {};
function useIsFocused(): boolean {
  const em = useContext(Ctx);
  return useSyncExternalStore(em ? em.subscribe : always, () => (em ? em.focused : true));
}

/** What screens asked of the router. `setParams` counts both kinds; `routerSetParams` only `router.setParams` (it acts on the FOCUSED screen). */
export const routerCalls = { push: [] as unknown[], setParams: 0, routerSetParams: 0 };
/** The route params every screen reads (tests set them). */
export const routeParams: Record<string, string | undefined> = {};

// A screen's own navigation object: its setParams changes only that screen's params.
const navigationStub = {
  setParams: (p: Record<string, string | undefined>) => {
    routerCalls.setParams++;
    Object.assign(routeParams, p);
  },
  isFocused: () => true,
  addListener: () => () => {},
};

export function routerMock() {
  return {
    __esModule: true,
    router: {
      push: (to: unknown) => routerCalls.push.push(to),
      replace: () => {},
      back: () => {},
      navigate: () => {},
      setParams: () => {
        routerCalls.setParams++;
        routerCalls.routerSetParams++;
      },
      canGoBack: () => true,
      canDismiss: () => false,
      dismiss: () => {},
    },
    useFocusEffect,
    useIsFocused,
    useLocalSearchParams: () => routeParams,
    useNavigation: () => navigationStub,
    useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {} }),
    Link: ({ children }: { children: ReactNode }) => children,
  };
}
