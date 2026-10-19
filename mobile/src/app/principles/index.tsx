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
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { Enter, ListRow, PushedHeader, Screen, Section, T, useFontScale } from '../../components/ui';
import { CERTIFICATIONS, getCertification } from '../../content/certifications';
import { principleFamilies } from '../../content/principles';
import { useSettings } from '../../store/settings';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

export default function PrinciplesHome() {
  const { c } = useTheme();
  const certId = useSettings((s) => s.activeCertId);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  const groups = principleFamilies(cert.id);
  const large = useFontScale() >= LARGE_TEXT;

  if (groups.length === 0) {
    return (
      <EmptyScreen
        header="Principles"
        title="Principles are on the way"
        body="The exam-mindset principles for this exam aren't in the app yet. Lessons and practice are ready now."
        primary={{ label: 'Back to Learn', onPress: () => router.replace('/learn') }}
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
