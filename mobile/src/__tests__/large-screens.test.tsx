/**
 * Large screens (mobile 2.2).
 *
 * What must always hold:
 * - phones stay portrait: app.json keeps "orientation": "portrait";
 * - Google Play does not see portrait as REQUIRED: the withOptionalPortrait
 *   plugin is in app.json and writes android.hardware.screen.portrait with
 *   android:required="false" (exactly once, even if run twice or if another
 *   plugin already declared it as required);
 * - on a tablet the app draws in a centred column no wider than COLUMN_MAX,
 *   and on a phone the column is the whole window (nothing changes there).
 */
import { render } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';
import { columnWidth, COLUMN_MAX, CONTENT_MAX, ContentColumn, useContentWidth } from '../components/layout';
import { space } from '../theme/tokens';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../plugins/withOptionalPortrait.js') as {
  markPortraitOptional(m: Manifest): Manifest;
  FEATURE: string;
};
const appJson = require('../../app.json') as { expo: { orientation: string; plugins: unknown[] } };

type Feature = { $: Record<string, string> };
type Manifest = { manifest: { 'uses-feature'?: Feature[] } };
const portraitFeatures = (m: Manifest) => (m.manifest['uses-feature'] ?? []).filter((f) => f.$['android:name'] === plugin.FEATURE);

const start = Dimensions.get('window');
const setWindow = (width: number, height: number) => {
  const w = { ...start, width, height, fontScale: 1 };
  Dimensions.set({ window: w, screen: w });
};
afterAll(() => Dimensions.set({ window: start, screen: start }));

describe('phones stay portrait, Play sees portrait as optional', () => {
  it('keeps the phone portrait lock in app.json', () => {
    expect(appJson.expo.orientation).toBe('portrait');
  });

  it('registers the plugin in app.json', () => {
    expect(appJson.expo.plugins).toContain('./plugins/withOptionalPortrait');
  });

  it('adds the portrait feature as not required', () => {
    const m = plugin.markPortraitOptional({ manifest: {} });
    expect(portraitFeatures(m)).toEqual([{ $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } }]);
  });

  it('adds it once, even when run twice', () => {
    const m = plugin.markPortraitOptional(plugin.markPortraitOptional({ manifest: {} }));
    expect(portraitFeatures(m)).toHaveLength(1);
  });

  it('turns an existing required declaration into an optional one and keeps other features', () => {
    const touch = { $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' } };
    const m = plugin.markPortraitOptional({
      manifest: { 'uses-feature': [touch, { $: { 'android:name': plugin.FEATURE, 'android:required': 'true' } }] },
    });
    expect(portraitFeatures(m)).toEqual([{ $: { 'android:name': plugin.FEATURE, 'android:required': 'false' } }]);
    expect(m.manifest['uses-feature']).toContainEqual(touch);
  });
});

describe('the screen column', () => {
  it('is the reading measure plus the two gutters (Grove §2: content never wider than 560)', () => {
    expect(CONTENT_MAX).toBe(560);
    expect(COLUMN_MAX).toBe(560 + space.gutter * 2);
  });

  it('is the whole window on a phone and capped on a tablet', () => {
    expect(columnWidth(393)).toBe(393);
    expect(columnWidth(COLUMN_MAX)).toBe(COLUMN_MAX);
    expect(columnWidth(800)).toBe(COLUMN_MAX);
    expect(columnWidth(1280)).toBe(COLUMN_MAX);
  });

  it('useContentWidth follows the window on a phone and the column on a tablet', async () => {
    let seen = 0;
    const Probe = () => {
      seen = useContentWidth();
      return null;
    };
    setWindow(393, 852);
    await render(<Probe />);
    expect(seen).toBe(393);
    setWindow(1280, 800);
    await render(<Probe />);
    expect(seen).toBe(COLUMN_MAX);
  });

  it('ContentColumn centres its content at most COLUMN_MAX wide and paints the sides', async () => {
    const { getByTestId } = await render(
      <ContentColumn bg="#F3F1EA">
        <Text>inside</Text>
      </ContentColumn>,
    );
    const column = getByTestId('content-column');
    expect(column.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ maxWidth: COLUMN_MAX, alignSelf: 'center' })]));
    expect(column.parent!.props.style).toEqual(expect.objectContaining({ flex: 1, backgroundColor: '#F3F1EA' }));
  });
});
