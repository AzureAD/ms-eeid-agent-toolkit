import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCases } from '../../scripts/evals/lib/cases.mjs';
import { gradeRun } from '../../scripts/evals/lib/graders.mjs';
import {
  createLaunchAdapter, launchSkills, normalizeBundleLoads,
} from '../../scripts/evals/lib/launch-bundle.mjs';
import { skillsRoot } from '../../scripts/lib/paths.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test('launch suites load all cases and compile their regex graders', async () => {
  for (const [skill, count] of [
    ['eeid-onboarding', 8],
    ['eeid-implement-hosted-auth', 6],
    ['eeid-implement-native-auth', 8],
  ]) {
    const cases = await loadCases(join(root, 'tests', 'evals', skill));
    assert.equal(cases.length, count, skill);
    for (const testCase of cases) {
      for (const grader of testCase.graders) {
        if (grader.type === 'regex') {
          assert.doesNotThrow(() => new RegExp(grader.pattern), `${testCase.name}/${grader.name}`);
        }
      }
    }
  }
});

test('Windows sibling reads count as bundle loads, not arbitrary skill-name mentions', () => {
  const transcript = {
    tools: [{
      name: 'Read',
      input: { file_path: String.raw`C:\test\skills\eeid-implement-native-auth\SKILL.md` },
    }],
  };
  normalizeBundleLoads(transcript, launchSkills);
  normalizeBundleLoads(transcript, launchSkills);
  assert.equal(transcript.tools.filter((call) => call.name === 'Skill').length, 1);
  const unrelated = {
    tools: [{ name: 'Read', input: { file_path: 'eeid-implement-native-auth-notes.md' } }],
  };
  normalizeBundleLoads(unrelated, launchSkills);
  assert.equal(unrelated.tools.length, 1);
});

test('launch preparation installs only the bundle and leaves the baseline empty', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'eeid-launch-test-'));
  const home = join(parent, 'home');
  const prepare = async (settings) => {
    await rm(home, { recursive: true, force: true });
    await mkdir(join(home, 'skills'), { recursive: true });
    if (settings.withSkill) {
      await cp(join(skillsRoot, settings.skillName), join(home, 'skills', settings.skillName), {
        recursive: true,
      });
    }
  };
  try {
    const adapter = createLaunchAdapter({ name: 'fake', prepare }, { skillsRoot, home });
    await adapter.prepare({ skillName: 'eeid-onboarding', withSkill: true });
    assert.deepEqual((await readdir(join(home, 'skills'))).sort(), [...launchSkills].sort());
    await adapter.prepare({ skillName: 'eeid-onboarding', withSkill: false });
    assert.deepEqual(await readdir(join(home, 'skills')), []);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('launch runs return agent evidence without rerunning implementation checks', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'eeid-launch-run-test-'));
  try {
    for (const fixture of ['web-implementation', 'native-implementation']) {
      const workspace = join(parent, fixture);
      await cp(join(root, 'tests', 'evals', 'fixtures', fixture), workspace, { recursive: true });
      const testPath = join(workspace, 'tests', 'auth.test.mjs');
      const originalTests = await readFile(testPath, 'utf8');
      const evidence = { transcript: { tools: [], events: [], finalMessage: 'Not implemented' } };
      const adapter = createLaunchAdapter({
        name: 'fake',
        async run(settings) {
          assert.equal(settings.workspace, workspace);
          return evidence;
        },
      }, { skillsRoot, home: parent });
      assert.equal(await adapter.run({ workspace }), evidence);
      assert.equal(await readFile(testPath, 'utf8'), originalTests);
      await assert.rejects(readFile(join(workspace, '.eval-verification.json')), { code: 'ENOENT' });
    }
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('implementation graders require build and test calls without verifier artifacts', async () => {
  for (const skill of ['eeid-implement-hosted-auth', 'eeid-implement-native-auth']) {
    const cases = await loadCases(join(root, 'tests', 'evals', skill));
    const testCase = cases.find((entry) => entry.name.endsWith('-behavior-implement'));
    const tools = [
      { name: 'Skill', input: { skill } },
      { name: 'Bash', input: { command: 'npm run build && npm test' } },
    ];
    const run = {
      workspace: join(root, 'tests', 'evals', 'fixtures',
        skill === 'eeid-implement-hosted-auth' ? 'web-implementation' : 'native-implementation'),
      createdFiles: [],
      transcript: { tools, events: [{ output: 'build passed; tests passed' }], finalMessage: 'Done' },
    };
    const judge = async () => true;
    const passed = await gradeRun(testCase.graders, run, { judge });
    assert.equal(passed.score, 1);
    run.transcript.tools = tools.filter((call) => call.name !== 'Bash');
    const missingCommands = await gradeRun(testCase.graders, run, { judge });
    assert.deepEqual(
      missingCommands.results.filter((result) => !result.passed).map((result) => result.name),
      ['build-executed', 'tests-executed'],
    );
  }
});
