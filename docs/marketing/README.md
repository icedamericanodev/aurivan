# docs/marketing: the Turning marketing pack

Ready-to-shoot materials built around the plant's form change, "The Turning" (owner request, 29 Oct 2026). Read `docs/MARKETING_PLAN.md` first; the store listing itself lives in `docs/mobile/STORE_LISTING.md`.

## Files

| File | What it is |
|---|---|
| `TURNING_VIDEO_PLAN.md` | The 30 s and 60 s video scripts and storyboards, the phone recording recipe, crops, music, the website hero loop and the claims checklist |
| `STORE_SCREENSHOTS_AND_FEATURE_GRAPHIC.md` | The 8 store screenshots with captions, the screenshot-1 A/B test, and the Play feature graphic brief |
| `BETA_SOCIAL_POSTS.md` | 5 beta posts (2 LinkedIn, 3 Threads) with visuals, links, timing and character counts |
| `README.md` | This file |
| `footage/` | Real-speed clips of the Turning, its end frame, and all 13 species at Form IV (made by `tools/capture.sh`) |
| `tools/capture.sh` | One command that re-makes everything in `footage/` from the app's own web build |

## Guardrails (check every line of copy, every super, every caption)

```
- Never promise or hint at a pass. Readiness is always "an estimate".
  Not allowed: "pass guaranteed", "ace", "crush the exam", a pass rate.
- Never say "official". Never show or state how many questions there are.
  Say "practice questions across all 5 CISA domains".
- CISA® and ISACA® only to describe the exam: ® on first use, plus
  "Not affiliated with or endorsed by ISACA®" where there is room.
  Never in the app name, icon or developer name. No #ISACA hashtag.
- Only CISA is live. Name no other certification. If needed, say only:
  "Starting with CISA. More certifications later."
- Say "grows into a new form" / "The Turning".
  Banned: "evolve", "evolution", "evolving", any Pokémon reference,
  "gotta catch", collecting language, "level up" monster talk.
- No hype words: ultimate, guaranteed, best, #1, revolutionary.
- Beta: "free to use during the beta" (never "free app", "free forever",
  "completely free"). Android = Google Play closed test; iPhone = kaisip.com
  plus the waitlist. No tester reward in posts unless it is word for word
  from marketing/BETA_PROGRAM.md section 4. Never ask for reviews.
- App Store media: no "beta" and no "Google Play".
- Store name: "KaiSip: Cyber & IT Audit Prep". Screenshot captions: 2–5 words,
  no "CISA".
- The Form IV app line includes "Every domain reached 65%". Never put it in a
  super, caption or voiceover. The hero line is "30 questions right, a week later."
- Never speed up, strobe-cut or loop the Turning back to back. It stays under
  2.5 changes a second only at real speed.
- Real app footage only (Apple and Play rules).
```

## Re-capturing the stills (from `mobile/`)

The harness exports the app for the web, seeds demo data and takes phone-size screenshots. It needs Playwright (already in Claude cloud sessions; on your own computer run `npx playwright install chromium` once). If it says port 8093 is in use, stop the old screenshot server and run it again.

```bash
cd mobile   # from the repo root

# Plant forms: Your plant at each form (oak, lotus, bamboo), the Form IV
# flavours, the final-form choice, the quiet note, and frame strips of the Turning.
SHOTS=forms bash scripts/screenshots/run.sh /tmp/kaisip-shots/forms light
SHOTS=forms bash scripts/screenshots/run.sh /tmp/kaisip-shots/forms dark

# Only the Turning, with every strip frame kept as its own PNG:
FRAMES=1 REVEAL_ONLY=1 SHOTS=forms bash scripts/screenshots/run.sh /tmp/kaisip-shots/turning light

# The six store screenshots (always light, 1080×1920, flattened for Play):
SHOTS=store bash scripts/screenshots/run.sh /tmp/kaisip-shots/store

# Other screens for the video storyboard:
SHOTS=today     bash scripts/screenshots/run.sh /tmp/kaisip-shots/today light
SHOTS=practice  bash scripts/screenshots/run.sh /tmp/kaisip-shots/practice light
SHOTS=learnplay bash scripts/screenshots/run.sh /tmp/kaisip-shots/learnplay light
```

Use any output folder you like (a scratch folder is best). Only the small starter set in `footage/` is kept in the repo. File names are `<name>-<theme>.png`.

**What the forms run makes:**
- `forms-{oak,lotus,bamboo}-form{I,II,III,IV}-growth{2,3,5,6}`: Your plant at each form
- `forms-oak-formIV-moot`, `forms-bamboo-formIV-holdfast`: two Form IV flavours
- `forms-look-final-choice`: the Look screen's final-form choice
- `forms-oak-quiet-note`: the quiet note for a plant that was already past Form I
- `forms-reveal-full`: the Form I → II Turning, a strip of 8 frames
- `forms-reveal-grand`: the Form III → IV Turning, a strip of 8 frames
- `forms-reveal-reduced`: the Reduce Motion cross-fade
- `forms-reveal-after`: Your plant just after the Turning
- `forms-reveal-waiting`: the calm "See Kai's new form" button
- `-xl` versions: about 200% text size

**Sizes:** the forms stills are 786×1704 (a 393×852 phone at 2×). That's too tall for Play's screenshot rule, so frame them on a 1080×1920 canvas (see the screenshots file). The store shots are already 1080×1920.

**The Play feature graphic** (from the repo root, not `mobile/`):
```bash
node design-notes/brand-kaisip/store/render.mjs
```

## The 13-species stills and the moving Turning (`tools/capture.sh`)

One command makes both, from the repo root (it needs `cd mobile && npm ci` once, plus ffmpeg):

```bash
bash docs/marketing/tools/capture.sh ../kaisip-turning
```

It writes to the folder you give it (keep it outside the repo):
- `forms13/forms13-<species>-form{III,IV}-<theme>.png`: all 13 species, botanical look, light and dark.
  Species ids: oak, maple, narra, cherry-blossom, pine, coconut-palm, mango, bonsai, sunflower, lotus, sampaguita, cactus, bamboo.
- `clips/turning-<species>-formIV-<theme>-9x16.mp4` (1080×1920) and `-4x5.mp4` (1080×1350): the real Form III → IV Turning at exactly real speed, with a 1.5 s hold on the name. The 4:5 crop stops above "What grows it next", so no domain percentages show.
- `clips/turning-<species>-formIV-<theme>-end.png`: the settled last frame (screenshot 7's source).

Add species ids after the folder to choose which Turnings to film (default: oak, bamboo, narra and cherry-blossom in light, and oak in dark).

**How it films at real speed.** Like the repo's `SHOTS=forms` frame strips, it slows the page's clock 20× from the first frame, takes a full-resolution screenshot as often as it can, and saves each frame with its app time. ffmpeg then rebuilds the clip from those times. A plain screen recorder in a headless browser drops frames and records at half resolution, so it isn't used.

**What these clips are for.** They are the real app (its web build), so they suit social posts, the website hero and the edit's animatic. The App Store preview and the Play promo video use a recording from a real phone: `TURNING_VIDEO_PLAN.md` section 2.

**Do not use `mobile/scripts/screenshots/plant_sheet.sh` for marketing.** It renders the older cartoon look (with faces), not the botanical forms the Turning shows.

### What's in `footage/` now (made 30 Oct 2026, mobile 1.52.0)

A small starter set, so the edit can begin today. Re-make it with `capture.sh` after any change to the plant art.

| File | What it is |
|---|---|
| `turning-oak-formIV-light-9x16.mp4`, `-4x5.mp4` | The oak's Form III → IV Turning, light theme |
| `turning-oak-formIV-dark-4x5.mp4` | The same, dark theme |
| `turning-{bamboo,narra,cherry-blossom}-formIV-light-4x5.mp4` | Three species for the curated highlight |
| `turning-oak-formIV-light-end.png` | The settled end frame: the fact, "The Broadcrown Oak" and its description |
| `forms13-formIV-{light,dark}.jpg` | Contact sheet: all 13 species at Form IV, with each form's name |

## Who to ask

- `growth-marketer`: copy, posts, store listing
- `mobile-motion-designer`: the Turning footage
- `brand-logo-designer`: the feature graphic and framed screenshots
- `mobile-app-engineer`: demo backup files, harness extensions
- `app-store-compliance-reviewer`: before anything goes into App Store Connect or Play Console
