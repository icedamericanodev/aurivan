// https://docs.expo.dev/guides/using-eslint/
// Expo's recommended rules, plus one design-system guard (see below).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Design-system guard (docs/mobile/DESIGN_SYSTEM.md, "Forest"):
// screens and components pick a <T v="…"> variant and a palette token.
// They never set their own font size, line height, font family or hex
// colour. Only components/ui.tsx (and theme/) may do that.
const DESIGN_SYSTEM_GUARD = [
  'error',
  {
    selector: 'Property[key.name=/^(fontSize|lineHeight|fontFamily)$/]',
    message: 'Use a <T v="…"> variant from components/ui.tsx instead of fontSize/lineHeight/fontFamily (see docs/mobile/DESIGN_SYSTEM.md).',
  },
  {
    selector: 'Literal[value=/^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/]',
    message: 'Use a palette token from useTheme() instead of a hex colour (see docs/mobile/DESIGN_SYSTEM.md).',
  },
  {
    selector: 'TemplateElement[value.raw=/#[0-9A-Fa-f]{6}\\b/]',
    message: 'Use a palette token from useTheme() instead of a hex colour (see docs/mobile/DESIGN_SYSTEM.md).',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/content/generated/*'],
  },
  {
    // These React Compiler rules flag existing patterns (Date.now() in
    // render, resetting state in an effect, a "latest callback" ref).
    // They are advisory here; fixing them is a behaviour change, so they
    // warn for now instead of blocking CI. TODO: address in a later pass.
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['src/components/ui.tsx'],
    rules: {
      'no-restricted-syntax': DESIGN_SYSTEM_GUARD,
    },
  },
]);
