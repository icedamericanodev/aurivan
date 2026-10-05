# Running Aurivan on the Android emulator, with live updates

Written for a beginner. Every step says what it does and why it matters.
Same idea as Salapify's "run it yourself" guide, adapted for Aurivan, which
is built with **Expo (React Native)** instead of Flutter.

The goal: Aurivan installed on your Android emulator **as its own app** (its
own icon, like Salapify 3), updating by itself whenever new code arrives, so
you can tap through a feature instead of looking at a screenshot of it.

> **Expo vs Expo Go.** *Expo* is the toolkit Aurivan is built with — like
> Flutter is for Salapify — and it stays. *Expo Go* is a separate helper app
> that can run Expo projects without building them. We do **not** use Expo Go:
> it cannot run every feature (daily reminders crash in it on Android).
> Instead you build a **development build**: the real Aurivan app, wired to
> receive live code updates.

---

## What you need

| Tool | Why | Status |
|---|---|---|
| **Android Studio** | The **emulator**, the Android SDK, and the Java it bundles | ✅ from Salapify |
| **Node.js 20+** | Runs Expo's tools. `node --version` should print `v24.x` | ✅ installed |
| **VS Code** | To open the project and use its Terminal | ✅ |
| **Git** | To get the code | ✅ |

## Step 0 — Tell the terminal where Android and Java live (once)

Flutter finds these on its own; Expo's Android build needs to be told. In the
VS Code Terminal, paste these **four lines** one at a time, pressing Enter
after each:

    echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
    echo 'export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"' >> ~/.zshrc
    echo 'export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"' >> ~/.zshrc
    source ~/.zshrc

What this does: adds three settings to `~/.zshrc`, the file your terminal
reads every time it opens, so you never have to type them again. `source`
applies them to the current tab right away.

Check it worked:

    adb devices

With the emulator running you should see something like `emulator-5554  device`.

---

## Step 1 — Get the Aurivan code (once)

    cd ~
    git clone https://github.com/icedamericanodev/aurivan.git
    cd aurivan/mobile

Already cloned? Just update instead: `cd ~/aurivan && git pull && cd mobile`.

## Step 2 — Install the app's libraries (once, and after library changes)

    npm ci

Downloads every library the app uses and builds the question pack. Look for
`✓ content pack built: … questions`. Yellow `npm warn` lines are normal.

> **Why `npm ci` and not `npm install`?** `npm ci` installs *exactly* what
> the project's lock file lists and never changes that file. `npm install`
> can quietly rewrite `package-lock.json`, and then `git pull` refuses with
> *"Your local changes … would be overwritten"*. If that ever happens:
> `git restore mobile/package-lock.json`, then pull again.

## Step 3 — Start the emulator

Android Studio → **More Actions → Virtual Device Manager** (or **Tools →
Device Manager**) → press **▶** next to your **Pixel 8**. Wait for the home
screen. The same emulator can run Salapify and Aurivan side by side — they are
separate apps.

## Step 4 — Build and run Aurivan (the first time)

Inside `~/aurivan/mobile`:

    npx expo run:android

What happens:

1. Expo generates the Android project (a hidden `android/` folder — never
   edit it, it is regenerated).
2. Gradle (Android's build tool) compiles Aurivan. **The first build takes
   5–10 minutes** — it is compiling everything from nothing. Later builds take
   well under a minute. This is normal.
3. It installs **Aurivan** on the emulator (you'll see the app icon), opens
   it, and starts the **dev server** that streams your code into the app.

You should see: *"Which exam are you preparing for?"*

Leave that Terminal running. Keys you can press in it:

| Key | What it does |
|---|---|
| **r** | Reload the app (fresh start, keeps saved progress) |
| **j** | Open the debugger |
| **m** | Toggle the in-app developer menu |
| **Ctrl-C** | Stop the dev server |

> **Next time,** if nothing native changed, you don't need to rebuild: open
> the Aurivan icon on the emulator and run `npx expo start` — the app
> connects to it. `npx expo run:android` also works every time; it just takes
> a little longer because it checks the build.

---

## Live updates — the efficient loop

### Option A: let a script do it (recommended)

When I (Claude) work in a cloud session and **push** commits, run this
instead of Step 4, with the emulator already open:

    cd ~/aurivan/mobile
    bash scripts/dev-sync.sh

It builds/installs Aurivan, starts the dev server, **and** watches GitHub.
Every 15 seconds it checks for new commits, pulls them, and prints what
changed. Code changes appear on the emulator **within a second or two, by
themselves** (Expo's "Fast Refresh"). It also:

- rebuilds the question pack when questions change, and
- runs `npm ci` and **rebuilds the app** when libraries change (new
  libraries can contain native Android code, which only a rebuild picks up).

You don't type anything after starting it. Stop it with **Ctrl-C**.

> **Which branch?** It watches the branch you're on. To test a pull request
> before merging, switch to its branch first, e.g.
> `git fetch origin && git checkout claude/jolly-archimedes-p1sklr`
> (the PR page shows the branch name). To test what's live, stay on `main`.

### Option B: by hand

Leave `npx expo run:android` running. In a **second** Terminal tab (the **+**
in VS Code's Terminal panel):

    cd ~/aurivan && git pull

The app updates by itself. Two exceptions:

| If the pull changed… | Do this |
|---|---|
| Questions (`data/domain*.json`) | `cd mobile && npm run content` |
| Libraries (`mobile/package.json`) | Ctrl-C the dev server, `npm ci`, then `npx expo run:android` again |

I'll tell you when either happens. It's rare.

**If a screen still looks old:** press **r**. If *that* still shows old
code: Ctrl-C, run `npx expo start -c` (the `-c` clears the cache), and check
`git branch --show-current` to confirm you're on the branch you expect.

---

## What to test — a 10-minute tour

1. **Onboarding:** pick CISA (others show "Coming soon"), pick an exam date.
2. **Home:** readiness 0%, domain bars, "Practise IS Audit (10)".
3. **Practice a question:** tap an option → choose Sure/Unsure/Guessing →
   **Submit answer**. Check the green ✓ / red ✗ marks, that "Why X is
   tempting but wrong" uses the **same letter you tapped**, and that tips
   reveal one at a time (Trap → Mindset → Exam-day).
4. **Answer a few wrong on purpose**, end the session → Results → **Practise
   the ones I missed**.
5. **Home → Spaced review** now shows questions due.
6. **Mock tab → Mini mock:** answer a few, **flag** one (⚐), open the grid
   (▦), then **Pause**. Swipe the app away completely, reopen it from its
   icon, and check Home shows **Resume** with your answers still there.
7. **Settings:** Dark/Light, shuffle off (options stay in A–D order), and
   the **daily reminder** — it works in this build. Set it, then check
   Android's notification settings list Aurivan.
8. **Android back button** inside a quiz should ask before leaving.

Found something odd? Tell me the screen, what you tapped, and what you
expected. A screenshot (⌘-S in the emulator toolbar) helps a lot.

---

## Things worth knowing

**It starts completely empty** — exactly what a brand-new learner sees.

**Reset to a brand-new install:** long-press the Aurivan icon → **App info →
Storage → Clear storage**, or in the app: **Settings → Reset CISA progress**.

**Your progress lives on the emulator only.** Accounts and sync come later.

**The dev build is for testing, not the store.** The store version is built
separately (EAS production build) and doesn't connect to a dev server.

---

## Running on your real Android phone

Developer options (Settings → About phone → tap **Build number** 7 times) →
turn on **USB debugging** → plug into the Mac → trust the computer →
`adb devices` should list it → `npx expo run:android --device` and pick your
phone. Live updates work the same way.

---

## Troubleshooting

| You see… | It means | Fix |
|---|---|---|
| `SDK location not found` / `ANDROID_HOME` | Step 0 wasn't applied in this tab | Run Step 0, or open a new Terminal tab |
| `Unable to locate a Java Runtime` / `JAVA_HOME is set to an invalid directory` | Java path wrong | Check Android Studio is in **Applications**; redo Step 0 |
| `No Android connected device found` | Emulator isn't running | Start it (Step 3), then run the command again |
| `adb: command not found` | PATH line from Step 0 missing | Redo Step 0 |
| Build fails with a long Gradle error | Usually a stale build | `cd ~/aurivan/mobile && rm -rf android && npx expo run:android` (regenerates it) |
| App icon opens a "Development servers" screen | The dev server isn't running | Run `npx expo start` (or `bash scripts/dev-sync.sh`), then tap the server shown |
| Red error screen about a missing module | Libraries changed since your last install | Ctrl-C → `npm ci` → `npx expo run:android` |
| `Your local changes to … package-lock.json would be overwritten` | An `npm install` rewrote the lock file | `git restore mobile/package-lock.json`, then pull again; use `npm ci` from now on |
| `Could not fast-forward and you have local edits` from dev-sync | You (or a tool) changed files in the project | It lists them. Don't need them? `git restore . && git clean -fd` — the script then carries on. (A branch rebuilt after a merge is handled automatically when you have no local edits.) |

Send me a screenshot of any error you can't match here — the real cause is
usually a few lines above the last red line.
