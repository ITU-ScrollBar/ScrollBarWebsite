import * as Firebase from 'firebase-admin/firestore';
import { MigrationProps } from './migration-runner';

export default async function ({ db, env }: MigrationProps) {
    const usersRef = db.collection(`users`).where('active', '==', false);
    const snapshot = await usersRef.get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
        batch.update(doc.ref, { photoUrl: '' });
    });

    await batch.commit();
}
