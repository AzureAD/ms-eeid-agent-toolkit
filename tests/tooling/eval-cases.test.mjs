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
    ['sdk-ios-migrate-all-flows', 'sdk-ios-plan-all-flows'],
    ['sdk-android-migrate-all-flows', 'sdk-android-plan-all-flows'],
    ['sdk-ios-migrate-install-fails', 'sdk-ios-plan-all-flows'],
    ['sdk-android-migrate-install-fails', 'sdk-android-plan-sign-in-only'],
  ]) {
    const workspace = await seededWorkspace(caseName);
    try {
      const results = {
        ...await grade(graders(planCase, 'gen-plan-'), workspace.workspace),
        ...await grade(graders(planCase, 'gen-notes-'), workspace.workspace),
      };
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
      .replace('## 3. What users will notice', '## Users will notice')
      .replace('| Migrate now | sign-in, sspr |', '| Migrate now | <sign-in, sspr (password reset)> |')
      .replace(/(\| sspr \| )Migrate( \|)/, '$1Defer$2'));
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
  for (const name of ['api-migrate-sign-in-sspr', 'api-migrate-all-flows', 'sdk-js-migrate-sign-in-sspr', 'sdk-js-migrate-all-flows', 'sdk-ios-migrate-all-flows', 'sdk-android-migrate-all-flows']) {
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
    const reworded = filled.replace('## 5. What users will notice', '## 5. What users notice');
    await writeFile(join(dir, '.native-auth-v2-migration/report.md'), reworded);
    results = await grade(graders('api-migrate-all-flows', 'gen-report-template-sections'), dir);
    assert.equal(results['gen-report-template-sections'].passed, true);
    await writeFile(join(dir, '.native-auth-v2-migration/report.md'), reworded.replace('## 7. Security review', '## Security'));
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

// The plan text a run leaves when it stops at the SDK step (what
// seed-plan.mjs --waiting writes), for cases seeded before approval.
function stoppedAtSdkStep(plan) {
  return plan
    .replace(/\nstatus: draft\b/, '\nstatus: applying')
    .replace(/\napproved: null\b/, '\napproved: { revision: 1, date: 2026-11-11, how: confirmed in chat }')
    .replace(/(### Shared\n- \[ \] [^\n]*)/, '$1\n  Waiting for the customer to install: install failed');
}

test('SDK install cases: a run that stops at the SDK step passes, one that changes code fails', async () => {
  for (const [name, source] of [
    ['sdk-js-migrate-install-fails', 'src/auth/signIn.js'],
    ['sdk-ios-migrate-install-fails', 'ContosoAuth/Auth/SignInCoordinator.swift'],
    ['sdk-android-migrate-install-fails', 'app/src/main/java/com/contoso/auth/SignInRepository.kt'],
    ['sdk-js-migrate-resume-still-old', 'src/auth/signIn.js'],
    ['sdk-ios-migrate-resume-still-old', 'ContosoAuth/Auth/SignInCoordinator.swift'],
    ['sdk-android-migrate-resume-still-old', 'app/src/main/java/com/contoso/auth/SignInRepository.kt'],
  ]) {
    const workspace = await seededWorkspace(name);
    const fileChecks = byName.get(name).graders.filter((grader) => grader.type === 'regex' && grader.target !== 'last_message'
      || grader.type === 'file_exists');
    const planPath = join(workspace.workspace, '.native-auth-v2-migration/plan.md');
    try {
      const plan = await readFile(planPath, 'utf8');
      if (name.endsWith('-install-fails')) {
        assert.match(plan, /\nstatus: draft\b/, `${name} is seeded before approval`);
        await writeFile(planPath, stoppedAtSdkStep(plan));
      } else {
        assert.match(plan, /\nstatus: applying\b/, `${name} is seeded stopped at the SDK step`);
        assert.match(plan, /Waiting for the customer to install: \S/, `${name} has the waiting note`);
      }
      let results = await grade(fileChecks, workspace.workspace, await workspace.createdFiles());
      for (const [check, result] of Object.entries(results)) assert.equal(result.passed, true, `${name}/${check}: ${result.detail}`);

      // A run that carried on: a ticked step, changed code, and a report.
      await writeFile(planPath, (await readFile(planPath, 'utf8')).replace('### Shared\n- [ ]', '### Shared\n- [x]'));
      await appendFile(join(workspace.workspace, source), '\n// V2\n');
      await writeFile(join(workspace.workspace, '.native-auth-v2-migration/report.md'), '# Report\n');
      results = await grade(fileChecks, workspace.workspace, await workspace.createdFiles());
      for (const check of ['plan-no-step-ticked', 'no-report']) assert.equal(results[check].passed, false, `${name}/${check}`);
      assert.ok(Object.entries(results).some(([check, result]) => check.startsWith('gen-file-unchanged-') && !result.passed),
        `${name}: a changed source file fails its unchanged check`);
    } finally {
      await workspace.dispose();
    }
  }
});

test('SDK resume case: the customer\'s install is seeded without a download', async () => {
  const workspace = await seededWorkspace('sdk-js-migrate-resume-installed');
  try {
    const lock = JSON.parse(await readFile(join(workspace.workspace, 'package-lock.json'), 'utf8'));
    assert.equal(lock.packages['node_modules/@azure/msal-browser'].version, '5.29.0');
    assert.match(await readFile(join(workspace.workspace, 'package.json'), 'utf8'), /"\^5\.29\.0"/);
    const plan = await readFile(join(workspace.workspace, '.native-auth-v2-migration/plan.md'), 'utf8');
    assert.match(plan, /\nstatus: applying\b/);
    assert.match(plan, /### Shared\n- \[ \] [^\n]*\n {2}Waiting for the customer to install: /);
    assert.match(plan, /\| Revision 1 approved \|/);
    assert.equal(execFileSync('git', ['status', '--porcelain', '--', ':!.native-auth-v2-migration'], { cwd: workspace.workspace, encoding: 'utf8' }), '');
  } finally {
    await workspace.dispose();
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

test('iOS migrate graders: the V1 fixture fails them and a V2 migration passes', async () => {
  const name = 'sdk-ios-migrate-all-flows';
  const workspace = await seededWorkspace(name);
  const list = byName.get(name).graders.filter((grader) => grader.type === 'regex' && /^(?:v1-gone|v2-)/.test(grader.name));
  const flowDelegate = 'MSALNativeAuthFlowDelegate, MSALNativeAuthCodeRequiredDelegate, MSALNativeAuthAuthMethodSelectionRequiredDelegate';
  const auth = (file) => join(workspace.workspace, 'ContosoAuth/Auth', file);
  try {
    // The customer already installed MSAL 2.18.1, so only the code checks fail
    // on the seeded workspace.
    const before = await grade(list, workspace.workspace);
    assert.equal(before['v2-sdk-version-minimum'].passed, true);
    for (const check of ['v1-gone-sign-in', 'v1-gone-sign-up', 'v1-gone-sspr',
      'v2-sign-in-calls-signinv2', 'v2-sign-in-no-password-at-start', 'v2-sign-up-calls-signupv2', 'v2-sspr-calls-resetpasswordv2',
      'v2-config-tenant-id', 'v2-config-tenant-id-placement']) {
      assert.equal(before[check].passed, false, check);
    }
    await writeFile(join(workspace.workspace, 'Podfile'), "target 'ContosoAuth' do\n  pod 'MSAL', '~> 2.18'\nend\n");
    await writeFile(join(workspace.workspace, 'ContosoAuth/Configuration.swift'),
      'enum Configuration {\n    static let clientId = "c"\n    static let tenantId = "00000000-0000-0000-0000-000000000001"\n}\n');
    await writeFile(auth('NativeAuthClient.swift'), `let authority = try MSALCIAMAuthority(url: URL(string: "https://contoso.ciamlogin.com/\\(Configuration.tenantId)")!)
      let config = MSALNativeAuthPublicClientApplicationConfig(clientId: Configuration.clientId, authority: authority, challengeTypes: [.OOB, .password])`);
    await writeFile(auth('SignInCoordinator.swift'), `extension C: ${flowDelegate}, MSALNativeAuthPasswordRequiredDelegate {}
      app.signInV2(parameters: MSALNativeAuthSignInParametersV2(username: email), delegate: self)
      state.submitPassword(held, delegate: self); if error.isBrowserRequired {}`);
    await writeFile(auth('SignUpCoordinator.swift'), `extension C: ${flowDelegate}, MSALNativeAuthPasswordRequiredDelegate, MSALNativeAuthAttributesRequiredDelegate,
      MSALNativeAuthExistingAccountCodeRequiredDelegate, MSALNativeAuthExistingAccountPasswordRequiredDelegate, MSALNativeAuthSignInAfterSignUpRequiredDelegate {}
      let parameters = MSALNativeAuthSignUpParametersV2(username: email); parameters.attributes = ["displayName": name]
      app.signUpV2(parameters: parameters, delegate: self); onOutcome(.failed(.userAlreadyExists))
      state.submitPassword(held, delegate: self); state.signIn(delegate: self)`);
    await writeFile(auth('ResetPasswordCoordinator.swift'), `extension C: ${flowDelegate}, MSALNativeAuthNewPasswordRequiredDelegate, MSALNativeAuthSignInAfterResetPasswordRequiredDelegate {}
      app.resetPasswordV2(parameters: MSALNativeAuthResetPasswordParametersV2(username: email), delegate: self)
      state.submitNewPassword(password, delegate: self); state.signIn(delegate: self)`);
    const after = await grade(list, workspace.workspace);
    for (const [check, result] of Object.entries(after)) assert.equal(result.passed, true, `${check}: ${result.detail}`);

    await writeFile(join(workspace.workspace, 'Podfile'), "pod 'MSAL', :git => 'https://example.test/msal.git', :branch => 'dev'\n");
    const pinned = await grade(list, workspace.workspace);
    assert.equal(pinned['v2-sdk-source-unchanged'].passed, false);
    assert.equal(pinned['v2-sdk-version-minimum'].passed, false);
  } finally {
    await workspace.dispose();
  }
});

test('the Android fixture is seeded and its V1 SDK usage is what the plan cases expect', async () => {
  const workspace = await createWorkspace(byName.get('sdk-android-plan-all-flows'));
  try {
    const signIn = await readFile(join(workspace.workspace, 'app/src/main/java/com/contoso/auth/SignInRepository.kt'), 'utf8');
    assert.match(signIn, /app\.signIn\(parameters\)/);
    assert.match(signIn, /isUserNotFound\(\)/);
    assert.match(await readFile(join(workspace.workspace, 'app/build.gradle'), 'utf8'), /identity\.client:msal:8\.5\.0/);
  } finally {
    await workspace.dispose();
  }
});

test('Android plan graders: the plan must move MSAL to the V2 minimum or later', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eval-android-'));
  const check = graders('sdk-android-plan-all-flows', 'plan-sdk-version');
  try {
    await mkdir(join(dir, '.native-auth-v2-migration'), { recursive: true });
    const planPath = join(dir, '.native-auth-v2-migration/plan.md');
    for (const [text, expected] of [
      ['MSAL 8.5.0 → latest 8.x (at least the minimum)', true],
      ['Upgrade MSAL from 8.5.0 to 8.7.0', true],
      ['Upgrade MSAL from 8.5.0 to 8.10.1', true],
      ['Upgrade MSAL from 8.5.0 to 8.6.0', false],
      ['Keep MSAL 8.5.0', false],
    ]) {
      await writeFile(planPath, `---\napproach: sdk\n---\n\n${text}\n`);
      assert.equal((await grade(check, dir))['plan-sdk-version'].passed, expected, text);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Android migrate graders: the V1 fixture fails them and a V2 migration passes', async () => {
  const name = 'sdk-android-migrate-all-flows';
  const workspace = await seededWorkspace(name);
  const list = byName.get(name).graders.filter((grader) => grader.type === 'regex' && /^(?:v1-gone|v2-)/.test(grader.name));
  const repo = (file) => join(workspace.workspace, 'app/src/main/java/com/contoso/auth', file);
  try {
    assert.match(await readFile(join(workspace.workspace, 'app/build.gradle'), 'utf8'), /identity\.client:msal:8\.7\.0/);
    const before = await grade(list, workspace.workspace);
    for (const check of ['v1-gone-sign-in', 'v1-gone-sign-up', 'v1-gone-sspr', 'v2-config-tenant-id',
      'v2-sign-in-calls-signinv2', 'v2-sign-in-no-password-at-start', 'v2-sign-up-calls-signupv2', 'v2-sspr-calls-resetpasswordv2']) {
      assert.equal(before[check].passed, false, check);
    }
    const config = join(workspace.workspace, 'app/src/main/res/raw/auth_config_native_auth.json');
    await writeFile(config, (await readFile(config, 'utf8')).replace('contoso.onmicrosoft.com/', '00000000-0000-0000-0000-000000000001/'));
    await writeFile(repo('SignInRepository.kt'), `when (val result = app.signInV2(NativeAuthSignInParametersV2(username = email))) {
      is NativeAuthResultV2.PasswordRequired -> result.nextState.submitPassword(held)
      is NativeAuthResultV2.CodeRequired -> keep(result)
      is NativeAuthResultV2.AuthMethodSelectionRequired -> select(result)
      is NativeAuthResultV2.Complete -> done(result)
      is NativeAuthErrorV2 -> if (result.isBrowserRequired()) browser() else failed()
      else -> failed()
    }`);
    await writeFile(repo('SignUpRepository.kt'), `val parameters = NativeAuthSignUpParametersV2(username = email)
    parameters.attributes = UserAttributes.Builder().displayName(displayName).build()
    when (val result = app.signUpV2(parameters)) {
      is NativeAuthResultV2.ExistingAccountCodeRequired, is NativeAuthResultV2.ExistingAccountPasswordRequired,
      is NativeAuthResultV2.AuthMethodSelectionRequired -> AuthOutcome.Failed(AuthFailure.USER_ALREADY_EXISTS)
      is NativeAuthResultV2.PasswordRequired -> result.nextState.submitPassword(held)
      is NativeAuthResultV2.SignInAfterSignUpRequired -> result.nextState.signIn()
      else -> failed()
    }`);
    await writeFile(repo('ResetPasswordRepository.kt'), `when (val result = app.resetPasswordV2(NativeAuthResetPasswordParametersV2(username = email))) {
      is NativeAuthResultV2.CodeRequired -> keep(result)
      is NativeAuthResultV2.AuthMethodSelectionRequired -> select(result)
      is NativeAuthResultV2.NewPasswordRequired -> result.nextState.submitNewPassword(password)
      is NativeAuthResultV2.SignInAfterResetPasswordRequired -> result.nextState.signIn()
      else -> failed()
    }`);
    const after = await grade(list, workspace.workspace);
    for (const [check, result] of Object.entries(after)) assert.equal(result.passed, true, `${check}: ${result.detail}`);
  } finally {
    await workspace.dispose();
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
  assert.doesNotMatch(shared, /\bon[A-Z][a-z]\w+|StateV2|MSALNativeAuth|CustomAuth|NativeAuthResultV2|@azure\/msal|isState\(|scenario/);
  for (const platform of ['js', 'ios', 'android']) {
    const security = `security-sdk-${platform}.md`;
    const validation = `validation-sdk-${platform}.md`;
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
