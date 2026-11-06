/**
 * useTheme() — gives any screen the right colours for light/dark mode,
 * respecting the learner's choice in Settings ("system" follows the phone).
 * `g` holds the Grove additions (theme/grove.ts): the floating bar, seeds, soil, empty leaves.
 */
import { useColorScheme } from 'react-native';
import { useSettings } from '../store/settings';
import { groveDark, groveLight, type GroveInk } from './grove';
import { dark, light, type Palette } from './tokens';

export function useTheme(): { c: Palette; g: GroveInk; isDark: boolean } {
  const pref = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = pref === 'system' ? system !== 'light' : pref === 'dark';
  return { c: isDark ? dark : light, g: isDark ? groveDark : groveLight, isDark };
}
