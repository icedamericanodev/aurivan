/**
 * Uplift Phase 8: the board's text rules and pseudonyms (engine/moderation.ts,
 * engine/boardNames.ts). The server's board-submit runs the same moderation
 * file (guard G8), so these are the server's answers too.
 */
import { ADJECTIVES, freshPseudonym, isPseudonym, pseudonym, TREES } from '../engine/boardNames';
import { checkHandle, foldForMatch, hasPhoneNumber, linksIn, moderateText, normalizeText, RESERVED_HANDLES, wordsOf } from '../engine/moderation';
import { createRng } from '../engine/random';

const ZW = String.fromCharCode(0x200b);
const BOM = String.fromCharCode(0xfeff);
const BELL = String.fromCharCode(7);
const NBSP = String.fromCharCode(0xa0);
const LQ = String.fromCharCode(0x201c);
const RQ = String.fromCharCode(0x201d);
const CYR_O = String.fromCharCode(0x43e);
const FW_A = String.fromCharCode(0xff21);

describe('normalizeText', () => {
  it('cleans invisible and control characters, quotes and spacing, and is idempotent', () => {
    const raw = `  Hello${ZW}${BOM}  ${NBSP}world${BELL}\r\n\r\n\r\n${LQ}quoted${RQ}  `;
    const once = normalizeText(raw);
    expect(once).toBe('Hello world\n\n"quoted"');
    expect(normalizeText(once)).toBe(once);
  });

  it('turns full-width letters into plain ones (NFKC)', () => {
    expect(normalizeText(`${FW_A}BC`)).toBe('ABC');
  });

  it('plain ASCII takes the same path as everything else would', () => {
    for (const s of ['a  b', ' x\n\n\n\ny ', 'tab\tseparated', 'quote `tick`']) {
      expect(normalizeText(s)).toBe(normalizeText(`${s}${ZW}`));
    }
  });

  it('folds look-alike letters for matching only', () => {
    expect(foldForMatch(`Pr${CYR_O}ject`)).toBe('project');
    expect(foldForMatch('Café')).toBe('cafe');
    expect(normalizeText(`Pr${CYR_O}ject`)).toBe(`Pr${CYR_O}ject`);
  });

  it('undoes leetspeak for the word lists', () => {
    expect(wordsOf('h4te $pam 0pen')).toEqual(['hate', 'spam', 'open']);
  });
});

describe('moderateText (board-submit step 3)', () => {
  const member = { newMember: false };

  it('rejects blocked words, even disguised', () => {
    for (const t of ['what the fuck', 'F.U.C.K this', `fu${ZW}ck`, 'p0rn links', 'send nudes']) {
      expect([t, moderateText(t, member)]).toEqual([t, { verdict: 'reject', reason: 'words' }]);
    }
  });

  it('keeps ordinary study talk, including words that merely contain a blocked one', () => {
    for (const t of ['Scunthorpe audit team', 'Retardant materials in the data centre', 'The class was a cocktail of topics', 'memory dump analysis']) {
      expect(moderateText(t, member)).toEqual({ verdict: 'ok' });
    }
  });

  it('a new member cannot post a link; nobody can post a shortener or a dump site', () => {
    expect(moderateText('see https://example.org/page', { newMember: true })).toEqual({ verdict: 'reject', reason: 'links' });
    expect(moderateText('see www.example.org', { newMember: true })).toEqual({ verdict: 'reject', reason: 'links' });
    expect(moderateText('see example.org/page', member)).toEqual({ verdict: 'ok' });
    expect(moderateText('see bit.ly/abc', member)).toEqual({ verdict: 'reject', reason: 'links' });
    expect(moderateText('free https://best-braindumps.example/cisa', member)).toEqual({ verdict: 'reject', reason: 'links' });
    expect(moderateText('see https://bad.example', { newMember: false, extra: { linkDomains: ['bad.example'] } })).toEqual({ verdict: 'reject', reason: 'links' });
    expect(linksIn('Visit EXAMPLE.COM today')).toEqual(['example.com']);
  });

  it('holds threats, self-harm and contact details for a person to see first', () => {
    for (const t of ['I will find you', 'sometimes I want to die', 'add me on whatsapp', 'mail me at jo@example.com', 'call +63 917 555 0199']) {
      expect([t, moderateText(t, member)]).toEqual([t, { verdict: 'hold', reason: 'hold_words' }]);
    }
  });

  it('dates and standard numbers are not phone numbers', () => {
    expect(hasPhoneNumber('crashed on 2026-10-12 at noon')).toBe(false);
    expect(hasPhoneNumber('iso 27001 and nist 800-53')).toBe(false);
    expect(hasPhoneNumber('+44 20 7946 0958')).toBe(true);
  });

  it('extra terms from the server are plain words, never patterns', () => {
    expect(moderateText('this is spoilerword here', { newMember: false, extra: { block: ['spoilerword'] } })).toEqual({ verdict: 'reject', reason: 'words' });
    // A regex-looking term matches only itself as words, and never throws.
    expect(moderateText('aaaa', { newMember: false, extra: { block: ['(a+)+$'] } })).toEqual({ verdict: 'ok' });
    expect(moderateText('meet at the cafe', { newMember: false, extra: { hold: ['the cafe'] } })).toEqual({ verdict: 'hold', reason: 'hold_words' });
  });
});

describe('checkHandle', () => {
  it.each(['KaiSip Team', 'Aurivan Team', 'AURIVAN', 'kaisip', 'Kai Sip fan', 'KAISIP_mod', 'ISACA_mod', 'support', 'Support', 'CISA mod', 'The Official One', 'Staff Pick', 'adm1n'])('rejects %j as reserved', (h) => {
    expect(checkHandle(h)).toBe('reserved');
  });

  it.each(['Quiet Cedar 214', 'Modest Pine 4', 'Maya', "O'Neil", 'Team-work fan x'.replace('Team-work fan x', 'Teamwork Fan')])('accepts %j', (h) => {
    expect(checkHandle(h)).toBeNull();
  });

  it('checks the shape: 3 to 24 characters, a letter first, no double spaces', () => {
    for (const h of ['ab', '1abc', 'x'.repeat(25), 'two  spaces', ' lead', 'emoji \u{1F600}x'.replace('\u{1F600}', '?')]) expect(checkHandle(h)).toBe('shape');
  });

  it('look-alike letters from other alphabets can’t be used in a name at all', () => {
    expect(checkHandle(`Aur${String.fromCharCode(0x456)}van fan`)).toBe('shape');
  });

  it('keeps both product names reserved, with look-alike letters (l for i, digits for letters)', () => {
    expect(checkHandle('KAISlP')).toBe('reserved'); // "l" reads as "i"
    expect(checkHandle('Ka1s1p Fan')).toBe('reserved'); // digits read as letters
    expect(checkHandle('AURlVAN')).toBe('reserved');
    expect(checkHandle('Kaisipan Study')).toBe('reserved'); // anywhere inside the name
  });

  it('rejects names with blocked words, and the server’s extra reserved names', () => {
    expect(checkHandle('Fuck Off')).toBe('words');
    expect(checkHandle('Ranger Bob', { reserved: ['ranger'] })).toBe('reserved');
  });

  it('every reserved word is caught by itself', () => {
    for (const r of RESERVED_HANDLES) expect(checkHandle(r.length < 3 ? `${r}x1` : r.charAt(0).toUpperCase() + r.slice(1))).not.toBeNull();
  });
});

describe('pseudonyms', () => {
  it('are "Adjective Tree N", N from 1 to 999, and always pass the name check', () => {
    const rng = createRng(5);
    for (let i = 0; i < 2000; i++) {
      const name = pseudonym(rng);
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ ([1-9]\d{0,2})$/);
      const n = Number(name.split(' ')[2]);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(999);
      expect(checkHandle(name)).toBeNull();
      expect(isPseudonym(name)).toBe(true);
    }
  });

  it('every word in the lists is clean on its own', () => {
    for (const w of [...ADJECTIVES, ...TREES]) expect(checkHandle(`${w} Oak 1`)).toBeNull();
  });

  it('"New name" never repeats the one shown, and avoids the server’s extra reserved words', () => {
    const rng = createRng(9);
    const first = freshPseudonym(rng);
    for (let i = 0; i < 50; i++) expect(freshPseudonym(rng, first)).not.toBe(first);
    const noCedar = freshPseudonym(createRng(1), undefined, { reserved: ['cedar'] });
    expect(noCedar.toLowerCase()).not.toContain('cedar');
  });

  it('a chosen name is not mistaken for a pseudonym', () => {
    expect(isPseudonym('Maya')).toBe(false);
    expect(isPseudonym('Quiet Cedar 0')).toBe(false);
  });
});
