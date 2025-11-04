import * as Firebase from 'firebase-admin/firestore';

type Tender = {
  uid: string;
  name?: string;
  active: boolean;
  email: string;
  displayName?: string;
  photoUrl?: string;
  isAdmin: boolean;
  roles?: string[];
  studyline?: string;
  teamIds?: string[];
};

export default async function ({ db }: {db: Firebase.Firestore}) {
    const usersRef = db.collection(`users`);
    const snapshot = await usersRef.get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
        const user = doc.data() as Tender;
        if (!user.roles?.includes('regular_access')) {
            batch.update(doc.ref, { photoUrl: '', active: false, displayName: 'Deleted User', email: '', phone: '' });
        }
    });

    await batch.commit();
}
