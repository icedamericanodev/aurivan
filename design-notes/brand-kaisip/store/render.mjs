// Renders the Google Play graphics in this folder (docs/mobile/PLAY_LAUNCH.md c9).
// Run from the repo root:  node design-notes/brand-kaisip/store/render.mjs
//
//   feature-graphic-1024x500.png  from feature-graphic.html (Playwright, 1024x500 @1x),
//                                 then flattened to 24-bit RGB, no alpha (Play's rule)
//   play-icon-512.png             from ../png/icon-1024.png, resized to 512x512,
//                                 saved as 32-bit RGBA PNG (Play's rule, at most 1 MB)
//
// Needs Playwright (preinstalled in Claude cloud sessions; locally:
// npx playwright install chromium) and Python 3 with Pillow.
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || '/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const chrome = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// ── Feature graphic ────────────────────────────────────────────────────
const feature = path.join(here, 'feature-graphic-1024x500.png');
let browser;
try {
  browser = await chromium.launch({ executablePath: chrome });
} catch {
  browser = await chromium.launch(); // a local Playwright install with its own browser
}
const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'feature-graphic.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: feature });
await browser.close();
execFileSync('python3', [path.join(repo, 'mobile/scripts/screenshots/flatten_png.py'), '--bg', '#1E4A34', feature], { stdio: 'inherit' });

// ── Play icon ──────────────────────────────────────────────────────────
const icon = path.join(here, 'play-icon-512.png');
const py = `
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGBA").resize((512, 512), Image.LANCZOS)
img.save(out, "PNG", optimize=True)
print(f"{out}: {img.size[0]}x{img.size[1]} {img.mode}")
`;
execFileSync('python3', ['-c', py, path.join(repo, 'design-notes/brand-kaisip/png/icon-1024.png'), icon], { stdio: 'inherit' });
