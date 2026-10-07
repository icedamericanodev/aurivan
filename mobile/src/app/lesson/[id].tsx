/**
 * Lesson player — one scene at a time, segmented progress at the top, and
 * thumb-reach Back / Next at the bottom. Ends on a quick check; finishing
 * marks the lesson done, ticks it off today's plan and feeds the journey.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BotanyKind } from '../../components/glyphs';
import { SceneView } from '../../components/lesson';
import { Button, Gap, PushedHeader, Row, SegmentBar, T } from '../../components/ui';
import { getCertification } from '../../content/certifications';
import { findLesson } from '../../content/lessons';
import { logLesson } from '../../lib/activity';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
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
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.gutter, justifyContent: 'center' }}>
        <T v="headline" center>This lesson isn’t available.</T>
        <Gap />
        <Button label="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const scene = lesson.scenes[index];
  const isLast = index === lesson.scenes.length - 1;
  const canFinish = scene.type !== 'check' || checked;
  const tone = getCertification(lesson.certId)?.domains.find((d) => d.id === lesson.domainId)?.tone ?? 0;

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    completeLesson(lesson.certId, lesson.id);
    logLesson(lesson.certId, lesson.id);
    router.back();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader
          icon="close"
          onBack={() => router.back()}
          center={<SegmentBar total={lesson.scenes.length} done={index} current={index} />}
          right={<T v="meta" num accessibilityLabel={`Scene ${index + 1} of ${lesson.scenes.length}`}>{`${index + 1}/${lesson.scenes.length}`}</T>}
        />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}>
        {/* key forces each scene to re-mount, replaying its entrance animation */}
        <SceneView key={index} scene={scene} onCheck={() => setChecked(true)} art={`branch${tone % 5}` as BotanyKind} />
        {isLast && (
          <>
            <Gap h={space.xl} />
            <T v="meta" color={c.muted}>
              {`${lesson.provenance} Last reviewed ${lesson.lastReviewed}. Sources: ${lesson.references.join('; ')}.`}
            </T>
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: space.gutter, paddingVertical: space.md, backgroundColor: c.bg }}>
        <Row gap={space.sm}>
          <Button kind="secondary" label="Back" disabled={index === 0} onPress={() => setIndex(Math.max(0, index - 1))} style={{ flex: 1 }} />
          <Button label={isLast ? 'Finish lesson' : 'Next'} disabled={!canFinish} onPress={next} style={{ flex: 2 }} />
        </Row>
      </View>
    </SafeAreaView>
  );
}
