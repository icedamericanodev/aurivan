// Builds the KaiSip Kit email files: logo PNGs, the email snippets and the preview pictures.
// Run: node _build/build.cjs   (from the kit-email folder; needs Playwright)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const REPO = '/home/user/aurivan';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

/* ---------- Building blocks (every style inline, classes only for dark mode) ---------- */
const pre = (t) => `<!-- PREHEADER: the grey preview line in the inbox. Hidden in the email itself. -->\n<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${t}${'&#847;&zwnj;&nbsp;'.repeat(50)}</div>`;
const eyebrow = (t) => `<h3 style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:#24603F;">${t}</h3>`;
const h1 = (t) => `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:32px;line-height:38px;font-weight:normal;letter-spacing:-0.4px;color:#17231B;">${t}</h1>`;
const em = (t) => `<em style="font-style:italic;color:#24603F;">${t}</em>`;
const h2 = (t) => `<h2 style="margin:30px 0 10px;font-family:${SERIF};font-size:23px;line-height:30px;font-weight:normal;letter-spacing:-0.2px;color:#17231B;">${t}</h2>`;
const p = (t, mb = 18) => `<p style="margin:0 0 ${mb}px;font-family:${SANS};font-size:17px;line-height:27px;color:#17231B;">${t}</p>`;
const small = (t, mb = 18) => `<p class="k-ink2" style="margin:0 0 ${mb}px;font-family:${SANS};font-size:14px;line-height:21px;color:#465349;">${t}</p>`;
const a = (t, href) => `<a href="${href}" style="color:#24603F;text-decoration:underline;">${t}</a>`;
const btn = (t, href) => `<div style="padding:6px 0 14px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
<td class="k-btn" bgcolor="#1E4A34" style="background-color:#1E4A34;border-radius:999px;mso-padding-alt:15px 30px;"><a href="${href}" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:17px;line-height:22px;font-weight:bold;color:#F7F5EF;text-decoration:none;border-radius:999px;">${t}&nbsp;&rarr;</a></td>
</tr></table>
</div>`;
const leaf = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td class="k-leaf" width="10" height="10" bgcolor="#2B6E4A" style="width:10px;height:10px;font-size:0;line-height:0;background-color:#2B6E4A;border-radius:10px 0 10px 0;">&nbsp;</td></tr></table>`;
const leafList = (items) => `<table role="list" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:0;">
${items.map((t) => `<tr role="listitem">
<td aria-hidden="true" valign="top" width="24" style="width:24px;padding:9px 0 0;font-size:0;line-height:0;">${leaf}</td>
<td class="k-ink" valign="top" style="padding:0 0 10px;font-family:${SANS};font-size:17px;line-height:27px;color:#17231B;">${t}</td>
</tr>`).join('\n')}
</table>
<div style="font-size:0;line-height:0;height:8px;">&nbsp;</div>`;
const panel = ({ label, title, body, button, href }) => `<div style="padding:10px 0 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
<td class="k-panel" bgcolor="#1E4A34" style="background-color:#1E4A34;border-radius:18px;padding:26px 22px 28px;">
<h3 class="k-sap" style="margin:0 0 10px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:#A9D9BA;">${label}</h3>
<h2 class="k-onforest" style="margin:0 0 12px;font-family:${SERIF};font-size:26px;line-height:32px;font-weight:normal;letter-spacing:-0.3px;color:#F3F1EA;">${title}</h2>
<p class="k-onforest2" style="margin:0 0 20px;font-family:${SANS};font-size:16px;line-height:25px;color:#C9DACD;">${body}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
<td class="k-pill" bgcolor="#F3F1EA" style="background-color:#F3F1EA;border-radius:999px;mso-padding-alt:14px 22px;"><a href="${href}" style="display:inline-block;padding:14px 22px;font-family:${SANS};font-size:16px;line-height:22px;font-weight:bold;color:#17231B;text-decoration:none;border-radius:999px;">${button}&nbsp;&rarr;</a></td>
</tr></table>
</td>
</tr></table>
</div>`;
const emSap = (t) => `<em style="font-style:italic;color:#A9D9BA;">${t}</em>`;
const tip = ({ label, body }) => `<div style="padding:8px 0 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
<td class="k-tip" bgcolor="#E9E6DC" style="background-color:#E9E6DC;border-left:3px solid #2B6E4A;border-radius:0 14px 14px 0;padding:18px 20px 20px;">
<h3 style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:#24603F;">${label}</h3>
<p style="margin:0;font-family:${SERIF};font-size:19px;line-height:28px;color:#17231B;">${body}</p>
</td>
</tr></table>
</div>`;
const rule = `<div class="k-rule" style="margin:28px 0 22px;border-top:1px solid #DFDCD1;font-size:0;line-height:0;height:0;">&nbsp;</div>`;
const sign = (line) => `${p(line, 6)}\n<p style="margin:0 0 10px;font-family:${SERIF};font-size:20px;line-height:28px;font-style:italic;color:#17231B;">KaiSip</p>`;

const SUPPORT = 'certprep.support@gmail.com';
const questions = small(`Questions? Write to <a href="mailto:${SUPPORT}" style="color:#465349;text-decoration:underline;" class="k-ink2">${SUPPORT}</a>.`, 0);

/* ---------- The emails ---------- */
const EMAILS = {
  'waitlist-welcome': {
    subject: "You're on the KaiSip iPhone waitlist",
    preheader: "What we'll email you about, and how to study on your iPhone today.",
    html: () => [
      eyebrow('iPhone waitlist'),
      h1(`You’re on ${em('the&nbsp;list.')}`),
      p('Thanks for confirming your email. Here is what happens next.'),
      h2("What we’ll email you about"),
      leafList(['The day the iPhone app is ready.', 'When a new KaiSip course opens.']),
      p("Nothing else. The iPhone app has no date yet, so this list may be quiet for a while."),
      panel({
        label: 'On your iPhone today',
        title: `Study now, ${emSap('in&nbsp;Safari.')}`,
        body: 'KaiSip already works on the web. Open kaisip.com/app in Safari, tap Share, then Add to Home Screen. Free CISA practice, no account needed.',
        button: 'Open the web app',
        href: 'https://kaisip.com/app/',
      }),
      sign('Thanks for waiting with us.'),
      questions,
    ].join('\n'),
    text: `You're on the list.

Thanks for confirming your email. Here is what happens next.

WHAT WE'LL EMAIL YOU ABOUT
- The day the iPhone app is ready.
- When a new KaiSip course opens.

Nothing else. The iPhone app has no date yet, so this list may be quiet for a while.

ON YOUR IPHONE TODAY
KaiSip already works on the web. Open kaisip.com/app in Safari, tap Share, then Add to Home Screen. Free CISA practice, no account needed.

Open the web app: https://kaisip.com/app/

Thanks for waiting with us.
KaiSip

Questions? Write to ${SUPPORT}.`,
  },

  'iphone-launch': {
    subject: 'KaiSip for iPhone is ready',
    preheader: 'The app you asked to hear about is on the App Store.',
    note: 'DRAFT. Before sending, replace [[LAUNCH DATE]] (once, in the first paragraph) and [[APP STORE LINK]] (once, inside the button link: href="[[APP STORE LINK]]"). Search the snippet for [[ to be sure none is left.',
    html: () => [
      eyebrow('iPhone app'),
      h1(`KaiSip for iPhone ${em('is&nbsp;ready.')}`),
      p('You asked us to tell you when the iPhone app was ready. It is on the App Store from [[LAUNCH DATE]].'),
      btn('Get KaiSip for iPhone', '[[APP STORE LINK]]'),
      h2("What you’ll find inside"),
      leafList([
        `<strong style="font-weight:bold;">A plan for today.</strong> Open the app and your next step is already in view.`,
        `<strong style="font-weight:bold;">The reason behind each best answer.</strong> CISA practice that explains the thinking, not only the letter.`,
        `<strong style="font-weight:bold;">A mistake journal.</strong> Your misses are kept, so you can come back to them.`,
      ]),
      rule,
      p("This is the email you signed up for. From here, you’ll hear from us only when a new KaiSip course opens."),
      sign('Thanks for waiting.'),
      questions,
      small('iPhone and App Store are trademarks of Apple Inc.', 0).replace('margin:0 0 0px', 'margin:14px 0 0').replace('font-size:14px;line-height:21px', 'font-size:12px;line-height:18px'),
    ].join('\n'),
    text: `KaiSip for iPhone is ready.

You asked us to tell you when the iPhone app was ready. It is on the App Store from [[LAUNCH DATE]].

Get KaiSip for iPhone: [[APP STORE LINK]]

WHAT YOU'LL FIND INSIDE
- A plan for today. Open the app and your next step is already in view.
- The reason behind each best answer. CISA practice that explains the thinking, not only the letter.
- A mistake journal. Your misses are kept, so you can come back to them.

This is the email you signed up for. From here, you'll hear from us only when a new KaiSip course opens.

Thanks for waiting.
KaiSip

Questions? Write to ${SUPPORT}.

iPhone and App Store are trademarks of Apple Inc.`,
  },

  'news-welcome': {
    subject: 'Your KaiSip study emails start here',
    preheader: "What you'll get, how often, and how to stop.",
    html: () => [
      eyebrow('Study tips and news'),
      h1(`Short tips, ${em('sent&nbsp;sparingly.')}`),
      p('Thanks for confirming. You asked for KaiSip study tips and news, so here is what to expect.'),
      h2("What you’ll get"),
      leafList(['A short study tip you can use in your next session.', 'News when something new arrives in KaiSip, such as a new course.']),
      p('A few times a month at most. Never daily.'),
      tip({ label: 'A first tip', body: 'Before you read the options, say in your own words what the question is asking. Then read all four, even when the first one looks right.' }),
      h2('How to stop'),
      p('Every email has an Unsubscribe link at the bottom. One tap and the emails stop. Your KaiSip progress stays as it is.'),
      sign('Thanks for studying with us.'),
      questions,
    ].join('\n'),
    text: `Short tips, sent sparingly.

Thanks for confirming. You asked for KaiSip study tips and news, so here is what to expect.

WHAT YOU'LL GET
- A short study tip you can use in your next session.
- News when something new arrives in KaiSip, such as a new course.

A few times a month at most. Never daily.

A FIRST TIP
Before you read the options, say in your own words what the question is asking. Then read all four, even when the first one looks right.

HOW TO STOP
Every email has an Unsubscribe link at the bottom. One tap and the emails stop. Your KaiSip progress stays as it is.

Thanks for studying with us.
KaiSip

Questions? Write to ${SUPPORT}.`,
  },
};

// The two confirmation emails live in Kit's own confirmation editor: plain fields, typed in.
const CONFIRMS = {
  'waitlist-confirm': {
    subject: 'Confirm your place on the KaiSip iPhone waitlist',
    preheader: 'One tap and you are on the list.',
    heading: 'Confirm your place',
    paras: ["Tap the button to confirm. We'll email you when the iPhone app is ready and when new KaiSip courses open. Nothing else.", "If you didn't sign up, ignore this email and you won't hear from us."],
    button: 'Confirm my email',
  },
  'news-confirm': {
    subject: 'Confirm your KaiSip study emails',
    preheader: 'One tap to start short study tips and KaiSip news.',
    heading: 'Confirm your study emails',
    paras: ["Tap the button to confirm. We'll send you short study tips and KaiSip news, a few times a month at most. Every email has an Unsubscribe link.", "If you didn't ask for this, ignore this email and you won't hear from us."],
    button: 'Confirm my email',
  },
};

function writeEmails() {
  const dir = path.join(ROOT, 'emails');
  for (const [name, e] of Object.entries(EMAILS)) {
    const head = `<!-- KaiSip email: ${name}\n     Subject:   ${e.subject}\n     Preheader: ${e.preheader}${e.note ? `\n     ${e.note}` : ''}\n     Paste everything below into one HTML block in Kit's editor. -->\n`;
    fs.writeFileSync(path.join(dir, `${name}.html`), head + pre(e.preheader) + '\n' + e.html() + '\n');
    fs.writeFileSync(path.join(dir, `${name}.txt`), `SUBJECT: ${e.subject}\nPREHEADER: ${e.preheader}\n${e.note ? `NOTE: ${e.note}\n` : ''}\n----- BODY (plain text) -----\n\n${e.text}\n`);
  }
  for (const [name, c] of Object.entries(CONFIRMS)) {
    fs.writeFileSync(path.join(dir, `${name}.txt`), `Type these into Kit's confirmation email editor (see KIT_STEPS.md, step 5).\nDo not paste HTML here, and never delete Kit's own confirm button: it carries the confirm link.\n\nSUBJECT:\n${c.subject}\n\nPREVIEW TEXT (only if Kit shows a "Preview text" box):\n${c.preheader}\n\nHEADING (optional: type it as the first line and set it to Heading 1):\n${c.heading}\n\nBODY TEXT (two short paragraphs, above the button):\n${c.paras.join('\n\n')}\n\nBUTTON LABEL:\n${c.button}\n`);
    // What it should look like in the shell, with Kit's plain tags (no KaiSip classes) and a stand-in for Kit's button.
    const sim = `<h1>${c.heading}</h1>\n${c.paras.slice(0, 1).map((t) => `<p>${t}</p>`).join('\n')}\n<p><a href="#" style="display:inline-block;background-color:#1E4A34;color:#F7F5EF;padding:15px 30px;border-radius:999px;font-weight:bold;text-decoration:none;">${c.button}</a></p>\n${c.paras.slice(1).map((t) => `<p>${t}</p>`).join('\n')}`;
    fs.writeFileSync(path.join(__dirname, `${name}.sim.html`), sim);
  }
}

/* ---------- Logo PNGs (2x) ---------- */
async function logos(browser) {
  const out = path.join(ROOT, 'publish');
  const dark = fs.readFileSync(path.join(REPO, 'design-notes/brand-kaisip/lockup_dark.svg'), 'utf8');
  const light = fs.readFileSync(path.join(REPO, 'design-notes/brand-kaisip/lockup_light.svg'), 'utf8');
  const page = await browser.newPage({ viewport: { width: 400, height: 200 }, deviceScaleFactor: 2 });
  const svgSized = (svg, w, h) => svg.replace(/<svg ([^>]*?)width="[^"]*" height="[^"]*"/, `<svg $1width="${w}" height="${h}"`);
  // Forest plaque: 168 x 48, lockup 157.83 x 48, rounded corners so it still reads as a plaque if an app recolours the band behind it.
  await page.setContent(`<body style="margin:0;background:transparent"><div id="l" style="width:168px;height:48px;background:#1E4A34;border-radius:10px;overflow:hidden;position:relative"><div style="position:absolute;left:3px;top:0;width:157.83px;height:48px">${svgSized(dark, 157.83, 48)}</div></div></body>`);
  await page.locator('#l').screenshot({ path: path.join(out, 'kaisip-email-logo-forest.png'), omitBackground: true });
  // Light lockup, transparent: 168 x 51 (spare, for light backgrounds only).
  await page.setContent(`<body style="margin:0;background:transparent"><div id="l" style="width:168px;height:51px">${svgSized(light, 168, 51.09)}</div></body>`);
  await page.locator('#l').screenshot({ path: path.join(ROOT, 'spare', 'kaisip-email-logo-light.png'), omitBackground: true });
  await page.close();
}

/* ---------- Previews ---------- */
const FONT_DIR = path.join(__dirname, 'fonts');
// Stand-ins so the pictures show the fallback look: a Georgia-metric serif and an Arial-metric sans.
const PREVIEW_FONTS = `<style>
@font-face{font-family:Georgia;src:url(file://${FONT_DIR}/g2.ttf);font-weight:400;font-style:normal}
@font-face{font-family:Georgia;src:url(file://${FONT_DIR}/g1.ttf);font-weight:400;font-style:italic}
@font-face{font-family:Georgia;src:url(file://${FONT_DIR}/g3.ttf);font-weight:700;font-style:normal}
</style>`;

function assemble(snippet, { imagesOff = false, invert = false } = {}) {
  let t = fs.readFileSync(path.join(ROOT, 'kaisip-kit-template.html'), 'utf8');
  t = t.replace('{{ message_content }}', snippet)
    .replace('{{ unsubscribe_url }}', '#unsubscribe')
    .replace('{{ address }}', 'KaiSip, [the postal address saved in Kit]')
    .replace('https://kaisip.com/assets/email/kaisip-email-logo-forest.png', `file://${ROOT}/publish/kaisip-email-logo-forest.png`)
    .replace('</head>', PREVIEW_FONTS + '</head>');
  if (imagesOff) {
    // What an inbox shows when pictures are blocked: the alt text, in the image's own colours.
    t = t.replace(/<img [^>]*alt="([^"]*)"[^>]*style="([^"]*)"[^>]*>/, (m, alt, style) => `<span style="${style};overflow:hidden;">${alt}</span>`);
  }
  if (invert) {
    // Rough stand-in for apps that flip every colour (Gmail on iPhone, Outlook.com): pictures are left alone.
    t = t.replace('</head>', '<style>html{filter:invert(1) hue-rotate(180deg);background:#F3F1EA}img{filter:invert(1) hue-rotate(180deg)}</style></head>');
  }
  return t;
}

async function shoot(browser, name, html, width, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  const file = path.join(__dirname, `_page-${name}.html`);
  fs.writeFileSync(file, html);
  await page.goto('file://' + file);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) console.log(`  !! ${name} @${width}: page is ${overflow}px wider than the screen`);
  await page.screenshot({ path: path.join(ROOT, 'previews', `${name}.png`), fullPage: true });
  await ctx.close();
  fs.unlinkSync(file);
}

(async () => {
  writeEmails();
  const browser = await chromium.launch();
  await logos(browser);
  const only = process.argv[2];
  const jobs = [];
  for (const key of ['waitlist-welcome', 'iphone-launch']) {
    const snip = fs.readFileSync(path.join(ROOT, 'emails', `${key}.html`), 'utf8');
    for (const w of [375, 600]) for (const s of ['light', 'dark']) jobs.push([`${key}-${w}-${s}`, assemble(snip), w, s]);
  }
  const welcome = fs.readFileSync(path.join(ROOT, 'emails', 'waitlist-welcome.html'), 'utf8');
  jobs.push(['waitlist-welcome-375-images-off', assemble(welcome, { imagesOff: true }), 375, 'light']);
  jobs.push(['waitlist-welcome-375-images-off-dark', assemble(welcome, { imagesOff: true }), 375, 'dark']);
  jobs.push(['waitlist-welcome-375-full-inversion-sim', assemble(welcome, { invert: true }), 375, 'light']);
  jobs.push(['waitlist-welcome-320-light', assemble(welcome), 320, 'light']);
  jobs.push(['waitlist-welcome-720-desktop-light', assemble(welcome), 720, 'light']);
  jobs.push(['news-welcome-375-light', assemble(fs.readFileSync(path.join(ROOT, 'emails', 'news-welcome.html'), 'utf8')), 375, 'light']);
  jobs.push(['news-welcome-600-dark', assemble(fs.readFileSync(path.join(ROOT, 'emails', 'news-welcome.html'), 'utf8')), 600, 'dark']);
  jobs.push(['waitlist-confirm-375-light-plain-kit-tags', assemble(fs.readFileSync(path.join(__dirname, 'waitlist-confirm.sim.html'), 'utf8')), 375, 'light']);
  jobs.push(['waitlist-confirm-375-dark-plain-kit-tags', assemble(fs.readFileSync(path.join(__dirname, 'waitlist-confirm.sim.html'), 'utf8')), 375, 'dark']);
  for (const [name, html, w, s] of jobs) { if (only && !name.includes(only)) continue; await shoot(browser, name, html, w, s); }
  await browser.close();
  const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1) + ' KB';
  console.log('template', kb(path.join(ROOT, 'kaisip-kit-template.html')));
  for (const k of Object.keys(EMAILS)) console.log(k, kb(path.join(ROOT, 'emails', `${k}.html`)));
})();
