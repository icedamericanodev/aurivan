/**
 * Lesson player — one scene at a time, segmented progress at the top, and
 * thumb-reach Back / Next at the bottom. Ends on a quick check; finishing
 * marks the lesson done, ticks it off today's plan and feeds the journey.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BotanyKind } from '../../components/glyphs';
import { SceneView } from '../../components/lesson';
import { useReportFlow } from '../../components/support';
import { Button, Gap, PushedHeader, Row, SegmentBar, T } from '../../components/ui';
import { getCertification } from '../../content/certifications';
import { findLesson } from '../../content/lessons';
import { createRng } from '../../engine/random';
import { displayToOriginal, lettersFor, makeCheckPermutation, type Permutation } from '../../engine/shuffle';
import type { Letter } from '../../content/types';
import { logLesson } from '../../lib/activity';
import { useProgress } from '../../store/progress';
import { useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function LessonPlayer() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = findLesson(String(id));
  const completeLesson = useProgress((s) => s.completeLesson);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  // The DISPLAY letter picked on this scene's check (for Report a problem), reset with `checked`.
  const [picked, setPicked] = useState<Letter | null>(null);
  const shuffleOn = useSettings((s) => s.shuffleOptions);
  // One option order per check, made ONCE when the lesson opens (useState's
  // initialiser runs only on the first render). Going Back and Next re-mounts
  // a check, but it keeps this same order for the whole viewing.
  const [perms] = useState<(Permutation | undefined)[]>(() => {
    const rng = shuffleOn ? createRng(Date.now()) : null;
    return (lesson?.scenes ?? []).map((s) => (s.type === 'check' ? makeCheckPermutation(s.options.length, rng) : undefined));
  });
  // Moving between scenes re-mounts the check unanswered, so reset the gate
  // too. Done in the same event as the move (not in an effect) so there is
  // no extra render with a stale gate.
  const goTo = (to: number) => {
    if (to === index) return;
    setIndex(to);
    setChecked(false);
    setPicked(null);
  };

  // Report a problem with THIS step (mobile 1.7). A check step offers its
  // options in the order shown; the email names the ORIGINAL letters.
  const cur = lesson?.scenes[index];
  const curPerm = cur?.type === 'check' ? (perms[index] ?? lettersFor(cur.options.length)) : undefined;
  const report = useReportFlow(lesson?.certId ?? 'cisa', {
    kind: 'lesson',
    id: lesson?.id ?? String(id),
    name: lesson?.title,
    step: index + 1,
    steps: lesson?.scenes.length,
    where: 'Lesson',
    ...(cur?.type === 'check' && curPerm
      ? {
          part: 'check',
          perm: curPerm,
          pickedDisplay: picked ?? undefined,
          options: lettersFor(cur.options.length).map((d) => ({ display: d, text: cur.options['ABCD'.indexOf(displayToOriginal(d, curPerm))] ?? '' })),
        }
      : {}),
  });

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
      goTo(index + 1);
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
        <SceneView
          key={index}
          scene={scene}
          onCheck={(_ok, letter) => {
            setChecked(true);
            setPicked(letter);
          }}
          perm={perms[index]}
          art={`branch${tone % 5}` as BotanyKind}
        />
        {/* A quiet "Report a problem" at the end of each step. On a check it waits
            until the check is answered, so it never hints at the answer. */}
        {(scene.type !== 'check' || checked) && (
          <View style={{ marginTop: space.xl, alignItems: 'flex-start' }}>
            {report.link}
            <View style={{ alignSelf: 'stretch' }}>{report.block}</View>
          </View>
        )}
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
          {/* No Back on the first scene (a disabled slab looked broken); Next takes the full width. */}
          {index > 0 && <Button kind="secondary" label="Back" onPress={() => goTo(index - 1)} style={{ flex: 1 }} />}
          <Button label={isLast ? 'Finish lesson' : 'Next'} disabled={!canFinish} onPress={next} style={{ flex: 2 }} />
        </Row>
      </View>
      {report.sheet}
    </SafeAreaView>
  );
}
