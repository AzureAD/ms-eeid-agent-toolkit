// node scripts/release-notes.mjs <plugin version>
// Prints that version's CHANGELOG.md entry, for the GitHub Release the tag
// workflow creates. Exits 1 when there is no entry.
import { readFile } from 'node:fs/promises';
import { layout } from './lib/paths.mjs';
import { changelogEntry } from './lib/changelog.mjs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <plugin version>');
  process.exit(1);
}
const entry = changelogEntry(await readFile(layout().changelog, 'utf8'), version);
if (!entry) {
  console.error(`CHANGELOG.md has no entry for ${version}.`);
  process.exit(1);
}
console.log(entry);
