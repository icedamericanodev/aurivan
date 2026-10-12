/**
 * Plant contact sheets, drawn by the APP's renderer (components/plant/Plant.tsx)
 * through react-native-web + react-native-svg's web build, server-rendered to
 * HTML. Run by plant_sheet.sh (a one-file jest run with the jest-expo web
 * preset, so the app's TSX and module aliases work unchanged), which then
 * screenshots the pages with Playwright.
 *
 * Writes into $PLANT_SHEET_OUT:
 *   contact-light.html / contact-dark.html  13 species × 6 growths (200pt shared stage, 64pt and 24pt framed)
 *   quiet-light.html / quiet-dark.html      face vs Quiet look, plus the resting look
 *   sizes-light.html / sizes-dark.html      24 / 64 / 200pt strips
 *   organs-light.html                       domain organs: weak, uneven, strong (CISA weights)
 *   looks-light.html / looks-dark.html      mobile 1.14: colourways, grounds, planters, visitors, sample looks
 *   keepsakes-light.html / keepsakes-dark.html  every keepsake, and keepsakes on 3 species
 *   chips-light.html / chips-dark.html      24pt chips (lotus, sampaguita, round crowns by shape)
 *   moods-light.html / moods-dark.html      each mood on the face (and Quiet look shows none)
 *   proud-light.html / proud-dark.html      mobile 1.18: proud beside rest, happy and resting on all 13 species
 */
import fs from 'fs';
import path from 'path';
import type { ReactElement } from 'react';
import { Plant } from '../../src/components/plant/Plant';
import { KeepsakeIcon, PlanterIcon } from '../../src/components/plant/Keepsake';
import { colourwaysFor, GROUNDS, KEEPSAKE_ITEMS, plantersFor, resolveLook, VISITORS, LOOK_ITEMS } from '../../src/engine/plantLooks';
import { getCertification } from '../../src/content/certifications';
import { GROWTH_LOOKS, GROWTH_NAMES, organs, organScales, plantLabel, PLANT_SPECIES, SPECIES_INFO, type GrowthLevel, type PlantSpecies } from '../../src/engine/plant';
import { dark, light } from '../../src/theme/tokens';

// react-dom ships no types in this project (the app never imports it); only this sheet uses it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server') as { renderToStaticMarkup: (el: ReactElement) => string };

const OUT = process.env.PLANT_SHEET_OUT || path.join(process.cwd(), 'plant-sheets');
const GROWTHS: GrowthLevel[] = [1, 2, 3, 4, 5, 6];
const FONTS = path.join(process.cwd(), 'node_modules/@expo-google-fonts');

type Theme = 'light' | 'dark';
const pal = (t: Theme) => (t === 'dark' ? dark : light);

function plant(props: Parameters<typeof Plant>[0]): string {
  return renderToStaticMarkup(<Plant {...props} />);
}

function page(title: string, sub: string, body: string, theme: Theme, width: number): string {
  const c = pal(theme);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;src:url(file://${FONTS}/fraunces/500Medium/Fraunces_500Medium.ttf);font-weight:500}
@font-face{font-family:Fraunces;font-style:italic;src:url(file://${FONTS}/fraunces/400Regular_Italic/Fraunces_400Regular_Italic.ttf)}
@font-face{font-family:Figtree;src:url(file://${FONTS}/figtree/400Regular/Figtree_400Regular.ttf);font-weight:400}
@font-face{font-family:Figtree;src:url(file://${FONTS}/figtree/600SemiBold/Figtree_600SemiBold.ttf);font-weight:600}
*{box-sizing:border-box}body{margin:0;background:${c.bg};color:${c.ink};font-family:Figtree;width:${width}px;padding:36px}
h1{font-family:Fraunces;font-weight:500;font-size:34px;letter-spacing:-.6px;margin:0 0 6px}
.meta{font-size:14px;color:${c.ink2}}
.cap{font-size:12px;font-weight:600;color:${c.ink2};text-align:center}
.it{font-family:Fraunces;font-style:italic;font-size:17px}
.row{display:flex;gap:8px;align-items:flex-end}
.cell{display:flex;flex-direction:column;align-items:center;gap:4px;width:204px}
.lab{width:118px;flex:none;align-self:center;font-weight:600;font-size:15px}
.lab small{display:block;font-weight:400;color:${c.ink2};font-size:12px}
.sm{display:flex;gap:10px;align-items:flex-end;justify-content:center;height:68px}
.card{background:${c.raised};border-radius:16px;padding:8px}
hr{border:none;border-top:1px solid ${c.line};margin:14px 0}
.grid{display:grid;gap:14px}
</style></head><body><h1>${title}</h1><div class="meta">${sub}</div>${body}</body></html>`;
}

const label = (species: PlantSpecies, g: GrowthLevel) => plantLabel({ species, growth: g });

function contact(theme: Theme): string {
  let b = `<div class="row" style="margin-top:18px"><div class="lab"></div>${GROWTHS.map((g) => `<div class="cell"><div class="it">${g} · ${GROWTH_NAMES[g]}</div><div class="cap">${GROWTH_LOOKS[g]}</div></div>`).join('')}</div>`;
  for (const sp of PLANT_SPECIES) {
    b += `<hr><div class="row"><div class="lab">${SPECIES_INFO[sp].name}<small>${sp}</small></div>${GROWTHS.map(
      (g) =>
        `<div class="cell"><div>${plant({ species: sp, stage: g, size: 200, theme, accessibilityLabel: label(sp, g) })}</div><div class="sm"><div>${plant({ species: sp, stage: g, size: 64, theme })}</div><div>${plant({ species: sp, stage: g, size: 24, theme })}</div></div></div>`,
    ).join('')}</div>`;
  }
  return page('Your plant · every species, every growth', `Rendered by the app's &lt;Plant&gt; (react-native-svg). Each cell: 200pt on the shared stage (so growth reads), then 64pt and 24pt framed. ${theme === 'light' ? 'Light' : 'Dark'} theme.`, b, theme, 1440);
}

function quiet(theme: Theme): string {
  const row = (title: string, f: (sp: PlantSpecies) => string) =>
    `<div style="margin-top:22px;font-weight:600">${title}</div><div class="row" style="flex-wrap:wrap;gap:10px;margin-top:8px">${PLANT_SPECIES.map((sp) => `<div class="card" style="text-align:center">${f(sp)}<div class="cap">${SPECIES_INFO[sp].name}</div></div>`).join('')}</div>`;
  const b =
    row('Face on (default), Crown, 120pt', (sp) => plant({ species: sp, stage: 5, size: 120, theme, fit: true })) +
    row('Quiet look (no face), Crown, 120pt', (sp) => plant({ species: sp, stage: 5, size: 120, theme, fit: true, quietLook: true })) +
    row('Resting (dusk and a moon), Crown, 120pt', (sp) => plant({ species: sp, stage: 5, size: 120, theme, fit: true, resting: true })) +
    row('Resting with Quiet look, Sprout and Bough, 120pt', (sp) => plant({ species: sp, stage: sp.length % 2 ? 2 : 4, size: 120, theme, fit: true, resting: true, quietLook: true }));
  return page('Your plant · face, Quiet look and rest', 'The face is on by default; Quiet look removes it. Resting changes the scene, never the plant.', b, theme, 1400);
}

function sizes(theme: Theme): string {
  let b = '';
  for (const g of [2, 4, 6] as GrowthLevel[]) {
    b += `<div style="margin-top:20px" class="it">${GROWTH_NAMES[g]}</div><div class="row" style="flex-wrap:wrap;gap:14px;margin-top:6px">${PLANT_SPECIES.map(
      (sp) => `<div style="display:flex;align-items:flex-end;gap:6px">${plant({ species: sp, stage: g, size: 24, theme })}${plant({ species: sp, stage: g, size: 64, theme })}</div>`,
    ).join('')}</div>`;
  }
  b += `<div style="margin-top:24px" class="it">200pt, Crown</div><div class="row" style="flex-wrap:wrap;gap:6px">${PLANT_SPECIES.slice(0, 6)
    .map((sp) => plant({ species: sp, stage: 5, size: 200, theme, fit: true }))
    .join('')}</div>`;
  return page('Your plant · 24 / 64 / 200pt', '24pt is the icon level (silhouette, no face); 64pt the small level; 200pt full detail.', b, theme, 1500);
}

function organSheet(theme: Theme): string {
  const cisa = getCertification('cisa')!;
  const weights = cisa.domains.map((d) => d.weight);
  const cases: [string, number[]][] = [
    ['Every domain at 10%', [0.1, 0.1, 0.1, 0.1, 0.1]],
    ['Uneven: 92 · 45 · 75 · 30 · 85%', [0.92, 0.45, 0.75, 0.3, 0.85]],
    ['Every domain at 90%', [0.9, 0.9, 0.9, 0.9, 0.9]],
  ];
  let b = '';
  for (const [title, m] of cases) {
    const sc = organScales(organs(weights, m.map((x) => ({ answered: 20, mastery: x }))));
    b += `<div style="margin-top:20px;font-weight:600">${title} <span class="meta">(organ scales ${sc.map((v) => v.toFixed(2)).join(' · ')})</span></div><div class="row" style="flex-wrap:wrap;gap:6px">${PLANT_SPECIES.map((sp) => plant({ species: sp, stage: 5, size: 140, theme, fit: true, organs: sc })).join('')}</div>`;
  }
  return page('Your plant · domain organs', 'Organ size follows the CISA blueprint weight (12% to 26%) and fullness follows mastery (62% to 108%). A weak domain looks young, never bare.', b, theme, 1500);
}

const ALL = LOOK_ITEMS.map((x) => x.id);
const art = (species: PlantSpecies, look: Parameters<typeof resolveLook>[1], visitor = false) => {
  const r = resolveLook(species, look, ALL);
  return { palette: r.palette, ground: r.ground, planter: r.planter, visitor: visitor && r.visitor !== 'no-visitor' ? r.visitor : undefined, keepsakes: r.keepsakes };
};
const cardRow = (title: string, cells: string[]) => `<div style="margin-top:20px;font-weight:600">${title}</div><div class="row" style="flex-wrap:wrap;gap:10px;margin-top:8px">${cells.join('')}</div>`;
const card = (inner: string, cap: string) => `<div class="card" style="text-align:center">${inner}<div class="cap" style="max-width:150px">${cap}</div></div>`;

function looks(theme: Theme): string {
  let b = '';
  b += cardRow(
    'Colourways (three per species: two free, the third at Bough), Crown, 120pt',
    PLANT_SPECIES.flatMap((sp) => colourwaysFor(sp).map((cw) => card(plant({ species: sp, stage: 5, size: 120, theme, fit: true, look: art(sp, { colourway: cw.id }) }), `${SPECIES_INFO[sp].name} · ${cw.name}`))),
  );
  b += cardRow('Grounds (Meadow free, Stone ring at Crown, Trail blaze at Elder), oak and cactus', ['oak', 'cactus', 'lotus'].flatMap((sp) => GROUNDS.map((g) => card(plant({ species: sp as PlantSpecies, stage: 6, size: 130, theme, fit: true, look: art(sp as PlantSpecies, { ground: g.id }) }), `${g.name}`))));
  b += cardRow('Planters (your own ground and terracotta free; one per completed badge set), Crown, 130pt', ['oak', 'sunflower', 'lotus', 'bonsai'].flatMap((sp) => plantersFor(sp as PlantSpecies).map((pl) => card(plant({ species: sp as PlantSpecies, stage: 5, size: 130, theme, fit: true, look: art(sp as PlantSpecies, { planter: pl.id }) }), `${SPECIES_INFO[sp as PlantSpecies].name} · ${pl.name}`))));
  b += cardRow('Visitors (on days you clear your plan), 140pt', ['oak', 'pine', 'sunflower', 'cactus', 'bamboo', 'coconut-palm', 'sampaguita'].flatMap((sp) => VISITORS.filter((v) => v.id !== 'no-visitor').map((v) => card(plant({ species: sp as PlantSpecies, stage: 5, size: 140, theme, fit: true, look: art(sp as PlantSpecies, { visitor: v.id }, true) }), `${SPECIES_INFO[sp as PlantSpecies].name} · ${v.name}`))));
  const samples: [PlantSpecies, number, Parameters<typeof resolveLook>[1], string][] = [
    ['oak', 6, { colourway: 'oak-autumn', ground: 'trail-blaze', planter: 'native', keepsakes: ['lantern', 'fox', 'jay'] }, 'Autumn oak, trail blaze, lantern · fox · jay'],
    ['cherry-blossom', 5, { colourway: 'cherry-blossom-white', planter: 'celadon', keepsakes: ['clear-dawn', 'sundial', 'stepping-stone'] }, 'White cherry in celadon, clear dawn · sundial · stone'],
    ['cactus', 6, { colourway: 'cactus-yellow', planter: 'compass-rose', ground: 'stone-ring', keepsakes: ['cairn', 'roe-deer'] }, 'Yellow-bloom cactus, compass-rose planter'],
    ['lotus', 6, { colourway: 'lotus-violet', planter: 'five-stone', keepsakes: ['still-pond', 'swallow', 'fern'] }, 'Violet lotus in the five-stone planter'],
    ['sunflower', 5, { colourway: 'sunflower-velvet', planter: 'banded', keepsakes: ['signpost', 'mushroom-ring'] }, 'Velvet sunflower, banded planter'],
    ['bamboo', 6, { planter: 'root-woven', keepsakes: ['pebble-path', 'woven-ring', 'weather-vane'] }, 'Bamboo in the root-woven basket'],
  ];
  b += cardRow('Sample looks (200pt, the hero stage)', samples.map(([sp, g, l, cap]) => card(plant({ species: sp, stage: g as GrowthLevel, size: 200, theme, fit: false, look: { ...art(sp, l), visitor: 'robin' } }), cap)));
  return page('Your plant · looks', 'Colour, ground, planter, visitor and keepsakes (mobile 1.14). Cosmetics only: they carry no readiness claim.', b, theme, 1500);
}

function keepsakeSheet(theme: Theme): string {
  let b = cardRow('Every keepsake (each badge’s emblem), 48pt icon (fitted to 80% height)', KEEPSAKE_ITEMS.map((k) => card(renderToStaticMarkup(<KeepsakeIcon id={k.id} size={48} theme={theme} />), k.name)));
  b += cardRow('Planter icons (the Look screen’s planter rows), 40pt', (['oak', 'lotus', 'bonsai', 'cactus'] as PlantSpecies[]).flatMap((sp) => plantersFor(sp).map((pl) => card(renderToStaticMarkup(<PlanterIcon id={pl.id} species={sp} size={40} theme={theme} />), `${SPECIES_INFO[sp].name} · ${pl.name}`))));
  for (const sp of ['oak', 'sunflower', 'cactus'] as PlantSpecies[]) {
    const sets = [
      ['stepping-stone', 'trail-post', 'trail-board'],
      ['compass-stone', 'jay', 'empty-nest'],
      ['woven-ring', 'fern', 'still-pond'],
      ['dew-web', 'weather-vane', 'lantern'],
      ['sundial', 'swallow', 'fox'],
      ['cairn', 'signpost', 'clear-dawn'],
      ['roe-deer', 'mushroom-ring', 'pebble-path'],
      ['ribbon', 'lantern', 'fox'],
    ];
    b += cardRow(`Keepsakes on the ${SPECIES_INFO[sp].lower} (three at a time), 160pt`, sets.map((ks) => card(plant({ species: sp, stage: 5, size: 160, theme, fit: true, look: art(sp, { keepsakes: ks }) }), ks.join(' · '))));
    b += cardRow(`… at 64pt and at Sprout`, sets.slice(0, 4).map((ks) => card(plant({ species: sp, stage: 5, size: 64, theme, look: art(sp, { keepsakes: ks }) }) + plant({ species: sp, stage: 2, size: 64, theme, look: art(sp, { keepsakes: ks }) }), ks.join(' · '))));
  }
  return page('Your plant · keepsakes', 'Each badge’s emblem becomes a small object by the plant, with a caption that names the skill. Up to three are shown.', b, theme, 1500);
}

function chips(theme: Theme): string {
  let b = '';
  for (const g of [3, 4, 5, 6] as GrowthLevel[]) {
    b += `<div style="margin-top:18px" class="it">${GROWTH_NAMES[g]} · 24pt (actual) and 24pt ×3</div><div class="row" style="flex-wrap:wrap;gap:16px;margin-top:6px">${PLANT_SPECIES.map(
      (sp) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">${plant({ species: sp, stage: g, size: 24, theme })}<div style="zoom:3">${plant({ species: sp, stage: g, size: 24, theme })}</div><div class="cap">${SPECIES_INFO[sp].name}</div></div>`,
    ).join('')}</div>`;
  }
  return page('Your plant · 24pt chips', 'Lotus and sampaguita read at 24pt; the round-crown trees differ by shape: oak round, maple a flame, narra an umbrella, cherry three puffs, mango a dome with fruit.', b, theme, 1500);
}

function moodSheet(theme: Theme): string {
  const moods = ['idle', 'happy', 'curious', 'proud', 'resting'] as const;
  let b = '';
  for (const sp of ['oak', 'sunflower', 'cactus', 'lotus', 'bamboo', 'sampaguita'] as PlantSpecies[])
    b += cardRow(SPECIES_INFO[sp].name, [
      ...moods.map((m) => card(plant({ species: sp, stage: 5, size: 130, theme, fit: true, mood: m === 'resting' ? undefined : m, resting: m === 'resting' }), m)),
      card(plant({ species: sp, stage: 5, size: 130, theme, fit: true, mood: 'proud', quietLook: true }), 'Quiet look: no face, no mood'),
    ]);
  return page('Your plant · moods', 'Idle, happy, curious, proud and resting, on the face only. Never sad.', b, theme, 1500);
}

/**
 * Mobile 1.18: the proud face on EVERY species, beside rest (idle), happy and
 * resting, at Crown (130pt) and on Today's 104pt small detail level, so the
 * redraw can be checked to read as proud (not smug or sleepy) on all 13.
 */
function proudSheet(theme: Theme): string {
  const moods = ['idle', 'happy', 'proud', 'resting'] as const;
  let b = '';
  for (const sp of PLANT_SPECIES)
    b += cardRow(SPECIES_INFO[sp].name, [
      ...moods.map((m) => card(plant({ species: sp, stage: 5, size: 130, theme, fit: true, mood: m === 'resting' ? undefined : m, resting: m === 'resting' }), m)),
      card(plant({ species: sp, stage: 3, size: 104, theme, fit: true, lod: 'small', mood: 'proud' }), 'proud · Shoot, 104pt (Today)'),
      card(plant({ species: sp, stage: 5, size: 64, theme, fit: true, mood: 'proud' }), 'proud · 64pt (You)'),
      card(plant({ species: sp, stage: 5, size: 130, theme, fit: true, mood: 'proud', quietLook: true }), 'Quiet look'),
    ]);
  return page('Your plant · proud on every species', 'Rest, happy, proud and resting at Crown; proud at Today’s and You’s sizes; Quiet look shows no face.', b, theme, 1500);
}

describe('plant sheets', () => {
  it('writes the HTML sheets', () => {
    fs.mkdirSync(OUT, { recursive: true });
    for (const t of ['light', 'dark'] as Theme[]) {
      fs.writeFileSync(path.join(OUT, `contact-${t}.html`), contact(t));
      fs.writeFileSync(path.join(OUT, `quiet-${t}.html`), quiet(t));
      fs.writeFileSync(path.join(OUT, `sizes-${t}.html`), sizes(t));
      fs.writeFileSync(path.join(OUT, `looks-${t}.html`), looks(t));
      fs.writeFileSync(path.join(OUT, `keepsakes-${t}.html`), keepsakeSheet(t));
      fs.writeFileSync(path.join(OUT, `chips-${t}.html`), chips(t));
      fs.writeFileSync(path.join(OUT, `moods-${t}.html`), moodSheet(t));
      fs.writeFileSync(path.join(OUT, `proud-${t}.html`), proudSheet(t));
    }
    fs.writeFileSync(path.join(OUT, 'organs-light.html'), organSheet('light'));
    expect(fs.existsSync(path.join(OUT, 'contact-light.html'))).toBe(true);
  });
});
