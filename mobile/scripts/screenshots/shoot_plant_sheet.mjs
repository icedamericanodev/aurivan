// Screenshots every plant sheet page in a folder (plant_sheet.sh step 2).
// Usage: node shoot_plant_sheet.mjs <dir>   (writes <name>.png beside each <name>.html)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const dir = process.argv[2];
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  const width = Number(/width:(\d+)px;padding/.exec(html)?.[1] ?? 1400);
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(dir, f));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const out = path.join(dir, f.replace(/\.html$/, '.png'));
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  console.log('wrote', out);
}
await browser.close();
