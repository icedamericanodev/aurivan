/**
 * The Kasama mark's four paths, copied from the master SVGs
 * (design-notes/brand-kaisip/icon.svg). Plain strings, so the app's mark
 * (components/brand.tsx) and the home-screen widgets (widgets/art.ts) draw
 * the very same leaves. The leaves span x 54–152, y 32–168.
 */
/** The upright leaf ("you"). */
export const KAI_LEAF = 'M72 168 C90 129.92 90 78.24 72 32 C54 78.24 54 129.92 72 168Z';
/** The companion pair ("your kasama"): the upper leaf… */
export const KAI_PAIR_UP = 'M94 100 C120.2 93.85 140.92 69.43 150 34 C113.47 46.14 92.75 70.56 94 100Z';
/** …and the lower leaf. */
export const KAI_PAIR_DOWN = 'M94 100 C93.48 129.7 114.94 154.12 152 166 C141.98 130.36 120.52 105.94 94 100Z';
/** The vein cut out of the upright leaf. */
export const KAI_VEIN = 'M72 146 V66';
