/**
 * The cloud runtime when the flag is OFF (every build today): no backend,
 * and nothing imported. cloud/backend.ts loads this one unless
 * EXPO_PUBLIC_AURIVAN_CLOUD is "1" at build time.
 */
import type { CloudBackend } from './types';

export const backend: CloudBackend | null = null;
