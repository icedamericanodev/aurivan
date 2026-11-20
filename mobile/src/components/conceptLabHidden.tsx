/**
 * What the Concept Lab screens (/labs and /labs/<id>) show while the lab is hidden
 * (CONCEPT_LAB_ENABLED is false, content/labs/enabled.ts; owner decision, 19 Nov 2026).
 *
 * Plain English for the founder: a learner may still reach a lab screen from an old link
 * (kaisip://labs/…), a bookmark, or a navigation state the phone restored. This shows nothing of its
 * own (the paper colour for a frame) and opens Learn at once, so they never see a blank
 * "unmatched route" screen or a lab we have hidden.
 *
 * The same house pattern as the retired plant and Play screens (app/plant.tsx, app/play.tsx):
 * - on first focus, not on mount (Expo SDK 58: the router is not ready on mount);
 * - through `openTab`: back to the tabs already at the bottom of the stack (never a second tab
 *   navigator on top), or a replace when nothing is under this screen (a cold link).
 * Saved data is untouched: the lab never saved anything (its state lives only while it is open).
 */
import { View } from 'react-native';
import { openTab } from '../lib/actions';
import { useOnceOnFocus } from '../lib/useOnceOnFocus';
import { useTheme } from '../theme/useTheme';

export function ConceptLabHidden() {
  const { c } = useTheme();
  useOnceOnFocus(() => openTab('/learn'));
  return <View accessible={false} testID="concept-lab-hidden" style={{ flex: 1, backgroundColor: c.bg }} />;
}
