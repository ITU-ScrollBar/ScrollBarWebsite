const fs = require('node:fs');
const path = require('node:path');

// Script to copy types-file from website hosting project to this project

const repoRoot = path.resolve(__dirname, '..', '..');
const srcTypes = path.join(repoRoot, 'src', 'types', 'types-file.ts');
const destDir = path.join(__dirname, '..', 'src', 'types');
const destFile = path.join(destDir, 'types-file.ts');

if (!fs.existsSync(srcTypes)) {
  console.error(`Source types not found: ${srcTypes}`);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(srcTypes, destFile);
