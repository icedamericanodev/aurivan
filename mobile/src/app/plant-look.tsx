/** Compatibility route for saved plant links. Plant data remains in backups. */
import { View } from 'react-native';
import { openTab } from '../lib/actions';
import { useOnceOnFocus } from '../lib/useOnceOnFocus';
import { useTheme } from '../theme/useTheme';

export default function PlantMoved() {
  const { c } = useTheme();
  useOnceOnFocus(() => openTab('/you'));
  return <View accessible={false} testID="plant-moved" style={{ flex: 1, backgroundColor: c.bg }} />;
}
