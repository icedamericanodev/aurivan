/**
 * Grove Phase 4, the answer screen's tip order (PHASE4.md section 4, fallback 4.6 while O1 is open):
 * right answers show every tip open; a miss shows the Exam cue and the row the coach named, and folds
 * the rest under "Read more". Written order always; nothing dropped or repeated.
 */
import { answerTipRows, coachedTip } from '../engine/answerTips';

const V2 = ['Eliminate: {{A}} and {{C}} fail the scope.', 'Final two: {{B}} beats {{D}} because it comes first.', 'Exam cue: FIRST means plan before act.'];

describe('answerTipRows', () => {
  it('after a right answer every tip is open, in the written order', () => {
    expect(answerTipRows(V2, { correct: true, coached: null })).toEqual({ open: [0, 1, 2], folded: [] });
    expect(answerTipRows(V2, { correct: true, coached: 'Final two' })).toEqual({ open: [0, 1, 2], folded: [] });
  });

  it('after a miss: the Exam cue and the coached row are open; the rest fold', () => {
    expect(answerTipRows(V2, { correct: false, coached: 'Final two' })).toEqual({ open: [1, 2], folded: [0] });
    expect(answerTipRows(V2, { correct: false, coached: 'Eliminate two' })).toEqual({ open: [0, 2], folded: [1] });
    expect(answerTipRows(V2, { correct: false, coached: null })).toEqual({ open: [2], folded: [0, 1] });
  });

  it('older tips with no label word: the exam-day shortcut stays open, the others fold; every tip once', () => {
    const old = ['A trap to avoid.', 'Think like the auditor.', 'On the day, read the last line first.', 'One more thing.'];
    const r = answerTipRows(old, { correct: false, coached: null });
    expect(r).toEqual({ open: [2], folded: [0, 1, 3] });
    expect([...r.open, ...r.folded].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('coachedTip', () => {
  it('names the row the coach line talked about', () => {
    expect(coachedTip('final-two', true, false)).toBe('Final two');
    expect(coachedTip('rule-out', true, false)).toBe('Eliminate two');
    // A tagged slip won over the pick line: only the runner-up rule can still name the final two.
    expect(coachedTip('rule-out', false, false)).toBeNull();
    expect(coachedTip(null, false, true)).toBe('Final two');
    expect(coachedTip(null, false, false)).toBeNull();
  });
});
