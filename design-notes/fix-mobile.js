#!/usr/bin/env node
/**
 * Aurivan Mobile Fix Script
 * Applies safe, mechanical CSS/HTML fixes to a single-page HTML file.
 *
 * Usage:
 *   node fix-mobile.js path/to/your-app.html
 *
 * What it does:
 *   1. Replaces #505068 with #9090aa (contrast fix — WCAG AA)
 *   2. Adds 100dvh fallback after every 100vh height declaration (iOS Safari fix)
 *   3. Adds font-size: 16px to input/textarea/select rules that have font-size < 16px (iOS zoom fix)
 *   4. Reports what needs manual review
 *
 * What it does NOT touch:
 *   - safe-area-inset fixes (too context-specific — see MANUAL FIXES below)
 *   - user-scalable viewport (too risky to auto-edit — check manually)
 *   - tap target sizes (requires HTML restructuring)
 *
 * A timestamped backup is created before any changes.
 */

const fs   = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node fix-mobile.js <path-to-html-file>');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
const original = html;
const log = [];

// ── FIX 1: #505068 → #9090aa ──────────────────────────────────────────────
// Safe to do globally — #505068 should never appear as readable text colour
const count505068 = (html.match(/#505068/gi) || []).length;
if (count505068 > 0) {
  html = html.replace(/#505068/gi, '#9090aa');
  log.push(`✓ [contrast]   #505068 → #9090aa: ${count505068} instance(s) replaced`);
} else {
  log.push(`— [contrast]   #505068 not found — nothing to replace`);
}

// ── FIX 2: 100vh → add 100dvh fallback ────────────────────────────────────
// Inserts a second declaration immediately after: height: 100vh; → height: 100dvh;
// Does not remove the original vh declaration (keeps backwards compat)
let dvhCount = 0;

// height: 100vh;
html = html.replace(/(height\s*:\s*100vh\s*;)(?!\s*\n\s*height\s*:\s*100dvh)/gi, (match) => {
  dvhCount++;
  return match + '\n  ' + match.replace('100vh', '100dvh');
});

// min-height: 100vh;
html = html.replace(/(min-height\s*:\s*100vh\s*;)(?!\s*\n\s*min-height\s*:\s*100dvh)/gi, (match) => {
  dvhCount++;
  return match + '\n  ' + match.replace('100vh', '100dvh');
});

if (dvhCount > 0) {
  log.push(`✓ [ios-safari]  100dvh fallback added after ${dvhCount} 100vh declaration(s)`);
} else {
  log.push(`— [ios-safari]  No 100vh height declarations found`);
}

// ── FIX 3: input/textarea/select font-size < 16px ─────────────────────────
// Finds inline style font-size on input/textarea/select elements
let zoomFixed = 0;

// Inline styles: <input style="...font-size: 14px...">
html = html.replace(
  /(<(?:input|textarea|select)[^>]*style\s*=\s*["'][^"']*font-size\s*:\s*)(\d+(?:\.\d+)?)(px)([^"']*["'])/gi,
  (match, pre, size, unit, post) => {
    if (parseFloat(size) < 16) {
      zoomFixed++;
      return pre + '16' + unit + post;
    }
    return match;
  }
);

// CSS rules targeting input/textarea/select with font-size < 16px
// Matches: input { ... font-size: 14px ... }
html = html.replace(
  /((?:input|textarea|select)[^{]*\{[^}]*font-size\s*:\s*)(\d+(?:\.\d+)?)(px)/gi,
  (match, pre, size, unit) => {
    if (parseFloat(size) < 16) {
      zoomFixed++;
      return pre + '16' + unit;
    }
    return match;
  }
);

if (zoomFixed > 0) {
  log.push(`✓ [ios-zoom]    font-size bumped to 16px on ${zoomFixed} input/textarea/select instance(s)`);
} else {
  log.push(`— [ios-zoom]    No sub-16px font-size found on inputs`);
}

// ── WRITE ──────────────────────────────────────────────────────────────────
if (html !== original) {
  const ts     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext    = path.extname(file);
  const backup = file.replace(ext, `.backup-${ts}${ext}`);
  fs.writeFileSync(backup, original, 'utf8');
  fs.writeFileSync(file, html, 'utf8');
  console.log(`\n✓ Fixes applied to: ${file}`);
  console.log(`  Backup saved:      ${backup}\n`);
} else {
  console.log('\n— No changes needed. File unchanged.\n');
}

log.forEach(l => console.log(' ', l));

// ── MANUAL FIXES REMINDER ─────────────────────────────────────────────────
console.log(`
──────────────────────────────────────────────────
MANUAL FIXES still needed (not auto-applied):
──────────────────────────────────────────────────

1. Safe-area insets (iOS home indicator overlap)
   Find any position:fixed element near the bottom and add:

     padding-bottom: calc(16px + env(safe-area-inset-bottom));

   Common candidates: submit button bar, bottom nav, timer bar.

2. Viewport meta — check yours has:

     <meta name="viewport" content="width=device-width, initial-scale=1">

   Remove any: user-scalable=no  or  maximum-scale=1

3. Tap targets < 44px
   Run audit-mobile.js in DevTools console to find specific elements,
   then add padding to expand hit areas without changing visual size:

     .small-icon-btn { padding: 12px; }  /* expands tap area */

4. #505068 on truly decorative elements
   This script replaced ALL #505068 → #9090aa. If you use #505068 purely
   for non-text decoration (borders, dividers), you can revert those
   specific instances back without affecting readability.
──────────────────────────────────────────────────
`);
