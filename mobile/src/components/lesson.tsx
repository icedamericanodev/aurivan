/**
 * Lesson scene templates — one composed, animated layout per scene type.
 *
 * Grove v2 (DESIGN_SYSTEM.md §11 "Learn", §2): scene prose is the serif
 * `stem` style (you sit and read it), the takeaway and "How ISACA thinks"
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
 * - Text-only scenes are composed, not left half empty: the block sits a
 *   third of the way down the page, like a title on a printed page.
 * - Under Reduce Motion every part fades in together (120 ms), lines are
 *   simply drawn, and nothing moves; the same words are there.
 * Every part is mounted (and readable) from the first frame.
 */
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Lesson, Scene } from '../content/lessons/types';
import { displayToOriginal, isCheckCorrect, lettersFor, originalToDisplay, renderText, type Permutation } from '../engine/shuffle';
import { LETTERS, type Letter } from '../content/types';
import { sayLater } from '../lib/a11y';
import { haptic } from '../lib/haptics';
import { motion, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LeafBig, PlanLeaf, type BotanyKind } from './glyphs';
import { DrawLine, FadeIn } from './motion';
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
    default:
      // The cover, an idea, an analogy, "How ISACA thinks" and the takeaway: two parts.
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

function Heading({ children }: { children: string }) {
  return (
    <Part i={0}>
      <T v="headline" accessibilityRole="header">{children}</T>
      <Gap h={space.md} />
    </Part>
  );
}

/** Scene prose: the serif reading style. */
function Prose({ children }: { children: string }) {
  return <Stem>{children}</Stem>;
}

/**
 * A text-only scene, composed: the block sits about a third of the way down
 * the page (a 1 : 2 split of the spare height, with a floor), so a short
 * idea reads as a printed page, not as a half-empty slide. Long text simply
 * starts at the top.
 */
function Composed({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, minHeight: space.sm, maxHeight: 180 }} />
      <View>{children}</View>
      <View style={{ flex: 2 }} />
    </View>
  );
}

/** The key-idea recipe (as on the vine and in notes): a leaf and a caption, then the italic voice on a green rule. */
function KeyIdea({ caption, body, i = 0 }: { caption: string; body: string; i?: number }) {
  const { c } = useTheme();
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
        <T v="quote">{body}</T>
      </Part>
    </>
  );
}

/** What a scene is about, in a word or two: the cover's "In this lesson" map. Exported for tests. */
export function sceneLabel(scene: Scene): string | null {
  switch (scene.type) {
    case 'title':
      return null;
    case 'tip':
      return 'Exam-day shortcut';
    case 'check':
      return 'Quick check';
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
 */
function LessonCover({ scene, lesson, art, tone }: { scene: Extract<Scene, { type: 'title' }>; lesson: Lesson; art?: BotanyKind; tone?: string }) {
  const { c } = useTheme();
  const map = lessonMap(lesson);
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
      <Heading>{scene.heading}</Heading>
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
      <Heading>{scene.heading}</Heading>
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
      <Heading>{scene.heading}</Heading>
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

export function SceneView({
  scene,
  lesson,
  onCheck,
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
      // "How ISACA thinks" is the coach's voice: the key-idea recipe (ui.md LP3), as on the vine and in notes.
      if (scene.heading === 'How ISACA thinks') {
        return (
          <Composed>
            <KeyIdea caption="How ISACA thinks" body={scene.body} />
          </Composed>
        );
      }
      return (
        <Composed>
          <Heading>{scene.heading}</Heading>
          <Part i={1}>
            <Prose>{scene.body}</Prose>
          </Part>
        </Composed>
      );

    case 'analogy':
      return (
        <Composed>
          <Part i={0}>
            <T v="caption" color={c.accentText}>Real-life analogy</T>
            <Gap h={space.xs} />
          </Part>
          <Heading>{scene.heading}</Heading>
          <Part i={1} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.lg }}>
            <Prose>{scene.body}</Prose>
          </Part>
        </Composed>
      );

    case 'stack':
      return <LayersScene scene={scene} />;

    case 'flow':
      return scene.layout === 'timeline' ? <TimelineScene scene={scene} /> : <StepsScene scene={scene} />;

    case 'compare':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          {[scene.left, scene.right].map((side, i) => (
            <Part key={side.title} i={i + 1} style={{ borderLeftWidth: 3, borderLeftColor: i === 0 ? c.accent : c.control, paddingLeft: space.lg, marginBottom: space.xl }}>
              <T v="headline" color={i === 0 ? c.accentText : c.ink}>{side.title}</T>
              <Gap h={space.xs} />
              {side.points.map((p) => (
                <T key={p} v="body">{`·  ${p}`}</T>
              ))}
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
          <Part i={0}>
            <T v="caption" color={c.tip}>The trap</T>
            <Gap h={space.xs} />
          </Part>
          <Heading>{scene.heading}</Heading>
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
      // The takeaway: the coach's italic voice, the key-idea recipe.
      return (
        <Composed>
          <KeyIdea caption="Exam-day shortcut" body={scene.body} />
        </Composed>
      );

    case 'check':
      return <CheckScene scene={scene} onCheck={onCheck} perm={perm ?? lettersFor(scene.options.length)} />;
  }
}

function CheckScene({
  scene,
  onCheck,
  perm,
}: {
  scene: Extract<Scene, { type: 'check' }>;
  onCheck?: (correct: boolean, picked: Letter) => void;
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

  return (
    <View>
      <Part i={0}>
        <T v="caption" color={c.accentText}>Quick check</T>
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
                // Said once, after the tap's own feedback (a live region would say it twice).
                sayLater(`${isRight ? 'Correct' : 'Not quite'}. ${isRight ? 'That’s the answer the exam wants.' : `The best answer is ${keyLetter}.`}`);
                onCheck?.(isRight, letter);
              }}
            />
          </Part>
        );
      })}
      {done && (
        // The session's verdict (ui.md LP4): the leaf springs in, then the words.
        <FadeIn dur="reveal">
          <Verdict correct={right} coach={coach} />
          <Gap h={space.md} />
          {/* renderText maps any {{X}} letter reference to what is on screen. */}
          <T v="body">{renderText(scene.explanation, perm)}</T>
        </FadeIn>
      )}
    </View>
  );
}
