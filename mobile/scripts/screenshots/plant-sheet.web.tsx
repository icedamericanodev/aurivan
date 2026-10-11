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
 */
import fs from 'fs';
import path from 'path';
import type { ReactElement } from 'react';
import { Plant } from '../../src/components/plant/Plant';
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

describe('plant sheets', () => {
  it('writes the HTML sheets', () => {
    fs.mkdirSync(OUT, { recursive: true });
    for (const t of ['light', 'dark'] as Theme[]) {
      fs.writeFileSync(path.join(OUT, `contact-${t}.html`), contact(t));
      fs.writeFileSync(path.join(OUT, `quiet-${t}.html`), quiet(t));
      fs.writeFileSync(path.join(OUT, `sizes-${t}.html`), sizes(t));
    }
    fs.writeFileSync(path.join(OUT, 'organs-light.html'), organSheet('light'));
    expect(fs.existsSync(path.join(OUT, 'contact-light.html'))).toBe(true);
  });
});
