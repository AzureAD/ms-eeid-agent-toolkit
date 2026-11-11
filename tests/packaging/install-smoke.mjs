// npm run test:install: install checks with the agents' own tools, run on PRs.
//   - Claude Code's validator accepts the marketplace catalog and the plugin.
//   - The Skills CLI finds exactly the skills under the plugin folder.
// `npm run validate` covers the rest (manifests, catalogs, skill rules). This
// downloads both tools with npx, so it is separate from `npm test`. The pinned
// versions are updated by hand; pick releases at least 7 days old.
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { layout, repoPath } from '../../scripts/lib/paths.mjs';

const CLAUDE_CODE = '@anthropic-ai/claude-code@2.1.316';
const SKILLS_CLI = 'skills@1.7.5';

const paths = layout();
const env = { ...process.env, DO_NOT_TRACK: '1', DISABLE_TELEMETRY: '1', NO_COLOR: '1', CI: '1' };
let failed = false;

function run(label, args) {
  console.log(`\n> npx ${args.join(' ')}`);
  try {
    const output = execFileSync('npx', ['-y', ...args], { cwd: paths.root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 });
    console.log(output.trim());
    return output;
  } catch (error) {
    console.error(`${label} failed:\n${error.stdout ?? ''}${error.stderr ?? error.message}`);
    failed = true;
    return null;
  }
}

run('Claude Code catalog check', [CLAUDE_CODE, 'plugin', 'validate', '.']);
run('Claude Code plugin check', [CLAUDE_CODE, 'plugin', 'validate', `./${repoPath(paths.pluginDir)}`]);

const expected = (await readdir(paths.skillsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const listing = run('Skills CLI listing', [SKILLS_CLI, 'add', '.', '--list']);
if (listing !== null) {
  // The listing prints "Found <n> skill(s)", then each skill's name on its own line.
  const count = Number(/Found (\d+) skill/.exec(listing)?.[1]);
  const names = listing.split('\n').map((line) => line.replace(/^[\s│|]+/, '').trim());
  const missing = expected.filter((name) => !names.includes(name));
  if (count !== expected.length || missing.length) {
    console.error(`The Skills CLI found ${count} skill(s), missing ${JSON.stringify(missing)}; expected exactly ${JSON.stringify(expected)}.`);
    failed = true;
  } else {
    console.log(`Skills CLI found exactly: ${expected.join(', ')}`);
  }
}

if (failed) process.exitCode = 1;
else console.log('\nInstall checks passed.');
