import { Tender, Engagement, Role } from "../../types/types-file";

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
  return tenders.find((t) => t.uid === engagement.userId) || null;
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

export const roleToColor = (role: Role): string => {
  switch (role) {
    case Role.ADMIN:
      return "volcano";
    case Role.ANCHOR:
      return "purple";
    case Role.NEWBIE:
      return "green";
    case Role.BOARD:
      return "blue";
    case Role.USER_MANAGER:
      return "orange";
    case Role.SHIFT_MANAGER:
      return "cyan";
    case Role.EVENT_MANAGER:
      return "magenta";
    case Role.REGULAR_ACCESS:
      return "geekblue";
    case Role.PASSIVE:
      return "gold";
    case Role.LEGACY:
      return "lime";
    case Role.TENDER:
      return "pink";
    default:
      return "default";
  }
};

export const roleToLabel = (role: Role): string => {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.ANCHOR:
      return "Anchor";
    case Role.NEWBIE:
      return "Newbie";
    case Role.BOARD:
      return "Board";
    case Role.USER_MANAGER:
      return "User Manager";
    case Role.SHIFT_MANAGER:
      return "Shift Manager";
    case Role.EVENT_MANAGER:
      return "Event Manager";
    case Role.REGULAR_ACCESS:
      return "Regular Access";
    case Role.PASSIVE:
      return "Passive";
    case Role.LEGACY:
      return "Legacy";
    case Role.TENDER:
      return "Tender";
    default:
      return "Unknown";
  }
};