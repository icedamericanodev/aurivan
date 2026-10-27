/**
 * Content packs, Phase A: the security review's fixes.
 *
 * HIGH-1: "constructor", "prototype" and the other names a plain object
 * answers to through its prototype are never a cert id: a restore or a sync
 * pull refuses them as the active exam, and every content loader, store read
 * and exam-date read treats them as "no such exam" (own-key lookups only).
 *
 * MEDIUM-1: the app studies an exam only when it knows it AND its content is
 * on this phone (lib/activeCert.ts effectiveCertId). The stored choice is kept
 * as it is; the screens fall back to the default exam.
 *
 * MEDIUM-2: a restore trims each kind of id only when this phone has ids of
 * that kind.
 *
 * LOW-1: at most 16 exams in a file. LOW-2: the lessons builder never reads a
 * scene type or copies a key through the prototype.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { installFakePack } from '../../jest/fakePack';
import Learn from '../app/(tabs)/learn';
import { DEFAULT_CERT_ID } from '../content/certifications';
import { getExamGuide, getFinalWeek } from '../content/exam';
import { firstSetIds } from '../content/firstSet';
import { getRoleDeck, getStepSequences } from '../content/games';
import { findLesson, lessonsFor } from '../content/lessons';
import { findQuestion, getAllQuestions, getDomainQuestions, hasContent } from '../content/loader';
import { getNotes, noteSubtopics } from '../content/notes';
import { clearContentCaches, packInstalled, sourceFor } from '../content/packs';
import { own } from '../content/packs/bundled';
import { getPrinciples } from '../content/principles';
import {
  BACKUP_SCHEMA,
  isCertId,
  keepKnownIds,
  MAX_CERTS,
  readBackup,
  RESERVED_CERT_IDS,
  type BackupError,
  type BackupProgress,
  type KnownIds,
} from '../engine/backup';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { readSnapshot } from '../engine/syncMerge';
import { activeCertIdNow, effectiveCertId } from '../lib/activeCert';
import { knownIds } from '../lib/backup';
import { selectCert, useProgress } from '../store/progress';
import { examDateOf, useSettings } from '../store/settings';

/* eslint-disable @typescript-eslint/no-require-imports */
const { buildLessonsPack } = require('../../scripts/lessons-pack.cjs');
/* eslint-enable @typescript-eslint/no-require-imports */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissAll: jest.fn(), setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const T = Date.UTC(2026, 9, 20);
const CERTS = ['cisa', 'cism', 'crisc', 'aaia', 'cissp'];
const PROTO_NAMES = ['constructor', 'prototype', 'hasownproperty', 'tostring', 'valueof', 'isprototypeof', '__proto__'];
const ans = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T };

const stores = (byCert: Record<string, unknown>, activeCertId = 'cisa') => ({
  settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId } },
  progress: { version: PROGRESS_VERSION, state: { byCert, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } },
});
const file = (byCert: Record<string, unknown>, activeCertId = 'cisa') =>
  JSON.stringify({ app: 'kaisip', schema: BACKUP_SCHEMA, exportedAt: new Date(T).toISOString(), appVersion: '1.46.0', stores: stores(byCert, activeCertId) });
const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'ok';
  } catch (e) {
    return (e as BackupError).code;
  }
};

let r: ReactTestRenderer | undefined;
let undoPack: (() => void) | undefined;
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  undoPack?.();
  undoPack = undefined;
  clearContentCaches();
  useSettings.setState({ activeCertId: 'cisa' });
});
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') out.push(n);
    else n.children.forEach(walk);
  };
  walk(r!.root);
  return out.join(' ');
};

describe('HIGH-1: a prototype member’s name is never an exam', () => {
  it('the id rule refuses every one, and still accepts real ids', () => {
    for (const id of PROTO_NAMES) expect(isCertId(id)).toBe(false);
    for (const id of ['cisa', 'cc', 'cissp', 'sec-plus']) expect(isCertId(id)).toBe(true);
  });

  it('the fixed denylist covers every Object.prototype and Function.prototype name of the id shape, on this engine', () => {
    const names = [...Object.getOwnPropertyNames(Object.prototype), ...Object.getOwnPropertyNames(Function.prototype)]
      .map((n) => n.toLowerCase())
      .filter((n) => /^[a-z0-9-]{2,20}$/.test(n));
    for (const n of names) expect(RESERVED_CERT_IDS.has(n)).toBe(true);
  });

  it('a restore refuses "constructor" or "prototype" as the active exam, an exam date or a progress key', () => {
    for (const id of ['constructor', 'prototype', 'tostring', 'hasownproperty']) {
      expect(codeOf(() => readBackup(file({ cisa: {} }, id), CERTS))).toBe('unknown-cert');
      // Even an app that listed it as known refuses it.
      expect(codeOf(() => readBackup(file({ cisa: {} }, id), [...CERTS, id]))).toBe('unknown-cert');
      const dated = JSON.parse(file({ cisa: {} }));
      dated.stores.settings.state.examDates = { [id]: '2026-12-01' };
      expect(codeOf(() => readBackup(JSON.stringify(dated), CERTS))).not.toBe('ok');
      expect(codeOf(() => readBackup(file({ [id]: { answers: { d1_001: ans } } }), CERTS))).not.toBe('ok');
    }
  });

  it('a sync pull (readSnapshot) refuses them too', () => {
    const ctx = { now: T, knownCertIds: CERTS, thisApp: '1.46.0' };
    for (const id of ['constructor', 'prototype']) {
      const snap = { state: { onboarded: true, activeCertId: id }, storeVersion: SETTINGS_VERSION, appVersion: '1.46.0' };
      expect(codeOf(() => readSnapshot('settings', snap, ctx))).toBe('unknown-cert');
    }
  });

  it('every content loader says "nothing" for "constructor", never the Object function', () => {
    for (const id of ['constructor', 'prototype', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(hasContent(id)).toBe(false);
      expect(packInstalled(id)).toBe(false);
      expect(getAllQuestions(id)).toEqual([]);
      expect(getDomainQuestions(id, '1')).toEqual([]);
      expect(getDomainQuestions('cisa', id)).toEqual([]);
      expect(findQuestion(id, 'd1_001')).toBeUndefined();
      expect(getNotes(id)).toBeNull();
      expect(noteSubtopics(id)).toEqual([]);
      expect(getPrinciples(id)).toBeNull();
      expect(getExamGuide(id)).toBeNull();
      expect(getFinalWeek(id)).toBeNull();
      expect(lessonsFor(id)).toEqual([]);
      expect(getRoleDeck(id)).toBeNull();
      expect(getStepSequences(id)).toEqual([]);
      expect(sourceFor(id).gameDeck('cisa', id as 'roles')).toBeNull();
      expect(firstSetIds(id)).toEqual([]);
    }
    expect(findLesson('constructor')).toBeUndefined();
    expect(own({ a: 1 }, 'constructor')).toBeUndefined();
  });

  it('the stores read "constructor" as no data: progress, today’s plan and exam dates', () => {
    const cp = selectCert(useProgress.getState(), 'constructor');
    expect(cp.answers).toEqual({});
    expect(typeof cp).toBe('object');
    expect(examDateOf({ cisa: '2026-12-01' }, 'constructor')).toBeUndefined();
    expect(examDateOf({ cisa: '2026-12-01' }, 'cisa')).toBe('2026-12-01');
  });

  it('Learn opens on CISA, not a crash, even with "constructor" stored as the exam', () => {
    useSettings.setState({ activeCertId: 'constructor' });
    expect(() => {
      act(() => {
        r = create(<Learn />);
      });
    }).not.toThrow();
    expect(allText()).toContain('The audit charter');
  });
});

describe('MEDIUM-1: only an exam whose content is on this phone is studied', () => {
  it('the resolver: known and installed, else the default exam', () => {
    expect(DEFAULT_CERT_ID).toBe('cisa');
    expect(effectiveCertId('cisa')).toBe('cisa');
    expect(effectiveCertId('cism')).toBe('cisa'); // known, but no content here
    expect(effectiveCertId('zz9')).toBe('cisa'); // a pack from another phone, no descriptor here
    expect(effectiveCertId('constructor')).toBe('cisa');
    undoPack = installFakePack('cism');
    expect(effectiveCertId('cism')).toBe('cism'); // once its content is here, it is studied
  });

  it('the stored choice is kept as it is; the app reads the effective one', () => {
    useSettings.setState({ activeCertId: 'zz9' });
    expect(useSettings.getState().activeCertId).toBe('zz9');
    expect(activeCertIdNow()).toBe('cisa');
  });

  it('Learn shows CISA for an exam whose content is not on this phone', () => {
    useSettings.setState({ activeCertId: 'cism' });
    act(() => {
      r = create(<Learn />);
    });
    expect(allText()).toContain('The audit charter');
  });
});

describe('MEDIUM-2: each kind of id is trimmed only when this phone has that kind', () => {
  const EMPTY = { questions: new Set<string>(), lessons: new Set<string>(), notes: new Set<string>() };
  const progress = (cp: Record<string, unknown>) => ({ byCert: { cisa: cp }, streak: { current: 0, best: 0, lastDay: null } }) as unknown as BackupProgress;
  const cp = {
    answers: { d1_001: ans, gone_1: ans },
    bookmarks: ['d1_001', 'gone_1'],
    lessonsDone: ['cisa-l-d1-charter', 'cisa-l-gone'],
    notesRead: ['1A1.1', '9Z9.9'],
    mastery: { '1A1.1': '2026-10-01', '9Z9.9': '2026-10-01' },
    cards: { 'flow:cisa-l-gone': { box: 1, dueAt: T, lastSeen: T, reps: 1 }, 'rumor:9Z9.9:k1': { box: 1, dueAt: T, lastSeen: T, reps: 1 } },
  };

  it('a pack with questions only: questions trimmed, lessons, notes and their cards kept', () => {
    const k: KnownIds = { ...EMPTY, installed: true, questions: new Set(['d1_001']) };
    const out = keepKnownIds(progress(cp), () => k).byCert.cisa;
    expect(Object.keys(out.answers!)).toEqual(['d1_001']);
    expect(out.bookmarks).toEqual(['d1_001']);
    expect(out.lessonsDone).toEqual(cp.lessonsDone);
    expect(out.notesRead).toEqual(cp.notesRead);
    expect(out.mastery).toEqual(cp.mastery);
    expect(Object.keys(out.cards!)).toEqual(Object.keys(cp.cards));
  });

  it('with every kind present, every kind is trimmed', () => {
    const k: KnownIds = { installed: true, questions: new Set(['d1_001']), lessons: new Set(['cisa-l-d1-charter']), notes: new Set(['1A1.1']) };
    const out = keepKnownIds(progress(cp), () => k).byCert.cisa;
    expect(out.lessonsDone).toEqual(['cisa-l-d1-charter']);
    expect(out.notesRead).toEqual(['1A1.1']);
    expect(Object.keys(out.mastery!)).toEqual(['1A1.1']);
    expect(out.cards).toEqual({});
  });

  it('lib/backup: installed means content AND question ids', () => {
    expect(knownIds('cisa').installed).toBe(true);
    expect(knownIds('cism').installed).toBe(false);
    expect(knownIds('constructor').installed).toBe(false);
  });
});

describe('LOW-1: at most 16 exams in a file', () => {
  it('16 is fine, 17 is refused', () => {
    expect(MAX_CERTS).toBe(16);
    const exams = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`ex-${i}`, {}]));
    expect(codeOf(() => readBackup(file(exams(16)), CERTS))).toBe('ok');
    expect(codeOf(() => readBackup(file(exams(17)), CERTS))).toBe('bad-data');
  });
});

describe('LOW-2: the lessons builder never goes through the prototype', () => {
  const lesson = (scenes: unknown[], extra: Record<string, unknown> = {}) => ({
    id: 'zz9-l-1',
    certId: 'zz9',
    domainId: '1',
    order: 1,
    title: 't',
    minutes: 1,
    provenance: 'p',
    references: ['r'],
    outlineVersion: 'o',
    lastReviewed: '2026-10-27',
    scenes,
    ...extra,
  });
  it('a scene typed "constructor" or "toString" is an unknown type', () => {
    for (const type of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      const { problems } = buildLessonsPack({ schema_version: 1, lessons: [lesson([{ type }])] }, 'zz9');
      expect(problems.join(' ')).toMatch(/unknown type/);
    }
  });
  it('"constructor" and "prototype" keys are never copied into the pack', () => {
    const raw = JSON.parse(JSON.stringify({ schema_version: 1, lessons: [lesson([{ type: 'tip', body: 'b', constructor: 'x', prototype: 'y' }], { constructor: 'z' })] }));
    const { pack } = buildLessonsPack(raw, 'zz9');
    expect(Object.prototype.hasOwnProperty.call(pack[0], 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(pack[0].scenes[0], 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(pack[0].scenes[0], 'prototype')).toBe(false);
    expect(pack[0].scenes[0]).toEqual({ type: 'tip', body: 'b' });
  });
});
