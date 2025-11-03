import * as Firebase from 'firebase-admin/firestore';

export default async function ({ db }: {db: Firebase.Firestore}) {
    const usersRef = db.collection(`users`).where('active', '==', false);
    const snapshot = await usersRef.get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
        batch.update(doc.ref, { photoUrl: '' });
    });

    await batch.commit();
}
