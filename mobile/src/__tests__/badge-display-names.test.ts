import { BADGES } from '../engine/milestones';
const expected = {
  "first-foothold": "First Review",
  "topic-clear": "Topic Complete",
  "ten-topics": "Ten Topics",
  "firm-footing": "Domain Mastery",
  "whole-map": "All Domains",
  "loop-closed": "Mistakes Fixed",
  "slip-spotter": "Error Insight",
  "long-memory": "Lasting Recall",
  "graduate": "Review Complete",
  "know-what-you-know": "Confidence Check",
  "dress-rehearsal": "Mock Complete",
  "on-pace": "On Pace",
  "mindset-shift": "Better Judgement",
  "rooted": "Study Days",
  "took-root": "Topic Recall",
  "fresh-start": "Study Return",
  "snare-wise": "Trap Spotter",
  "even-keel": "Calibration",
  "signpost-reader": "Priority Reader",
  "myth-clearer": "Fact Check",
  "sure-footed-pace": "Timed Accuracy",
  "whole-grove": "All Drills",
  "back-on-path": "Drill Recovery"
};
test('all existing badge IDs keep distinct short display names', () => {
 expect(Object.fromEntries(BADGES.map(b => [b.id, b.name]))).toEqual(expected);
 expect(new Set(BADGES.map(b => b.name)).size).toBe(BADGES.length);
 expect(BADGES.every(b => b.name.split(/\s+/).length <= 2)).toBe(true);
});
