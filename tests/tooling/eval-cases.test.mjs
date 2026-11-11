// Checks the native auth migration eval cases themselves: generated graders
// are up to date, and the plan-template and file-comparison graders give the
// right verdicts on real files. No model is called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCases } from '../../scripts/evals/lib/cases.mjs';
import { gradeRun } from '../../scripts/evals/lib/graders.mjs';
import { createWorkspace } from '../../scripts/evals/lib/workspace.mjs';
import { skillsRoot } from '../../scripts/lib/paths.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const evalDir = join(root, 'tests/evals/eeid-native-auth-migrate-v2');
const cases = await loadCases(evalDir);
const byName = new Map(cases.map((testCase) => [testCase.name, testCase]));
const emptyTranscript = { finalMessage: '', tools: [], events: [] };

function graders(caseName, prefix) {
  return byName.get(caseName).graders.filter((grader) => grader.name.startsWith(prefix));
}

async function grade(list, workspace, createdFiles = []) {
  const { results } = await gradeRun(list, { workspace, createdFiles, transcript: emptyTranscript });
  return Object.fromEntries(results.map((result) => [result.name, result]));
}

// A workspace the way a full-migration case starts: the fixture committed and
// the seeded plan written.
async function seededWorkspace(caseName) {
  const workspace = await createWorkspace(byName.get(caseName));
  return workspace;
}

test('generated graders are up to date', () => {
  const result = spawnSync(process.execPath, [join(evalDir, 'scripts/generate-graders.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('every grader file parses and every regex compiles', () => {
  assert.ok(cases.length >= 18);
  for (const testCase of cases) {
    for (const grader of testCase.graders) {
      if (grader.type === 'regex') assert.doesNotThrow(() => new RegExp(grader.pattern), `${testCase.name}/${grader.name}`);
    }
  }
});

test('a seeded plan passes the plan-template graders of the matching plan case', async () => {
  for (const [caseName, planCase] of [
    ['api-migrate-sign-in-sspr', 'api-plan-sign-in-sspr'],
    ['api-migrate-all-flows', 'api-plan-all-flows'],
    ['sdk-js-migrate-all-flows', 'sdk-js-plan-all-flows'],
  ]) {
    const workspace = await seededWorkspace(caseName);
    try {
      const results = await grade(graders(planCase, 'gen-plan-'), workspace.workspace);
      for (const [name, result] of Object.entries(results)) assert.equal(result.passed, true, `${planCase}/${name}: ${result.detail}`);
    } finally {
      await workspace.dispose();
    }
  }
});

test('the plan-template graders catch a missing field, a missing section, a placeholder, and a wrong scope table', async () => {
  const workspace = await seededWorkspace('api-migrate-sign-in-sspr');
  try {
    const planPath = join(workspace.workspace, '.native-auth-v2-migration/plan.md');
    const plan = await readFile(planPath, 'utf8');
    await writeFile(planPath, plan
      .replace(/\nvalidation-baseline:[^\n]*/, '')
      .replace('## 4. Coexistence notes', '## Coexistence')
      .replace('| Migrate now | sign-in, sspr |', '| Migrate now | <sign-in, sspr> |')
      .replace(/(\| sspr \| email OTP[^\n]*\| )Migrate( \|)/, '$1Defer$2'));
    const results = await grade(graders('api-plan-sign-in-sspr', 'gen-plan-'), workspace.workspace);
    assert.equal(results['gen-plan-template-fields'].passed, false);
    assert.equal(results['gen-plan-template-sections'].passed, false);
    assert.equal(results['gen-plan-no-template-placeholders'].passed, false);
    assert.equal(results['gen-plan-scope-table-sspr'].passed, false);
    assert.equal(results['gen-plan-scope-table-sign-in'].passed, true);
  } finally {
    await workspace.dispose();
  }
});

test('file graders compare each fixture file with the plan, whatever tool changed it', async () => {
  const workspace = await seededWorkspace('api-migrate-sign-in-sspr');
  const fileGraders = graders('api-migrate-sign-in-sspr', 'gen-file');
  try {
    // Before the migration: unchanged files pass, planned changes fail.
    let results = await grade(fileGraders, workspace.workspace, await workspace.createdFiles());
    assert.equal(results['gen-file-unchanged-src-auth-signup-js'].passed, true);
    assert.equal(results['gen-file-unchanged-src-auth-tokenstore-js'].passed, true);
    assert.equal(results['gen-file-changed-src-auth-signin-js'].passed, false);
    assert.equal(results['gen-file-new-src-api-nativeauthv2client-js'].passed, false);
    assert.equal(results['gen-files-no-unplanned-new-files'].passed, true);

    // A shell-style edit of every planned file, the planned new files, a new
    // test, the report, and two mistakes: a deferred file touched and an
    // unplanned new file.
    const ws = workspace.workspace;
    for (const path of ['cors.js', 'src/config.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/resetPassword.js',
      'test/mockFetch.js', 'test/signIn.test.js', 'test/resetPassword.test.js']) {
      await appendFile(join(ws, path), '\n// migrated\n');
    }
    await writeFile(join(ws, 'src/api/nativeAuthV2Client.js'), '// V2\n');
    await writeFile(join(ws, 'test/nativeAuthV2Client.test.js'), '// tests\n');
    await writeFile(join(ws, 'test/extra.test.js'), '// more tests\n');
    await writeFile(join(ws, '.native-auth-v2-migration/report.md'), '# report\n');
    await appendFile(join(ws, 'src/auth/signUp.js'), ' ');
    await mkdir(join(ws, 'src/lib'), { recursive: true });
    await writeFile(join(ws, 'src/lib/helpers.js'), '// unplanned\n');

    results = await grade(fileGraders, ws, await workspace.createdFiles());
    for (const [name, result] of Object.entries(results)) {
      if (name.startsWith('gen-file-changed-') || name.startsWith('gen-file-new-')) assert.equal(result.passed, true, name);
    }
    assert.equal(results['gen-file-unchanged-src-auth-signup-js'].passed, false, 'a whitespace edit to a deferred file is caught');
    assert.equal(results['gen-file-unchanged-src-auth-tokenstore-js'].passed, true);
    assert.equal(results['gen-files-no-unplanned-new-files'].passed, false, 'src/lib/helpers.js is not in the plan');

    execFileSync('git', ['checkout', '--', 'src/auth/signUp.js'], { cwd: ws });
    await rm(join(ws, 'src/lib'), { recursive: true });
    results = await grade(fileGraders, ws, await workspace.createdFiles());
    for (const [name, result] of Object.entries(results)) assert.equal(result.passed, true, `${name}: ${result.detail}`);
  } finally {
    await workspace.dispose();
  }
});

test('the full-migration cases are behavior cases, run once, and seed an unapproved plan', async () => {
  for (const name of ['api-migrate-sign-in-sspr', 'api-migrate-all-flows', 'sdk-js-migrate-sign-in-sspr', 'sdk-js-migrate-all-flows']) {
    const testCase = byName.get(name);
    assert.deepEqual(testCase.tags, ['behavior']);
    assert.equal(testCase.runs, 1);
    const workspace = await seededWorkspace(name);
    try {
      const plan = await readFile(join(workspace.workspace, '.native-auth-v2-migration/plan.md'), 'utf8');
      assert.match(plan, /\nstatus: draft\b/);
      assert.match(plan, /\napproved: null\b/);
      assert.doesNotMatch(plan, /\{\{/);
    } finally {
      await workspace.dispose();
    }
  }
});

test('report-template graders pass on a report built from the template, and match sections by number and first word', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eval-report-'));
  try {
    const template = await readFile(join(skillsRoot, 'eeid-native-auth-migrate-v2/assets/report-template.md'), 'utf8');
    const filled = template.replace(/<[^<>\n]+>/g, 'filled');
    await mkdir(join(dir, '.native-auth-v2-migration'), { recursive: true });
    await writeFile(join(dir, '.native-auth-v2-migration/report.md'), filled);
    let results = await grade(graders('api-migrate-all-flows', 'gen-report-'), dir);
    for (const [name, result] of Object.entries(results)) assert.equal(result.passed, true, `${name}: ${result.detail}`);
    // A reworded title still counts; a missing section doesn't.
    const reworded = filled.replace('## 5. Behavior changes and known limitations', '## 5. Behavior changes and limitations');
    await writeFile(join(dir, '.native-auth-v2-migration/report.md'), reworded);
    results = await grade(graders('api-migrate-all-flows', 'gen-report-template-sections'), dir);
    assert.equal(results['gen-report-template-sections'].passed, true);
    await writeFile(join(dir, '.native-auth-v2-migration/report.md'), reworded.replace('## 8. Security review', '## Security'));
    results = await grade(graders('api-migrate-all-flows', 'gen-report-template-sections'), dir);
    assert.equal(results['gen-report-template-sections'].passed, false);

    await writeFile(join(dir, '.native-auth-v2-migration/report.md'), template);
    results = await grade(graders('api-migrate-all-flows', 'gen-report-'), dir);
    assert.equal(results['gen-report-no-template-placeholders'].passed, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('SDK file graders follow the seeded plan: V1 sign-up untouched, lockfile allowed', async () => {
  const workspace = await seededWorkspace('sdk-js-migrate-sign-in-sspr');
  const fileGraders = graders('sdk-js-migrate-sign-in-sspr', 'gen-file');
  try {
    const ws = workspace.workspace;
    let results = await grade(fileGraders, ws, await workspace.createdFiles());
    assert.equal(results['gen-file-changed-package-json'].passed, false);
    assert.equal(results['gen-file-unchanged-src-auth-signup-js'].passed, true);

    for (const path of ['package.json', 'cors.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/resetPassword.js',
      'test/fakeSdk.js', 'test/signIn.test.js', 'test/resetPassword.test.js']) {
      await appendFile(join(ws, path), '\n// migrated\n');
    }
    await writeFile(join(ws, 'package-lock.json'), '{}\n');
    await writeFile(join(ws, '.native-auth-v2-migration/report.md'), '# report\n');
    results = await grade(fileGraders, ws, await workspace.createdFiles());
    for (const [name, result] of Object.entries(results)) assert.equal(result.passed, true, `${name}: ${result.detail}`);

    await appendFile(join(ws, 'src/config.js'), '\n');
    await writeFile(join(ws, 'src/auth/signInV2.js'), '// unplanned\n');
    results = await grade(fileGraders, ws, await workspace.createdFiles());
    assert.equal(results['gen-file-unchanged-src-config-js'].passed, false, 'sign-up stays on V1, so the config keeps challengeTypes');
    assert.equal(results['gen-files-no-unplanned-new-files'].passed, false);
  } finally {
    await workspace.dispose();
  }
});

test('SDK migration graders: V1 start calls, a password at start, and the pinned version', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eval-sdk-'));
  const list = byName.get('sdk-js-migrate-all-flows').graders.filter((g) => /^(?:v1-gone-sign-in|v2-sign-in-no-password-at-start|v2-sdk-version-minimum)$/.test(g.name));
  try {
    await mkdir(join(dir, 'src/auth'), { recursive: true });
    await writeFile(join(dir, 'package.json'), '{ "dependencies": { "@azure/msal-browser": "^5.20.0" } }');
    await writeFile(join(dir, 'src/auth/signIn.js'), 'app.signIn({ username, password });\napp.signInV2({ username, password, scopes });');
    let results = await grade(list, dir);
    for (const name of ['v1-gone-sign-in', 'v2-sign-in-no-password-at-start', 'v2-sdk-version-minimum']) assert.equal(results[name].passed, false, name);

    await writeFile(join(dir, 'package.json'), '{ "dependencies": { "@azure/msal-browser": "^5.31.2" } }');
    await writeFile(join(dir, 'src/auth/signIn.js'), 'const r = await app.signInV2({ username, scopes: SCOPES });\nawait r.state.submitPassword(password);');
    results = await grade(list, dir);
    for (const [name, result] of Object.entries(results)) assert.equal(result.passed, true, `${name}: ${result.detail}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('open-decision approval case: the seeded workspace passes, an applied approval fails', async () => {
  const name = 'api-plan-approve-with-open-decision';
  const workspace = await seededWorkspace(name);
  const fileChecks = byName.get(name).graders.filter((grader) =>
    grader.name.startsWith('gen-') || ['plan-still-draft', 'plan-not-approved', 'decision-still-open'].includes(grader.name));
  try {
    // As seeded (what a correct run leaves behind): every check passes.
    let results = await grade(fileChecks, workspace.workspace, await workspace.createdFiles());
    for (const [check, result] of Object.entries(results)) assert.equal(result.passed, true, `${check}: ${result.detail}`);
    assert.ok(!Object.keys(results).some((check) => check.startsWith('gen-report-')), 'no report checks for a case that stops before applying');

    // A run that approved anyway and started changing code fails.
    const planPath = join(workspace.workspace, '.native-auth-v2-migration/plan.md');
    const plan = await readFile(planPath, 'utf8');
    await writeFile(planPath, plan
      .replace(/\nstatus: draft\b/, '\nstatus: applying')
      .replace(/\napproved: null\b/, '\napproved: { revision: 1, date: 2026-11-07, how: confirmed in chat }')
      .replace('- [ ] Production proxy', '- [x] Production proxy'));
    await appendFile(join(workspace.workspace, 'src/config.js'), '\n// V2\n');
    await writeFile(join(workspace.workspace, 'test/extra.test.js'), '// new test\n');
    results = await grade(fileChecks, workspace.workspace, await workspace.createdFiles());
    for (const check of ['plan-still-draft', 'plan-not-approved', 'decision-still-open', 'gen-file-unchanged-src-config-js', 'gen-files-no-unplanned-new-files']) {
      assert.equal(results[check].passed, false, check);
    }
  } finally {
    await workspace.dispose();
  }
});

test('iOS plan graders: the plan must move MSAL to the V2 minimum or later', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eval-ios-'));
  const check = graders('sdk-ios-plan-all-flows', 'plan-sdk-version');
  try {
    await mkdir(join(dir, '.native-auth-v2-migration'), { recursive: true });
    const planPath = join(dir, '.native-auth-v2-migration/plan.md');
    for (const [text, expected] of [
      ['MSAL `~> 2.16` (2.16.1) → latest 2.x (at least the minimum)', true],
      ['Upgrade MSAL from 2.16.1 to 2.18.1', true],
      ['Upgrade MSAL from 2.16.1 to 2.20.0', true],
      ['Upgrade MSAL from 2.16.1 to 2.17.1', false],
      ['Keep MSAL 2.18.0', false],
    ]) {
      await writeFile(planPath, `---\napproach: sdk\n---\n\n${text}\n`);
      const results = await grade(check, dir);
      assert.equal(results['plan-sdk-version'].passed, expected, text);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the iOS fixture is seeded and its V1 SDK usage is what the plan cases expect', async () => {
  const workspace = await createWorkspace(byName.get('sdk-ios-plan-all-flows'));
  try {
    const signIn = await readFile(join(workspace.workspace, 'ContosoAuth/Auth/SignInCoordinator.swift'), 'utf8');
    assert.match(signIn, /app\.signIn\(parameters: parameters, delegate: self\)/);
    assert.match(await readFile(join(workspace.workspace, 'Podfile.lock'), 'utf8'), /MSAL \(2\.16\.1\)/);
  } finally {
    await workspace.dispose();
  }
});

test('the email-first check accepts any capitalization and "precedes", and needs the order stated', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eval-email-first-'));
  try {
    await mkdir(join(dir, '.native-auth-v2-migration'), { recursive: true });
    const planPath = join(dir, '.native-auth-v2-migration/plan.md');
    for (const caseName of ['api-plan-sign-up-only', 'sdk-js-plan-sign-up-only']) {
      const list = graders(caseName, 'plan-notes-email-first');
      for (const text of ['Email is verified before the service accepts the password.', 'Email verification precedes password submission.', 'Service verifies email first.']) {
        await writeFile(planPath, text);
        assert.equal((await grade(list, dir))['plan-notes-email-first'].passed, true, text);
      }
      await writeFile(planPath, 'The form is unchanged and the password is sent with the code.');
      assert.equal((await grade(list, dir))['plan-notes-email-first'].passed, false);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('SDK references: each platform loads the shared rules, and the shared file names no platform API', async () => {
  const references = pathToFileURL(join(skillsRoot, 'eeid-native-auth-migrate-v2/references/'));
  const shared = await readFile(new URL('sdk/shared-rules.md', references), 'utf8');
  assert.doesNotMatch(shared, /\bon[A-Z][a-z]\w+|StateV2|MSALNativeAuth|CustomAuth|@azure\/msal|isState\(|scenario/);
  for (const platform of ['js', 'ios']) {
    const security = platform === 'js' ? 'security-sdk-js.md' : 'security-sdk-ios.md';
    const validation = platform === 'js' ? 'validation-sdk-js.md' : 'validation-sdk-ios.md';
    for (const file of ['approach.md', 'v2-flows.md', 'v2-errors.md', 'v1-v2-mapping.md', security, validation]) {
      const text = await readFile(new URL(`sdk/${platform}/${file}`, references), 'utf8');
      assert.match(text, /\(\.\.\/shared-rules\.md\)/, `${platform}/${file} doesn't link the shared rules`);
    }
    // Every section the platform files point to exists in the shared file.
    const flows = await readFile(new URL(`sdk/${platform}/v2-flows.md`, references), 'utf8');
    for (const heading of ['Flow rules', 'One-screen forms', 'Sign-up attributes', 'Existing account at sign-up', 'Password reset', 'Finish after sign-up or reset', 'Registration and browser required']) {
      assert.ok(shared.includes(`## ${heading}\n`), `shared file has no section "${heading}"`);
      assert.ok(flows.replace(/\s+/g, ' ').includes(`**${heading}**`), `${platform}/v2-flows.md doesn't point to "${heading}"`);
    }
  }
});
