import { router } from 'expo-router';
import { View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { PageTitle, HubCard, CardHead } from '../../components/groveHub';
import { Button, PushedHeader, Screen, T } from '../../components/ui';
import { labsFor } from '../../content/labs';
import { getCertification } from '../../content/certifications';
import { useActiveCertId } from '../../lib/activeCert';
import { Clock, ShieldCheck, Gauge, Scale, ListChecks, LayoutGrid, ICON_STROKE } from '../../components/icons';
import { useTheme } from '../../theme/useTheme';
import { space } from '../../theme/tokens';

const previews = {
  'recovery-timeline': { icon: Clock, label: 'Recovery timeline', detail: 'Move recovery time and usable-data age against business limits.' },
  'role-permissions': { icon: ShieldCheck, label: 'Role assignment', detail: 'Assign purchasing duties and examine conflicting access.' },
  'risk-allocation': { icon: Gauge, label: 'Audit planning', detail: 'Change risk factors and allocate a limited audit budget.' },
  'authority-mapping': { icon: Scale, label: 'Decision authority', detail: 'Map decisions to management, the board and independent audit.' },
  'control-workflow': { icon: ListChecks, label: 'Change workflow', detail: 'Reorder controls and compare normal and emergency changes.' },
  'dependency-simulation': { icon: LayoutGrid, label: 'Recovery dependencies', detail: 'Connect business impacts to the systems needed for recovery.' },
} as const;

export default function LabCatalog() {
  const { c } = useTheme();
  const certId = useActiveCertId();
  const cert = getCertification(certId);
  const labs = labsFor(certId);
  if (!labs.length) return <EmptyScreen header="Concept Lab" fallback="/learn" title="No labs for this exam yet" body="Explore the lessons and study notes in Learn." primary={{ label: 'Back to Learn', onPress: () => router.replace('/learn') }} />;
  return <Screen edges={['top', 'bottom']} header={<PushedHeader title="Concept Lab" showTitle={false} onBack={() => router.canGoBack() ? router.back() : router.replace('/learn')} />}>
    <PageTitle title="Interactive Concept Lab" />
    <T v="meta" style={{ marginTop: space.sm }}>Change the variables. See what happens. Then apply your judgment.</T>
    {cert?.domains.filter(d => labs.some(l => l.domainId === d.id)).map(d => <View key={d.id} style={{ marginTop: space.xl, gap: space.md }}>
      <T v="title" accessibilityRole="header">{d.short}</T>
      {labs.filter(l => l.domainId === d.id).map(l => { const preview = previews[l.interaction]; const Icon = preview.icon; return <HubCard key={l.id} style={{ gap: space.md, paddingBottom: space.md }}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon size={24} color={c.accentText} strokeWidth={ICON_STROKE} /></View>
        <CardHead title={l.title} meta={`${l.minutes} min · ${preview.label}`} />
        <T v="body">{preview.detail}</T>
        <T v="meta">Explore → Experiment → Apply · Works offline</T>
        <Button kind="secondary" label="Open lab" accessibilityLabel={`Open ${l.title}`} onPress={() => router.push(`/labs/${l.id}`)} />
      </HubCard>; })}
    </View>)}
  </Screen>;
}
