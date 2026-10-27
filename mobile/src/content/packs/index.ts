/**
 * Content packs: one import for everything about where content comes from.
 * See ./registry.ts (which source wins) and ./types.ts (what a source is).
 * Decision record: docs/mobile/ARCHITECTURE.md, "Content packs".
 */
export { BundledSource } from './bundled';
export {
  clearContentCaches,
  installedCertIds,
  onClearContentCaches,
  PACK_SCHEMA_VERSION,
  packInfo,
  packInstalled,
  registerPackSource,
  sourceFor,
} from './registry';
export type { GameDeckKind, PackInfo, PackSource } from './types';
