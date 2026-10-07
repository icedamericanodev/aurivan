/**
 * Lesson scene templates — one animated layout per scene type.
 *
 * Grove v2 (DESIGN_SYSTEM.md §11 "Learn", §2): the lesson title is `hero`,
 * scene prose is the serif `stem` style (you sit and read it), the takeaway
 * is the italic `quote` on a green rule, and checks reuse the quiz
 * OptionCard. Check options are shuffled like practice questions and graded
 * on the ORIGINAL letter (engine/shuffle.ts). No cards around content; tinted blocks only for the trap.
 *
 * Motion: lessons are explainers, so parts build up in reading order
 * (240ms fade + rise, 120ms apart). Every animation respects Reduce Motion.
 */
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import type { Scene } from '../content/lessons/types';
import { displayToOriginal, isCheckCorrect, lettersFor, renderText, type Permutation } from '../engine/shuffle';
import { LETTERS, type Letter } from '../content/types';
import { haptic } from '../lib/haptics';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Botany, type BotanyKind } from './glyphs';
import { OptionCard, type OptionState } from './quiz';
import { BigNum, Gap, Stem, T } from './ui';

const BASE = 240;
const STEP = 120;
const enter = (i = 0) => FadeInDown.duration(BASE).delay(i * STEP).reduceMotion(ReduceMotion.System);

function Heading({ children }: { children: string }) {
  return (
    <Animated.View entering={enter(0)}>
      <T v="headline" accessibilityRole="header">{children}</T>
      <Gap h={space.md} />
    </Animated.View>
  );
}

/** Scene prose: the serif reading style. */
function Prose({ children }: { children: string }) {
  return <Stem>{children}</Stem>;
}

export function SceneView({
  scene,
  onCheck,
  art,
  perm,
}: {
  scene: Scene;
  onCheck?: (correct: boolean) => void;
  /**
   * Check scenes only: the option order to show. The player makes it once
   * per viewing, so going Back and Next shows the same order.
   */
  perm?: Permutation;
  /** The domain's branch, drawn on the title scene. */
  art?: BotanyKind;
}) {
  const { c } = useTheme();

  switch (scene.type) {
    case 'title':
      return (
        // Upper-middle, not dead centre: a 1 : 2 split of the spare height puts
        // the title about a third of the way down. The frond is anchored to the
        // text block (absolute, above its right edge), so it balances the title
        // without pushing it down the page.
        <View style={{ flex: 1 }}>
          {/* minHeight leaves room for the frond on short screens. */}
          <View style={{ flex: 1, minHeight: 150 }} />
          <View>
            {art && (
              <Animated.View
                entering={enter(0)}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={{ position: 'absolute', right: -space.lg, bottom: '100%', marginBottom: -70, opacity: 0.9 }}
              >
                <Botany kind={art} color={c.accent} />
              </Animated.View>
            )}
            <Animated.View entering={enter(1)}>
              <T v="caption" color={c.accentText}>{scene.kicker}</T>
            </Animated.View>
            <Gap h={space.sm} />
            <Animated.View entering={enter(2)}>
              <T v="hero" accessibilityRole="header">{scene.title}</T>
            </Animated.View>
            <Gap h={space.md} />
            <Animated.View entering={enter(3)}>
              <T v="body" color={c.ink2}>{scene.subtitle}</T>
            </Animated.View>
          </View>
          <View style={{ flex: 2 }} />
        </View>
      );

    case 'idea':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          <Animated.View entering={enter(1)}>
            <Prose>{scene.body}</Prose>
          </Animated.View>
        </View>
      );

    case 'analogy':
      return (
        <View>
          <Animated.View entering={enter(0)}>
            <T v="caption" color={c.accentText}>Real-life analogy</T>
          </Animated.View>
          <Gap h={space.xs} />
          <Heading>{scene.heading}</Heading>
          <Animated.View entering={enter(1)} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.lg }}>
            <Prose>{scene.body}</Prose>
          </Animated.View>
        </View>
      );

    case 'stack':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          {scene.layers.map((layer, i) => (
            <Animated.View
              key={layer.label}
              entering={enter(i + 1)}
              style={{ flexDirection: 'row', gap: 14, paddingVertical: 13, borderBottomWidth: i < scene.layers.length - 1 ? 1 : 0, borderBottomColor: c.line }}
            >
              <View style={{ width: 28 }}>
                <BigNum value={String(i + 1)} size={22} color={i === 0 ? c.accentText : c.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="label">{layer.label}</T>
                <T v="meta">{layer.note}</T>
              </View>
            </Animated.View>
          ))}
          {scene.caption && (
            <Animated.View entering={enter(scene.layers.length + 1)}>
              <Gap h={space.md} />
              <T v="meta">{scene.caption}</T>
            </Animated.View>
          )}
        </View>
      );

    case 'flow':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          {scene.steps.map((step, i) => (
            <Animated.View key={step.label} entering={enter(i + 1)} style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ alignItems: 'center', width: 32 }}>
                <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <BigNum value={String(i + 1)} size={17} color={c.accentText} />
                </View>
                {i < scene.steps.length - 1 && <View style={{ width: 1.5, flex: 1, minHeight: 18, backgroundColor: c.accent, opacity: 0.55 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: space.lg, paddingTop: 4 }}>
                <T v="label">{step.label}</T>
                <T v="meta">{step.note}</T>
              </View>
            </Animated.View>
          ))}
          {scene.caption && (
            <Animated.View entering={enter(scene.steps.length + 1)}>
              <T v="meta">{scene.caption}</T>
            </Animated.View>
          )}
        </View>
      );

    case 'compare':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          {[scene.left, scene.right].map((side, i) => (
            <Animated.View
              key={side.title}
              entering={enter(i + 1)}
              style={{ borderLeftWidth: 3, borderLeftColor: i === 0 ? c.accent : c.control, paddingLeft: space.lg, marginBottom: space.xl }}
            >
              <T v="headline" color={i === 0 ? c.accentText : c.ink}>{side.title}</T>
              <Gap h={space.xs} />
              {side.points.map((p) => (
                <T key={p} v="body">{`·  ${p}`}</T>
              ))}
            </Animated.View>
          ))}
          {scene.caption && (
            <Animated.View entering={enter(3)}>
              <T v="meta">{scene.caption}</T>
            </Animated.View>
          )}
        </View>
      );

    case 'trap':
      return (
        <View>
          <Animated.View entering={enter(0)}>
            <T v="caption" color={c.tip}>The trap</T>
          </Animated.View>
          <Gap h={space.xs} />
          <Heading>{scene.heading}</Heading>
          {/* Trap warnings are the one tinted block in a lesson (spec §5). */}
          <Animated.View entering={enter(1)} style={{ backgroundColor: c.tipBg, borderRadius: radius.md, padding: space.lg }}>
            <Prose>{scene.trap}</Prose>
          </Animated.View>
          <Gap h={space.xl} />
          <Animated.View entering={enter(2)}>
            <T v="headline">Why it’s wrong</T>
            <Gap h={space.xs} />
            <T v="body">{scene.why}</T>
          </Animated.View>
        </View>
      );

    case 'tip':
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View entering={enter(0)}>
            <T v="caption" color={c.accentText}>Exam-day shortcut</T>
          </Animated.View>
          <Gap h={space.md} />
          {/* The takeaway: the coach's italic voice on a green rule, like Key idea. */}
          <Animated.View entering={enter(1)} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.lg }}>
            <T v="quote">{scene.body}</T>
          </Animated.View>
        </View>
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
  onCheck?: (correct: boolean) => void;
  perm: Permutation;
}) {
  const { c } = useTheme();
  // `picked` is the DISPLAY letter the learner tapped.
  const [picked, setPicked] = useState<Letter | null>(null);
  const done = picked !== null;
  const right = picked !== null && isCheckCorrect(scene.correctIndex, picked, perm);
  // Display slots A, B, C… in order; perm says which original option sits in each.
  const displayLetters = lettersFor(scene.options.length);

  return (
    <View>
      <Animated.View entering={enter(0)}>
        <T v="caption" color={c.accentText}>Quick check</T>
        <Gap h={space.sm} />
        <Stem>{scene.question}</Stem>
        <Gap h={space.xl} />
      </Animated.View>
      {displayLetters.map((letter, i) => {
        // Look up the ORIGINAL option behind this display letter (shuffled like practice).
        const original = displayToOriginal(letter, perm);
        const opt = scene.options[LETTERS.indexOf(original)] ?? '';
        // Grade on the ORIGINAL letter, never on the display position.
        const isRight = isCheckCorrect(scene.correctIndex, letter, perm);
        const state: OptionState = !done ? 'idle' : isRight ? 'correct' : letter === picked ? 'wrong' : 'dimmed';
        return (
          <Animated.View key={opt} entering={enter(i + 1)}>
            <OptionCard
              letter={letter}
              text={opt}
              state={state}
              disabled={done}
              onPress={() => {
                setPicked(letter);
                if (isRight) haptic.success();
                else haptic.error();
                onCheck?.(isRight);
              }}
            />
          </Animated.View>
        );
      })}
      {done && (
        <Animated.View entering={enter(0)} accessibilityLiveRegion="polite">
          <Gap h={space.sm} />
          <T v="hero" color={right ? c.correct : c.wrong}>{right ? 'Correct' : 'Not quite'}</T>
          <Gap h={space.xs} />
          {/* renderText maps any {{X}} letter reference to what is on screen. */}
          <T v="body">{renderText(scene.explanation, perm)}</T>
        </Animated.View>
      )}
    </View>
  );
}
