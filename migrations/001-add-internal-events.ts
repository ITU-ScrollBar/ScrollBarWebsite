// Adds internal: false to all existing events
// to support internal events going forward.

import type { MigrationProps } from "./migration-runner.js";

export default async function ({ db, env }: MigrationProps) {
  let eventsCollection = db.collection(`/env/${env}/events`);

  const pageSize = 500;

  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;

  while (true) {
    const writer = db.batch();
    let q = eventsCollection.orderBy("__name__").limit(pageSize);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const d of snap.docs) {
      const data = d.data();
      if (data.internal === undefined) {
        writer.update(d.ref, { internal: false });
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    console.log(`  processed ${snap.size} docs batch`);

    await writer.commit();
  }
}
