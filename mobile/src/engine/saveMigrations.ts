/**
 * Saved-data versions and upgrades, shared by the stores and the backup file.
 *
 * Each store saves `{ state, version }`. When a store's shape changes in a
 * way old data can't simply load, its version goes up and an upgrade runs.
 * The backup file (engine/backup.ts) records each store's version too, so a
 * backup made by an older app is upgraded the same way on restore.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { DayPlan } from './dayPlan';

/** The progress store's save version (store/progress.ts). */
export const PROGRESS_VERSION = 2;
/** The settings store's save version (store/settings.ts). */
export const SETTINGS_VERSION = 1;

/**
 * Upgrade an older progress save. Version 1 had at most one plan in `day`
 * (or none, before Grove); it moves into `days` under its own cert id.
 */
export function migrateProgress(persisted: unknown): Record<string, unknown> {
  const old = (persisted ?? {}) as Record<string, unknown> & { day?: DayPlan | null; days?: Record<string, DayPlan> };
  const { day, ...rest } = old;
  const days: Record<string, DayPlan> = { ...(old.days ?? {}) };
  if (day && typeof day === 'object' && day.certId && !days[day.certId]) days[day.certId] = day;
  return { ...rest, days };
}
