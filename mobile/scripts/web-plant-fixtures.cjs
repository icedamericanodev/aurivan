/**
 * web-plant-fixtures.cjs — learner histories shared by the plant parity
 * tests: src/__tests__/web-plant-bundle.test.ts (the app's TypeScript engine
 * against the compiled website copy) and the website's browser test (the
 * same histories answered in index.html, which must grow the same plant).
 *
 * A history is plain events (question, right or wrong, when) plus finished
 * mocks. `mobileReplay` turns one into what the app's store would have
 * saved (store/progress.ts recordAnswer: answer records with the retest
 * rule, subtopic mastery, the readiness log), using the engine functions it
 * is given, so the same replay runs on the TypeScript sources and on the
 * compiled bundle.
 *
 * Deterministic: fixed dates (local time), questions picked in outline order.
 */
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** "Now" for every learner: 19 Oct 2026, 18:00 local time. */
const NOW = new Date(2026, 9, 19, 18, 0, 0).getTime();
const at = (daysAgo, hour = 10, min = 0) => {
  const d = new Date(NOW);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo, hour, min, 0).getTime();
};

/**
 * Per domain, the outline's subtopics with their practice questions:
 * [[{ id, q: [questionIds] }]] in outline order. `topics` is engine/outline.ts outlineFromNotes().
 */
function subtopicTable(topics, domainIds) {
  return domainIds.map((d) =>
    topics.filter((t) => t.domainId === d).flatMap((t) => t.subtopics.filter((s) => s.questionIds.length).map((s) => ({ id: s.id, q: s.questionIds }))),
  );
}

/**
 * The learners. `share`: the part of each domain's subtopics answered right
 * on two days (one question each), so "know the outline" lands where wanted.
 */
function learners(topics, domainIds) {
  const table = subtopicTable(topics, domainIds);
  const firstQs = (share, offset = 0) =>
    table.flatMap((subs) => subs.slice(0, Math.ceil(subs.length * share)).map((s) => s.q[Math.min(offset, s.q.length - 1)]));
  /** Every question once per day on the given days (each answer a minute apart, from 09:00). */
  const days = (qs, daysAgo, ok = () => true) =>
    daysAgo.flatMap((d) => qs.map((q, i) => ({ q, ok: ok(q, i, d), at: at(d, 9, 0) + i * 60_000 })));
  const L = [];
  L.push({ id: 'new', events: [], mocks: [], expectGrowth: 1 });
  // 25 right answers in two domains on one day: the diagnostic is done.
  L.push({ id: 'sprout', events: days([...table[0], ...table[1]].slice(0, 25).map((s) => s.q[0]), [2]), mocks: [], expectGrowth: 2 });
  // Ten or more in every domain, and a few subtopics right on two days.
  const shoot = table.flatMap((subs) => subs.slice(0, 12).map((s) => s.q[0]));
  L.push({
    id: 'shoot',
    events: [...days(shoot, [5], (q, i) => i % 3 !== 0), ...days(shoot.filter((_, i) => i % 3 === 1), [2])],
    mocks: [],
    expectGrowth: 3,
  });
  // A third of the outline known on two days, mostly right: Bough.
  const bough = firstQs(0.34);
  L.push({ id: 'bough', events: [...days(bough, [9], (q, i) => i % 9 !== 0), ...days(bough, [3], (q, i) => i % 7 !== 0)], mocks: [], expectGrowth: 4 });
  // Half of it known, high accuracy and a mini mock (50): Crown. A wrong
  // answer put right within 4 hours (a retest) along the way.
  const crown = firstQs(0.6);
  L.push({
    id: 'crown',
    events: [
      ...days(crown, [12], (q, i) => i % 10 !== 0),
      ...days(crown.filter((_, i) => i % 10 === 0), [12]).map((e) => ({ ...e, at: e.at + 2 * HOUR })),
      ...days(crown, [4], (q, i) => i % 12 !== 0),
    ],
    mocks: [{ total: 50, correct: 41, at: at(4, 16), unanswered: 0, timing: 'standard', type: 'mini' }],
    expectGrowth: 5,
  });
  // Two thirds known, every domain strong, a full timed mock with nothing
  // unanswered, and a readiness low end at 80+ every day for a week: Elder.
  const elder = firstQs(0.7);
  const daily = table.flatMap((subs) => subs.slice(0, 3).map((s) => s.q[0]));
  L.push({
    id: 'elder',
    events: [...days(elder, [14]), ...days(elder, [10]), ...days(daily, [6, 5, 4, 3, 2, 1, 0])],
    mocks: [{ total: 150, correct: 128, at: at(8, 15), unanswered: 0, timing: 'standard', type: 'full' }],
    expectGrowth: 6,
  });
  // Mixed: wrong answers, right retests that must not count, a week away (resting).
  const mixed = table.flatMap((subs) => subs.slice(0, 11).map((s) => s.q[0]));
  L.push({
    id: 'resting',
    events: [
      ...days(mixed, [20], (q, i) => i % 2 === 0),
      ...days(mixed.filter((_, i) => i % 2 === 1), [20]).map((e) => ({ ...e, at: e.at + 3 * HOUR })),
      ...days(mixed, [9], (q, i) => i % 4 !== 0),
    ],
    mocks: [],
    expectGrowth: 3,
  });
  for (const l of L) l.events.sort((a, b) => a.at - b.at || (a.q < b.q ? -1 : 1));
  return L;
}

/**
 * What the app's store would hold for this history (store/progress.ts
 * recordAnswer, one answer at a time). `E` is { readiness, readinessRange,
 * examReady, mastery, streak } (engine modules); `subtopicOf` the outline's.
 */
function mobileReplay(E, cert, learner, subtopicOf) {
  let answers = {};
  let mastery;
  let log = [];
  for (const ev of learner.events) {
    const prev = answers[ev.q];
    const retest = ev.ok && !!prev && prev.lastCorrect === false && ev.at - prev.lastAt >= 0 && ev.at - prev.lastAt < 4 * HOUR;
    const rec = { attempts: (prev ? prev.attempts : 0) + 1, correctCount: (prev ? prev.correctCount : 0) + (ev.ok ? 1 : 0), lastCorrect: ev.ok, lastAt: ev.at };
    if (retest) rec.lastRetest = true;
    answers = { ...answers, [ev.q]: rec };
    const day = E.streak.dayKey(ev.at);
    mastery = E.mastery.recordMastery(mastery, subtopicOf(ev.q), day, { correct: ev.ok, assisted: retest }, ev.at);
    const range = E.readinessRange.readinessRange(cert, E.readiness.computeReadiness(cert, answers));
    log = E.examReady.logReadinessDay(log, day, range.enough ? range.low : null);
  }
  const mocks = learner.mocks.map((m) => ({ total: m.total, correct: m.correct, day: E.streak.dayKey(m.at), timing: m.timing, unanswered: m.unanswered }));
  return { answers, mastery: mastery ?? {}, readinessLog: log, mocks };
}

/** The CISA certification as the website builds it from DI (index.html plantCert). */
const WEB_CISA = {
  id: 'cisa',
  domains: [
    { id: '1', weight: 18 },
    { id: '2', weight: 18 },
    { id: '3', weight: 12 },
    { id: '4', weight: 26 },
    { id: '5', weight: 26 },
  ],
  exam: { questions: 150, minutes: 240 },
};

module.exports = { NOW, DAY, HOUR, learners, mobileReplay, subtopicTable, WEB_CISA };
