/**
 * Perf harness: counts which components React actually RE-RENDERED in each
 * commit, per <Profiler id> subtree (one per tab screen).
 *
 * Plain English: React DevTools learns about every commit through a global
 * "hook". We turn jest-expo's disabled stand-in into a tiny working one, so
 * after each commit we can walk the component tree and count the components
 * whose function ran (React marks them "PerformedWork"). A subtree React
 * skipped (its children are the very same objects as last time) is not
 * walked, so nothing that didn't render is counted.
 *
 * MUST be imported before react-test-renderer (React reads the hook once,
 * when the renderer module loads).
 */
type Fiber = {
  tag: number;
  flags: number;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
  memoizedProps: { id?: string } | null;
  type: unknown;
  elementType: unknown;
};

// React's work tags for components whose own code runs on a render.
const COMPOSITE = new Set([0, 1, 11, 14, 15]); // function, class, forwardRef, memo, simple memo
const PROFILER = 12;
const PERFORMED_WORK = 1;

/** Renders per profiler id since the last reset (components whose function ran). */
let counts: Record<string, number> = {};
/** Component names that rendered, per profiler id (only while `trackNames` is on). */
let names: Record<string, Record<string, number>> = {};
let trackNames = false;

function nameOf(f: Fiber): string {
  const t = (f.elementType ?? f.type) as { displayName?: string; name?: string; type?: { displayName?: string; name?: string }; render?: { displayName?: string; name?: string } } | null;
  if (!t) return '?';
  return t.displayName ?? t.name ?? t.type?.displayName ?? t.type?.name ?? t.render?.displayName ?? t.render?.name ?? 'anonymous';
}

function note(tab: string, f: Fiber) {
  counts[tab] = (counts[tab] ?? 0) + 1;
  if (trackNames) {
    const byTab = (names[tab] ??= {});
    const n = nameOf(f);
    byTab[n] = (byTab[n] ?? 0) + 1;
  }
}

/** Walks the committed tree; `prev` is the fiber's previous version (null = new). */
function walk(f: Fiber | null, tab: string, mounting: boolean) {
  for (let n = f; n; n = n.sibling) {
    const prev = n.alternate;
    const isNew = mounting || prev === null;
    const here = n.tag === PROFILER && n.memoizedProps?.id ? n.memoizedProps.id : tab;
    if (COMPOSITE.has(n.tag) && (isNew || (n.flags & PERFORMED_WORK) !== 0)) note(here, n);
    // Same child list as last time: React skipped this whole subtree.
    if (!isNew && prev && n.child === prev.child) continue;
    walk(n.child, here, isNew);
  }
}

const g = globalThis as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, unknown> };
const hook = (g.__REACT_DEVTOOLS_GLOBAL_HOOK__ ??= {});
Object.assign(hook, {
  isDisabled: false,
  supportsFiber: true,
  inject: () => 1,
  checkDCE: () => {},
  onScheduleFiberRoot: () => {},
  onCommitFiberUnmount: () => {},
  onPostCommitFiberRoot: () => {},
  onCommitFiberRoot: (_id: number, root: { current: Fiber }) => {
    const cur = root.current;
    const prev = cur.alternate;
    walk(cur.child, '(root)', prev === null || prev.child === null);
  },
});

export function resetRenders(opts: { names?: boolean } = {}) {
  counts = {};
  names = {};
  trackNames = !!opts.names;
}
export function renders(): Record<string, number> {
  return { ...counts };
}
export function renderNames(): Record<string, Record<string, number>> {
  return names;
}
