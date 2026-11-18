/**
 * KaiSip (mobile 2.2): phones stay portrait, but Google Play must not treat
 * portrait as a REQUIRED hardware feature.
 *
 * WHY: app.json keeps `"orientation": "portrait"`, so the main activity is
 * written with android:screenOrientation="portrait" (phones never turn
 * sideways mid-question; a 393pt-tall landscape screen fits one answer option).
 * Play reads that lock as "this app needs a portrait screen" and, at the 2.1
 * upload (18 Nov 2026), its pre-review check warned that the
 * android.hardware.screen.portrait requirement restricts availability on
 * phones, tablets, Chromebooks and Android XR.
 *
 * Android's own guidance for exactly this case (uses-feature element, "If you
 * declare an orientation for your activity using android:screenOrientation but
 * don't actually require it"): declare the feature with android:required="false".
 * That is all this plugin does. It adds, once, to the manifest:
 *
 *   <uses-feature android:name="android.hardware.screen.portrait" android:required="false" />
 *
 * The lock itself is unchanged on phones. On large screens (smallest width
 * 600dp or more) Android 16 ignores it anyway for apps targeting SDK 36, and
 * the app lays out in a centred column there (src/components/layout.tsx).
 * Native: needs a store build. Checked by src/__tests__/large-screens.test.tsx.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

/** The manifest with the portrait feature marked optional (pure, for tests). */
function markPortraitOptional(manifest) {
  const root = manifest.manifest;
  const features = (root['uses-feature'] = root['uses-feature'] || []);
  const existing = features.find((f) => f.$ && f.$['android:name'] === FEATURE);
  if (existing) existing.$['android:required'] = 'false';
  else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
  return manifest;
}

function withOptionalPortrait(config) {
  return withAndroidManifest(config, (c) => {
    c.modResults = markPortraitOptional(c.modResults);
    return c;
  });
}

module.exports = withOptionalPortrait;
module.exports.markPortraitOptional = markPortraitOptional;
module.exports.FEATURE = FEATURE;
