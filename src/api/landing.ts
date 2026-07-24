import type { LandingStatsRead } from '@/types/api';
import { api } from './client';

/**
 * Public landing-page statistics (GET /landing/stats — no auth). The
 * figures are hand-curated by an admin on the backend; zeros mean "not set
 * yet", so callers should fall back to their own defaults per field.
 */
export const landingApi = {
  stats() {
    return api.get<LandingStatsRead>('/landing/stats');
  },
};
