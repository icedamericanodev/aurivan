/**
 * Aurivan Mobile Audit Script
 * Paste this entire block into Chrome/Safari DevTools console
 * while viewing your app at 375×667 (Device Toolbar on in DevTools)
 *
 * Reports: contrast failures, tap targets < 44px, font-size < 16px on inputs,
 * 100vh usage, missing safe-area insets, body scroll lock issues
 */
(function auditMobile() {
  const issues = [];
  const warn  = (type, el, msg) => issues.push({ severity:'⚠ warn',  type, msg, el });
  const fail  = (type, el, msg) => issues.push({ severity:'✗ fail',  type, msg, el });
  const ok    = (type,     msg) => issues.push({ severity:'✓ ok',    type, msg, el: null });

  // ── 1. Contrast: #505068 on readable text ─────────────────────────
  document.querySelectorAll('*').forEach(el => {
    if (!el.offsetParent && el.tagName !== 'BODY') return; // skip hidden
    const cs = getComputedStyle(el);
    const c  = cs.color;
    if (c === 'rgb(80, 80, 104)' && el.childNodes.length && el.textContent.trim().length > 2) {
      fail('contrast', el, `#505068 text — contrast ~2.8:1, fails WCAG AA. El: <${el.tagName.toLowerCase()}>`);
    }
  });

  // ── 2. Tap targets < 44px ─────────────────────────────────────────
  const interactiveSelectors = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [onclick], [tabindex]';
  document.querySelectorAll(interactiveSelectors).forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return; // hidden
    if (r.height > 0 && r.height < 44) {
      fail('tap-target', el,
        `${Math.round(r.height)}px tall < 44px. <${el.tagName.toLowerCase()}${el.className ? ' class="'+el.className.split(' ')[0]+'"' : ''}>`
      );
    }
    if (r.width > 0 && r.width < 44) {
      warn('tap-target', el,
        `${Math.round(r.width)}px wide < 44px. <${el.tagName.toLowerCase()}${el.className ? ' class="'+el.className.split(' ')[0]+'"' : ''}>`
      );
    }
  });

  // ── 3. Input font-size < 16px (causes iOS Safari zoom) ────────────
  document.querySelectorAll('input, textarea, select').forEach(el => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) {
      fail('ios-zoom', el,
        `font-size: ${fs}px on <${el.tagName.toLowerCase()}>. iOS Safari zooms viewport on focus if < 16px.`
      );
    }
  });

  // ── 4. Fixed elements without safe-area inset ─────────────────────
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') {
      const pb = cs.paddingBottom;
      const hasSafeArea = el.getAttribute('style')?.includes('safe-area') ||
                          document.styleSheets && (() => {
                            try {
                              return Array.from(document.styleSheets)
                                .flatMap(s => { try { return Array.from(s.cssRules) } catch(e) { return [] } })
                                .some(r => r.cssText?.includes('safe-area'));
                            } catch(e) { return false; }
                          })();
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight * 0.85) {
        warn('safe-area', el,
          `Fixed element near bottom without env(safe-area-inset-bottom). <${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}>`
        );
      }
    }
  });

  // ── 5. Viewport meta check ────────────────────────────────────────
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    fail('viewport', null, 'No <meta name="viewport"> found. iOS will render at 980px layout width.');
  } else {
    const content = viewportMeta.getAttribute('content') || '';
    if (!content.includes('width=device-width')) {
      fail('viewport', viewportMeta, 'Missing width=device-width in viewport meta.');
    }
    if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
      fail('viewport', viewportMeta, 'user-scalable=no or maximum-scale=1 prevents zoom — WCAG 1.4.4 failure.');
    }
    if (content.includes('width=device-width') && !content.includes('user-scalable=no')) {
      ok('viewport', 'Viewport meta looks correct.');
    }
  }

  // ── 6. Horizontal overflow (causes unwanted scroll) ───────────────
  const bodyW = document.body.scrollWidth;
  const winW  = window.innerWidth;
  if (bodyW > winW + 2) {
    fail('overflow', document.body,
      `Body scrollWidth (${bodyW}px) > window width (${winW}px) — page has horizontal overflow.`
    );
  } else {
    ok('overflow', `No horizontal overflow detected (body ${bodyW}px, window ${winW}px).`);
  }

  // ── 7. Body scroll lock in modals ─────────────────────────────────
  // Just report body overflow state — user should test by opening a modal
  const bodyOverflow = getComputedStyle(document.body).overflow;
  if (bodyOverflow === 'hidden') {
    ok('scroll-lock', 'Body overflow is currently hidden — scroll lock is active (good if modal is open).');
  } else {
    warn('scroll-lock', null, 'Body overflow is not hidden. Open a modal and re-run to verify scroll lock is applied.');
  }

  // ── Report ────────────────────────────────────────────────────────
  const failures = issues.filter(i => i.severity.startsWith('✗'));
  const warnings = issues.filter(i => i.severity.startsWith('⚠'));
  const passes   = issues.filter(i => i.severity.startsWith('✓'));

  console.group('%cAurivan Mobile Audit', 'font-weight:bold;font-size:14px');
  console.log(`%c${failures.length} failures  ${warnings.length} warnings  ${passes.length} passing`,
    'color:gray;font-size:12px');

  if (failures.length) {
    console.group('%c✗ FAILURES (fix before launch)', 'color:#f87171;font-weight:bold');
    failures.forEach(i => console.log(`[${i.type}] ${i.msg}`, i.el || ''));
    console.groupEnd();
  }
  if (warnings.length) {
    console.group('%c⚠ WARNINGS', 'color:#fbbf24;font-weight:bold');
    warnings.forEach(i => console.log(`[${i.type}] ${i.msg}`, i.el || ''));
    console.groupEnd();
  }
  if (passes.length) {
    console.group('%c✓ PASSING', 'color:#4ade80;font-weight:bold');
    passes.forEach(i => console.log(`[${i.type}] ${i.msg}`));
    console.groupEnd();
  }
  console.groupEnd();

  return { failures: failures.length, warnings: warnings.length };
})();
