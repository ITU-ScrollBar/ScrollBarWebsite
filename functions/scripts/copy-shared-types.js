const fs = require('node:fs');
const path = require('node:path');

// Script to copy the shared type files from website hosting project to this project

const repoRoot = path.resolve(__dirname, '..', '..');
const srcDir = path.join(repoRoot, 'src', 'types');
const destDir = path.join(__dirname, '..', 'src', 'types');
const sharedFiles = ['types-file.ts', 'drinkRecipe.ts'];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const file of sharedFiles) {
  const srcFile = path.join(srcDir, file);

  if (!fs.existsSync(srcFile)) {
    console.error(`Source types not found: ${srcFile}`);
    process.exit(1);
  }

  fs.copyFileSync(srcFile, path.join(destDir, file));
}
