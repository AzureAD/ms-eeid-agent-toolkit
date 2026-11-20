import { cp, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [fixture, ...extra] = process.argv.slice(2);
if (!['server', 'react', 'web-implementation', 'native-implementation', 'byoux-implementation'].includes(fixture) || extra.length) {
  throw new Error('Usage: node seed-fixture.mjs <server|react|web-implementation|native-implementation|byoux-implementation>');
}
const workspace = process.cwd();
if ((await readdir(workspace)).length) {
  throw new Error('The eval workspace must be empty before seeding.');
}
const source = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', fixture);
for (const name of await readdir(source)) {
  await cp(join(source, name), join(workspace, name), {
    recursive: true, force: false, errorOnExist: true,
  });
}

for (const args of [
  ['init', '--quiet'],
  ['add', '--all'],
  ['-c', 'user.name=EEID Eval', '-c', 'user.email=eval@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
    'commit', '--quiet', '-m', 'Seed synthetic authentication fixture'],
]) {
  const result = spawnSync('git', args, { cwd: workspace, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(`Fixture Git baseline failed: ${result.error?.message ?? result.stderr}`);
  }
}
