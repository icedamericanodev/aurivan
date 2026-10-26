#!/usr/bin/env node
/**
 * set-update-channel.mjs: tells a build made WITHOUT EAS which over-the-air
 * update channel to listen to.
 *
 *   node scripts/set-update-channel.mjs preview
 *
 * WHEN TO USE IT (plain English):
 *   Builds made on expo.dev (EAS Build) get their channel from eas.json, so
 *   they never need this. The backup builder scripts/build-apk.sh (a Mac
 *   build) doesn't go through EAS. (The GitHub "Android test APK" workflow
 *   that also used it was retired on 26 Oct 2026.)
 *   It runs this in a THROWAWAY copy of the code, AFTER computing the update
 *   runtime and BEFORE `expo prebuild`. It writes the channel into that copy's
 *   app.json, and prebuild then puts it in the Android project.
 *
 *   Never commit the result: the committed app.json must set no channel
 *   (scripts/check-release-config.mjs fails CI if it does). And only
 *   "preview" is allowed here: store builds come from EAS with "production".
 *
 * No third-party packages: only Node's built-in modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED = ['preview'];

const channel = process.argv[2];
if (!ALLOWED.includes(channel)) {
  console.error(`usage: set-update-channel.mjs <${ALLOWED.join('|')}> (store builds get "production" from eas.json on EAS)`);
  process.exit(1);
}

const file = path.join(MOBILE, 'app.json');
const app = JSON.parse(fs.readFileSync(file, 'utf8'));
app.expo.updates = app.expo.updates ?? {};
app.expo.updates.requestHeaders = { ...(app.expo.updates.requestHeaders ?? {}), 'expo-channel-name': channel };
fs.writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
console.log(`This build will listen to the "${channel}" update channel (app.json in this copy only; do not commit it).`);
