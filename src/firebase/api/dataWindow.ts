// Live Firestore listeners stream whole collections, so their cost grows with
// everything ever recorded rather than with what the UI actually renders. The
// shifts and events collections accumulate every semester and are never needed
// in full: member-facing views only ever show upcoming work, and admin views
// scope every lookup to a selected event or planning period.
//
// Bounding those listeners to a rolling window keeps reads proportional to
// recent activity. The window has to be generous enough to cover the planning
// periods an admin might still open, hence 12 months (current + previous
// semester) rather than something tighter.
export const LIVE_DATA_WINDOW_MONTHS = 12;

/**
 * Start of the rolling window that live listeners are bounded to.
 *
 * Computed per call rather than at module load so a long-lived browser session
 * doesn't keep querying against an increasingly stale cutoff.
 */
export const getLiveDataWindowStart = (): Date => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - LIVE_DATA_WINDOW_MONTHS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
};
