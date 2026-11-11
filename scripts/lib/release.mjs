// Shared logic for the release command (scripts/release.mjs), the PR version
// check (scripts/check-release.mjs), and the tag workflow's release notes
// (scripts/release-notes.mjs).
//
// Two kinds of version, kept separate:
//   - the plugin version: plugin.json, copied to .claude-plugin/plugin.json and
//     package.json; one CHANGELOG.md entry per plugin version.
//   - the skill version: metadata.version in each skill's SKILL.md.
// Both are compared with the base branch (normally main), so running the
// command again computes the same result instead of bumping twice.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { layout, repoPath } from './paths.mjs';
import { changelogVersions } from './changelog.mjs';
import { SEMVER, parseSkillFile } from './validate-repo.mjs';

export { changelogEntry, changelogVersions, formatEntry, insertEntry } from './changelog.mjs';

export const LEVELS = ['patch', 'minor', 'major'];

export function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// The ref to compare with: --base if given, else origin/main, else main.
export function resolveBase(root, base) {
  for (const candidate of base ? [base] : ['origin/main', 'main']) {
    try {
      return git(root, 'merge-base', 'HEAD', candidate);
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(base ? `can't find base ${base}.` : "can't find origin/main or main; pass --base <ref>.");
}

export function parseVersion(version) {
  const match = SEMVER.exec(version ?? '');
  if (!match) throw new Error(`not a semantic version: ${version}`);
  return match.slice(1, 4).map(Number);
}

export function compareVersions(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  // A prerelease sorts before its release.
  const [pa, pb] = [a.includes('-'), b.includes('-')];
  return pa === pb ? 0 : pa ? -1 : 1;
}

export function bumpVersion(version, level) {
  const [major, minor, patch] = parseVersion(version);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`level must be one of ${LEVELS.join(', ')}.`);
}

// A file's content at a git ref, or null when it didn't exist there.
function showAt(root, ref, path) {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

// Files changed since `base`: committed, staged, unstaged, and untracked.
export function changedFiles(root, base) {
  const committed = git(root, 'diff', '--name-only', base).split('\n');
  const untracked = git(root, 'ls-files', '--others', '--exclude-standard').split('\n');
  return [...new Set([...committed, ...untracked].filter(Boolean))].sort();
}

function skillVersion(text) {
  return parseSkillFile('skill', text).data?.metadata?.version;
}

// What changed in the plugin since `base`, and each version then and now.
export async function releaseState(root, base) {
  const paths = layout(root);
  const pluginRel = repoPath(paths.pluginDir, root);
  const skillsRel = repoPath(paths.skillsRoot, root);
  // Files the release command writes itself don't make a release necessary.
  const generated = new Set([paths.pluginManifest, paths.claudeManifest, paths.changelog].map((p) => repoPath(p, root)));
  const changed = changedFiles(root, base).filter((file) => file.startsWith(`${pluginRel}/`) && !generated.has(file));
  const skillNames = [...new Set(changed
    .filter((file) => file.startsWith(`${skillsRel}/`))
    .map((file) => file.slice(skillsRel.length + 1).split('/')[0]))].sort();
  const skills = [];
  for (const name of skillNames) {
    const rel = `${skillsRel}/${name}/SKILL.md`;
    const current = await readFile(join(root, rel), 'utf8').catch(() => null);
    if (current === null) continue; // Removed skill.
    const before = showAt(root, base, rel);
    skills.push({ name, path: rel, base: before === null ? null : skillVersion(before), current: skillVersion(current) });
  }
  const pluginJsonRel = repoPath(paths.pluginManifest, root);
  const basePlugin = showAt(root, base, pluginJsonRel);
  const plugin = {
    base: basePlugin === null ? null : JSON.parse(basePlugin).version,
    current: JSON.parse(await readFile(paths.pluginManifest, 'utf8')).version,
  };
  const changelog = await readFile(paths.changelog, 'utf8').catch(() => '');
  const baseChangelog = showAt(root, base, repoPath(paths.changelog, root)) ?? '';
  return { paths, changed, skills, plugin, changelog, baseChangelog };
}

export async function setSkillVersion(file, version) {
  const text = await readFile(file, 'utf8');
  const updated = text.replace(/^(---\r?\n[\s\S]*?\n {2}version:\s*)"?[^"\r\n]*"?(\r?\n)/, `$1"${version}"$2`);
  if (updated === text && skillVersion(text) !== version) throw new Error(`couldn't set the skill version in ${file}.`);
  await writeFile(file, updated);
}

async function updateJson(file, change) {
  const value = JSON.parse(await readFile(file, 'utf8'));
  change(value);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

// Writes the plugin version to plugin.json and copies the shared fields to
// .claude-plugin/plugin.json, package.json, and package-lock.json.
export async function setPluginVersion(root, version) {
  const paths = layout(root);
  let plugin;
  await updateJson(paths.pluginManifest, (value) => {
    value.version = version;
    plugin = value;
  });
  const { $schema, ...claude } = plugin;
  await writeFile(paths.claudeManifest, `${JSON.stringify(claude, null, 2)}\n`);
  await updateJson(paths.packageJson, (value) => {
    value.version = version;
  });
  await updateJson(join(root, 'package-lock.json'), (value) => {
    value.version = version;
    if (value.packages?.['']) value.packages[''].version = version;
  }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

// Problems a PR must fix before merging. Empty when the versions and changelog
// are in order, or when nothing in the plugin folder changed.
export function releaseProblems(state) {
  const problems = [];
  if (!state.changed.length) return problems;
  for (const skill of state.skills) {
    if (skill.base && compareVersions(skill.current, skill.base) <= 0) {
      problems.push(`${skill.name}: the skill version is still ${skill.current}; raise it above ${skill.base}.`);
    }
  }
  if (state.plugin.base && compareVersions(state.plugin.current, state.plugin.base) <= 0) {
    problems.push(`The plugin version is still ${state.plugin.current}; raise it above ${state.plugin.base}.`);
  }
  if (!changelogVersions(state.changelog).includes(state.plugin.current)) {
    problems.push(`CHANGELOG.md has no entry for plugin version ${state.plugin.current}.`);
  }
  return problems;
}
