/** Shared live-sync cadence — matches inspector roster poll and crossub_web dispatch sync. */
export const LIVE_POLL_MS = 5_000;

/** Leasing cycle reads are heavy — poll less aggressively than portfolio/notifications. */
export const LEASING_CYCLE_POLL_MS = 15_000;
