import * as Firebase from 'firebase-admin/firestore';

export default async function ({
  db,
  env,
}: {
  db: Firebase.Firestore;
  env: string;
}) {
  const eventsRef = db.collection('env').doc(env).collection('events');
  const snapshot = await eventsRef.get();

  const batch = db.batch();

  for (const eventDoc of snapshot.docs) {
    batch.update(eventDoc.ref, { deleted: false });
  }

  await batch.commit();
}
