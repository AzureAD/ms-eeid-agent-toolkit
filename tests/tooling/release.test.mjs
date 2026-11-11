// The release command, the PR release check, and changelog handling, run in a
// throwaway git repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  bumpVersion, changelogEntry, compareVersions, insertEntry, releaseProblems, releaseState,
} from '../../scripts/lib/release.mjs';
import { release } from '../../scripts/release.mjs';

const PLUGIN = '.github/plugins/eeid-toolkit';
const SKILL = `${PLUGIN}/skills/eeid-sample/SKILL.md`;

const skill = (version) => `---\nname: eeid-sample\ndescription: Sample.\nlicense: MIT\nmetadata:\n  author: Microsoft\n  status: draft\n  version: "${version}"\n---\n\n# Sample\n`;

async function write(root, path, content) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
}

const read = async (root, path) => readFile(join(root, path), 'utf8');
const readJson = async (root, path) => JSON.parse(await read(root, path));

// A repository whose main branch has plugin version 0.1.0 and skill version
// 0.2.0, with a feature branch checked out.
async function repo() {
  const root = await mkdtemp(join(tmpdir(), 'eeid-release-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  await write(root, `${PLUGIN}/plugin.json`, { $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', name: 'eeid-toolkit', version: '0.1.0', description: 'Sample.', license: 'MIT' });
  await write(root, `${PLUGIN}/.claude-plugin/plugin.json`, { name: 'eeid-toolkit', version: '0.1.0', description: 'Sample.', license: 'MIT' });
  await write(root, 'package.json', { name: 'sample', version: '0.1.0' });
  await write(root, 'package-lock.json', { name: 'sample', version: '0.1.0', packages: { '': { name: 'sample', version: '0.1.0' } } });
  await write(root, `${PLUGIN}/CHANGELOG.md`, '# Changelog\n\nIntro text.\n\nNo version has been released yet.\n');
  await write(root, SKILL, skill('0.2.0'));
  await write(root, `${PLUGIN}/skills/eeid-sample/references/notes.md`, 'Notes.\n');
  await write(root, 'scripts/tool.mjs', '// tool\n');
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '--allow-empty', '-m', 'empty');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'base');
  git('switch', '-q', '-c', 'feature');
  return root;
}

const OPTIONS = { base: 'main', date: '2026-01-02', note: 'Fix wording.' };

test('version helpers', () => {
  assert.equal(bumpVersion('0.2.4', 'patch'), '0.2.5');
  assert.equal(bumpVersion('0.2.4', 'minor'), '0.3.0');
  assert.equal(bumpVersion('0.2.4', 'major'), '1.0.0');
  assert.equal(bumpVersion('1.0.0-beta.1', 'patch'), '1.0.1');
  assert.ok(compareVersions('1.0.0', '1.0.0-beta') > 0);
  assert.ok(compareVersions('0.10.0', '0.9.9') > 0);
});

test('a changed skill: bumps its skill version and the plugin version, syncs manifests, writes one changelog entry', async () => {
  const root = await repo();
  try {
    await write(root, `${PLUGIN}/skills/eeid-sample/references/notes.md`, 'Better notes.\n');
    const state = await releaseState(root, 'main');
    assert.deepEqual(releaseProblems(state), [
      'eeid-sample: the skill version is still 0.2.0; raise it above 0.2.0.',
      'The plugin version is still 0.1.0; raise it above 0.1.0.',
      'CHANGELOG.md has no entry for plugin version 0.1.0.',
    ]);

    await release(root, { ...OPTIONS, level: 'patch' });
    assert.match(await read(root, SKILL), /\n {2}version: "0\.2\.1"\n/);
    for (const file of [`${PLUGIN}/plugin.json`, `${PLUGIN}/.claude-plugin/plugin.json`, 'package.json']) {
      assert.equal((await readJson(root, file)).version, '0.1.1', file);
    }
    assert.equal((await readJson(root, 'package-lock.json')).packages[''].version, '0.1.1');
    assert.equal((await readJson(root, `${PLUGIN}/.claude-plugin/plugin.json`)).$schema, undefined);
    const changelog = await read(root, `${PLUGIN}/CHANGELOG.md`);
    assert.equal(changelog, '# Changelog\n\nIntro text.\n\n## 0.1.1 - 2026-01-02\n\nFix wording.\n\n| Skill | Skill version |\n| --- | --- |\n| `eeid-sample` | 0.2.1 |\n');
    assert.deepEqual(releaseProblems(await releaseState(root, 'main')), []);

    // Running it again changes nothing.
    await release(root, { ...OPTIONS, level: 'patch' });
    assert.equal(await read(root, `${PLUGIN}/CHANGELOG.md`), changelog);
    assert.equal((await readJson(root, `${PLUGIN}/plugin.json`)).version, '0.1.1');

    // A different level or note replaces this branch's entry instead of adding one.
    await release(root, { ...OPTIONS, level: 'minor', note: 'New flow.', action: 'Restart open plans.' });
    const updated = await read(root, `${PLUGIN}/CHANGELOG.md`);
    assert.equal((updated.match(/^## /gm) ?? []).length, 1);
    assert.match(updated, /## 0\.2\.0 - 2026-01-02\n\nNew flow\.\n\n\*\*Action needed for work done with an earlier version:\*\* Restart open plans\./);
    assert.match(await read(root, SKILL), /version: "0\.3\.0"/);
    assert.equal(changelogEntry(updated, '0.2.0').split('\n')[0], 'New flow.');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a skill version raised by hand is kept', async () => {
  const root = await repo();
  try {
    await write(root, SKILL, skill('1.0.0'));
    const result = await release(root, { ...OPTIONS, level: 'patch' });
    assert.equal(result.skills[0].version, '1.0.0');
    assert.match(await read(root, SKILL), /version: "1\.0\.0"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('changes outside the plugin folder need no release', async () => {
  const root = await repo();
  try {
    await write(root, 'scripts/tool.mjs', '// changed\n');
    const state = await releaseState(root, 'main');
    assert.deepEqual(state.changed, []);
    assert.deepEqual(releaseProblems(state), []);
    assert.equal((await release(root, { ...OPTIONS, level: 'patch' })).nothing, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a new skill keeps its starting skill version; the plugin version still moves', async () => {
  const root = await repo();
  try {
    await write(root, `${PLUGIN}/skills/eeid-new/SKILL.md`, skill('0.1.0').replace('eeid-sample', 'eeid-new'));
    const result = await release(root, { ...OPTIONS, level: 'minor', note: 'Add eeid-new.' });
    assert.deepEqual(result.skills.map((s) => [s.name, s.base, s.version]), [['eeid-new', null, '0.1.0']]);
    assert.equal(result.plugin.version, '0.2.0');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('overlapping PRs: after merging main and taking its versions, the command moves past them', async () => {
  const root = await repo();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: root, stdio: 'ignore' });
  try {
    // Another PR released plugin version 0.1.1 to main first.
    git('switch', '-q', 'main');
    await write(root, `${PLUGIN}/skills/eeid-sample/references/notes.md`, 'Main notes.\n');
    await release(root, { ...OPTIONS, level: 'patch', note: 'Other PR.' });
    git('commit', '-q', '-am', 'other PR');
    // This branch also released 0.1.1.
    git('switch', '-q', 'feature');
    await write(root, `${PLUGIN}/skills/eeid-sample/references/extra.md`, 'Extra.\n');
    await release(root, { ...OPTIONS, level: 'patch', note: 'This PR.' });
    git('add', '-A');
    git('commit', '-q', '-m', 'this PR');
    // Merge main, taking main's side for the conflicting release files.
    try {
      git('merge', '-q', 'main');
    } catch {
      git('checkout', '--theirs', '--', '.');
      git('add', '-A');
      git('commit', '-q', '--no-edit');
    }
    const result = await release(root, { ...OPTIONS, level: 'patch', note: 'This PR.' });
    assert.equal(result.plugin.version, '0.1.2');
    assert.equal(result.skills[0].version, '0.2.2');
    const changelog = await read(root, `${PLUGIN}/CHANGELOG.md`);
    assert.deepEqual(changelog.match(/^## \S+/gm), ['## 0.1.2', '## 0.1.1']);
    assert.equal(changelogEntry(changelog, '0.1.1').split('\n')[0], 'Other PR.');
    assert.deepEqual(releaseProblems(await releaseState(root, 'main')), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('insertEntry keeps entries already on the base branch', () => {
  const base = '# Changelog\n\nIntro.\n\n## 0.1.0 - 2026-01-01\n\nFirst.\n';
  const branch = '# Changelog\n\nIntro.\n\n## 0.1.1 - 2026-01-02\n\nOld note.\n\n## 0.1.0 - 2026-01-01\n\nFirst.\n';
  assert.equal(insertEntry(branch, base, '## 0.2.0 - 2026-01-03\n\nNew note.\n'),
    '# Changelog\n\nIntro.\n\n## 0.2.0 - 2026-01-03\n\nNew note.\n\n## 0.1.0 - 2026-01-01\n\nFirst.\n');
});
