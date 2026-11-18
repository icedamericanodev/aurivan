/* Round four review checks. Dev-only: needs Playwright and a local server.
   Run from the repository root:
     python3 -m http.server 8000 &
     node design-notes/landing-round-four/qa.cjs
   Set CHROMIUM_PATH if Playwright cannot find a browser. */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8000/design-notes/landing-round-four/';
const PAGES = ['fieldwork', 'canopy', 'night'];
const WIDTHS = [[320, 640], [360, 760], [390, 844], [768, 1024], [844, 390], [1440, 900]];
let failures = 0;
const check = (ok, label) => { if (!ok) { failures++; console.log('  FAIL', label); } };

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const name of PAGES) {
    console.log(name);
    // Layout, assets and structure at each size.
    for (const [width, height] of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height } });
      const problems = [];
      const external = [];
      page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
      page.on('requestfailed', r => problems.push('failed ' + r.url()));
      page.on('request', r => { if (!r.url().startsWith('http://localhost:8000/')) external.push(r.url()); });
      await page.goto(BASE + name + '.html');
      await page.waitForTimeout(1800);
      const info = await page.evaluate(async () => {
        const height = document.documentElement.scrollHeight;
        for (let y = 0; y < height; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
        await new Promise(r => setTimeout(r, 400));
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          h1: document.querySelectorAll('h1').length,
          broken: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
          noAlt: [...document.images].filter(i => !i.alt).length,
          small: [...document.querySelectorAll('main a.button, main button, .site-header a.button, summary')]
            .filter(el => el.offsetParent && el.getBoundingClientRect().height < 44).map(el => el.textContent.trim().slice(0, 30)),
          enhanced: document.querySelector('.story').classList.contains('is-enhanced'),
        };
      });
      check(info.overflow <= 0, `${width}px horizontal overflow ${info.overflow}`);
      check(info.h1 === 1, `${width}px expected one h1, found ${info.h1}`);
      check(!info.broken.length, `${width}px broken images ${info.broken}`);
      check(!info.noAlt, `${width}px images without alt text: ${info.noAlt}`);
      check(!info.small.length, `${width}px touch targets under 44px: ${info.small}`);
      check(info.enhanced === (width >= 900 && height >= 560), `${width}px story enhancement state ${info.enhanced}`);
      check(!problems.length, `${width}px console or network problems: ${problems}`);
      check(!external.length, `${width}px external requests: ${external}`);
      await page.close();
    }

    // Story: the sticky phone follows the step in the middle of the window.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE + name + '.html');
      await page.waitForTimeout(500);
      const seen = [];
      for (let i = 0; i < 5; i++) {
        await page.evaluate(i => document.querySelectorAll('.step')[i].scrollIntoView({ block: 'center', behavior: 'instant' }), i);
        await page.waitForTimeout(250);
        seen.push(await page.evaluate(() => [...document.querySelectorAll('.stage-screens img')].findIndex(im => im.classList.contains('is-active'))));
      }
      check(seen.join() === '0,1,2,3,4', `story active screens ${seen}`);
      await page.close();
    }

    // Voices: movement, pause and resume, read all, hover, focus, touch, offscreen.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE + name + '.html');
      const x = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.quote-track')).transform).m41);
      const moved = async () => { const a = await x(); await page.waitForTimeout(500); return Math.abs((await x()) - a) > 1; };
      check(!(await moved()), 'voices should be paused while offscreen');
      await page.evaluate(() => document.querySelector('.motion-controls').scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.mouse.move(5, 5);
      await page.waitForTimeout(400);
      check(await moved(), 'voices should move when in view');
      const dup = await page.evaluate(() => { const g = document.querySelectorAll('.quote-group'); return g.length === 2 && g[1].getAttribute('aria-hidden') === 'true' && g[1].hasAttribute('inert'); });
      check(dup, 'duplicate group must be aria-hidden and inert');
      await page.click('.pause-quotes');
      await page.mouse.move(5, 5);
      check(!(await moved()), 'pause button should stop motion');
      check(await page.textContent('.pause-quotes') === 'Resume motion', 'pause label should become Resume motion');
      await page.click('.pause-quotes');
      await page.mouse.move(5, 5);
      check(await moved(), 'resume button should restart motion while the button keeps focus');
      await page.hover('.quote-viewport');
      check(!(await moved()), 'hover should pause motion');
      await page.mouse.move(5, 5);
      await page.focus('.quote-viewport');
      await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      check(!(await moved()), 'keyboard focus on the row should pause motion');
      await page.click('.read-quotes');
      const reading = await page.evaluate(() => ({ t: getComputedStyle(document.querySelector('.quote-track')).animationName, visible: [...document.querySelectorAll('.quote-group:not([aria-hidden]) .quote-card')].filter(c => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }).length, pauseHidden: document.querySelector('.pause-quotes').hidden, tab: document.querySelector('.quote-viewport').hasAttribute('tabindex') }));
      check(reading.t === 'none' && reading.visible === 6 && reading.pauseHidden && !reading.tab, `read all should show six static cards ${JSON.stringify(reading)}`);
      const labels = await page.evaluate(() => ({ fictional: [...document.querySelectorAll('.quote-group:not([aria-hidden]) .sample-badge')].filter(b => /Fictional sample/.test(b.textContent)).length, real: document.querySelectorAll('.quote-group:not([aria-hidden]) .real-badge').length }));
      check(labels.fictional === 5 && labels.real === 1, `badges ${JSON.stringify(labels)}`);
      await page.close();

      const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      await touch.goto(BASE + name + '.html');
      await touch.evaluate(() => document.querySelector('.quote-viewport').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await touch.waitForTimeout(300);
      await touch.tap('.quote-viewport');
      check(await touch.getAttribute('.pause-quotes', 'aria-pressed') === 'true', 'touch should pause until resumed');
      await touch.close();
    }

    // Reduced motion, including a change while the page is open.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      await page.goto(BASE + name + '.html');
      const still = () => page.evaluate(() => ({ controls: document.querySelector('.motion-controls').hidden, moving: document.querySelector('.voices').classList.contains('is-moving'), replay: document.querySelector('.replay-motion').hidden, hero: getComputedStyle(document.querySelector('.rise')).animationName }));
      let s = await still();
      check(s.controls && !s.moving && s.replay && s.hero === 'none', `reduced motion ${JSON.stringify(s)}`);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForTimeout(150);
      s = await still();
      check(!s.controls && s.moving, `motion preference switched on ${JSON.stringify(s)}`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(150);
      s = await still();
      check(s.controls && !s.moving, `motion preference switched off ${JSON.stringify(s)}`);
      await page.close();
    }

    // No JavaScript: all copy and all five screenshots stay in the page; the form cannot submit.
    {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(BASE + name + '.html');
      const quotes = await page.locator('.quote-card').count();
      const shots = await page.locator('.step-shot img').count();
      const disabled = await page.locator('#waitlist-email').isDisabled();
      const stageHidden = await page.locator('.story-stage').isHidden();
      check(quotes === 6 && shots === 5 && disabled && stageHidden, `no-JS: quotes ${quotes}, shots ${shots}, form disabled ${disabled}, stage hidden ${stageHidden}`);
      await context.close();
    }

    // Waitlist mockup: validation works and nothing leaves the browser.
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(BASE + name + '.html');
      await page.waitForLoadState('networkidle');
      const requests = [];
      page.on('request', r => { if (!/\.(webp|woff2|svg)$/.test(r.url())) requests.push(r.method() + ' ' + r.url()); });
      const before = page.url();
      check(!(await page.isChecked('input[name=launch_updates_consent]')), 'consent must start unchecked');
      await page.click('.waitlist-form button[type=submit]');
      check(await page.textContent('.waitlist-status') === '', 'empty form must not report success');
      await page.fill('#waitlist-email', 'reviewer@example.com');
      await page.check('input[value=android]', { force: true });
      await page.check('input[name=launch_updates_consent]');
      await page.click('.waitlist-form button[type=submit]');
      check(/has not been sent or saved/.test(await page.textContent('.waitlist-status')), 'valid form should show the preview message');
      const stored = await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length);
      check(!requests.length && page.url() === before && stored === 0, `mockup must not send or store anything: ${requests} ${page.url()} stored ${stored}`);
      await page.close();
    }

    // Keyboard: every questions row opens with the keyboard.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(BASE + name + '.html');
      await page.focus('.faq summary');
      await page.keyboard.press('Enter');
      check(await page.evaluate(() => document.querySelector('.faq details').open), 'questions row should open with Enter');
      await page.close();
    }
  }
  await browser.close();
  console.log(failures ? `${failures} check(s) failed` : 'All round four checks passed');
  process.exit(failures ? 1 : 0);
})();
