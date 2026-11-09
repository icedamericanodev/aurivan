/** Pure, minute-based model. No dates, time zones, storage, or learner progress. */
export interface RecoveryConfig {
  /** Local scenario clock, minutes after midnight. */
  outageMinutes: number;
  rto: number;
  rpo: number;
  initialRecovery: number;
  initialGap: number;
  maxRecovery: number;
  maxGap: number;
}

export const DEFAULT_RECOVERY_CONFIG: Readonly<RecoveryConfig> = Object.freeze({
  outageMinutes: 14 * 60,
  rto: 120,
  rpo: 15,
  initialRecovery: 80,
  initialGap: 30,
  maxRecovery: 180,
  maxGap: 60,
});

function wholeMinutes(value: number, name: string, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${name} must be a whole number between 0 and ${max}`);
  }
}

/** Explicit 12-hour clock; wraps across midnight without relying on device locale. */
export function formatClock(minutes: number): string {
  if (!Number.isSafeInteger(minutes)) throw new RangeError('Clock minutes must be a safe integer');
  const dayMinute = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(dayMinute / 60);
  return `${hour % 12 || 12}:${String(dayMinute % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function validateRecoveryConfig(config: Readonly<RecoveryConfig>): void {
  wholeMinutes(config.outageMinutes, 'Outage clock', 1439);
  wholeMinutes(config.maxRecovery, 'Maximum recovery');
  wholeMinutes(config.maxGap, 'Maximum data gap');
  if (config.maxRecovery === 0 || config.maxGap === 0) throw new RangeError('Timeline ranges must be positive');
  wholeMinutes(config.rto, 'RTO', config.maxRecovery);
  wholeMinutes(config.rpo, 'RPO', config.maxGap);
  wholeMinutes(config.initialRecovery, 'Initial recovery', config.maxRecovery);
  wholeMinutes(config.initialGap, 'Initial data gap', config.maxGap);
}

/** Equality meets an objective: objectives are maximum tolerances, not strict cutoffs. */
export function evaluateRecovery(recovery: number, gap: number, config: Readonly<RecoveryConfig> = DEFAULT_RECOVERY_CONFIG) {
  validateRecoveryConfig(config);
  wholeMinutes(recovery, 'Actual recovery time', config.maxRecovery);
  wholeMinutes(gap, 'Recoverable data gap', config.maxGap);
  const rtoMet = recovery <= config.rto;
  const rpoMet = gap <= config.rpo;
  return {
    downtime: recovery,
    dataGap: gap,
    rtoMet,
    rpoMet,
    restorationTime: formatClock(config.outageMinutes + recovery),
    recoveryPointTime: formatClock(config.outageMinutes - gap),
    summary: `${rtoMet ? 'RTO met' : 'RTO missed'}: ${recovery} minutes of downtime against ${config.rto} minutes allowed. ${rpoMet ? 'RPO met' : 'RPO missed'}: ${gap} minutes of potential data loss against ${config.rpo} minutes allowed. The data gap is exposure, not a count of verified lost transactions.`,
  };
}

/** Reset creates a fresh value pair; it never writes existing lesson or question state. */
export function initialRecoveryState(config: Readonly<RecoveryConfig> = DEFAULT_RECOVERY_CONFIG) {
  validateRecoveryConfig(config);
  return { recovery: config.initialRecovery, gap: config.initialGap };
}
