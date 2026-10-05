import * as Firebase from 'firebase-admin/firestore';

// Invite doc IDs are emails and registration now looks them up lowercased, so move any invite
// stored under a mixed-case or padded email to its lowercase ID. Invites are global, so the
// second env's run finds nothing left to move.
export default async function ({ db }: { db: Firebase.Firestore; env: string }) {
  const invites = await db.collection('invites').get();
  const ids = new Set(invites.docs.map((doc) => doc.id));
  const toMove = invites.docs.filter((doc) => doc.id !== doc.id.trim().toLowerCase());

  // Two writes per invite, so 200 invites stay under the 500-operation batch limit.
  for (let i = 0; i < toMove.length; i += 200) {
    const batch = db.batch();
    for (const doc of toMove.slice(i, i + 200)) {
      const id = doc.id.trim().toLowerCase();
      const target = db.collection('invites').doc(id);
      if (ids.has(id)) {
        // Both spellings exist: keep the lowercase doc, registered if either one was.
        if (doc.get('registered') === true) batch.update(target, { registered: true });
      } else {
        // manualInviteRequestId makes sendEmailInvite email the person again on create.
        const data = doc.data();
        delete data.manualInviteRequestId;
        batch.set(target, { ...data, registered: data.registered ?? false });
        ids.add(id);
      }
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  console.log(`Moved ${toMove.length} invite(s) to lowercase IDs: ${toMove.map((doc) => doc.id).join(', ')}`);
}
