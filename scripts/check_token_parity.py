#!/usr/bin/env python3
"""Web <-> mobile design-token parity for the premium pass §0 pairs.

The web app (index.html) and the mobile app (mobile/src/theme/tokens.ts)
share one design system (Grove). This check reads the web `:root` and
`[data-theme="dark"]` blocks and the mobile `light` / `dark` palettes and
`space` scale, and fails when a shared pair drifts.

Pairs (premium pass deltas §0):
  T1  dark raised      web --surface      <-> mobile dark.raised
      dark raised2     web --raised2      <-> mobile dark.raised2 (sits between bg and raised)
  T3  dark wrongBg     web --wrong-light  <-> mobile dark.wrongBg
  T4  section gap      web --sp-2xl       <-> mobile space.xxl (web --sp-section is retired)

PENDING lists a mobile value that a web release has moved ahead of, while
the matching mobile change is still being built. A pair whose mobile side
still holds exactly that old value is reported as pending, not failed; any
other mismatch fails. Empty PENDING once mobile ships the change.

Usage: python3 scripts/check_token_parity.py   (exit 1 on drift)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / 'index.html'
MOBILE = ROOT / 'mobile' / 'src' / 'theme' / 'tokens.ts'

# (label, web block, web var, mobile object, mobile key)
PAIRS = [
    ('T1 dark raised', 'dark', '--surface', 'dark', 'raised'),
    ('T1 dark raised2', 'dark', '--raised2', 'dark', 'raised2'),
    ('T3 dark wrongBg', 'dark', '--wrong-light', 'dark', 'wrongBg'),
    ('T4 section gap', 'root', '--sp-2xl', 'space', 'xxl'),
]

# mobile key -> the old value it may still hold while mobile catches up.
PENDING = {}


def first_block(css, selector):
    """The first `selector { ... }` block's declarations (the Grove token blocks come first)."""
    m = re.search(re.escape(selector) + r'\s*\{', css)
    if not m:
        return None
    depth, i = 1, m.end()
    while i < len(css) and depth:
        if css[i] == '{':
            depth += 1
        elif css[i] == '}':
            depth -= 1
        i += 1
    body = re.sub(r'/\*.*?\*/', '', css[m.end():i - 1], flags=re.S)
    return dict((k, v.strip()) for k, v in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', body))


def ts_object(src, name):
    m = re.search(r'export const ' + re.escape(name) + r'\b[^=]*=\s*\{(.*?)\}', src, re.S)
    if not m:
        return None
    body = re.sub(r'//[^\n]*', '', m.group(1))
    out = {}
    for k, v in re.findall(r'(\w+)\s*:\s*([^,\n]+)', body):
        out[k] = v.strip().strip("'\"")
    return out


def norm(v):
    v = str(v).strip()
    if re.fullmatch(r'#[0-9a-fA-F]{3,8}', v):
        return v.upper()
    m = re.fullmatch(r'(\d+(?:\.\d+)?)(px)?', v)
    return m.group(1) if m else v


def main():
    print('Token parity (web index.html <-> mobile tokens.ts):')
    if not MOBILE.exists():
        print('  skipped (mobile/src/theme/tokens.ts not found)')
        return 0
    html = WEB.read_text(encoding='utf8')
    ts = MOBILE.read_text(encoding='utf8')
    web = {'root': first_block(html, ':root'), 'dark': first_block(html, '[data-theme="dark"]')}
    mob = {k: ts_object(ts, k) for k in ('light', 'dark', 'space')}
    if not web['root'] or not web['dark'] or not all(mob.values()):
        print('  ✗ could not read the token blocks')
        return 1
    ok = True
    for label, wb, wv, mo, mk in PAIRS:
        w, m = web[wb].get(wv), mob[mo].get(mk)
        if w is None or m is None:
            print(f'  ✗ {label}: missing (web {wv}={w}, mobile {mo}.{mk}={m})')
            ok = False
        elif norm(w) == norm(m):
            print(f'  ✓ {label}: {w}')
        elif PENDING.get((mo, mk)) and norm(m) == norm(PENDING[(mo, mk)]):
            print(f'  ⚠ {label}: web {w}, mobile still {m} (mobile change pending)')
        else:
            print(f'  ✗ {label}: web {wv}={w} but mobile {mo}.{mk}={m}')
            ok = False
    if '--sp-section' in web['root'] or 'var(--sp-section)' in html:
        print('  ✗ T4: web --sp-section is retired; use --sp-2xl (32)')
        ok = False
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
