// Jest config for plant_sheet.sh only (never part of `npm test`): the jest-expo
// WEB preset, so react-native resolves to react-native-web and react-native-svg
// to its web build. The web preset's babel step loses the project's Babel
// presets, so they are put back here (with the web platform caller).
const web = require('jest-expo/web/jest-preset');
const { resolveBabelOptions } = require('jest-expo/src/resolveBabelOptions');

const root = process.cwd(); // plant_sheet.sh runs from mobile/
const babel = { ...resolveBabelOptions(root), caller: { name: 'metro', bundler: 'metro', platform: 'web' } };

module.exports = {
  ...web,
  rootDir: root,
  transform: { ...web.transform, '\\.[jt]sx?$': ['babel-jest', babel] },
  testMatch: ['<rootDir>/scripts/screenshots/plant-sheet.web.tsx'],
};
