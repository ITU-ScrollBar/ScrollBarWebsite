import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";

export type MigrationProps = {
  db: Firestore,
  env: string,
}

const serviceAccount =  JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || fs.readFileSync("./.credentials.json", "utf8"));

initializeApp({credential: cert(serviceAccount)});

const db = getFirestore();
const MIGRATION_COLL = "migrations";
const env = process.env.VITE_APP_ENV ?? 'dev';

async function hasRun(id: string) {
  const docSnap = await db.collection(`/env/${env}/${MIGRATION_COLL}`).doc(id).get();
  return docSnap.exists;
}

async function markRun(id: string) {
  await db.collection(`/env/${env}/${MIGRATION_COLL}`).doc(id).set({
    ranAt: FieldValue.serverTimestamp(),
    version: id,
  });
}

async function run() {
  const files = fs.readdirSync("./migrations")
    .filter(f => /^\d+.*\.(js|ts)$/.test(f))
    .sort(); // ensures order 001, 002, ...

  for (const file of files) {
    const id = path.basename(file).replace(/\.(js|ts)$/, '');
    if (await hasRun(id)) {
      console.log(`Skip ${id} (already ran)`);
      continue;
    }
    console.log(`Running ${id}...`);
    const migration = (await import(`./${file}`)).default;
    await migration({ db, env } as MigrationProps); // run migration
    await markRun(id);
    console.log(`Done ${id}`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
