import * as Firebase from 'firebase-admin/firestore';

// Profile pictures in the old bucket were re-encoded to .webp and the originals
// (.jpeg/.png/...) deleted, so users.photoUrl points at files that 404.
// Relink each broken photoUrl to the file with the same base name that still exists.
// The bucket belongs to another project, so use the public Firebase Storage REST API
// (read access is allowed by its rules) instead of the admin SDK.
const OLD_BUCKET = 'scrollweb-cc9b4.appspot.com';
const API = `https://firebasestorage.googleapis.com/v0/b/${OLD_BUCKET}/o`;

const getJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const listProfilePictures = async (): Promise<string[]> => {
  const names: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ prefix: 'profile_pictures/', delimiter: '/', maxResults: '1000' });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await getJson(`${API}?${params}`);
    names.push(...(data.items ?? []).map((i: { name: string }) => i.name));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return names;
};

const baseName = (path: string) => path.slice(0, path.lastIndexOf('.')).toLowerCase();

export default async function ({ db }: { db: Firebase.Firestore; env: string }) {
  const existing = await listProfilePictures();
  const existingSet = new Set(existing);
  const byBase = new Map<string, string>();
  for (const name of existing) {
    // Prefer the re-encoded .webp when several files share a base name.
    if (!byBase.has(baseName(name)) || name.endsWith('.webp')) byBase.set(baseName(name), name);
  }

  const users = await db.collection('users').get();
  const updates: Array<{ ref: Firebase.DocumentReference; photoUrl: string }> = [];
  const unmatched: string[] = [];

  for (const doc of users.docs) {
    const photoUrl: unknown = doc.get('photoUrl');
    if (typeof photoUrl !== 'string' || !photoUrl.includes(`/b/${OLD_BUCKET}/o/`)) continue;

    const path = decodeURIComponent(photoUrl.split('/o/')[1].split('?')[0]);
    if (existingSet.has(path)) continue; // still valid (or already relinked)

    const replacement = byBase.get(baseName(path));
    if (!replacement) {
      unmatched.push(path);
      continue;
    }

    const meta = await getJson(`${API}/${encodeURIComponent(replacement)}`);
    const token = meta.downloadTokens?.split(',')[0];
    if (!token) {
      unmatched.push(path);
      continue;
    }
    updates.push({
      ref: doc.ref,
      photoUrl: `${API}/${encodeURIComponent(replacement)}?alt=media&token=${token}`,
    });
  }

  for (let i = 0; i < updates.length; i += 500) {
    const batch = db.batch();
    updates.slice(i, i + 500).forEach(({ ref, photoUrl }) => batch.update(ref, { photoUrl }));
    await batch.commit();
  }

  console.log(`Relinked ${updates.length} profile pictures.`);
  if (unmatched.length) {
    console.log(`No replacement found for ${unmatched.length} (left unchanged): ${unmatched.join(', ')}`);
  }
}
