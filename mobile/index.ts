/**
 * The app's entry (mobile 1.47). It is Expo Router's own entry, plus two
 * lines for the Android home-screen widgets: their background task
 * (src/widgets/register.android.ts) and the short "choose" screen Android
 * opens when Readiness or Exam countdown is added
 * (src/components/widgetConfig.android.tsx). Elsewhere both files do nothing.
 * Keep the first import in step with `expo-router/entry` at each SDK upgrade.
 */
import 'expo-router/entry';
import './src/widgets/register';
import './src/components/widgetConfig';
