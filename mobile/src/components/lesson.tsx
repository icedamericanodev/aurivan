/**
 * Lesson scene templates — one composed, animated layout per scene type.
 *
 * Grove v2 (DESIGN_SYSTEM.md §11 "Learn", §2): scene prose is the serif
 * `stem` style (you sit and read it), the takeaway and "The IS auditor’s lens"
 * are the key-idea recipe (a leaf, a caption, the italic `quote` on a 3px
 * green rule), and checks reuse the quiz OptionCard and the session's
 * verdict leaf. Check options are shuffled like practice questions and
 * graded on the ORIGINAL letter (engine/shuffle.ts). No cards around
 * content; tinted blocks only for the trap.
 *
 * Mobile 1.12 (ui.md LP1–LP4, §3 `LessonCover` + `SceneBuild`, motion.md M4):
 * - The title scene is a lesson COVER: the forest panel with the domain's
 *   branch, the title, "5 min · 7 scenes" and the promise, then "In this
 *   lesson": the lesson's own map, so a learner knows what's coming.
 * - Diagrams BUILD in reading order (`SceneBuild`): parts arrive 120 ms
 *   apart (the first 6), each with a fade and an 8pt rise. Three templates:
 *   - steps (`flow`): numbered stops; the path between them draws down as
 *     each stop arrives (nothing springs: a scene's parts only fade and rise);
 *   - layers (`stack`): bands that settle onto the stack from above;
 *   - timeline (`flow` with layout 'timeline'): phases on a time rail that
 *     draws down the whole build, ending in an arrow (time runs on).
 * - Mobile 1.22 (design spec §4): every scene starts at ONE anchor line
 *   under the header (the player pads it), with a kicker naming the scene
 *   kind ("The idea", "How it flows", "The trap"…) over its heading in
 *   `hero`. Nothing is pushed down to the middle any more, so a page turn
 *   lands on the same line each time. A heading that only repeats its
 *   kicker ("The core idea") is left out.
 * - Under Reduce Motion every part fades in together (120 ms), lines are
 *   simply drawn, and nothing moves; the same words are there.
 * Every part is mounted (and readable) from the first frame.
 */
import { useRef, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { Lesson, Scene } from '../content/lessons/types';
import { displayToOriginal, isCheckCorrect, lettersFor, originalToDisplay, renderText, type Permutation } from '../engine/shuffle';
import { LETTERS, type Letter } from '../content/types';
import { moveFocus } from '../lib/a11y';
import { lessonNotes } from '../lib/outline';
import { haptic } from '../lib/haptics';
import { motion, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LeafBig, PlanLeaf, type BotanyKind } from './glyphs';
import { DrawLine, FadeIn } from './motion';
import { Bullets } from './notes';
import { OptionCard, Verdict, type OptionState } from './quiz';
import { BigNum, Gap, HeroPanel, Stem, T } from './ui';

/** When part `i` of a scene arrives: 120 ms apart in reading order, the first 6 (the rest come with the 6th). */
export const partDelay = (i: number) => Math.min(i, motion.stagger.maxScene - 1) * motion.stagger.scene;

/**
 * The index of a scene's last part (its "Report a problem" link arrives with
 * it). Exported for the player and tests. A check's link waits for the answer.
 */
export function lastPart(scene: Scene): number {
  switch (scene.type) {
    case 'flow':
      return scene.steps.length + (scene.caption ? 1 : 0);
    case 'stack':
      return scene.layers.length + (scene.caption ? 1 : 0);
    case 'compare':
      return scene.caption ? 3 : 2;
    case 'trap':
      return 2;
    case 'check':
      return scene.options.length;
    case 'tip':
      // The takeaway: the caption, the italic quote, then (when it runs long) the rest in plain text.
      return splitCoachText(scene.body).rest ? 2 : 1;
    case 'idea':
      // "The IS auditor’s lens" splits like the takeaway; a plain idea is two parts.
      return scene.heading === COACH_HEADING && splitCoachText(scene.body).rest ? 2 : 1;
    default:
      // The cover and an analogy: two parts.
      return 1;
  }
}

/**
 * One part of a scene building up (`SceneBuild`): fade + 8pt rise after
 * its reading-order delay. It plays inside the page turn too: the build-up
 * IS the content. `drop`: settles from above (a layer onto the stack).
 * `spoken`: the part is ONE screen-reader stop that says this (a step or a
 * layer: "Step 2 of 4: label. note"), its layout on that stop.
 */
function Part({ i, drop, style, spoken, children }: { i: number; drop?: boolean; style?: object; spoken?: string; children: ReactNode }) {
  return (
    <FadeIn build delay={partDelay(i)} drop={drop} style={spoken ? undefined : style}>
      {spoken ? (
        <View accessible accessibilityLabel={spoken} style={style}>
          {children}
        </View>
      ) : (
        children
      )}
    </FadeIn>
  );
}

/**
 * The name of the "coach speaks" scene: the one reasoning tip in each lesson
 * that shows how an IS auditor would think. The lesson data (content/lessons)
 * uses this exact text as the scene `heading`, and the code below compares
 * against it in two places (kicker and key-idea card), so it lives here ONCE.
 * If you ever rename it, change this line and the headings in cisa.ts together
 * (a test fails if they drift apart).
 */
export const COACH_HEADING = 'The IS auditor’s lens';

/**
 * What KIND of scene this is, in a word or two: the kicker over its heading
 * (mobile 1.22, design spec §4.3). "Think of it like" reads as a lead-in to
 * an analogy's name ("A leaking roof"); an analogy whose heading already
 * says "Think of…" gets "An analogy" instead, so the page never says it
 * twice. Exported for tests.
 */
export function sceneKicker(scene: Scene): string | null {
  switch (scene.type) {
    case 'title':
      return null;
    case 'idea':
      return scene.heading === COACH_HEADING ? COACH_HEADING : 'The idea';
    case 'analogy':
      return /^think of\b/i.test(scene.heading) ? 'An analogy' : 'Think of it like';
    case 'flow':
      return 'How it flows';
    case 'stack':
      return 'The layers';
    case 'compare':
      return 'Side by side';
    case 'trap':
      return 'The trap';
    case 'tip':
      return 'Exam-day shortcut';
    case 'check':
      return 'Quick check';
  }
}

/**
 * Whether a heading only repeats its kicker ("The core idea" under "The
 * idea", "The exam trap" under "The trap"): then the kicker stands alone and
 * the first sentence of the body leads. Exported for tests.
 */
export function headingRepeatsKicker(kicker: string, heading: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/\b(core|exam|main|key|big)\s+/g, '').replace(/\s+/g, ' ').trim();
  return norm(kicker) === norm(heading);
}

/**
 * The top of every scene (mobile 1.22, design spec §4.2–4.4): the kicker
 * (`caption`, accentText; honey for the trap) naming the scene kind, 6pt,
 * then the heading in `hero` (Fraunces 28/34), then 16pt to the body. Every
 * scene starts at the same anchor line under the header, so a page turn
 * lands on the same y each time and nothing jumps. One screen-reader
 * heading: the kicker and heading are spoken together ("The idea: What a
 * charter does").
 */
function SceneTop({ kicker, heading, tone }: { kicker: string; heading?: string; tone?: string }) {
  const { c } = useTheme();
  const showHeading = Boolean(heading) && !headingRepeatsKicker(kicker, heading!);
  return (
    <Part i={0}>
      <View accessible accessibilityRole="header" accessibilityLabel={showHeading ? `${kicker}: ${heading}` : kicker}>
        <T v="caption" color={tone ?? c.accentText}>{kicker}</T>
        {showHeading && (
          <T v="hero" style={{ marginTop: 6 }}>{heading}</T>
        )}
      </View>
      <Gap h={space.lg} />
    </Part>
  );
}

/** Scene prose: the serif reading style. */
function Prose({ children }: { children: string }) {
  return <Stem>{children}</Stem>;
}

/**
 * The italic coach's voice is capped (mobile 1.39, design spec §1: italic is
 * "never for whole paragraphs > 4 lines"): at most two sentences and about
 * four lines at phone width. Fraunces italic 18 fits about 35 characters a
 * line at 393pt, so four lines is about 140 characters.
 */
export const QUOTE_MAX_SENTENCES = 2;
export const QUOTE_MAX_CHARS = 140;

/**
 * Splits a sentence-ending text into its sentences. A sentence ends at . ? or !
 * (with any closing quote or bracket) followed by a space and a capital or an
 * opening quote. "(information systems)" and "a.m." mid-sentence stay whole,
 * because what follows them is lower case.
 */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  // The end mark (and closing quote) is kept with its sentence; only the spaces after it are cut.
  const end = /[.?!][”’")]?(?=\s+[A-Z“‘"(])/g;
  let from = 0;
  for (let m = end.exec(text); m; m = end.exec(text)) {
    out.push(text.slice(from, m.index + m[0].length).trim());
    from = m.index + m[0].length;
  }
  out.push(text.slice(from).trim());
  return out.filter(Boolean);
}

/**
 * Splits the coach's text (The IS auditor’s lens, the Exam-day shortcut) into
 * the italic `quote`, its first sentences up to the cap, and the `rest`, said
 * in plain `body` under it. The first sentence is always the quote, even if it
 * runs long (lessons.test.ts keeps every first sentence under the cap).
 * Pure: exported for tests.
 */
export function splitCoachText(text: string): { quote: string; rest: string } {
  const all = sentencesOf(text);
  let n = 1;
  while (
    n < all.length &&
    n < QUOTE_MAX_SENTENCES &&
    all.slice(0, n + 1).join(' ').length <= QUOTE_MAX_CHARS
  ) {
    n++;
  }
  return { quote: all.slice(0, n).join(' '), rest: all.slice(n).join(' ') };
}

/**
 * The key-idea recipe (as on the vine and in notes): a leaf and a caption, then the italic voice on a green rule.
 * Mobile 1.39: only the first sentence or two sit in the italic quote (splitCoachText); the rest follows as plain
 * `body` text under the rule, so the italic never runs past about four lines.
 */
function KeyIdea({ caption, body, i = 0 }: { caption: string; body: string; i?: number }) {
  const { c } = useTheme();
  const { quote, rest } = splitCoachText(body);
  return (
    <>
      <Part i={i}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View accessible={false} importantForAccessibility="no-hide-descendants">
            <LeafBig color={c.accent} rib={c.bg} />
          </View>
          <T v="caption" color={c.accentText} accessibilityRole="header">{caption}</T>
        </View>
        <Gap h={space.md} />
      </Part>
      <Part i={i + 1} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.lg }}>
        <T v="quote">{quote}</T>
      </Part>
      {rest ? (
        // 24 between blocks (spec §4 rhythm); lined up with the quote's text, not the rule.
        <Part i={i + 2} style={{ marginTop: space.lg, paddingLeft: space.lg + 3 }}>
          <T v="body">{rest}</T>
        </Part>
      ) : null}
    </>
  );
}

/** What a scene is about, in a word or two: the cover's "In this lesson" map. Exported for tests. */
export function sceneLabel(scene: Scene): string | null {
  switch (scene.type) {
    case 'title':
      return null;
    case 'tip':
    case 'check':
      return sceneKicker(scene);
    default:
      return scene.heading;
  }
}

/** The lesson's map for its cover: each scene's label once, in order (checks once). Exported for tests. */
export function lessonMap(lesson: Lesson): string[] {
  const out: string[] = [];
  for (const scene of lesson.scenes) {
    const label = sceneLabel(scene);
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/**
 * The lesson cover (ui.md LP1): the Learn cover's forest panel (the
 * domain's dot and kicker, the title, "5 min · 7 scenes", the promise, the
 * domain's branch), then on paper "In this lesson": the lesson's map, each
 * stop a small outline leaf (the leaves the lesson-complete branch fills).
 * Mobile 1.20: one last meta line names the study notes that go deeper
 * (a "Goes deeper in the notes" caption over one line per note), when the
 * lesson's notes resolve.
 */
function LessonCover({ scene, lesson, art, tone }: { scene: Extract<Scene, { type: 'title' }>; lesson: Lesson; art?: BotanyKind; tone?: string }) {
  const { c } = useTheme();
  const map = lessonMap(lesson);
  // The notes this lesson leads into (its `notes`, else its topics' first notes).
  const deeper = lessonNotes(lesson.certId, lesson).map((n) => n.name);
  return (
    <View>
      <Part i={0}>
        <HeroPanel
          captionLead={tone ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} /> : undefined}
          caption={scene.kicker}
          title={scene.title}
          meta={`${lesson.minutes} min · ${lesson.scenes.length} scenes`}
          art={art ?? 'branch0'}
          // A lesson is a focus screen: the art stays still (no loop while reading).
          sway={false}
        >
          <T v="small" color={c.onForest} style={{ marginTop: space.md }}>{scene.subtitle}</T>
        </HeroPanel>
      </Part>
      <Part i={1} style={{ marginTop: space.xl }}>
        <T v="headline" accessibilityRole="header">In this lesson</T>
        <View
          accessible
          accessibilityLabel={`In this lesson: ${map.join(', ')}.`}
          style={{ marginTop: space.sm, gap: space.sm }}
        >
          {map.map((label) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: 16, alignItems: 'center' }}>
                <PlanLeaf color={c.accent} />
              </View>
              <T v="body" color={c.ink2} style={{ flex: 1 }}>{label}</T>
            </View>
          ))}
        </View>
        {deeper.length > 0 && (
          // A caption, then one meta line per note; one screen-reader stop, names split by ";".
          <View
            accessible
            accessibilityLabel={`Goes deeper in the notes: ${deeper.join('; ')}.`}
            style={{ marginTop: space.lg }}
          >
            <T v="caption" color={c.accentText}>Goes deeper in the notes</T>
            {deeper.map((name) => (
              <T key={name} v="meta" style={{ marginTop: 2 }}>{name}</T>
            ))}
          </View>
        )}
      </Part>
    </View>
  );
}

/** Steps (`flow`): numbered stops on a path that draws down to each next stop as it arrives. */
function StepsScene({ scene }: { scene: Extract<Scene, { type: 'flow' }> }) {
  const { c } = useTheme();
  const n = scene.steps.length;
  return (
    <View>
      <SceneTop kicker={sceneKicker(scene)!} heading={scene.heading} />
      {scene.steps.map((step, i) => (
        <Part key={step.label} i={i + 1} spoken={`Step ${i + 1} of ${n}: ${step.label}. ${step.note}`} style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ alignItems: 'center', width: 32 }} accessible={false} importantForAccessibility="no-hide-descendants">
            {/* The stop arrives with its step (fade + rise; no spring: nothing springs as a scene mounts). */}
            <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <BigNum value={String(i + 1)} size={17} color={c.accentText} />
            </View>
            {/* The path to the next stop draws down in the time it takes that stop to arrive. */}
            {i < n - 1 && (
              <DrawLine
                delay={partDelay(i + 1)}
                durMs={i + 2 < motion.stagger.maxScene ? motion.stagger.scene : motion.dur.select}
                style={{ width: 1.5, flex: 1, minHeight: 18, backgroundColor: c.accent, opacity: 0.55 }}
              />
            )}
          </View>
          <View style={{ flex: 1, paddingBottom: space.lg, paddingTop: 4 }}>
            <T v="label">{step.label}</T>
            <T v="meta">{step.note}</T>
          </View>
        </Part>
      ))}
      {scene.caption && (
        <Part i={n + 1}>
          <T v="meta">{scene.caption}</T>
        </Part>
      )}
    </View>
  );
}

/**
 * Timeline (`flow`, layout 'timeline'): phases on one time rail. The rail
 * draws down over the whole build and ends in an arrow (time runs on);
 * each phase is a ring on the rail that fills as the phase arrives. No
 * numbers: unlike steps, phases are a stretch of time, not a checklist.
 */
function TimelineScene({ scene }: { scene: Extract<Scene, { type: 'flow' }> }) {
  const { c } = useTheme();
  const n = scene.steps.length;
  const RAIL = 9; // the rail's x, and the rings' centre
  return (
    <View>
      <SceneTop kicker={sceneKicker(scene)!} heading={scene.heading} />
      <View style={{ paddingLeft: 32 }}>
        {/* The rail: from the first ring to below the last, drawn over the whole build. */}
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: RAIL - 1, top: 10, bottom: 4, width: 2, alignItems: 'center' }}>
          <DrawLine
            delay={partDelay(1)}
            durMs={partDelay(n) + motion.dur.enter}
            style={{ position: 'absolute', top: 0, bottom: 8, width: 2, backgroundColor: c.accent, opacity: 0.55 }}
          />
          {/* The arrow at the end of time's rail. */}
          <FadeIn build delay={partDelay(n) + motion.dur.enter} rise={false} style={{ position: 'absolute', bottom: 0 }}>
            <View style={{ width: 9, height: 9, borderRightWidth: 2, borderBottomWidth: 2, borderColor: c.accent, opacity: 0.8, transform: [{ rotate: '45deg' }], marginLeft: 0 }} />
          </FadeIn>
        </View>
        {scene.steps.map((step, i) => (
          <Part key={step.label} i={i + 1} style={{ paddingBottom: i < n - 1 ? space.lg : space.xl }}>
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -32 + RAIL - 7, top: 3, width: 14, height: 14 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.accent, backgroundColor: c.bg }} />
              {/* The ring fills just after its phase arrives (a fade, no spring). */}
              <FadeIn build rise={false} dur="quick" delay={partDelay(i + 1) + motion.dur.quick} style={{ position: 'absolute', left: 4, top: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
              </FadeIn>
            </View>
            <T v="label">{step.label}</T>
            <T v="meta">{step.note}</T>
          </Part>
        ))}
      </View>
      {scene.caption && (
        <Part i={n + 1} style={{ marginTop: space.sm }}>
          <T v="meta">{scene.caption}</T>
        </Part>
      )}
    </View>
  );
}

/** Layers (`stack`): bands that settle onto the stack from above, top layer first. */
function LayersScene({ scene }: { scene: Extract<Scene, { type: 'stack' }> }) {
  const { c } = useTheme();
  const n = scene.layers.length;
  return (
    <View>
      <SceneTop kicker={sceneKicker(scene)!} heading={scene.heading} />
      <View style={{ gap: 4 }}>
        {scene.layers.map((layer, i) => (
          <Part
            key={layer.label}
            i={i + 1}
            drop
            spoken={`Layer ${i + 1} of ${n}: ${layer.label}. ${layer.note}`}
            style={{
              flexDirection: 'row',
              gap: 14,
              paddingVertical: space.md,
              paddingHorizontal: 14,
              backgroundColor: c.soft,
              // The stack's ends are rounder than the joins, so the bands read as one stack.
              borderTopLeftRadius: i === 0 ? radius.md : 4,
              borderTopRightRadius: i === 0 ? radius.md : 4,
              borderBottomLeftRadius: i === n - 1 ? radius.md : 4,
              borderBottomRightRadius: i === n - 1 ? radius.md : 4,
            }}
          >
            <View style={{ width: 24 }}>
              <BigNum value={String(i + 1)} size={22} color={i === 0 ? c.accentText : c.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="label">{layer.label}</T>
              <T v="meta">{layer.note}</T>
            </View>
          </Part>
        ))}
      </View>
      {scene.caption && (
        <Part i={n + 1}>
          <Gap h={space.md} />
          <T v="meta">{scene.caption}</T>
        </Part>
      )}
    </View>
  );
}

/**
 * Where a check's answer block sits, in the scroll's content (mobile 1.37):
 * `top` = the verdict's top edge, `bottom` = the explanation's last line.
 */
export interface RevealBox {
  top: number;
  bottom: number;
}

/** Breathing room kept above the verdict and below the explanation when the page scrolls to them. */
export const REVEAL_GAP = space.lg;

/**
 * Mobile 1.37: after a check is answered, how far to scroll so the verdict
 * and explanation are in view ABOVE the sticky Back / Next bar. Pure maths
 * (exported for tests). Returns null when no scroll is needed.
 *
 * - Scroll just enough that the explanation's last line clears the bar
 *   (the smallest move, so the option the learner picked stays on screen
 *   whenever everything fits).
 * - But never past the verdict's top (minus a small gap): when the
 *   explanation is taller than the screen, the verdict leads.
 * - Never scroll backwards: if the learner has already scrolled further
 *   down, leave them where they are.
 *
 * `viewport` = the scroll view's height; `footer` = the sticky bar's height
 * (it floats over the bottom of the scroll view); `scrollY` = where the
 * scroll is now.
 */
export function revealScrollY(box: RevealBox, viewport: number, footer: number, scrollY: number): number | null {
  // Visible area above the bar. Unknown (0) or tiny: just lead with the verdict.
  const visible = viewport - footer;
  const fitBottom = visible > 0 ? box.bottom + REVEAL_GAP - visible : Infinity;
  const verdictTop = box.top - REVEAL_GAP;
  const target = Math.max(0, Math.min(fitBottom, verdictTop));
  // 1pt of slack, so a rounding difference never causes a pointless nudge.
  return target > scrollY + 1 ? target : null;
}

export function SceneView({
  scene,
  lesson,
  onCheck,
  onReveal,
  art,
  tone,
  perm,
}: {
  scene: Scene;
  /** The lesson (its cover reads the length and the map). */
  lesson: Lesson;
  /** A check was answered: right or not, and the DISPLAY letter picked (for Report a problem). */
  onCheck?: (correct: boolean, picked: Letter) => void;
  /**
   * Check scenes only (mobile 1.37): the answer block has been laid out, at
   * these y positions measured from the top of the scene. The player uses it
   * to scroll the explanation into view.
   */
  onReveal?: (box: RevealBox) => void;
  /**
   * Check scenes only: the option order to show. The player makes it once
   * per viewing, so going Back and Next shows the same order.
   */
  perm?: Permutation;
  /** The domain's branch, drawn on the cover. */
  art?: BotanyKind;
  /** The domain's tone (the cover's dot, on forest). */
  tone?: string;
}) {
  const { c } = useTheme();

  switch (scene.type) {
    case 'title':
      return <LessonCover scene={scene} lesson={lesson} art={art} tone={tone} />;

    case 'idea':
      // "The IS auditor’s lens" is the coach's voice: the key-idea recipe (ui.md LP3), as on the vine and in
      // notes, at the same anchor line as every other scene (mobile 1.22).
      if (scene.heading === COACH_HEADING) {
        return <KeyIdea caption={COACH_HEADING} body={scene.body} />;
      }
      return (
        <View>
          <SceneTop kicker="The idea" heading={scene.heading} />
          <Part i={1}>
            <Prose>{scene.body}</Prose>
          </Part>
        </View>
      );

    case 'analogy':
      return (
        <View>
          <SceneTop kicker={sceneKicker(scene)!} heading={scene.heading} />
          <Part i={1} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.lg }}>
            <Prose>{scene.body}</Prose>
          </Part>
        </View>
      );

    case 'stack':
      return <LayersScene scene={scene} />;

    case 'flow':
      return scene.layout === 'timeline' ? <TimelineScene scene={scene} /> : <StepsScene scene={scene} />;

    case 'compare':
      return (
        <View>
          <SceneTop kicker="Side by side" heading={scene.heading} />
          {[scene.left, scene.right].map((side, i) => (
            <Part key={side.title} i={i + 1} style={{ borderLeftWidth: 3, borderLeftColor: i === 0 ? c.accent : c.control, paddingLeft: space.lg, marginBottom: space.xl }}>
              <T v="headline" color={i === 0 ? c.accentText : c.ink}>{side.title}</T>
              {/* Real bullets (the notes' dot, hanging indent), never typed "·" characters. */}
              <Bullets items={side.points} />
            </Part>
          ))}
          {scene.caption && (
            <Part i={3}>
              <T v="meta">{scene.caption}</T>
            </Part>
          )}
        </View>
      );

    case 'trap':
      return (
        <View>
          {/* The trap's kicker is honey: trap = honey everywhere (spec §5). */}
          <SceneTop kicker="The trap" heading={scene.heading} tone={c.tip} />
          {/* Trap warnings are the one tinted block in a lesson (spec §5). */}
          <Part i={1} style={{ backgroundColor: c.tipBg, borderRadius: radius.md, padding: space.lg }}>
            <Prose>{scene.trap}</Prose>
          </Part>
          <Gap h={space.xl} />
          <Part i={2}>
            <T v="headline">Why it’s wrong</T>
            <Gap h={space.xs} />
            <T v="body">{scene.why}</T>
          </Part>
        </View>
      );

    case 'tip':
      // The takeaway: the coach's italic voice, the key-idea recipe, at the anchor line.
      return <KeyIdea caption="Exam-day shortcut" body={scene.body} />;

    case 'check':
      return <CheckScene scene={scene} onCheck={onCheck} onReveal={onReveal} perm={perm ?? lettersFor(scene.options.length)} />;
  }
}

function CheckScene({
  scene,
  onCheck,
  onReveal,
  perm,
}: {
  scene: Extract<Scene, { type: 'check' }>;
  onCheck?: (correct: boolean, picked: Letter) => void;
  onReveal?: (box: RevealBox) => void;
  perm: Permutation;
}) {
  const { c } = useTheme();
  // `picked` is the DISPLAY letter the learner tapped.
  const [picked, setPicked] = useState<Letter | null>(null);
  const done = picked !== null;
  const right = picked !== null && isCheckCorrect(scene.correctIndex, picked, perm);
  // Display slots A, B, C… in order; perm says which original option sits in each.
  const displayLetters = lettersFor(scene.options.length);
  // The key as the learner sees it (the coach line names it on a miss).
  const keyLetter = originalToDisplay(LETTERS[scene.correctIndex], perm);
  const coach = right ? 'That’s the answer the exam wants.' : `The best answer is ${keyLetter}.`;
  // Mobile 1.37: screen-reader focus moves to the verdict after a pick (as on the practice answer screen).
  const verdictRef = useRef<View>(null);
  // The answer block is reported to the player ONCE per pick (a later re-layout must not scroll again).
  const reported = useRef(false);
  const onAnswerLayout = (e: LayoutChangeEvent) => {
    if (reported.current) return;
    reported.current = true;
    const { y, height } = e.nativeEvent.layout;
    onReveal?.({ top: y, bottom: y + height });
    // Focus moves only AFTER the scroll is issued, so the glide (~250–300 ms) has settled
    // before it lands and VoiceOver / TalkBack never scroll to the verdict mid-glide.
    moveFocus(verdictRef, 400);
  };

  return (
    <View>
      <Part i={0}>
        <T v="caption" color={c.accentText} accessibilityRole="header">Quick check</T>
        <Gap h={space.sm} />
        <Stem>{scene.question}</Stem>
        <Gap h={space.xl} />
      </Part>
      {displayLetters.map((letter, i) => {
        // Look up the ORIGINAL option behind this display letter (shuffled like practice).
        const original = displayToOriginal(letter, perm);
        const opt = scene.options[LETTERS.indexOf(original)] ?? '';
        // Grade on the ORIGINAL letter, never on the display position.
        const isRight = isCheckCorrect(scene.correctIndex, letter, perm);
        const state: OptionState = !done ? 'idle' : isRight ? 'correct' : letter === picked ? 'wrong' : 'dimmed';
        return (
          <Part key={opt} i={i + 1}>
            <OptionCard
              letter={letter}
              text={opt}
              state={state}
              disabled={done}
              onPress={() => {
                setPicked(letter);
                if (isRight) haptic.success();
                else haptic.error();
                // Mobile 1.37: screen-reader focus then moves to the verdict (onAnswerLayout, after
                // the scroll), the same pattern as the practice answer screen (session.tsx). Its
                // label says it all once ("Not quite. The best answer is B."), so there is no
                // separate announcement (that was cut off on iOS and doubled on Android).
                onCheck?.(isRight, letter);
              }}
            />
          </Part>
        );
      })}
      {done && (
        // A plain View measures the answer block (FadeIn only fades and rises, so the
        // layout is final at once): the player scrolls it into view (mobile 1.37).
        <View onLayout={onAnswerLayout}>
          {/* The session's verdict (ui.md LP4): the leaf springs in, then the words. */}
          <FadeIn dur="reveal">
            <Verdict ref={verdictRef} correct={right} coach={coach} />
            <Gap h={space.md} />
            {/* renderText maps any {{X}} letter reference to what is on screen. */}
            <T v="body">{renderText(scene.explanation, perm)}</T>
          </FadeIn>
        </View>
      )}
    </View>
  );
}
