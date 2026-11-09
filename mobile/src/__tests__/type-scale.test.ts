/**
 * The phone's type scale (design-notes/grove/TYPE_SCALE.md sections 1 to 3).
 *
 * Plain English: every word uses one of the scale's roles and every serif number one of five
 * numeral steps. This test pins each role's size, line height and text-size limit, so a later
 * edit cannot quietly drift from the web's tokens.
 */
import { fieldRole, numRole, percentFor, rangeStep, role, type NumStep } from '../theme/grove';
import { maxScale, type } from '../theme/tokens';

const metric = (r: { style: { fontSize?: number; lineHeight?: number } }) => [r.style.fontSize, r.style.lineHeight];

describe('type scale roles (TYPE_SCALE.md section 3)', () => {
  it('each role has the size, line height and limit of the table', () => {
    expect(metric(role.read)).toEqual([18, 26]);
    expect(metric(role.title)).toEqual([22, 26]);
    expect(metric(role.aside)).toEqual([16, 22]);
    expect(metric(role.button)).toEqual([17, 22]);
    expect(metric(role.chip)).toEqual([15, 20]);
    expect(metric(role.optionPick)).toEqual([16, 24]);
    expect(metric(role.optionBest)).toEqual([16, 24]);
    expect(metric(role.badgeLetter)).toEqual([14, 18]);
    // Words grow to x2; title stops at x1.6 so it stays under hero and above headline.
    for (const k of ['read', 'aside', 'button', 'chip', 'optionPick', 'optionBest', 'badgeLetter'] as const) expect(role[k].max).toBe(2);
    expect(role.title.max).toBe(1.6);
  });

  it('the five numeral steps, all capped at x1.3', () => {
    const steps: Record<NumStep, [number, number]> = { 52: [52, 52], 38: [38, 41], 30: [30, 32], 22: [22, 26], 20: [20, 22] };
    for (const [size, want] of Object.entries(steps)) {
      const r = numRole[Number(size) as NumStep];
      expect(metric(r)).toEqual(want);
      expect(r.max).toBe(1.3);
    }
  });

  it('the raised % is never under 11pt', () => {
    for (const size of [52, 38, 30, 22, 20] as const) expect(percentFor(size).fontSize).toBeGreaterThanOrEqual(11);
    expect(percentFor(20).fontSize).toBe(11);
  });

  it('the readiness range steps down only when space runs out: 38, then 30, then 22', () => {
    expect(rangeStep(1, 390)).toBe(38);
    expect(rangeStep(1.3, 390)).toBe(30);
    expect(rangeStep(1, 359)).toBe(30);
    expect(rangeStep(2, 320)).toBe(22);
  });

  it('the Term Match cuts the scale retired draw their role', () => {
    expect(fieldRole.value).toBe(role.title);
    expect(fieldRole.verdict?.style).toBe(type.hero);
    expect(fieldRole.verdict?.max).toBe(maxScale.hero);
    expect(fieldRole.recap).toBe(role.read);
    expect(fieldRole.option).toBe(role.optionPick);
    expect(fieldRole.best).toBe(role.optionBest);
    expect(fieldRole.why).toBe(role.aside);
    expect(fieldRole.keyNo).toBe(role.aside);
  });

  it('kicker and tab floors: nothing under 11pt among the roles', () => {
    for (const r of Object.values(role)) expect(r.style.fontSize).toBeGreaterThanOrEqual(11);
    expect(type.tab.fontSize).toBe(11);
  });
});
