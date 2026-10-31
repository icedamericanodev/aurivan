/**
 * Principles: the exam-mindset library (Learn → Principles).
 *
 * Plain English: the reasoning patterns CISA questions reward, grouped into
 * six families. Each family is a section ("Your role") with the question it
 * answers under it ("Who am I in this question…?"), then one row per
 * principle: its name, and its one-line rule under it. A row opens the
 * principle's page (app/principles/[id].tsx).
 *
 * Content: ../data/mindset/principles.json via the content build
 * (scripts/principles-pack.cjs → content/principles). A cert with no
 * principles shows a calm "on the way" screen instead of an empty list.
 *
 * Grove: rows on the paper with hairlines (no cards: nothing here is a
 * choice between options), one `Section` headline per family, the Compass
 * glyph only on the Learn row that leads here. Rows grow at large text (the
 * rule is never cut off at 200%). No motion beyond the shared `Enter` fade,
 * which already respects Reduce Motion.
 *
 * ?family=<id> (Final review week's "Read the principles on …" tasks): only
 * that family's section, with "Showing one family" and "See all principles"
 * under the title. An unknown id
 * shows the whole list.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { openTab } from '../../lib/actions';
import { useState } from 'react';
import { View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { Button, Enter, ListRow, PushedHeader, Screen, Section, T, useFontScale } from '../../components/ui';
import { CERTIFICATIONS, getCertification } from '../../content/certifications';
import { principleFamilies } from '../../content/principles';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { useActiveCertId } from '../../lib/activeCert';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

export default function PrinciplesHome() {
  const { c } = useTheme();
  const certId = useActiveCertId();
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  const all = principleFamilies(cert.id);
  const large = useFontScale() >= LARGE_TEXT;
  // One family when a link asks for it (and it exists), until "See all principles".
  const { family: asked } = useLocalSearchParams<{ family?: string }>();
  const [showAll, setShowAll] = useState(false);
  const only = !showAll && typeof asked === 'string' && all.some((g) => g.family.id === asked) ? asked : undefined;
  const groups = only ? all.filter((g) => g.family.id === only) : all;

  if (groups.length === 0) {
    return (
      <EmptyScreen
        header="Principles"
        title="Principles are on the way"
        body="The exam-mindset principles for this exam aren't in the app yet. Lessons and practice are ready now."
        primary={{ label: 'Back to Learn', onPress: () => openTab('/learn') }}
      />
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Principles" onBack={goBack} />
      <Enter i={0}>
        <T v="meta" style={{ marginTop: space.xs }}>
          The thinking the exam rewards. Learn the rule, spot it in the question, avoid the trap.
        </T>
        {/* One family from a link (UX review P5): say so up top, with the way back to all of them. */}
        {only && (
          <View testID="principles-one-family" style={{ marginTop: space.sm }}>
            <T v="small" color={c.ink}>{`Showing one family: ${groups[0]?.family.title ?? ''}`}</T>
            <Button
              kind="ghost"
              label="See all principles"
              onPress={() => setShowAll(true)}
              style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
            />
          </View>
        )}
      </Enter>

      {groups.map(({ family, principles }, g) => (
        <Enter key={family.id} i={Math.min(g + 1, 4)}>
          <Section title={family.title} />
          {/* The question this family answers: read, not a label, so `small` in ink2. */}
          <T v="small" color={c.ink2}>{family.question}</T>
          <View style={{ marginTop: space.xs }}>
            {principles.map((p, i) => (
              <ListRow
                key={p.id}
                title={p.title}
                subtitle={
                  <T v="small" color={c.ink2} numberOfLines={large ? undefined : 2} style={{ marginTop: 2 }}>
                    {p.rule}
                  </T>
                }
                accessibilityLabel={`${p.title}. ${p.rule}`}
                accessibilityHint="Opens this principle"
                onPress={() => router.push({ pathname: '/principles/[id]', params: { id: p.id } })}
                last={i === principles.length - 1}
              />
            ))}
          </View>
        </Enter>
      ))}
      <T v="meta" color={c.muted} style={{ marginTop: space.xxl }}>Original content, reviewed against public frameworks.</T>
    </Screen>
  );
}
