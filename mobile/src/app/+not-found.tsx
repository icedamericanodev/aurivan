/**
 * A link to a screen the app does not have (kaisip://course, an old bookmark):
 * land on Today instead of Expo Router's developer "Unmatched Route" page.
 * Removed screens with a better home are mapped first (lib/legacyLinks.ts).
 */
import { LandOnToday } from '../components/landOnToday';

export default function NotFound() {
  return <LandOnToday testID="not-found" />;
}
