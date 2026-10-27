/**
 * A Settings door's own screen (mobile 1.46): `settings-section?category=data` (Your data) or
 * `?category=help` (Help and about); in a cloud build also `account` and `board`. It is the Settings
 * screen itself showing only that category, its name in the bar, so every row, sheet and deep link
 * behaves exactly as on Settings. Any other value shows the whole Settings page.
 */
import Settings from './settings';

export default function SettingsSection() {
  return <Settings />;
}
