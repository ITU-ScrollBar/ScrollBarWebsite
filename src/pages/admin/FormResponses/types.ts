import { Tender } from "../../../types/types-file";

/**
 * Form responses only carry uids, so names are resolved from the users streamed by
 * TenderProvider. `isLoaded` separates "this user does not exist" from "not fetched yet", so a
 * requester is never briefly labelled unknown on first paint.
 */
export type TenderLookup = {
  resolve: (uid?: string) => Tender | null;
  isLoaded: boolean;
};

export const tenderName = (tenders: TenderLookup, uid?: string): string => {
  const tender = tenders.resolve(uid);
  if (tender?.displayName) {
    return tender.displayName;
  }

  return tenders.isLoaded ? "Unknown user" : "Loading…";
};
