/**
 * Every test runs in UTC (release bug hunt round 1).
 *
 * Why: CI runners use UTC, but the owner's machine is in the Philippines.
 * Some tests build days and shuffles from the clock, so they gave a
 * different result outside UTC (2 failed in Asia/Manila, 4 in Los Angeles)
 * while the app itself was right. Setting TZ here, before Jest starts its
 * workers, makes `npm test` give the same result in any timezone.
 * (src/__tests__/timezone-pinned.test.ts checks it.)
 */
module.exports = () => {
  process.env.TZ = 'UTC';
};
