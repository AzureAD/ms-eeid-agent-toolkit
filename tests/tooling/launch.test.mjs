import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCases } from '../../scripts/evals/lib/cases.mjs';
import {
  implementationContract, normalizeBundleLoads, verifyImplementation,
} from '../../scripts/evals/lib/eval-verification.mjs';
import { createLaunchAdapter, launchSkills } from '../../scripts/evals/lib/launch-bundle.mjs';
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

test('independent implementation verifier rejects unimplemented or tampered fixtures', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'eeid-verifier-test-'));
  try {
    for (const fixture of ['web-implementation', 'native-implementation']) {
      const workspace = join(parent, fixture);
      await cp(join(root, 'tests', 'evals', 'fixtures', fixture), workspace, { recursive: true });
      const contract = await implementationContract(workspace);
      assert(contract);
      const result = await verifyImplementation(workspace, contract);
      assert.equal(result.passed, false);
      assert(result.checks.some((check) => check.name === 'acceptance-tests' && !check.passed));
      assert.deepEqual(
        JSON.parse(await readFile(join(workspace, '.eval-verification.json'), 'utf8')), result,
      );
      await writeFile(contract.test, '');
      const tampered = await verifyImplementation(workspace, contract);
      assert.equal(tampered.passed, false);
      assert(tampered.checks.some((check) => check.name === 'acceptance-tests-unchanged' && !check.passed));
    }
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
