/**
 * One exam-mindset principle: its reading page.
 *
 * Plain English, top to bottom:
 * - The family it belongs to ("Your role"), then its name as the page title.
 * - The page itself (components/principles.tsx → PrincipleBody): The rule,
 *   Why it matters, Spot it in the question, The trap, Worked example, Nuance.
 * - ONE ending: "Practice this principle", which starts a practice set of
 *   exactly the questions the principle lists (`practiceIds`), shuffled, the
 *   same path as a study note's "Practice this concept". Those answers count
 *   toward progress and spaced review like any practice. No button when none
 *   of its questions are in this build.
 *
 * - Then the source row, like a study note's: "Code <id>" and "Report a
 *   problem" (a `principle` report: its id and title only, never the text).
 *
 * Any id a link may carry opens the right page: the principle's own id, an
 * old id it replaced, or an alias (content/principles findPrinciple). An id
 * that matches nothing shows "Principle not found" with a way to the list,
 * and so does a malformed one (a lone "%" can't be decoded: it is used as is).
 *
 * Header: like a study note, the back chevron alone until the page title has
 * scrolled under the bar, then the name cross-fades in (at once under Reduce
 * Motion; never read by screen readers, it only repeats the title).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { PrincipleBody } from '../../components/principles';
import { ReportRow } from '../../components/support';
import { Button, Enter, PushedHeader, Screen, T } from '../../components/ui';
import { CERTIFICATIONS, getCertification } from '../../content/certifications';
import { findQuestion } from '../../content/loader';
import { familyOf, findPrinciple } from '../../content/principles';
import { createRng, shuffled } from '../../engine/random';
import { openSessionFromStack, safeDecode } from '../../lib/actions';
import { guardedStart, startFromIds } from '../../lib/sessions';
import { useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The header title's hysteresis (pt): it shows past the line, and hides only 8pt back above it. */
const HYSTERESIS = 8;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/principles'));

export default function PrincipleScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = safeDecode(rawId ?? '');
  const { c } = useTheme();
  const certId = useSettings((s) => s.activeCertId);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  // Title collapse: the page title has scrolled under the header.
  const [titleUnder, setTitleUnder] = useState(false);
  const titleBottom = useRef(0);
  const principle = findPrinciple(cert.id, id);

  if (!principle) {
    return (
      <EmptyScreen
        header="Principles"
        title="Principle not found"
        body="It may have moved in a content update. Every principle is in the list."
        primary={{ label: 'All principles', onPress: () => router.replace('/principles') }}
      />
    );
  }

  const family = familyOf(cert.id, principle);
  // The questions it lists, minus any a content update removed.
  const practiceIds = principle.practiceIds.filter((q) => findQuestion(cert.id, q));
  const n = practiceIds.length;
  const practise = () =>
    guardedStart(
      // Shuffled each time, so a repeat run does not replay the same order.
      () => startFromIds(cert.id, shuffled(practiceIds, createRng(Date.now())), principle.title),
      // The page can sit above an old session or Results: start clean (lib/actions.ts).
      openSessionFromStack,
    );
  const onScroll = (y: number) => {
    const edge = titleBottom.current;
    const under = edge > 0 && (titleUnder ? y > edge - HYSTERESIS : y > edge);
    if (under !== titleUnder) setTitleUnder(under);
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      onScroll={onScroll}
      header={<PushedHeader title={principle.title} showTitle={titleUnder} onBack={goBack} />}
    >
      <Enter i={0}>
        <View onLayout={(e) => (titleBottom.current = space.lg + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          {family && <T v="caption" color={c.accentText}>{`Principle · ${family.title}`}</T>}
          <T v="hero" accessibilityRole="header" style={{ marginTop: space.xs }}>{principle.title}</T>
        </View>
      </Enter>

      <Enter i={1} style={{ marginTop: space.lg }}>
        <PrincipleBody principle={principle} />
      </Enter>

      {n > 0 && (
        // The helper line sits right under its button, so they read as one.
        <View style={{ marginTop: space.xxl, gap: space.xs }}>
          <Button
            label="Practice this principle"
            accessibilityHint={`Starts a practice set on ${principle.title}`}
            onPress={practise}
          />
          <T v="meta" center>
            {`${n} ${n === 1 ? 'question' : 'questions'} on this idea. Your answers count toward your progress.`}
          </T>
        </View>
      )}
      {/* The source row (as on a study note): its code, and Report a problem. */}
      <View style={{ marginTop: n > 0 ? space.xl : space.xxl }}>
        <ReportRow
          certId={cert.id}
          meta={`Code ${principle.id}`}
          target={{ kind: 'principle', id: principle.id, name: principle.title, where: 'Principle' }}
        />
      </View>
    </Screen>
  );
}
