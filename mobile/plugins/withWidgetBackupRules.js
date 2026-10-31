/**
 * KaiSip (mobile 1.47): keep the home-screen widgets' leftovers out of
 * Android's Auto Backup and phone-to-phone transfer.
 *
 * The widget library keeps two things of its own on the phone:
 * - files/widget_images/: pictures of the drawn widgets (they can show the
 *   day's topic, question or rule);
 * - shared_prefs/<package>.WIDGET_SIZES.xml: the size of each placed widget;
 * - shared_prefs/rnwidget.measured_sizes.xml (since 0.26, Expo SDK 58): each
 *   placed widget's size as measured from a tap on this phone's launcher.
 * None of them is needed on a new phone (the widgets redraw and re-measure
 * themselves), and a size measured on another phone would be wrong, so all
 * three are excluded. Everything else is backed up exactly as before (an "exclude
 * only" rules file keeps the default "back up everything else").
 *
 * Android 11 and older read android:fullBackupContent; Android 12+ reads
 * android:dataExtractionRules. Both are written. Native: needs a store build.
 */
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const RULES = 'kaisip_backup_rules';
const EXTRACTION = 'kaisip_data_extraction_rules';

function excludes(pkg) {
  return [
    '<exclude domain="file" path="widget_images/" />',
    `<exclude domain="sharedpref" path="${pkg}.WIDGET_SIZES.xml" />`,
    '<exclude domain="sharedpref" path="rnwidget.measured_sizes.xml" />',
  ];
}

function backupXml(pkg) {
  return ['<?xml version="1.0" encoding="utf-8"?>', '<full-backup-content>', ...excludes(pkg).map((l) => `  ${l}`), '</full-backup-content>', ''].join('\n');
}

function extractionXml(pkg) {
  const inner = excludes(pkg).map((l) => `    ${l}`);
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<data-extraction-rules>',
    '  <cloud-backup>',
    ...inner,
    '  </cloud-backup>',
    '  <device-transfer>',
    ...inner,
    '  </device-transfer>',
    '</data-extraction-rules>',
    '',
  ].join('\n');
}

module.exports = function withWidgetBackupRules(config) {
  const pkg = config.android && config.android.package;
  if (!pkg) throw new Error('withWidgetBackupRules: android.package is required');
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application && c.modResults.manifest.application[0];
    if (!app) return c;
    app.$ = app.$ || {};
    app.$['android:fullBackupContent'] = `@xml/${RULES}`;
    app.$['android:dataExtractionRules'] = `@xml/${EXTRACTION}`;
    return c;
  });
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const dir = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${RULES}.xml`), backupXml(pkg));
      fs.writeFileSync(path.join(dir, `${EXTRACTION}.xml`), extractionXml(pkg));
      return c;
    },
  ]);
};

module.exports.backupXml = backupXml;
module.exports.extractionXml = extractionXml;
