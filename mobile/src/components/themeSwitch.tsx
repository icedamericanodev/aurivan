/**
 * Appearance switch: System / Light / Dark as a Grove segmented control.
 * Used at the top of You AND in Settings → Appearance, on purpose: the owner
 * asked for it on You after not finding dark mode in Settings. Both read and
 * write the same settings store value (`theme` / `setTheme`), so they agree.
 */
import { useSettings, type ThemePref } from '../store/settings';
import { ICON_STROKE, Moon, Sun, SunMoon } from './icons';
import { ICON_SIZE, Segmented } from './ui';

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: SunMoon },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeSwitch() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  return (
    <Segmented
      accessibilityLabel="Appearance"
      value={theme}
      onChange={setTheme}
      options={OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        spoken: `${o.label} appearance`,
        icon: (color: string) => <o.Icon size={ICON_SIZE.inline} color={color} strokeWidth={ICON_STROKE} />,
      }))}
    />
  );
}
