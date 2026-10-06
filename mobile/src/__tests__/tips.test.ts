import { tipParts } from '../engine/tips';

describe('tipParts', () => {
  it('uses the v2 prefix as the label and strips it from the body', () => {
    expect(tipParts('Eliminate: A and C miss the point.', 0)).toEqual({ label: 'Eliminate two', body: 'A and C miss the point.' });
    expect(tipParts('Final two: D beats B because …', 1).label).toBe('Final two');
    expect(tipParts('Exam cue: escalate first.', 2)).toEqual({ label: 'Exam cue', body: 'Escalate first.' });
  });
  it('falls back to positional labels for older tips', () => {
    expect(tipParts('Trap is B: tempting.', 0)).toEqual({ label: 'The trap', body: 'Trap is B: tempting.' });
    expect(tipParts('x', 3).label).toBe('One more thing');
    expect(tipParts('x', 7).label).toBe('Tip');
  });
});
