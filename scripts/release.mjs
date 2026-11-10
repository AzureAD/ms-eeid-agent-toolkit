// npm run release -- <patch|minor|major> --note "<what changed>" [--action "<what earlier users must do>"] [--base <ref>] [--dry-run]
//
// Run before opening a PR that changes the plugin folder. Compared with the
// base branch (origin/main by default), it:
//   1. bumps the skill version of each changed skill,
//   2. bumps the plugin version and copies it to .claude-plugin/plugin.json,
//      package.json, and package-lock.json,
//   3. writes the CHANGELOG.md entry for the new plugin version,
//   4. runs npm run validate and npm test, and prints a summary.
// It doesn't commit, push, or run evals. Running it again gives the same
// result: versions are computed from the base, not from the current files.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './lib/paths.mjs';
import {
  LEVELS, bumpVersion, compareVersions, formatEntry, insertEntry, releaseState, resolveBase,
  setPluginVersion, setSkillVersion,
} from './lib/release.mjs';

const USAGE = 'Usage: npm run release -- <patch|minor|major> --note "<what changed>" [--action "<what earlier users must do>"] [--base <ref>] [--dry-run]';

function parseArgs(argv) {
  const options = { checks: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (LEVELS.includes(arg) && !options.level) options.level = arg;
    else if (['--note', '--action', '--base', '--date'].includes(arg) && argv[i + 1] !== undefined) options[arg.slice(2)] = argv[++i];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-checks') options.checks = false;
    else throw new Error(`unknown argument: ${arg}\n${USAGE}`);
  }
  if (!options.level || !options.note?.trim()) throw new Error(USAGE);
  return options;
}

// The higher of the bumped base version and what the file already says, so a
// version raised by hand (for example to 1.0.0) is kept.
function target(base, current, level) {
  if (!base) return current;
  const bumped = bumpVersion(base, level);
  return compareVersions(current, bumped) > 0 ? current : bumped;
}

export async function release(root, options) {
  const base = resolveBase(root, options.base);
  const state = await releaseState(root, base);
  if (!state.changed.length) {
    return { nothing: true, base };
  }
  const skills = state.skills.map((skill) => ({ ...skill, version: target(skill.base, skill.current, options.level) }));
  const pluginVersion = target(state.plugin.base, state.plugin.current, options.level);
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const entry = formatEntry({ version: pluginVersion, date, note: options.note, action: options.action, skills });
  if (!options.dryRun) {
    for (const skill of skills) {
      if (skill.version !== skill.current) await setSkillVersion(join(root, skill.path), skill.version);
    }
    await setPluginVersion(root, pluginVersion);
    const changelog = await readFile(state.paths.changelog, 'utf8');
    await writeFile(state.paths.changelog, insertEntry(changelog, state.baseChangelog, entry));
  }
  return { base, skills, plugin: { ...state.plugin, version: pluginVersion }, entry };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await release(repoRoot, options);
  if (result.nothing) {
    console.log(`Nothing in the plugin folder changed since ${result.base.slice(0, 12)}; no release needed.`);
    return;
  }
  const verb = options.dryRun ? 'Would set' : 'Set';
  console.log(`Compared with ${result.base.slice(0, 12)}.`);
  console.log(`${verb} plugin version: ${result.plugin.base ?? '(new)'} -> ${result.plugin.version}`);
  for (const skill of result.skills) {
    console.log(`${verb} skill version of ${skill.name}: ${skill.base ?? '(new skill)'} -> ${skill.version}`);
  }
  if (!result.skills.length) console.log('No skill changed; only the plugin version moves.');
  console.log(`\nCHANGELOG.md entry:\n\n${result.entry}`);
  if (options.dryRun) return;
  if (options.checks) {
    for (const script of ['validate', 'test']) {
      console.log(`\n> npm run ${script}`);
      execFileSync('npm', ['run', '--silent', script], { cwd: repoRoot, stdio: 'inherit' });
    }
  }
  console.log('\nDone. Review the changes, then commit them with your PR. Evals are not run by this command.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Release failed: ${error.message}`);
    process.exitCode = 1;
  });
}
