import { cp, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith('.mjs')) {
      const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (result.error || result.status !== 0) {
        throw new Error(`Module build failed: ${path}\n${result.error?.message ?? result.stderr}`);
      }
    }
  }
}
await check('src');
await cp('src', 'dist', { recursive: true });
console.log('Built BYOUX browser modules and POST ingress into dist.');
