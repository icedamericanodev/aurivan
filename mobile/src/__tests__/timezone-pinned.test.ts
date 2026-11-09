/**
 * The test run is pinned to UTC (jest/global-setup.js), so `npm test` gives the
 * same result on the owner's machine (Asia/Manila) as on CI. Before the fix,
 * `TZ=Asia/Manila npm test` failed 2 tests and Los Angeles failed 4.
 */
describe('the test clock', () => {
  it('runs in UTC whatever the machine’s timezone', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(new Date('2026-10-24T06:38:00Z').getTimezoneOffset()).toBe(0);
    expect(new Date('2026-10-24T06:38:00Z').getDate()).toBe(24);
  });
});
