import { router } from 'expo-router';
import { View } from 'react-native';
import { ConceptLabHidden } from '../../components/conceptLabHidden';
import { EmptyScreen } from '../../components/emptyScreen';
import { PageTitle, HubCard, CardHead } from '../../components/groveHub';
import { Button, PushedHeader, Screen, T } from '../../components/ui';
import { CONCEPT_LAB_ENABLED, labsFor } from '../../content/labs';
import { getCertification } from '../../content/certifications';
import { useActiveCertId } from '../../lib/activeCert';
import { space } from '../../theme/tokens';

/**
 * The /labs route. While the Concept Lab is hidden (CONCEPT_LAB_ENABLED is false; owner decision,
 * 19 Nov 2026, content/labs/enabled.ts) it shows nothing and opens Learn, so an old link never
 * crashes or shows the lab. Switch on: the catalog below, exactly as before.
 */
export default function LabCatalog() {
  return CONCEPT_LAB_ENABLED ? <LabCatalogScreen /> : <ConceptLabHidden />;
}

function LabCatalogScreen() {
  const certId = useActiveCertId();
  const cert = getCertification(certId);
  const labs = labsFor(certId);
  if (!labs.length) return <EmptyScreen header="Concept Lab" fallback="/learn" title="No labs for this exam yet" body="Explore the lessons and study notes in Learn." primary={{ label: 'Back to Learn', onPress: () => router.replace('/learn') }} />;
  return <Screen edges={['top', 'bottom']} header={<PushedHeader title="Concept Lab" showTitle={false} onBack={() => router.canGoBack() ? router.back() : router.replace('/learn')} />}>
    <PageTitle title="Interactive Concept Lab" />
    <T v="meta" style={{ marginTop: space.sm }}>Change the variables. See what happens. Then apply your judgment.</T>
    {cert?.domains.filter(d => labs.some(l => l.domainId === d.id)).map(d => <View key={d.id} style={{ marginTop: space.xl, gap: space.md }}>
      <T v="title" accessibilityRole="header">{d.short}</T>
      {labs.filter(l => l.domainId === d.id).map(l => <HubCard key={l.id} style={{ gap: space.md, paddingBottom: space.md }}>
        <CardHead title={l.title} meta={`${l.minutes} min · Timeline lab`} />
        <T v="body">{l.objective}</T>
        <T v="meta">Explore → Experiment → Apply · Works offline</T>
        <Button label="Open lab" onPress={() => router.push(`/labs/${l.id}`)} />
      </HubCard>)}
    </View>)}
  </Screen>;
}
