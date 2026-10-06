/**
 * Lesson scene templates — one animated layout per scene type.
 *
 * Motion rules (docs/mobile/PRODUCT_VISION.md §7): calm, 180–320ms,
 * ease-out, things build up in order so the eye follows the idea.
 * Every animation respects the phone's Reduce Motion setting.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import type { Scene } from '../content/lessons/types';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Card, Gap, T } from './ui';

const BASE = 320;
const STEP = 140;
const enter = (i = 0) => FadeInDown.duration(BASE).delay(i * STEP).reduceMotion(ReduceMotion.System);
const enterUp = (i = 0) => FadeInUp.duration(BASE).delay(i * STEP).reduceMotion(ReduceMotion.System);

function Heading({ children }: { children: string }) {
  return (
    <Animated.View entering={enter(0)}>
      <T v="title">{children}</T>
      <Gap h={space.lg} />
    </Animated.View>
  );
}

export function SceneView({ scene, onCheck }: { scene: Scene; onCheck?: (correct: boolean) => void }) {
  const { c } = useTheme();

  switch (scene.type) {
    case 'title':
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View entering={FadeIn.duration(BASE).reduceMotion(ReduceMotion.System)}>
            <T v="eyebrow">{scene.kicker}</T>
          </Animated.View>
          <Gap h={space.md} />
          <Animated.View entering={enter(1)}>
            <T v="display">{scene.title}</T>
          </Animated.View>
          <Gap h={space.lg} />
          <Animated.View entering={enter(2)}>
            <T v="body" color={c.text2}>{scene.subtitle}</T>
          </Animated.View>
        </View>
      );

    case 'idea':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          <Animated.View entering={enter(1)}>
            <T>{scene.body}</T>
          </Animated.View>
        </View>
      );

    case 'analogy':
      return (
        <View>
          <Animated.View entering={enter(0)}>
            <T v="eyebrow">Real-life analogy</T>
          </Animated.View>
          <Gap h={space.sm} />
          <Heading>{scene.heading}</Heading>
          <Animated.View
            entering={enter(1)}
            style={{ borderLeftWidth: 3, borderLeftColor: c.clay, paddingLeft: space.lg }}
          >
            <T>{scene.body}</T>
          </Animated.View>
        </View>
      );

    case 'stack':
      return (
        <View>
          <Heading>{scene.heading}</Heading>
          {scene.layers.map((layer, i) => (
            <Animated.View key={layer.label} entering={enter(i + 1)} style={{ marginBottom: space.sm }}>
              <View
                style={{
                  borderRadius: radius.md,
                  borderColor: i === 0 ? c.accent : c.border,
                  borderWidth: i === 0 ? 2 : 1,
                  backgroundColor: i === 0 ? c.surface2 : c.surface,
                  padding: space.md,
                }}
              >
                <T v="label" color={i === 0 ? c.accentText : c.text}>{layer.label}</T>
                <T v="meta">{layer.note}</T>
              </View>
            </Animated.View>
          ))}
          {scene.caption && (
            <Animated.View entering={enter(scene.layers.length + 1)}>
              <Gap h={space.sm} />
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
              <View style={{ alignItems: 'center', width: 28 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radius.pill,
                    backgroundColor: c.surface2,
                    borderWidth: 1,
                    borderColor: c.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T v="label" num color={c.accentText} maxFontSizeMultiplier={1.3}>{String(i + 1)}</T>
                </View>
                {i < scene.steps.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: c.border }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: space.lg }}>
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
            <Animated.View key={side.title} entering={enter(i + 1)} style={{ marginBottom: space.md }}>
              <Card style={{ borderColor: i === 0 ? c.accent : c.clay }}>
                <T v="title" color={i === 0 ? c.accentText : c.clayText}>{side.title}</T>
                <Gap h={space.sm} />
                {side.points.map((p) => (
                  <T key={p}>•  {p}</T>
                ))}
              </Card>
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
            <T v="eyebrow" color={c.warning}>The trap</T>
          </Animated.View>
          <Gap h={space.sm} />
          <Heading>{scene.heading}</Heading>
          <Animated.View entering={enter(1)}>
            <Card style={{ backgroundColor: c.warningBg, borderColor: c.warningBg }}>
              <T color={c.warning}>{scene.trap}</T>
            </Card>
          </Animated.View>
          <Gap />
          <Animated.View entering={enter(2)}>
            <T v="label" color={c.text2}>Why it’s wrong</T>
            <Gap h={space.xs} />
            <T>{scene.why}</T>
          </Animated.View>
        </View>
      );

    case 'tip':
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View entering={enter(0)}>
            <T v="eyebrow">Exam-day shortcut</T>
          </Animated.View>
          <Gap h={space.md} />
          <Animated.View entering={enterUp(1)}>
            <T v="title">{scene.body}</T>
          </Animated.View>
        </View>
      );

    case 'check':
      return <CheckScene scene={scene} onCheck={onCheck} />;
  }
}

function CheckScene({
  scene,
  onCheck,
}: {
  scene: Extract<Scene, { type: 'check' }>;
  onCheck?: (correct: boolean) => void;
}) {
  const { c } = useTheme();
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;

  return (
    <View>
      <Animated.View entering={enter(0)}>
        <T v="eyebrow">Quick check</T>
        <Gap h={space.sm} />
        <T v="title">{scene.question}</T>
        <Gap />
      </Animated.View>
      {scene.options.map((opt, i) => {
        const isRight = i === scene.correctIndex;
        const state = !done ? 'idle' : isRight ? 'right' : i === picked ? 'wrong' : 'dim';
        const border = state === 'right' ? c.correct : state === 'wrong' ? c.wrong : c.border;
        const bg = state === 'right' ? c.correctBg : state === 'wrong' ? c.wrongBg : c.surface;
        return (
          <Animated.View key={opt} entering={enter(i + 1)}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: picked === i, disabled: done }}
              accessibilityLabel={`${opt}${state === 'right' ? ', correct' : state === 'wrong' ? ', incorrect' : ''}`}
              disabled={done}
              onPress={() => {
                setPicked(i);
                onCheck?.(isRight);
              }}
              style={{
                minHeight: 56,
                justifyContent: 'center',
                padding: space.md,
                marginBottom: space.sm,
                borderRadius: radius.md,
                borderWidth: state === 'idle' || state === 'dim' ? 1 : 2,
                borderColor: border,
                backgroundColor: bg,
              }}
            >
              <T color={state === 'dim' ? c.muted : c.text}>{`${state === 'right' ? '✓ ' : state === 'wrong' ? '✗ ' : ''}${opt}`}</T>
            </Pressable>
          </Animated.View>
        );
      })}
      {done && (
        <Animated.View entering={enter(0)}>
          <Gap h={space.sm} />
          <T v="label" color={picked === scene.correctIndex ? c.correct : c.wrong}>
            {picked === scene.correctIndex ? 'Correct.' : 'Not quite.'}
          </T>
          <T color={c.text2}>{scene.explanation}</T>
        </Animated.View>
      )}
    </View>
  );
}
