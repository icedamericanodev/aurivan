/**
 * Mobile 1.51 Field Guide, UX review fixes (pure helpers):
 * - P1: dates are said in full ("6 December", never "6 Dec");
 * - P5: the plan caption keeps "19 min" together (a no-break space before the unit),
 *   and the spoken line still says "minutes" either way.
 */
import { keepUnits, spokenMin } from '../engine/pace';
import { shortDate, spokenShortDate } from '../lib/format';

describe('spokenShortDate', () => {
  it('says the month in full, the shown form keeps its short month', () => {
    const at = new Date(2026, 11, 6, 12).getTime();
    expect(shortDate(at)).toBe('6 Dec');
    expect(spokenShortDate(at)).toBe('6 December');
    expect(spokenShortDate(new Date(2026, 4, 28, 9).getTime())).toBe('28 May');
  });
});

describe('keepUnits', () => {
  it('holds "about 19 min" together: no-break spaces after about and before min and h, nowhere else', () => {
    expect(keepUnits('Today’s plan · about 19 min')).toBe('Today’s plan · about\u00A019\u00A0min');
    expect(keepUnits('About 2 h 10 min')).toBe('About\u00A02\u00A0h 10\u00A0min');
    expect(keepUnits('Today’s plan')).toBe('Today’s plan');
  });

  it('a kept line is still spoken in full', () => {
    expect(spokenMin(keepUnits('Today’s plan · about 19 min'))).toBe('Today’s plan · about\u00A019 minutes');
    expect(spokenMin(keepUnits('About 2 h 1 min'))).toBe('About\u00A02 hours 1 minute');
  });
});
