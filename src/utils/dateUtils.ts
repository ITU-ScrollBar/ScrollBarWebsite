/**
 * Formats an ISO date-only string ("YYYY-MM-DD") as "DD/MM/YYYY" in the user's local
 * calendar date. Parsing is done by extracting date components directly so the result
 * is timezone-independent — the displayed date always matches the stored calendar date.
 */
export const formatIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};
