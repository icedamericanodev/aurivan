/**
 * THE Concept Lab switch (one place; nothing else decides this).
 *
 * Plain English for the founder: the "Interactive Concept Lab" (the RTO/RPO lab) is HIDDEN from
 * learners while this says `false`.
 *
 * Why (owner decision, 19 Nov 2026, for mobile 2.2): the owner tried the lab and found it made the
 * topic more confusing. It is hidden, not deleted: it comes back after a redesign and learner testing.
 *
 * With it off:
 * - `labsFor`, `findLab` and `labForNote` (./index.ts) answer "no lab", so the Learn tile and the
 *   study note's "Explore in Concept Lab" link are not drawn (nothing shown, nothing spoken);
 * - the /labs and /labs/<id> screens show nothing and open Learn (an old link or a restored
 *   navigation state never crashes; components/conceptLabHidden.tsx).
 * The lab's code, its engine (engine/conceptLab.ts) and its tests all stay and keep running.
 *
 * To bring the lab back: change `false` to `true` on the line below. (One test,
 * src/__tests__/conceptLab-hidden.test.tsx, pins the shipped value so the lab can't return by
 * accident; flip its expectation in the same change.)
 *
 * It lives in its own tiny file so the tests can turn it on or off (jest.mock of this file).
 * Typed `boolean` on purpose: a bare `false` would make TypeScript treat the lab code as dead.
 */
export const CONCEPT_LAB_ENABLED: boolean = false;
