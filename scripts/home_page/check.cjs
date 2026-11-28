/* Checks the built home page the way a visitor's browser gets it: from _site/
   with the real response headers, so a Content-Security-Policy mistake fails
   here and not after a deploy. Dev-only (needs Playwright):
     SITE_MODE=home HOME_ALLOW_DRAFT=1 SITE_OUT=/tmp/site-home bash scripts/build_site.sh
     node scripts/home_page/serve_site.cjs /tmp/site-home 8787 &
     node scripts/home_page/check.cjs
   Works on the draft and on the approved page: checks that only make sense
   while the waitlist is a mockup are skipped once it is not.
   Set CHROMIUM_PATH if Playwright cannot find a browser. */
const { chromium } = require('playwright');
const ORIGIN = process.env.HOME_ORIGIN || 'http://127.0.0.1:8787';
const BASE = ORIGIN + '/';
const WIDTHS = [[320, 640], [360, 760], [390, 844], [768, 1024], [844, 390], [1024, 600], [1440, 900]];
const HOME_SCRIPT_SRC = "'self' https://static.cloudflareinsights.com";
let failures = 0;
const check = (ok, label) => { if (!ok) { failures++; console.log('  FAIL', label); } };
// Waits until the page has stopped scrolling (the page scrolls smoothly).
const settle = async page => { let last = -1; for (let i = 0; i < 40; i++) { const y = await page.evaluate(() => Math.round(scrollY)); if (y === last) return; last = y; await page.waitForTimeout(150); } };

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const first = await browser.newPage();
  const firstResponse = await first.goto(BASE);
  const html = await firstResponse.text();
  await first.close();
  const isMockup = /data-waitlist="mockup"/.test(html);
  const isDraft = !/<meta name="kaisip-home-status" content="approved">/.test(html);
  console.log(`home page (${isDraft ? 'draft' : 'approved'}${isMockup ? ', waitlist mockup' : ''})`);
  check(/<title>[^<]*KaiSip/.test(html), 'this is not the home page (is the server serving a landing build?)');

  // Response headers and Content-Security-Policy, as served.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const violations = [];
    await page.exposeFunction('__cspReport', v => violations.push(v));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__cspReport(e.violatedDirective + ' ' + e.blockedURI)));
    const response = await page.goto(BASE);
    const h = response.headers();
    const own = (h['content-security-policy'] || '').split(',').pop();
    const scriptSrc = ((own.match(/script-src ([^;]*)/) || [])[1] || '').trim();
    check(/default-src 'none'/.test(own) && /style-src 'self';/.test(own) && /form-action 'self' https:\/\/app\.kit\.com\/forms\/10207004\/subscriptions;/.test(own) && /frame-ancestors 'none'/.test(own), 'home policy missing from / : ' + own);
    const formActions = (h['content-security-policy'] || '').split(',').map(p => ((p.match(/form-action ([^;]*)/) || [])[1] || '').trim());
    check(formActions.every(a => /'self'/.test(a) && /https:\/\/app\.kit\.com\/forms\/10207004\/subscriptions(\s|$)/.test(a)), 'every policy on / must let the form post to the page itself and to Kit: ' + formActions.join(' | '));
    check(scriptSrc === HOME_SCRIPT_SRC && !/unsafe/.test(own), 'home policy script-src is not the strict one: ' + scriptSrc);
    check(h['x-frame-options'] === 'DENY' && /max-age/.test(h['strict-transport-security'] || '') && h['x-content-type-options'] === 'nosniff', 'site-wide security headers missing');
    check(!isDraft || /noindex/.test(h['x-robots-tag'] || ''), 'a draft home page must be served noindex');
    check(isDraft || !/noindex/.test(h['x-robots-tag'] || ''), 'an approved home page must not be served noindex');
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
    await page.locator('.faq summary').first().click();
    await page.waitForTimeout(400);
    check(!violations.length, 'Content-Security-Policy violations: ' + violations.join(' | '));
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      const fonts = [...document.fonts];
      return {
        styled: getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)',
        enhanced: document.querySelector('.story').classList.contains('is-enhanced'),
        serif: fonts.some(f => f.family.includes('KaiSip Serif') && f.style === 'normal' && f.status === 'loaded'),
      };
    });
    check(loaded.styled && loaded.enhanced, 'stylesheet and script must both load under the policy');
    check(loaded.serif, 'KaiSip Serif (the upright face with the conventional f) must load');
    const badge = await page.request.get(ORIGIN + '/assets/google-play-badge.png');
    check(badge.status() === 200 && badge.headers()['content-type'] === 'image/png', 'the Google Play badge must be served (200, image/png): ' + badge.status());
    for (const p of ['beta', 'privacy', 'terms', 'support']) {
      const r = await page.request.get(ORIGIN + '/' + p);
      check(r.status() === 200, '/' + p + ' should still be served: ' + r.status());
    }
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
    for (const href of [...new Set(links)]) {
      if (href === '#') continue; // back to the top of the page
      // The public Play listing (checked by hand; Google is not fetched here).
      if (/^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.kaisip\.app(&|$)/.test(href)) continue;
      if (href.startsWith('#')) {
        check(await page.evaluate(id => !!document.getElementById(id), href.slice(1)), 'anchor ' + href + ' has no target');
        continue;
      }
      const r = await page.request.get(new URL(href, ORIGIN + '/').href);
      check(r.status() === 200, 'link ' + href + ' returned ' + r.status());
    }
    await page.close();
  }

  // Layout, assets and structure at each size.
  for (const [width, height] of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height } });
    const problems = [];
    const external = [];
    page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
    page.on('requestfailed', r => problems.push('failed ' + r.url()));
    page.on('request', r => { if (!r.url().startsWith(ORIGIN + '/')) external.push(r.url()); });
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    const info = await page.evaluate(async () => {
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
      await new Promise(r => setTimeout(r, 400));
      const targets = [...document.querySelectorAll('.site-header a, main a.button, main a.text-link, main a.play-badge, main button, summary, .site-footer nav a')];
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        h1: document.querySelectorAll('h1').length,
        broken: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
        noAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
        small: targets.filter(el => el.offsetParent && el.getBoundingClientRect().height < 44).map(el => el.textContent.trim().slice(0, 30) || el.className),
        wrapped: [...document.querySelectorAll('.button')].filter(b => b.offsetParent && b.getBoundingClientRect().height > 60).map(b => b.textContent.trim()),
        enhanced: document.querySelector('.story').classList.contains('is-enhanced'),
        // Google Play badge (Google's rules): the official file, at least 40px
        // tall and no taller than the main button, alt text as Google words
        // it, a quarter of its height clear on every side, the trademark line
        // in the footer, and never beside a rating or review ask.
        badges: [...document.querySelectorAll('main a.play-badge')].filter((a) => a.offsetParent).map((a) => {
          const img = a.querySelector('img'); const r = img.getBoundingClientRect();
          const btn = a.parentElement.querySelector('a.button');
          const pad = r.height / 4;
          const crowd = [...a.parentElement.parentElement.querySelectorAll('a, button, p, span, img, h1, h2')].filter((el) => !a.contains(el) && !el.contains(a) && el.offsetParent).some((el) => {
            const o = el.getBoundingClientRect();
            return o.width && o.height && o.left < r.right + pad && o.right > r.left - pad && o.top < r.bottom + pad && o.bottom > r.top - pad;
          });
          return { src: img.getAttribute('src'), alt: img.alt, h: r.height, btnH: btn ? btn.getBoundingClientRect().height : 0, loaded: img.complete && img.naturalWidth === 478, crowd,
            nearAsk: /rate|rating|review|stars/i.test(a.parentElement.textContent) };
        }),
        legal: /Google Play and the Google Play logo are trademarks of Google LLC\./.test(document.querySelector('.site-footer').textContent),
        ids: (() => { const all = [...document.querySelectorAll('[id]')].map(e => e.id); return all.filter((id, i) => all.indexOf(id) !== i); })(),
      };
    });
    check(info.overflow <= 0, `${width}x${height} horizontal overflow ${info.overflow}`);
    check(info.h1 === 1, `${width}x${height} expected one h1, found ${info.h1}`);
    check(!info.broken.length, `${width}x${height} broken images ${info.broken}`);
    check(!info.noAlt, `${width}x${height} images without an alt attribute: ${info.noAlt}`);
    check(!info.small.length, `${width}x${height} touch targets under 44px: ${info.small}`);
    check(!info.wrapped.length, `${width}x${height} buttons wrapped to two lines: ${info.wrapped}`);
    check(!info.ids.length, `${width}x${height} duplicate ids: ${info.ids}`);
    check(info.enhanced === (width >= 900 && height >= 560), `${width}x${height} story enhancement state ${info.enhanced}`);
    check(info.badges.length === 1 && info.legal, `${width}x${height} the Google Play badge shows once, with the trademark line in the footer`);
    for (const b of info.badges) {
      check(b.src === 'assets/google-play-badge.png' && b.alt === 'Get it on Google Play' && b.loaded, `${width}x${height} badge must be the official file, loaded, alt "Get it on Google Play": ${JSON.stringify(b)}`);
      check(b.h >= 40 && (!b.btnH || b.h <= b.btnH + 1), `${width}x${height} badge height ${b.h} must be 40px or more and not taller than the button (${b.btnH})`);
      check(!b.crowd && !b.nearAsk, `${width}x${height} badge needs clear space of a quarter of its height and no rating or review ask nearby`);
    }
    check(!problems.length, `${width}x${height} console or network problems: ${problems}`);
    check(!external.length, `${width}x${height} external requests: ${external}`);
    await page.close();
  }

  // Story: the sticky phone follows the step in the middle of the window, and
  // fits between the header and the bottom of the window.
  for (const [width, height] of [[1440, 900], [1024, 600]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(BASE);
    await page.waitForTimeout(500);
    const seen = [];
    let fits = true;
    for (let i = 0; i < 5; i++) {
      await page.evaluate(i => document.querySelectorAll('.step')[i].scrollIntoView({ block: 'center', behavior: 'instant' }), i);
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => {
        const r = document.querySelector('.story-stage .phone').getBoundingClientRect();
        const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
        return { active: [...document.querySelectorAll('.stage-screens img')].findIndex(im => im.classList.contains('is-active')), top: r.top, bottom: r.bottom, header };
      });
      seen.push(state.active);
      if (state.top < state.header || state.bottom > height) fits = false;
    }
    check(seen.join() === '0,1,2,3,4', `${width}x${height} story active screens ${seen}`);
    check(fits, `${width}x${height} the sticky phone is cut off by the header or the window`);
    await page.close();
  }

  // Feedback: real quotes only, each with recorded permission and the reward disclosure.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE);
    const quotes = await page.evaluate(() => [...document.querySelectorAll('.quote-card')].map(c => ({
      permission: c.dataset.quotePermission,
      disclosure: /offered free Premium access/.test(c.textContent),
    })));
    check(quotes.length >= 1, 'no feedback quote found');
    check(quotes.every(q => q.permission === 'recorded'), 'every quote needs data-quote-permission="recorded"');
    check(quotes.every(q => q.disclosure), 'every tester quote needs the reward disclosure on the card');
    check(!/fictional|sample learner/i.test(html), 'sample feedback is still on the page');
    check(!isMockup, 'the waitlist is still a mockup');
    await page.close();
  }

  // Keyboard: every stop shows a visible focus ring, and the FAQ opens with Enter.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE);
    await page.waitForTimeout(400);
    const missing = [];
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return { name: (el.textContent || el.value || el.className).trim().slice(0, 30), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      if (!stop) break;
      if (!stop.ring) missing.push(stop.name);
    }
    check(!missing.length, 'focus stops without a visible ring: ' + missing.join(' | '));
    await page.focus('.faq summary');
    await page.keyboard.press('Enter');
    check(await page.evaluate(() => document.querySelector('.faq details').open), 'FAQ row should open with Enter');
    await page.close();
  }

  // Reduced motion: nothing animates, nothing is hidden.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(BASE);
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => ({
      running: document.getAnimations().filter(a => a.playState === 'running').length,
      hidden: [...document.querySelectorAll('h1, .lead, .panel, .reveal')].filter(el => parseFloat(getComputedStyle(el).opacity) < 1).length,
    }));
    check(s.running === 0 && s.hidden === 0, `reduced motion ${JSON.stringify(s)}`);
    await page.close();
  }

  // No JavaScript: all copy and all five screenshots stay in the page, the
  // header stays readable, and a mockup form cannot submit.
  {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE);
    const shots = await page.locator('.step-shot img').count();
    const stageHidden = await page.locator('.story-stage').isHidden();
    const quote = await page.locator('.quote-card blockquote').first().isVisible();
    const headerBg = await page.evaluate(() => getComputedStyle(document.querySelector('.site-header')).backgroundColor);
    check(shots === 5 && stageHidden && quote, `no-JS: shots ${shots}, stage hidden ${stageHidden}, quote visible ${quote}`);
    check(headerBg !== 'rgba(0, 0, 0, 0)', 'no-JS: the sticky header needs its own background');
    if (isMockup) check(await page.locator('#waitlist-email').isDisabled(), 'no-JS: the mockup form must stay disabled');
    if (!isMockup) {
      // The form must still send, with Kit stubbed, when JavaScript is off.
      let body = null;
      await page.route('https://app.kit.com/**', route => { body = route.request().postData(); route.fulfill({ status: 302, headers: { Location: ORIGIN + '/waitlist-thanks' } }); });
      await page.fill('#waitlist-email', 'nojs@example.com');
      await settle(page);
      await Promise.all([page.waitForURL('**/waitlist-thanks', { timeout: 10000 }).catch(() => {}), page.click('.waitlist-form button[type=submit]')]);
      check(new URLSearchParams(body || '').get('fields[phone_type]') === 'iPhone' && /\/waitlist-thanks$/.test(page.url()), 'no-JS: the waitlist form must still send: ' + body + ' ' + page.url());
    }
    await context.close();
  }

  // Waitlist: the form posts only to Kit, sends exactly the email and the
  // fixed phone type (iPhone), and the policy lets Kit redirect back to
  // the thank-you page. Kit itself is stubbed, so no real sign-up is made.
  if (!isMockup) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const violations = [];
    await page.exposeFunction('__cspReport2', v => violations.push(v));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__cspReport2(e.violatedDirective + ' ' + e.blockedURI)));
    const posted = [];
    await page.route('https://app.kit.com/**', route => {
      const req = route.request();
      posted.push({ url: req.url(), method: req.method(), body: req.postData() || '' });
      route.fulfill({ status: 302, headers: { Location: ORIGIN + '/waitlist-thanks' } });
    });
    await page.goto(BASE);
    const form = await page.evaluate(() => {
      const f = document.querySelector('.waitlist-form');
      const line = document.getElementById('waitlist-terms');
      const button = f.querySelector('button[type=submit]');
      const hidden = f.querySelector('input[type=hidden][name="fields[phone_type]"]');
      const b = button.getBoundingClientRect(); const l = line.getBoundingClientRect();
      return {
        named: [...f.querySelectorAll('[name]')].map(e => e.name).sort().join(),
        boxes: f.querySelectorAll('input[type=checkbox], input[type=radio]').length,
        phone: hidden && hidden.value,
        line: line.textContent.replace(/\s+/g, ' ').trim(),
        link: line.querySelector('a') && line.querySelector('a').getAttribute('href'),
        described: button.getAttribute('aria-describedby'),
        together: Math.max(b.bottom, l.bottom) - Math.min(b.top, l.top) <= innerHeight && Math.min(Math.abs(l.top - b.bottom), Math.abs(b.top - l.bottom)) <= 24,
      };
    });
    check(form.named === 'email_address,fields[phone_type]' && form.boxes === 0 && form.phone === 'iPhone', 'the form has an email field and a fixed hidden phone type of iPhone, and no tick box or phone choice: ' + JSON.stringify(form));
    check(/^By joining, you agree to get these emails\. For ages 18 and older\. Unsubscribe anytime\. Privacy Policy$/.test(form.line) && form.link === 'privacy#s3f' && form.described === 'waitlist-terms', 'the consent line must keep its wording, link to privacy#s3f and describe the button: ' + JSON.stringify(form));
    check(form.together, 'the consent line must sit right beside the button, on screen with it');
    await page.click('.waitlist-form button[type=submit]');
    await page.waitForTimeout(300);
    check(!posted.length, 'an empty form must not be sent');
    await page.fill('#waitlist-email', 'not-an-email');
    await settle(page);
    await page.click('.waitlist-form button[type=submit]');
    await page.waitForTimeout(300);
    check(!posted.length, 'the form must not be sent with a bad email address');
    await page.fill('#waitlist-email', 'reviewer@example.com');
    await Promise.all([page.waitForURL('**/waitlist-thanks', { timeout: 10000 }).catch(() => {}), page.click('.waitlist-form button[type=submit]')]);
    const sent = posted[0] || {};
    const fields = new URLSearchParams(sent.body || '');
    check(posted.length === 1 && sent.method === 'POST' && sent.url === 'https://app.kit.com/forms/10207004/subscriptions', 'form must post once to Kit form 10207004: ' + JSON.stringify(posted));
    check(fields.get('email_address') === 'reviewer@example.com' && fields.get('fields[phone_type]') === 'iPhone' && [...fields.keys()].length === 2, 'form must send only email_address and fields[phone_type]: ' + (sent.body || ''));
    check(/\/waitlist-thanks$/.test(page.url()), 'after Kit, the visitor must land on /waitlist-thanks: ' + page.url());
    check(/Check your/.test(await page.textContent('h1').catch(() => '')), 'the thank-you page must load');
    // A blocked redirect does not always raise this event; the URL check
    // above is the real proof that the policy lets Kit send people back.
    check(!violations.length, 'policy violations during sign-up: ' + violations.join(' | '));
    // Where the confirm link in Kit's email lands.
    const confirmed = await page.goto(ORIGIN + '/waitlist-confirmed');
    check(confirmed.status() === 200 && /on\s+the list/i.test(await page.textContent('h1')), 'the confirmed page must load');
    check(/noindex/.test(await page.getAttribute('meta[name=robots]', 'content')), 'the confirmed page must be noindex');
    const ch = confirmed.headers();
    check(/form-action 'none'/.test(ch['content-security-policy'] || '') && /noindex/.test(ch['x-robots-tag'] || ''), 'the waitlist pages need their own strict policy and noindex header: ' + ch['content-security-policy']);
    const stored = await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length);
    check(stored === 0, 'the page must not store anything: ' + stored);
    await page.close();
  }

  await browser.close();
  console.log(failures ? `${failures} check(s) failed` : 'All home page checks passed');
  process.exit(failures ? 1 : 0);
})();
