/**
 * Lesson player — one scene at a time, a progress rail at the top, and
 * thumb-reach Back / Next at the bottom. Ends on a quick check; finishing
 * marks the lesson done and feeds the journey.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneView } from '../../components/lesson';
import { Button, Gap, Row, T } from '../../components/ui';
import { findLesson } from '../../content/lessons';
import { useProgress } from '../../store/progress';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function LessonPlayer() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = findLesson(String(id));
  const completeLesson = useProgress((s) => s.completeLesson);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  // Moving between scenes re-mounts the check unanswered, so reset the gate too.
  useEffect(() => setChecked(false), [index]);

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, justifyContent: 'center' }}>
        <T v="title" center>This lesson isn’t available.</T>
        <Gap />
        <Button label="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const scene = lesson.scenes[index];
  const isLast = index === lesson.scenes.length - 1;
  const canFinish = scene.type !== 'check' || checked;

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    completeLesson(lesson.certId, lesson.id);
    router.back();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Progress rail: one segment per scene */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close lesson"
            onPress={() => router.back()}
            style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
          >
            <T v="label" color={c.accentText}>Close</T>
          </Pressable>
          <T v="meta" num>{`${lesson.minutes} min · ${index + 1}/${lesson.scenes.length}`}</T>
        </Row>
        <Gap h={space.sm} />
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: lesson.scenes.length, now: index + 1 }}
          style={{ flexDirection: 'row', gap: space.xs }}
        >
          {lesson.scenes.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: radius.pill,
                backgroundColor: i <= index ? c.accent : c.surface2,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.xl }}>
        {/* key forces each scene to re-mount, replaying its entrance animation */}
        <SceneView key={index} scene={scene} onCheck={() => setChecked(true)} />
        {isLast && (
          <>
            <Gap h={space.xl} />
            <T v="meta">
              {`${lesson.provenance} Last reviewed ${lesson.lastReviewed}. Sources: ${lesson.references.join('; ')}.`}
            </T>
          </>
        )}
      </ScrollView>

      <View style={{ padding: space.lg, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        <Row gap={space.sm}>
          <Button
            kind="secondary"
            label="Back"
            disabled={index === 0}
            onPress={() => setIndex(Math.max(0, index - 1))}
            style={{ flex: 1 }}
          />
          <Button
            label={isLast ? 'Finish lesson' : 'Next'}
            disabled={!canFinish}
            onPress={next}
            style={{ flex: 2 }}
          />
        </Row>
      </View>
    </SafeAreaView>
  );
}
