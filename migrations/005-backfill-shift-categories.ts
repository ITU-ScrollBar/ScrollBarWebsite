import * as Firebase from 'firebase-admin/firestore';

export default async function ({
  db,
  env,
}: {
  db: Firebase.Firestore;
  env: string;
}) {
  const shiftsRef = db.collection('env').doc(env).collection('shifts');
  const snapshot = await shiftsRef.get();

  // Group shifts by eventId, then assign category by chronological position within each event.
  const byEvent = new Map<string, Array<{ id: string; start: Date }>>();
  const unparseable: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.category) {
      // Already has an explicit category — skip.
      continue;
    }

    const eventId: string = data.eventId;
    const startRaw = data.start;
    const start: Date =
      startRaw && typeof startRaw.toDate === 'function'
        ? startRaw.toDate()
        : new Date(startRaw);

    if (isNaN(start.getTime())) {
      unparseable.push(doc.id);
      continue;
    }

    const bucket = byEvent.get(eventId) ?? [];
    bucket.push({ id: doc.id, start });
    byEvent.set(eventId, bucket);
  }

  const updates: Array<{ id: string; category: string }> = [];
  for (const [, eventShifts] of byEvent) {
    const sorted = [...eventShifts].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 0; i < sorted.length; i += 1) {
      let category: string;
      if (i === 0) {
        category = 'opening';
      } else if (i === sorted.length - 1) {
        category = 'closing';
      } else {
        category = 'middle';
      }
      updates.push({ id: sorted[i].id, category });
    }
  }

  // Shifts with unparseable start dates default to "middle".
  for (const id of unparseable) {
    updates.push({ id, category: 'middle' });
  }
  if (unparseable.length > 0) {
    console.warn(`${unparseable.length} shift(s) had unparseable start dates and were set to "middle".`);
  }

  // Commit in batches of 500.
  const chunks: Array<typeof updates> = [];
  for (let i = 0; i < updates.length; i += 500) {
    chunks.push(updates.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    for (const { id, category } of chunk) {
      batch.update(shiftsRef.doc(id), { category });
    }
    await batch.commit();
  }

  console.log(`Backfilled category on ${updates.length} shifts.`);
}
