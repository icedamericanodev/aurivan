/**
 * What counts as a "native change" for over-the-air updates.
 *
 * app.json uses the "fingerprint" runtime policy: an update only reaches APKs
 * whose fingerprint matches. By default the fingerprint includes the app's
 * version number, so every release (1.16 → 1.17) would look like a new native
 * app and stop updates reaching the APKs people already installed. Skipping
 * the version keeps updates flowing; real native changes (a new library with
 * Android code, permissions, icon, plugins) still change the fingerprint.
 *
 * @type {import('expo/fingerprint').Config}
 */
const config = {
  sourceSkips: ['ExpoConfigVersions', 'PackageJsonAndroidAndIosScriptsIfNotContainRun'],
};

module.exports = config;
