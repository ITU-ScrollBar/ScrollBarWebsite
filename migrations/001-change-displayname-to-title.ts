import * as Firebase from 'firebase-admin/firestore';

export default async function ({ db }: { db: Firebase.Firestore; }) {
    const env = process.env.VITE_APP_ENV || 'development';
    const eventsRef = db.collection(`env/${env}/events`);
    const snapshot = await eventsRef.get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
        const data = doc.data();
        batch.update(doc.ref, { title: data.displayName });
    });

    await batch.commit();
}
