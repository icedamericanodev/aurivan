/**
 * Replaces Expo Router's built-in /_sitemap page, which lists every screen
 * file by name (and ships in release builds). It lands on Today instead.
 * Expo Router only adds its own sitemap when this file is missing.
 */
import { LandOnToday } from '../components/landOnToday';

export default function NoSitemap() {
  return <LandOnToday testID="no-sitemap" />;
}
