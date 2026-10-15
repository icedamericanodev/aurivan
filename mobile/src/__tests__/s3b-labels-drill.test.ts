/**
 * Mobile 1.24, stream S3b (pure parts): the "IS auditor's lens" label and
 * Today's drill.
 *
 * Plain English for the founder:
 * - The label "How ISACA thinks" became "The IS auditor’s lens" everywhere.
 *   One shared constant (COACH_HEADING in components/lesson.tsx) is what the
 *   lesson screens compare against, so this test makes sure the lesson data
 *   and the constant can never drift apart, and the old words are gone.
 * - Play leads with the game that drills the learner's own mistake pattern
 *   (engine/games/todaysDrill.ts), shows three games, and folds the rest.
 */
import { COACH_HEADING, sceneKicker } from '../components/lesson';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { GAME_ORDER, GAMES, type GameId } from '../engine/games/registry';
import { DEFAULT_DRILL, drillPlan, RELATED, SHOWN_GAMES } from '../engine/games/todaysDrill';
import { PATTERN_COPY } from '../engine/slipCoach';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

describe('"The IS auditor’s lens" (replaces "How ISACA thinks")', () => {
  it('is one shared constant, with the typographic apostrophe', () => {
    expect(COACH_HEADING).toBe('The IS auditor’s lens');
  });

  it('every lesson that has the coach scene uses exactly the constant, and the old name is gone', () => {
    const headings = CISA_LESSONS.flatMap((l) => l.scenes).flatMap((s) => ('heading' in s ? [s.heading] : []));
    expect(headings.filter((h) => h === COACH_HEADING).length).toBeGreaterThan(30);
    expect(headings.filter((h) => /isaca thinks/i.test(h))).toEqual([]);
    // No scene text speaks in ISACA's voice about "how ISACA thinks".
    expect(JSON.stringify(CISA_LESSONS)).not.toMatch(/how isaca thinks/i);
    expect(JSON.stringify(CISA_LESSONS)).not.toMatch(/ISACA calls this/);
  });

  it('the scene kicker shows the constant for the coach scene and "The idea" for others', () => {
    expect(sceneKicker({ type: 'idea', heading: COACH_HEADING, body: 'x' })).toBe(COACH_HEADING);
    expect(sceneKicker({ type: 'idea', heading: 'Why it matters', body: 'x' })).toBe('The idea');
  });

  it('cites ITAF standards under one label (numbers unchanged)', () => {
    const text = JSON.stringify(CISA_LESSONS);
    expect(text).not.toContain('ISACA IT Audit Standard');
    expect(text).toContain('ITAF Standard 1201 (Risk Assessment in Planning)');
    expect(text).toContain('ITAF Standard 1207 (Irregularity and Illegal Acts)');
    expect(text).toContain('ITAF Standard 1402 (Follow-up Activities)');
  });
});

describe('every game has a plain subtitle', () => {
  it('a short, plain line that does not repeat the game name', () => {
    expect(GAME_ORDER).toHaveLength(9); // frozen at nine games
    for (const id of GAME_ORDER) {
      const g = GAMES[id];
      expect(g.plain.length).toBeGreaterThan(8);
      expect(g.plain.length).toBeLessThan(40);
      expect(g.plain.toLowerCase()).not.toContain(g.name.toLowerCase());
    }
    expect(GAMES.trap.plain).toBe('Spot the trick answer');
  });
});

describe("Today's drill", () => {
  const all = GAME_ORDER as GameId[];

  it('every game has two related games, none of them itself', () => {
    for (const id of all) {
      expect(RELATED[id]).toHaveLength(2);
      expect(RELATED[id]).not.toContain(id);
    }
  });

  it('leads with the game the learner’s pattern names, then two related, then the other six', () => {
    const plan = drillPlan('priority', all);
    expect(plan.drill).toBe('priority');
    expect(plan.fromPattern).toBe(true);
    expect(plan.also).toEqual(['trap', 'callit']);
    expect(plan.more).toHaveLength(all.length - SHOWN_GAMES);
    // Together they are every game once, nothing lost.
    expect([plan.drill, ...plan.also, ...plan.more].sort()).toEqual([...all].sort());
  });

  it('every pattern with a drill game picks that game', () => {
    for (const copy of Object.values(PATTERN_COPY)) {
      if (copy.game) expect(drillPlan(copy.game, all).drill).toBe(copy.game);
    }
  });

  it('with no pattern (a new learner) leads with Snare Spotter and says it is not from a pattern', () => {
    for (const none of [null, undefined as unknown as null]) {
      const plan = drillPlan(none, all);
      expect(plan.drill).toBe(DEFAULT_DRILL);
      expect(plan.fromPattern).toBe(false);
    }
  });

  it('a pattern whose game this exam cannot play falls back, and never offers an unplayable game', () => {
    const playable = all.filter((g) => g !== 'canopy' && g !== 'trap');
    const plan = drillPlan('canopy', playable);
    expect(plan.fromPattern).toBe(false);
    expect(plan.drill).toBe(playable[0]);
    for (const g of [plan.drill!, ...plan.also, ...plan.more]) expect(playable).toContain(g);
  });

  it('with few games, fills "also" from the rest and shows what exists', () => {
    expect(drillPlan(null, ['trap', 'sprint'])).toMatchObject({ drill: 'trap', also: ['sprint'], more: [] });
    expect(drillPlan(null, [])).toEqual({ drill: null, fromPattern: false, also: [], more: [] });
  });
});
