// Test helpers for the board's deno tests: an in-memory BoardDbPort that
// plays the SQL's answers (standing, consent, pause, a post limit, holds,
// staff), and records every write so a test can prove a rejected text was
// never stored. Never imported by an index.ts, so never deployed.

import {
  BoardDbError,
  type BoardDbPort,
  type BoardTerms,
  type DigestCounts,
  type MemberFacts,
  type StaffActInput,
  type WriteInput,
  type WriteResult,
} from './board.ts';
import { buildFingerprint, type Fingerprint, leakItem } from './leakGuard.ts';

export interface StoredWrite extends WriteInput {
  id: string;
  visibility: 'pending' | 'visible';
  holdReason: string | null;
}

export class FakeBoardDb implements BoardDbPort {
  members = new Map<string, MemberFacts>();
  staffIds = new Set<string>();
  writes: StoredWrite[] = [];
  staffActs: StaffActInput[] = [];
  termsList: BoardTerms = { block: [], hold: [], reserved: [], linkDomains: [] };
  postingOpen = true;
  guidelines = '2026-11';
  postsPerHour = 3;
  /** Write attempts allowed (SEC S6: counted before the filters). */
  attemptsAllowed = 30;
  attempts: string[] = [];
  digestCounts: DigestCounts = { held: 0, reported: 0, appeals: 0 };
  fail: Partial<Record<keyof BoardDbPort, BoardDbError>> = {};
  calls: string[] = [];
  private n = 0;

  addMember(userId: string, m: Partial<MemberFacts> = {}): MemberFacts {
    const member: MemberFacts = {
      // A public id unlike the account id (SEC S4).
      memberId: `30000000-0000-4000-8000-${String(this.members.size + 1).padStart(12, '0')}`,
      handle: `Quiet Cedar ${this.members.size + 1}`,
      handleKind: 'pseudonym',
      guidelinesVersion: this.guidelines,
      standing: 'active',
      standingUntil: null,
      approvedPosts: 1,
      isTeam: false,
      newAccount: false,
      postingOpen: true,
      currentGuidelines: this.guidelines,
      ...m,
    };
    this.members.set(userId, member);
    return member;
  }

  /** Every call: logged, then a forced failure as a REJECTED promise (like the real, async adapter). */
  private run<T>(method: keyof BoardDbPort, work: () => T | Promise<T>): Promise<T> {
    this.calls.push(method);
    const f = this.fail[method];
    if (f) return Promise.reject(f);
    try {
      return Promise.resolve(work());
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private facts(userId: string): MemberFacts | null {
    const m = this.members.get(userId);
    return m ? { ...m, postingOpen: this.postingOpen, currentGuidelines: this.guidelines } : null;
  }

  member(userId: string): Promise<MemberFacts | null> {
    return this.run('member', () => this.facts(userId));
  }

  terms(): Promise<BoardTerms> {
    return this.run('terms', () => structuredClone(this.termsList));
  }

  attempt(userId: string): Promise<void> {
    return this.run('attempt', () => {
      if (this.attempts.filter((u) => u === userId).length >= this.attemptsAllowed) {
        throw new BoardDbError('rate_limited');
      }
      this.attempts.push(userId);
    });
  }

  join(userId: string, handle: string, kind: 'pseudonym' | 'chosen', version: string): Promise<MemberFacts> {
    return this.run('join', () => {
      if (version !== this.guidelines) throw new BoardDbError('guidelines');
      for (const [id, m] of this.members) {
        if (id !== userId && m.handle.toLowerCase() === handle.toLowerCase()) throw new BoardDbError('handle_taken');
      }
      const prev = this.members.get(userId) ?? this.addMember(userId, { approvedPosts: 0 });
      this.members.set(userId, { ...prev, handle, handleKind: kind, guidelinesVersion: version });
      return this.facts(userId)!;
    });
  }

  write(i: WriteInput): Promise<WriteResult> {
    return this.run('write', () => {
      const m = this.members.get(i.userId);
      if (!m) throw new BoardDbError('forbidden');
      if (m.standing === 'banned') throw new BoardDbError('banned');
      if (!this.postingOpen) throw new BoardDbError('posting_paused');
      // The same draft again: the first post, not a second one (QA BUG-1).
      const same = i.op === 'post' && i.clientId
        ? this.writes.find((w) => w.userId === i.userId && w.clientId === i.clientId)
        : undefined;
      if (same) return { id: same.id, visibility: same.visibility, holdReason: same.holdReason };
      if (
        i.op === 'post' &&
        this.writes.filter((w) => w.userId === i.userId && w.op === 'post').length >= this.postsPerHour
      ) {
        throw new BoardDbError('rate_limited');
      }
      const hold = i.hold ?? (i.op === 'post' && m.approvedPosts === 0 ? 'new_member' : null);
      const id = `00000000-0000-4000-8000-${String(++this.n).padStart(12, '0')}`;
      const visibility = hold ? 'pending' : 'visible';
      this.writes.push({ ...i, id, visibility, holdReason: hold });
      return { id, visibility, holdReason: hold } as WriteResult;
    });
  }

  isStaff(userId: string): Promise<boolean> {
    return this.run('isStaff', () => this.staffIds.has(userId));
  }

  staffAct(i: StaffActInput): Promise<unknown> {
    return this.run('staffAct', () => {
      if (!this.staffIds.has(i.actor)) throw new BoardDbError('forbidden');
      this.staffActs.push(structuredClone(i));
      if (i.targetKind === 'board') this.postingOpen = i.action === 'reopen';
      return { ok: true, action: i.action };
    });
  }

  staffQueue(actor: string, tab: string): Promise<unknown> {
    return this.run('staffQueue', () => {
      if (!this.staffIds.has(actor)) throw new BoardDbError('forbidden');
      return { tab, items: [], postingOpen: this.postingOpen, waiting: 0 };
    });
  }

  digest(): Promise<DigestCounts> {
    return this.run('digest', () => ({ ...this.digestCounts }));
  }
}

/** A small made-up bank and its fingerprint (never the real bank). */
export const TEST_BANK = [
  {
    stem:
      'During the review the team learns that the payroll clerk edits master records without any independent review. What should the auditor do first?',
    options: {
      A: 'Escalate the matter to the audit committee',
      B: 'Retest the control with a fresh sample',
      C: 'Document the finding in the working papers',
      D: 'Ask the clerk to explain in writing',
    },
    explanation:
      'The root cause sits with the missing independent review of master record edits, so the first step is to understand the extent before choosing a fix.',
    wrongExplanations: { A: 'Escalating too early skips the facts.' },
    tips: ['Look for the step that gathers facts first.'],
  },
];

export function testFingerprint(): Fingerprint {
  return buildFingerprint(TEST_BANK.map(leakItem));
}
