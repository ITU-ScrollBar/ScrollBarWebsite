import { QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  RETENTION_ENVS,
  RetentionEnv,
  SCHEDULE_OPTIONS,
  deleteFileIfExists,
  deleteStorageFileByUrl,
  envCollection,
  resolveStorageBucketName,
} from "./common";

export const RESOLVED_TICKET_RETENTION_DAYS = 7;

// Tickets resolved before resolvedAt was recorded fall back to updatedAt, which every status
// change also sets, so it is at least as recent as the move to Done.
const resolvedAt = (ticket: QueryDocumentSnapshot): Date | null => {
  const value = ticket.get("resolvedAt") ?? ticket.get("updatedAt");
  return value instanceof Timestamp ? value.toDate() : null;
};

// Mirrors DELETE /tickets/:id in calendar.ts: attachments are removed before the doc, so a
// failure leaves the doc (and its paths) for the next run to retry.
const deleteTicket = async (ticket: QueryDocumentSnapshot): Promise<void> => {
  const bucket = getStorage().bucket(resolveStorageBucketName());
  for (const path of ticket.get("imagePaths") ?? []) {
    if (typeof path === "string" && path.trim()) await deleteFileIfExists(bucket, path);
  }
  for (const url of ticket.get("imageUrls") ?? []) {
    await deleteStorageFileByUrl(url);
  }
  await ticket.ref.delete();
};

const cleanupEnv = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "tickets").where("status", "==", "resolved").get();
  let deleted = 0;

  for (const ticket of snapshot.docs) {
    const doneSince = resolvedAt(ticket);
    if (!doneSince || doneSince >= cutoff) continue;

    try {
      await deleteTicket(ticket);
      deleted++;
    } catch (error) {
      console.warn(`[${env}] Kept ticket ${ticket.id}: could not delete it`, error);
    }
  }

  return deleted;
};

/**
 * Every 3 days: deletes kanban tickets that have been in the Done column ("resolved") for more
 * than RESOLVED_TICKET_RETENTION_DAYS, together with their image attachments.
 */
export const cleanupResolvedTickets = onSchedule(
  { ...SCHEDULE_OPTIONS, schedule: "every 72 hours" },
  async () => {
    const cutoff = new Date(Date.now() - RESOLVED_TICKET_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    for (const env of RETENTION_ENVS) {
      const deleted = await cleanupEnv(env, cutoff);
      console.log(`[${env}] Deleted ${deleted} tickets resolved before ${cutoff.toISOString()}.`);
    }
  }
);
