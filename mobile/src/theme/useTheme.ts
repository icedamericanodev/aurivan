/**
 * useTheme() — gives any screen the right colours for light/dark mode,
 * respecting the learner's choice in Settings ("system" follows the phone).
 */
import { useColorScheme } from 'react-native';
import { useSettings } from '../store/settings';
import { dark, light, type Palette } from './tokens';

export function useTheme(): { c: Palette; isDark: boolean } {
  const pref = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = pref === 'system' ? system !== 'light' : pref === 'dark';
  return { c: isDark ? dark : light, isDark };
}
