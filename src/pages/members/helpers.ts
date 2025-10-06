import { FirebaseDate, Tender, Engagement } from "../../types/types-file";

/**
 * Converts a FirebaseDate object to a number representing the hour.
 * @param date - The FirebaseDate object to convert.
 * @returns A number representing the hour.
 */
export const dateToHour = (date: FirebaseDate): number => {
  const jsDate = new Date(
    (date.seconds || 0) * 1000 + Math.floor((date.nanoseconds || 0) / 1e6)
  );
  return jsDate.getHours();
};

/**
 * Converts a FirebaseDate object to a string representing the hour.
 * @param date - The FirebaseDate object to convert.
 * @returns A string representing the hour.
 */
export const dateToHourString = (date: FirebaseDate): string => {
  return dateToHour(date).toString();
};

/**
 * Gets all engagements for a specific shift
 * @param shiftId - The ID of the shift
 * @param engagements - Array of all engagements
 * @returns Array of engagements for the shift
 */
export const getEngagementsForShift = (
  shiftId: string,
  engagements: Engagement[]
): Engagement[] => {
  return engagements.filter((e) => e.shiftId === shiftId);
};

/**
 * Gets tender information for a specific engagement
 * @param engagement - The engagement object
 * @param tenders - Array of all tenders
 * @returns The tender object or null if not found
 */
export const getTenderForEngagement = (
  engagement: Engagement,
  tenders: Tender[]
): Tender | null => {
  return tenders.find((t) => t.id === engagement.userId) || null;
};

/**
 * Gets the display name for a tender, with fallback
 * @param tender - The tender object
 * @returns The display name or "Unknown"
 */
export const getTenderDisplayName = (tender: Tender): string => {
  return tender.displayName || tender.name || "Unknown";
};

/**
 * Gets the initial letter for a tender's avatar
 * @param tender - The tender object
 * @returns The first letter of the display name, uppercased
 */
export const getTenderInitial = (tender: Tender): string => {
  const displayName = getTenderDisplayName(tender);
  return displayName.charAt(0).toUpperCase() || "?";
};

/**
 * Handles image error by hiding the image and showing fallback
 * @param e - The error event from the image
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement>
): void => {
  const imgElement = e.currentTarget;
  imgElement.style.display = "none";
  const fallbackDiv = imgElement.nextElementSibling as HTMLElement;
  if (fallbackDiv) {
    fallbackDiv.style.display = "flex";
  }
};
