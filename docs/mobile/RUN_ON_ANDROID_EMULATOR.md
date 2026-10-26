# Running KaiSip on the Android emulator, with live updates

Written for a beginner. Every step says what it does and why it matters.
Same idea as Salapify's "run it yourself" guide, adapted for KaiSip, which
is built with **Expo (React Native)** instead of Flutter.

The goal: KaiSip installed on your Android emulator **as its own app** (its
own icon, like Salapify 3), updating by itself whenever new code arrives, so
you can tap through a feature instead of looking at a screenshot of it.

> **Expo vs Expo Go.** *Expo* is the toolkit KaiSip is built with — like
> Flutter is for Salapify — and it stays. *Expo Go* is a separate helper app
> that can run Expo projects without building them. We do **not** use Expo Go:
> it cannot run every feature (daily reminders crash in it on Android).
> Instead you build a **development build**: the real KaiSip app, wired to
> receive live code updates.

---

## What you need

| Tool | Why | Status |
|---|---|---|
| **Android Studio** | The **emulator** and the Android SDK | ✅ from Salapify |
| **Java 17** | React Native's Android build requires it (Android Studio's bundled Java is too new) | Step 0 |
| **Node.js 20+** | Runs Expo's tools. `node --version` should print `v24.x` | ✅ installed |
| **VS Code** | To open the project and use its Terminal | ✅ |
| **Git** | To get the code | ✅ |

## Step 0 — Install Java 17 and tell the terminal where things live (once)

React Native's Android build needs **Java 17**. Newer Android Studio versions
bundle Java 21–25, which is too new: the build fails at a step named
`configureCMakeDebug` with *"A restricted method in java.lang.System has been
called"*. So install Java 17 separately:

1. Download **Azul Zulu JDK 17** for **macOS, ARM 64-bit, .dmg** (free):
   https://www.azul.com/downloads/?version=java-17-lts&os=macos&architecture=arm-64-bit&package=jdk
   (Intel Mac? pick **x86 64-bit** instead.) Open it and run the installer.
2. In the VS Code Terminal, paste these **four lines** one at a time:

       echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
       echo 'export JAVA_HOME="$(/usr/libexec/java_home -v 17)"' >> ~/.zshrc
       echo 'export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"' >> ~/.zshrc
       source ~/.zshrc

What this does: adds three settings to `~/.zshrc`, the file your terminal
reads every time it opens, so you never type them again. `source` applies
them to the current tab now.

Check it worked:

    java -version        # should say: openjdk version "17…"
    adb devices          # with the emulator running: emulator-5554  device

---

## Step 1 — Get the KaiSip code (once)

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
screen. The same emulator can run Salapify and KaiSip side by side — they are
separate apps.

## Step 4 — Build and run KaiSip (the first time)

Inside `~/aurivan/mobile`:

    npx expo run:android

What happens:

1. Expo generates the Android project (a hidden `android/` folder — never
   edit it, it is regenerated).
2. Gradle (Android's build tool) compiles KaiSip. **The first build takes
   5–10 minutes** — it is compiling everything from nothing. Later builds take
   well under a minute. This is normal.
3. It installs **KaiSip** on the emulator (you'll see the app icon), opens
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
> the KaiSip icon on the emulator and run `npx expo start` — the app
> connects to it. `npx expo run:android` also works every time; it just takes
> a little longer because it checks the build.

---

## Live updates — the efficient loop

### Option A: let a script do it (recommended)

When I (Claude) work in a cloud session and **push** commits, run this
instead of Step 4, with the emulator already open:

    cd ~/aurivan/mobile
    bash scripts/dev-sync.sh

It builds/installs KaiSip, starts the dev server, **and** watches GitHub.
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

## The emulator shows a blank white screen

Three common causes, most likely first:

1. **The dev server is not running.** The window that ran `dev-sync.sh` was
   closed or restarted (VS Code can restore a terminal as a plain prompt).
   A plain prompt is NOT the dev server: pressing `r` there does nothing
   useful (it may even run another project's helper). Start it again:

       cd ~/aurivan/mobile && bash scripts/dev-sync.sh

2. **The app on the emulator is from before a rename.** The app's id, name or
   icons live in the generated `android/` folder, which is not updated by a
   `git pull`. `dev-sync.sh` now notices this by itself and rebuilds from
   scratch (5-10 minutes, once). To do it by hand: Ctrl-C, then

       rm -rf android
       bash scripts/dev-sync.sh

   The old app stays on the emulator as a separate icon; long-press it and
   choose **Uninstall**.
3. **Metro's cache is stale.** Ctrl-C, run `npx expo start -c`, then reopen
   the app.

Still white? Open the terminal that runs the dev server and look for a red
error or "Unable to resolve": that line names the problem.

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
   Android's notification settings list KaiSip.
8. **Android back button** inside a quiz should ask before leaving.

Found something odd? Tell me the screen, what you tapped, and what you
expected. A screenshot (⌘-S in the emulator toolbar) helps a lot.

---

## Things worth knowing

**It starts completely empty** — exactly what a brand-new learner sees.

**Reset to a brand-new install:** long-press the KaiSip icon → **App info →
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

## Testing a release build (the R8 smoke test)

The emulator dev build above is not shrunk. Since mobile 1.24, **release**
builds (test APKs and store builds) are shrunk with R8, which deletes code the
app seems not to use. If it deletes something a library looks up by name, the
release app can crash where the dev build is fine. So after any change to
native libraries, test a release build once:

1. GitHub → **Actions → Phone build (EAS Build) → Run workflow**, profile
   **preview** (or `bash scripts/build-apk.sh` on the Mac). It builds a
   release APK with R8 on.
2. Install it: on a phone, open the build's page on expo.dev and tap
   **Install**; on an Apple-silicon Mac emulator, download the APK and run
   `adb -e install -r <file>.apk` (or drag it onto the emulator window). (The
   APK has no Intel emulator code, so an Intel Mac emulator can't run it.)
3. Try: first launch and onboarding, a practice set, a mock exam, notes and
   diagrams, Play games, Settings → reminders (a notification arrives),
   Your data → Save a backup and restore it, the share card (Save Image), and
   close and reopen the app (an over-the-air update applies).
4. A crash on open or on one screen? Send the error. The fix is usually one
   keep rule in `mobile/app.json` (`expo-build-properties` →
   `extraProguardRules`).

---

## Troubleshooting

| You see… | It means | Fix |
|---|---|---|
| `SDK location not found` / `ANDROID_HOME` | Step 0 wasn't applied in this tab | Run Step 0, or open a new Terminal tab |
| `Unable to locate a Java Runtime` / `JAVA_HOME is set to an invalid directory` | Java 17 missing or not selected | Install Java 17 and redo Step 0; `java -version` must say 17 |
| `Execution failed for task …configureCMakeDebug` + `A restricted method in java.lang.System has been called` | Build is running on Java 24+ (too new) | Install Java 17 (Step 0), then `cd android && ./gradlew --stop && cd .. && rm -rf android/.cxx android/app/.cxx node_modules/react-native-worklets/android/.cxx` and build again |
| `No Android connected device found` | Emulator isn't running | Start it (Step 3), then run the command again |
| `adb: command not found` | PATH line from Step 0 missing | Redo Step 0 |
| Build fails with a long Gradle error | Find the real cause: `cd android && ./gradlew app:assembleDebug 2>&1 \| tee ~/aurivan-build.log \| grep -A 12 "What went wrong"` — send that. Otherwise usually a stale build | `cd ~/aurivan/mobile && rm -rf android && npx expo run:android` (regenerates it) |
| App icon opens a "Development servers" screen | The dev server isn't running | Run `npx expo start` (or `bash scripts/dev-sync.sh`), then tap the server shown |
| Red error screen about a missing module | Libraries changed since your last install | Ctrl-C → `npm ci` → `npx expo run:android` |
| `Your local changes to … package-lock.json would be overwritten` | An `npm install` rewrote the lock file | `git restore mobile/package-lock.json`, then pull again; use `npm ci` from now on |
| `Could not fast-forward and you have local edits` from dev-sync | You (or a tool) changed files in the project | It lists them. Don't need them? `git restore . && git clean -fd` — the script then carries on. (A branch rebuilt after a merge is handled automatically when you have no local edits.) |

Send me a screenshot of any error you can't match here — the real cause is
usually a few lines above the last red line.
