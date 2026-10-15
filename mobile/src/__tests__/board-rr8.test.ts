/**
 * The Phase 8 re-review (RR_P8, 12 Oct): its repros, ported from the
 * reviewer's scratch copy into real tests. Each one failed on 8e1f488 and
 * asserts the safe behaviour.
 *
 * - R1 report, then edit: a harmless first report must not hide what the
 *   post says NOW. The staff queue shows the live words, says when they were
 *   edited after the report, and keeps the first and the latest reported
 *   words. Dismiss carries the edit time staff saw: if the words changed
 *   since, it is refused ('conflict') and nothing is closed.
 * - R2 names: "admin" and "staff" inside a name ("SiteAdmin", "StaffPick")
 *   are refused again; everyday words that merely contain them
 *   ("Badminton", "Distaff", "Flagstaff") are fine.
 * - R4 blank-looking characters that are not Unicode "format" characters
 *   (U+2800 braille blank, the Hangul fillers, U+1D159, the Khitan filler)
 *   can't split a word to get it past the word list.
 * - R3 joining counts a write attempt, so names can't probe the private
 *   block list for free (here the memory backend; the Edge Function's test
 *   is in board-submit/handler.test.ts).
 */
import { CloudError } from '../cloud/types';
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { boardSeed, DEMO_EMAIL, DEMO_USER_ID } from '../cloud/memory/seed';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { buildFingerprint, leakItem, leakMatch } from '../engine/leakGuard';
import { checkHandle, moderateText, normalizeText } from '../engine/moderation';

const DAY = 86_400_000;
const MIN = 60_000;
const RAJ = 'mem-user-raj';
const LEE = 'mem-user-lee';
let t = Date.UTC(2026, 9, 12, 10);

/** Maya (DEMO, staff, approved posts), Raj and Lee: all with the Terms, 30 days old. */
function make(): MemoryBackend {
  t = Date.UTC(2026, 9, 12, 10);
  return createMemoryBackend({
    now: () => t,
    users: [
      { userId: DEMO_USER_ID, email: DEMO_EMAIL, providers: ['email'], termsVersion: TERMS_VERSION, createdAt: t - 30 * DAY },
      { userId: RAJ, email: 'raj@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: t - 30 * DAY },
      { userId: LEE, email: 'lee@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: t - 30 * DAY },
    ],
    signedIn: { userId: DEMO_USER_ID, authAt: t },
    board: boardSeed(t, { boardJoined: true, boardStaff: true }),
  });
}
async function as(b: MemoryBackend, email: string) {
  await b.auth.signOut('local');
  await b.auth.sendEmailCode(email);
  await b.auth.verifyEmailCode(email, b.control.lastCode(email)!);
}
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : 'throw';
  }
};

const BENIGN = { kind: 'idea' as const, title: 'A modest idea for timers', body: 'Could the timer pause?', cert: 'cisa' };
const ABUSE = { kind: 'idea' as const, title: 'Calm Pine 7 is a liar', body: 'Calm Pine 7 is a fraud and a liar, everyone ignore him', cert: 'cisa' };

describe('R1 report, then edit: staff see the words that are live', () => {
  it('a harmless first report never masks an abusive edit (the reviewer’s RR8-1)', async () => {
    const b = make();
    const p = await b.board.submitPost(BENIGN);
    t += MIN;
    // Raj files a harmless report first (any profile may report).
    await as(b, 'raj@example.com');
    await b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2026-11' });
    await b.board.report({ kind: 'post', id: p.id, reason: 'spam' });
    t += MIN;
    // Maya edits it into harassment no word list catches; it stays up.
    await as(b, DEMO_EMAIL);
    expect((await b.board.editPost(p.id, ABUSE)).visibility).toBe('visible');
    t += MIN;
    const row = (await b.board.staffQueue('reported')).items.find((i) => i.id === p.id)!;
    // The live words, not the first report's.
    expect(row.title).toBe(ABUSE.title);
    expect(row.body).toContain('a fraud and a liar');
    expect(row.editedSinceReport).toBe(true);
    expect(row.editedAt).toBe(t - MIN);
    // And what was reported, for the record.
    expect(row.reportedFirst).toBe(`${BENIGN.title}\n${BENIGN.body}`);
  });

  it('abuse reported, then edited back to harmless: staff see the live words AND the reported ones', async () => {
    const b = make();
    const p = await b.board.submitPost(BENIGN);
    t += MIN;
    await as(b, 'raj@example.com');
    await b.board.report({ kind: 'post', id: p.id, reason: 'spam' });
    t += MIN;
    await as(b, DEMO_EMAIL);
    await b.board.editPost(p.id, ABUSE);
    t += MIN;
    // Lee, the victim, reports the abusive version.
    await as(b, 'lee@example.com');
    await b.board.report({ kind: 'post', id: p.id, reason: 'abuse' });
    t += MIN;
    // Maya edits it back to something harmless.
    await as(b, DEMO_EMAIL);
    await b.board.editPost(p.id, { ...BENIGN, body: 'Could the timer pause? Thanks.' });
    t += MIN;
    const row = (await b.board.staffQueue('reported')).items.find((i) => i.id === p.id)!;
    expect(row.body).toBe('Could the timer pause? Thanks.');
    expect(row.count).toBe(2);
    expect(row.editedSinceReport).toBe(true);
    expect(row.reportedFirst).toBe(`${BENIGN.title}\n${BENIGN.body}`);
    // The latest report holds the words the victim saw.
    expect(row.reportedLast).toBe(`${ABUSE.title}\n${ABUSE.body}`);
  });

  it('an unedited post: nothing about edits, and the reported words are the live ones', async () => {
    const b = make();
    const p = await b.board.submitPost(BENIGN);
    t += MIN;
    await as(b, 'raj@example.com');
    await b.board.report({ kind: 'post', id: p.id, reason: 'spam' });
    await as(b, DEMO_EMAIL);
    const row = (await b.board.staffQueue('reported')).items.find((i) => i.id === p.id)!;
    expect(row).toMatchObject({ title: BENIGN.title, body: BENIGN.body, editedSinceReport: false, editedAt: null });
    expect(row.reportedFirst).toBe(row.reportedLast);
  });

  it('Dismiss from an older view of the words is refused, and every report stays open', async () => {
    const b = make();
    const p = await b.board.submitPost(BENIGN);
    t += MIN;
    await as(b, 'raj@example.com');
    await b.board.report({ kind: 'post', id: p.id, reason: 'spam' });
    t += MIN;
    await as(b, DEMO_EMAIL);
    const seen = (await b.board.staffQueue('reported')).items.find((i) => i.id === p.id)!;
    expect(seen.editedAt).toBeNull();
    // The author edits while the moderator is looking.
    await b.board.editPost(p.id, ABUSE);
    t += MIN;
    const dismiss = (editedAt: number | null | undefined) =>
      b.board.staff({ action: 'dismiss', targetKind: 'report', targetId: p.id, extra: { kind: 'post', editedAt } });
    expect(await code(dismiss(seen.editedAt))).toBe('conflict:changed');
    // A Dismiss that doesn't say what it saw is refused too, once the words were edited.
    expect(await code(dismiss(undefined))).toBe('conflict:changed');
    const open = () => b.control.board.reports().filter((r) => r.targetId === p.id && r.status === 'open').length;
    expect(open()).toBe(1);
    // Reloaded: the live words, then Dismiss goes through.
    const now = (await b.board.staffQueue('reported')).items.find((i) => i.id === p.id)!;
    expect(now.body).toContain('a fraud and a liar');
    expect(await code(dismiss(now.editedAt))).toBe('ok');
    expect(open()).toBe(0);
  });

  it('a reported comment shows its live words too, and its Dismiss is checked the same way', async () => {
    const b = make();
    const p = await b.board.submitPost(BENIGN);
    const c = await b.board.comment(p.id, 'Nice idea, thanks');
    t += MIN;
    await as(b, 'raj@example.com');
    await b.board.report({ kind: 'comment', id: c.id, reason: 'spam' });
    t += MIN;
    await as(b, DEMO_EMAIL);
    await b.board.editComment(c.id, 'Calm Pine 7 is a liar');
    t += MIN;
    const row = (await b.board.staffQueue('reported')).items.find((i) => i.id === c.id)!;
    expect(row).toMatchObject({ kind: 'comment', title: null, body: 'Calm Pine 7 is a liar', editedSinceReport: true, reportedFirst: 'Nice idea, thanks' });
    expect(await code(b.board.staff({ action: 'dismiss', targetKind: 'report', targetId: c.id, extra: { kind: 'comment', editedAt: null } }))).toBe('conflict:changed');
    expect(await code(b.board.staff({ action: 'dismiss', targetKind: 'report', targetId: c.id, extra: { kind: 'comment', editedAt: row.editedAt } }))).toBe('ok');
  });
});

describe('R3 joining counts a write attempt (the memory backend plays board-submit)', () => {
  it('the 31st try at a name in an hour is refused before the name is checked', async () => {
    const b = make();
    await as(b, 'raj@example.com');
    for (let i = 0; i < 30; i++) expect(await code(b.board.join({ handle: 'Site Admin', handleKind: 'chosen', guidelinesVersion: '2026-11' }))).toBe('invalid:handle_reserved');
    expect(await code(b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2026-11' }))).toBe('rate_limited');
    t += 61 * MIN;
    expect(await code(b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2026-11' }))).toBe('ok');
  });
});

describe('R2 reserved names: "admin" and "staff" inside a name (the reviewer’s RR8-2)', () => {
  it.each(['AdminTeam', 'SiteAdmin', 'BoardStaff', 'StaffPick', 'KaiSip Admin', 'Admins Only', 'Staffer Pine', 'Ad Min Help', 'S t a f f Pine', 'Badminton Admin', 'Distaff Staff'])(
    '%s is refused',
    (h) => {
      expect(checkHandle(h)).toBe('reserved');
    },
  );
  it.each(['Badminton Fan', 'Distaff Pine', 'Flagstaff Hiker', 'Pikestaff Plain', 'Quarterstaff Pine', 'Stafford Reed', 'Modest Pine 4', 'Quiet Cedar 214'])('%s stays allowed', (h) => {
    expect(checkHandle(h)).toBeNull();
  });
});

describe('R4 blank-looking characters can’t split a word (the reviewer’s RR8-3)', () => {
  // Each renders as empty space in most fonts, and none is a Unicode "format" (Cf) character.
  const BLANKS: [string, string][] = [
    ['U+2800 braille pattern blank', '⠀'],
    ['U+3164 Hangul filler', 'ㅤ'],
    ['U+115F Hangul choseong filler', 'ᅟ'],
    ['U+1160 Hangul jungseong filler', 'ᅠ'],
    ['U+FFA0 halfwidth Hangul filler', 'ﾠ'],
    ['U+1D159 musical null notehead', '\u{1D159}'],
    ['U+16FE4 Khitan filler', '\u{16FE4}'],
    ['U+FFF0 (reserved, ignorable)', '￰'],
    ['U+E0080 (reserved tag-block, ignorable)', '\u{E0080}'],
    ['U+E01F0 (reserved, ignorable)', '\u{E01F0}'],
  ];
  it.each(BLANKS)('%s is removed, so the word list sees the word', (_name, ch) => {
    expect(normalizeText(`fu${ch}ck you`)).toBe('fuck you');
    expect(moderateText(`fu${ch}ck you`, { newMember: false }).verdict).toBe('reject');
  });
  it('a real braille letter (not blank) is kept', () => {
    expect(normalizeText('a⠁b')).toBe('a⠁b');
  });
  it('control: a tag character and combining strokes were already caught', () => {
    expect(moderateText('fu\u{E0020}ck you', { newMember: false }).verdict).toBe('reject');
    expect(moderateText('f̶u̶c̶k̶ you', { newMember: false }).verdict).toBe('reject');
  });
  it('a bank stem with U+2800 inside its words is still blocked by the server fingerprint', () => {
    const qs = getAllQuestions('cisa' as never) as never[];
    const fp = buildFingerprint(qs.map(leakItem as never), { squash: true });
    const stem = (qs as { stem?: string }[]).map((q) => q.stem ?? '').find((s) => s.split(' ').length > 18)!;
    const spoofed = stem.split(' ').map((w) => (w.length > 3 ? `${w.slice(0, 2)}⠀${w.slice(2)}` : w)).join(' ');
    expect(leakMatch(fp, spoofed).verdict).toBe('block');
  });
});
