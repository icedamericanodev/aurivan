/**
 * The website's plant (../assets/kaisip-plant.js) is the app's own engine,
 * compiled by scripts/build-web-plant.mjs. These tests load that committed
 * file the way a browser does (one script, one global) and check it against
 * the TypeScript sources, so the web and the app always grow and draw the
 * same plant:
 * - the file is up to date with the sources, and index.html loads this build;
 * - the outline the website builds from the raw notes file equals the app's;
 * - the shared learner histories (scripts/web-plant-fixtures.cjs) give the
 *   same facts and the same growth on both, and the expected growth;
 * - the art: every species, growth and theme builds the same part tree.
 * The browser side (index.html answering the same histories) is checked by
 * the website's Playwright parity test against this same engine.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { getCertification } from '../content/certifications';
import { getNotes } from '../content/notes';
import { buildPlant } from '../components/plant/art';
import * as examReady from '../engine/examReady';
import * as mastery from '../engine/mastery';
import { indexOutline, outlineFromNotes } from '../engine/outline';
import { growthFor, nextGrowthSteps, plantFacts, PLANT_SPECIES, type GrowthLevel } from '../engine/plant';
import * as readiness from '../engine/readiness';
import * as readinessRange from '../engine/readinessRange';
import * as streak from '../engine/streak';
import { certOutline, questionExists } from '../lib/outline';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundle = require('../../scripts/web-plant-bundle.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fx = require('../../scripts/web-plant-fixtures.cjs');

const ASSET = path.join(__dirname, '..', '..', '..', 'assets', 'kaisip-plant.js');
const RAW_NOTES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', 'cisa_notes.json'), 'utf8'));

/** The committed bundle, run like a browser script (its own global). */
function loadWebPlant(): any {
  const sandbox: Record<string, unknown> = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(ASSET, 'utf8'), sandbox, { filename: 'kaisip-plant.js' });
  return sandbox.KaiSipPlant;
}
const K = loadWebPlant();
const cisa = getCertification('cisa')!;
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));
/** lib/plant.ts plantSubtopics, without the stores it lives beside: subtopics with a practice question, per domain. */
function plantSubtopics(certId: string): string[][] {
  const exists = questionExists(certId);
  const topics = certOutline(certId).topics;
  return cisa.domains.map((d) => topics.filter((t) => t.domainId === d.id).flatMap((t) => t.subtopics.filter((x) => x.questionIds.some(exists)).map((x) => x.id)));
}

describe('website plant bundle', () => {
  it('is up to date with the plant sources, and index.html loads this build', () => {
    expect(bundle.checkBundle()).toEqual([]);
  }, 60_000);

  it('exposes the engine, looks, art and outline', () => {
    for (const k of ['plant', 'looks', 'art', 'mastery', 'readiness', 'readinessRange', 'examReady', 'streak', 'outline', 'notesPack']) expect(K[k]).toBeTruthy();
    expect([...K.plant.PLANT_SPECIES]).toEqual([...PLANT_SPECIES]);
  });

  it('uses the same certification as the website (DI weights, exam size)', () => {
    expect(cisa.domains.map((d) => ({ id: d.id, weight: d.weight }))).toEqual(fx.WEB_CISA.domains);
    expect(cisa.exam.questions).toBe(fx.WEB_CISA.exam.questions);
  });

  it('builds the same outline from the raw notes as the app', () => {
    const topics = K.outline.outlineFromNotes(K.notesPack.buildNotesPack(RAW_NOTES, 'cisa').pack);
    const web = cisa.domains.map((d) =>
      topics.filter((t: any) => t.domainId === d.id).flatMap((t: any) => t.subtopics.filter((s: any) => s.questionIds.length).map((s: any) => s.id)),
    );
    expect(web).toEqual(plantSubtopics('cisa'));
    const app = indexOutline(outlineFromNotes(getNotes('cisa')));
    const webIdx = K.outline.indexOutline(topics);
    for (const t of app.topics) for (const s of t.subtopics) for (const q of s.questionIds) expect(webIdx.subtopicOf(q)).toBe(app.subtopicOf(q));
  });

  describe('the shared learners grow the same plant', () => {
    const topics = outlineFromNotes(getNotes('cisa'));
    const subtopicOf = indexOutline(topics).subtopicOf;
    const ts = { readiness, readinessRange, examReady, mastery, streak };
    for (const learner of fx.learners(topics, cisa.domains.map((d) => d.id))) {
      it(learner.id, () => {
        const today = streak.dayKey(fx.NOW);
        const app = fx.mobileReplay(ts, cisa, learner, subtopicOf);
        const input = { cert: cisa, answers: app.answers, mastery: app.mastery, subtopicsByDomain: plantSubtopics('cisa'), mocks: app.mocks, readinessLog: app.readinessLog, today };
        const facts = plantFacts(input);
        // The same replay on the compiled engine gives the same saved data and facts.
        const web = fx.mobileReplay(K, plain(fx.WEB_CISA), learner, subtopicOf);
        expect(plain(web)).toEqual(plain(app));
        const webFacts = K.plant.plantFacts({ ...input, cert: fx.WEB_CISA, answers: web.answers, mastery: web.mastery, readinessLog: web.readinessLog, mocks: web.mocks });
        expect(plain(webFacts)).toEqual(plain(facts));
        const growth = growthFor(facts);
        expect(K.plant.growthFor(webFacts)).toBe(growth);
        expect(growth).toBe(learner.expectGrowth);
        expect(plain(K.plant.nextGrowthSteps(growth, webFacts))).toEqual(plain(nextGrowthSteps(growth as GrowthLevel, facts)));
      });
    }
  });

  it('draws the same part tree for every species, growth and theme', () => {
    for (const species of PLANT_SPECIES)
      for (let stage = 1; stage <= 6; stage++)
        for (const theme of ['light', 'dark'] as const) {
          const o = { species, stage, theme, organs: [0.7, 0.9, 1.0, 1.1, 0.8] };
          expect(JSON.stringify(K.art.buildPlant(o))).toBe(JSON.stringify(buildPlant(o)));
        }
    const look = { palette: 'gold' as const, ground: 'stone-ring', planter: 'terracotta', visitor: 'robin', keepsakes: ['lantern'] };
    expect(JSON.stringify(K.art.buildPlant({ species: 'oak', stage: 5, look, lod: 'small' }))).toBe(JSON.stringify(buildPlant({ species: 'oak', stage: 5, look, lod: 'small' })));
  });

  it('mobile 1.40: draws the botanical plant the same way, and has the style rule', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of [1, 4, 6])
        for (const theme of ['light', 'dark'] as const) {
          const o = { species, stage, theme, style: 'botanical' as const, px: 104, fit: true, organs: [0.7, 0.9, 1.0, 1.1, 0.8] };
          expect(JSON.stringify(K.art.buildPlant(o))).toBe(JSON.stringify(buildPlant(o)));
        }
    // The website's rule is the app's: no style = a plant from before (storybook); new plants are botanical.
    expect(K.looks.resolveStyle(undefined, undefined)).toBe('storybook-face');
    expect(K.looks.resolveStyle({}, { quietLook: true })).toBe('storybook');
    expect(K.looks.resolveStyle({ style: 'botanical' }, { quietLook: true })).toBe('botanical');
    expect(K.looks.styleHasFace('storybook-face')).toBe(true);
    expect(K.plant.plantNew('oak', 'Kai', 0).look).toEqual({ style: 'botanical' });
    expect(K.looks.STYLES.map((s: { id: string }) => s.id)).toEqual(['botanical', 'storybook', 'storybook-face']);
  });
});
