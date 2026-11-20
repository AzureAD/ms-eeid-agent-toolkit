import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadCases } from '../../scripts/evals/lib/cases.mjs';
import { gradeRun } from '../../scripts/evals/lib/graders.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const suite = join(root, 'tests', 'evals', 'eeid-implement-byoux');

test('BYOUX implementation case loads with scaffold and required command graders', async () => {
  const cases = await loadCases(suite);
  assert.equal(cases.length, 18);
  const entry = cases.find((candidate) => candidate.name === 'byoux-behavior-implement');
  assert(entry);
  assert.equal(entry.scaffoldScript, join(entry.directory, 'scaffold.sh'));
  assert.match(await readFile(entry.scaffoldScript, 'utf8'), /seed-fixture\.mjs" byoux-implementation/);
  const commandGraders = entry.graders.filter((grader) => grader.type === 'tool_used' && grader.tool === 'Bash');
  const run = { transcript: { tools: [] } };
  const missing = await gradeRun(commandGraders, run);
  assert.deepEqual(missing.results.filter((result) => !result.passed).map((result) => result.name),
    ['build-executed', 'tests-executed', 'browser-executed']);
  for (const command of [
    'npm run build && npm test && npm run test:browser',
    'npm.cmd run build; npm.cmd test; npm.cmd run test:browser',
  ]) {
    run.transcript.tools = [{ name: 'Bash', input: { command } }];
    assert.equal((await gradeRun(commandGraders, run)).score, 1);
  }
  run.transcript.tools = [{ name: 'Bash', input: { command: 'npm run build && npm test' } }];
  const missingBrowser = await gradeRun(commandGraders, run);
  assert.deepEqual(missingBrowser.results.filter((result) => !result.passed).map((result) => result.name),
    ['browser-executed']);
});

test('BYOUX seeder creates a clean baseline and stubs fail acceptance without changing tests', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'eeid-byoux-fixture-'));
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;
  const run = (...args) => spawnSync(args[0], args.slice(1), {
    cwd: workspace, encoding: 'utf8', timeout: 30000, env: environment,
  });
  try {
    const seeded = run(process.execPath, join(root, 'tests', 'evals', 'scripts', 'seed-fixture.mjs'), 'byoux-implementation');
    assert.equal(seeded.status, 0, seeded.error?.message ?? seeded.stderr);
    assert.equal(run('git', 'status', '--porcelain').stdout, '');
    const browserTests = await readFile(join(workspace, 'tests', 'journeys.browser.test.mjs'), 'utf8');
    const built = run(process.execPath, 'scripts/build.mjs');
    assert.equal(built.status, 0, built.error?.message ?? built.stderr);
    const acceptance = run(process.execPath, '--test', 'tests/handoff.test.mjs');
    assert.equal(acceptance.status, 1);
    assert.match(acceptance.stdout, /BYOUX POST validation is not implemented/);
    assert.match(acceptance.stdout, /not ok.*manual user-flow plan/);
    const syntax = run(process.execPath, '--check', 'tests/journeys.browser.test.mjs');
    assert.equal(syntax.status, 0, syntax.stderr);
    assert.equal(await readFile(join(workspace, 'tests', 'journeys.browser.test.mjs'), 'utf8'), browserTests);
    assert.equal(run('git', 'status', '--porcelain').stdout, '', 'Build outputs must be ignored');
    const repeat = run(process.execPath, join(root, 'tests', 'evals', 'scripts', 'seed-fixture.mjs'), 'byoux-implementation');
    assert.equal(repeat.status, 1);
    assert.match(repeat.stderr, /must be empty/);
  } finally { await rm(workspace, { recursive: true, force: true }); }
});
