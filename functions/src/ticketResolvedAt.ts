import { DocumentReference, FieldValue } from "firebase-admin/firestore";
import { TicketStatus } from "./types/types-file";

/**
 * Fields to write alongside a ticket status change so `resolvedAt` records when the ticket
 * entered the Done column: set when it moves into "resolved", cleared when it moves out, and
 * left alone when the status doesn't change (an edit that resends the same status keeps it).
 */
export const resolvedAtFields = async (
  ticketRef: DocumentReference,
  nextStatus: TicketStatus
): Promise<Record<string, FieldValue>> => {
  const previousStatus = (await ticketRef.get()).get("status") as TicketStatus | undefined;
  if (previousStatus === nextStatus) return {};
  return {
    resolvedAt: nextStatus === "resolved" ? FieldValue.serverTimestamp() : FieldValue.delete(),
  };
};
