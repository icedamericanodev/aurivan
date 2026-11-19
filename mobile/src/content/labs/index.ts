import { expansionLabs, type ExpansionLab } from './expansion';
import { DEFAULT_RECOVERY_CONFIG, type RecoveryConfig } from '../../engine/conceptLab';

/** Small discriminated registry: add another interaction only when a real lab needs it. */
export interface RecoveryLab {
  id: string;
  certId: string;
  domainId: string;
  title: string;
  objective: string;
  minutes: number;
  interaction: 'recovery-timeline';
  lessonId: string;
  noteId: string;
  questionIds?: readonly string[];
  references: readonly { title: string; url: string; section: string }[];
  lastReviewed: string;
  config: Readonly<RecoveryConfig>;
  explore: { rto: string; rpo: string };
  challenge: {
    recovery: number;
    gap: number;
    options: readonly string[];
    correctIndex: number;
  };
  apply: {
    scenario: string;
    options: readonly { text: string; feedback: string }[];
    correctIndex: number;
  };
}

export type ConceptLab = RecoveryLab | ExpansionLab;

const labs: readonly ConceptLab[] = [{
  id: 'cisa-lab-rto-rpo',
  certId: 'cisa',
  domainId: '4',
  title: 'Understand RTO vs. RPO',
  objective: 'Separate downtime tolerance from potential data-loss tolerance, then evaluate recovery evidence against business-approved objectives.',
  minutes: 6,
  interaction: 'recovery-timeline',
  lessonId: 'cisa-l-d4-rpo-rto',
  noteId: '4B1.2',
  // Relevance checked against the hand-authored originals, not inferred from domain alone.
  questionIds: ['d4_074', 'd4_082'],
  references: [{
    title: 'NIST SP 800-34 Rev. 1 — Contingency Planning Guide for Federal Information Systems',
    url: 'https://doi.org/10.6028/NIST.SP.800-34r1',
    section: '§3.2 Business Impact Analysis; §3.5 Plan Testing, Training, and Exercises (TT&E)',
  }],
  lastReviewed: '2026-11-09',
  config: DEFAULT_RECOVERY_CONFIG,
  explore: {
    rto: 'RTO (Recovery Time Objective) is the business-approved limit for how long a service may be unavailable. Measure downtime forward from the outage until the service is restored.',
    rpo: 'RPO (Recovery Point Objective) limits how much recent data the business can risk losing, measured in minutes. Count backward from the outage to the latest usable data. Check transaction records to find what is actually missing.',
  },
  challenge: {
    recovery: 140,
    gap: 10,
    options: ['Both met', 'RTO met, RPO missed', 'RTO missed, RPO met', 'Both missed'],
    correctIndex: 2,
  },
  apply: {
    scenario: 'A fictional order service has an approved RTO of 90 minutes and RPO of 10 minutes. A recovery exercise restores usable service after 70 minutes, but its latest usable data is 25 minutes before the outage. The backup dashboard is green. What is the best audit action?',
    correctIndex: 1,
    options: [
      {
        text: 'Accept the exercise because service returned within the approved RTO.',
        feedback: 'Restoring service on time meets the RTO only. A 25-minute data gap exceeds the 10-minute RPO. A green backup-job status does not prove that usable data meets the objective.',
      },
      {
        text: 'Report the missed RPO, verify the usable data, and recommend a fix and retest.',
        feedback: 'Yes. The 70-minute restoration meets the 90-minute RTO, but the 25-minute gap misses the 10-minute RPO. Verify recovery and transaction-reconciliation evidence, report the exception and recommend corrective action and a retest. Management owns the risk and any change to approved objectives.',
      },
      {
        text: 'Ask IT to increase the RPO so it matches the recovery exercise.',
        feedback: 'Changing the target to fit the result hides the exception. Business owners approve tolerances based on business impact; the auditor evaluates evidence, reports gaps and recommends action rather than setting recovery objectives.',
      },
    ],
  },
}, ...expansionLabs];

/** Returns only supported labs for the selected certification; no fallback to CISA. */
export function labsFor(certId: string): ConceptLab[] {
  return labs.filter((lab) => lab.certId === certId);
}

/** An unknown, missing, or cross-certification deep link resolves to no lab. */
export function findLab(certId: string, id: string | undefined): ConceptLab | undefined {
  return labsFor(certId).find((lab) => lab.id === id);
}

export function labForNote(certId: string, noteId: string): ConceptLab | undefined {
  return labsFor(certId).find((lab) => lab.noteId === noteId);
}
