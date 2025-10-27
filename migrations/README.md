# Migrations

This folder allows NoSQL migrations to be run on deployment.
It is important to note the following requirements on migrations:

1. Each migration file should export a default function (`export default async function ({ db }) { ... }`)

2. Idempotency - Each migration should only be run once against an environment. Thus, do not manually 

3. Collection `__migrations__` in Firestore will keep track of which migrations have already been executed. Be careful if manipulating these records.

4. Naming convention - All migrations should follow format `<version_number>-<title>.<ts|js>`. Version numbers are 3 digits with leading 0s. Title is a short description of the intent of the migration and then the migration should be Typescript or Javascript (preferably Typescript for type safety). This ensures migrations are run in the correct order and are easy to read. The file-name is how we check if the migration has already run or not, so do not rename the file after the migration has already been executed on any environment. If the file does not match the correct naming, it will not be executed properly.

5. Commit as batches, i.e. `let bach = db.batch()`. Batches should not change more than 500 documents at once. If so, please split it into multiple batches