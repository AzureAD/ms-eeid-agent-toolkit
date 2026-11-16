#!/usr/bin/env node
// Generates the graders that are derived from other files, so they stay in
// sync when those files change:
//   - plan cases: the plan follows the skill's plan template (front matter
//     fields, sections matched by number and first word, no placeholder text
//     left) and its scope table marks each flow as requested; its working
//     notes follow the working-notes template and carry the plan's revision;
//   - full-migration cases: every fixture file is either unchanged or changed
//     as the seeded plan says (compared by content, whatever tool the agent
//     used), new files are only those the plan allows, and the report follows
//     the skill's report template (sections matched the same way).
// Generated graders are named gen-*.md. Run after changing a template, the
// fixture, or a case spec below:
//   node tests/evals/eeid-native-auth-migrate-v2/scripts/generate-graders.mjs
// With --check, it only reports graders that are out of date (exit 1).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillsRoot } from '../../../../scripts/lib/paths.mjs';

const evalDir = dirname(dirname(fileURLToPath(import.meta.url)));
const skillDir = join(skillsRoot, 'eeid-native-auth-migrate-v2');
const MIGRATION_FOLDER = '.native-auth-v2-migration';

// Plan cases: which flows the request migrates and which it defers.
export const PLAN_CASES = {
  'behavior/api-plan-all-flows': { migrate: ['sign-in', 'sign-up', 'sspr'], defer: [] },
  'behavior/api-plan-sign-in-only': { migrate: ['sign-in'], defer: ['sign-up', 'sspr'] },
  'behavior/api-plan-sign-in-sspr': { migrate: ['sign-in', 'sspr'], defer: ['sign-up'] },
  'behavior/api-plan-sign-up-only': { migrate: ['sign-up'], defer: ['sign-in', 'sspr'] },
  'behavior/api-plan-sspr-only': { migrate: ['sspr'], defer: ['sign-in', 'sign-up'] },
  'behavior/sdk-js-plan-all-flows': { migrate: ['sign-in', 'sign-up', 'sspr'], defer: [] },
  'behavior/sdk-js-plan-sign-in-only': { migrate: ['sign-in'], defer: ['sign-up', 'sspr'] },
  'behavior/sdk-js-plan-sign-up-only': { migrate: ['sign-up'], defer: ['sign-in', 'sspr'] },
  'behavior/sdk-ios-plan-all-flows': { migrate: ['sign-in', 'sign-up', 'sspr'], defer: [] },
  'behavior/sdk-ios-plan-sign-in-only': { migrate: ['sign-in'], defer: ['sign-up', 'sspr'] },
  'behavior/sdk-android-plan-all-flows': { migrate: ['sign-in', 'sign-up', 'sspr'], defer: [] },
  'behavior/sdk-android-plan-sign-in-only': { migrate: ['sign-in'], defer: ['sign-up', 'sspr'] },
};

// Full-migration cases: what the seeded plan changes. Every other fixture
// file must stay exactly as it was. `removed` files are deleted by the plan
// and not checked; `mayChange` files may change or not and aren't checked
// either (for example the dependency file a failed SDK install may already
// have edited). `required` files are new files the plan adds; `allowedNew`
// lists other new files that are fine (regex, for example the lockfile an
// install writes). `newTests: false` allows no new test files and
// `report: false` skips the report checks (for cases that stop before
// applying).
export const FULL_CASES = {
  'behavior/api-migrate-sign-in-sspr': {
    fixture: 'spa-js-v1',
    changed: [
      'cors.js', 'src/config.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/resetPassword.js',
      'test/mockFetch.js', 'test/signIn.test.js', 'test/resetPassword.test.js',
    ],
    removed: [],
    required: ['src/api/nativeAuthV2Client.js', 'test/nativeAuthV2Client.test.js'],
  },
  'behavior/api-migrate-all-flows': {
    fixture: 'spa-js-v1',
    changed: [
      'cors.js', 'src/config.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/signUp.js',
      'src/auth/resetPassword.js', 'test/mockFetch.js', 'test/signIn.test.js', 'test/signUp.test.js',
      'test/resetPassword.test.js',
    ],
    removed: ['src/api/nativeAuthClient.js'],
    required: ['src/api/nativeAuthV2Client.js', 'test/nativeAuthV2Client.test.js'],
  },
  'behavior/sdk-js-migrate-sign-in-sspr': {
    fixture: 'spa-js-sdk-v1',
    changed: [
      'package.json', 'cors.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/resetPassword.js',
      'test/fakeSdk.js', 'test/signIn.test.js', 'test/resetPassword.test.js',
    ],
    removed: [],
    required: [],
    allowedNew: ['package-lock\\.json'],
  },
  'behavior/sdk-js-migrate-all-flows': {
    fixture: 'spa-js-sdk-v1',
    changed: [
      'package.json', 'cors.js', 'src/config.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/signUp.js',
      'src/auth/resetPassword.js', 'test/fakeSdk.js', 'test/signIn.test.js', 'test/signUp.test.js',
      'test/resetPassword.test.js',
    ],
    removed: [],
    required: [],
    allowedNew: ['package-lock\\.json'],
  },
  // Source only, never built. The customer installed MSAL 2.18.1 before the
  // run (customer-install.mjs), so the Podfile and Podfile.lock differ from
  // the fixture but the plan has no SDK step.
  'behavior/sdk-ios-migrate-all-flows': {
    fixture: 'ios-swift-sdk-v1',
    changed: [
      'Podfile', 'Podfile.lock', 'ContosoAuth/Configuration.swift', 'ContosoAuth/Auth/NativeAuthClient.swift', 'ContosoAuth/Auth/SignInCoordinator.swift', 'ContosoAuth/Auth/SignUpCoordinator.swift',
      'ContosoAuth/Auth/ResetPasswordCoordinator.swift',
    ],
    removed: [],
    required: [],
    newTests: false,
  },
  // The SDK install fails right after approval: the run stops before any
  // other change. The dependency file may already carry the new version.
  'behavior/sdk-js-migrate-install-fails': {
    fixture: 'spa-js-sdk-v1',
    changed: [],
    removed: [],
    required: [],
    mayChange: ['package.json'],
    newTests: false,
    report: false,
  },
  // The customer says the SDK is installed, but it is still the old version:
  // nothing changes.
  'behavior/sdk-js-migrate-resume-still-old': {
    fixture: 'spa-js-sdk-v1',
    changed: [],
    removed: [],
    required: [],
    newTests: false,
    report: false,
  },
  // The SDK install fails right after approval: the run stops before any
  // other change. The dependency file may already carry the new version.
  'behavior/sdk-ios-migrate-install-fails': {
    fixture: 'ios-swift-sdk-v1',
    changed: [],
    removed: [],
    required: [],
    mayChange: ['Podfile'],
    newTests: false,
    report: false,
  },
  // The customer says the SDK is installed, but it is still the old version:
  // nothing changes.
  'behavior/sdk-ios-migrate-resume-still-old': {
    fixture: 'ios-swift-sdk-v1',
    changed: [],
    removed: [],
    required: [],
    newTests: false,
    report: false,
  },
  // The SDK install fails right after approval: the run stops before any
  // other change. The dependency file may already carry the new version.
  'behavior/sdk-android-migrate-all-flows': {
    fixture: 'android-kotlin-sdk-v1',
    changed: [
      'app/build.gradle', 'app/src/main/res/raw/auth_config_native_auth.json',
      'app/src/main/java/com/contoso/auth/SignInRepository.kt', 'app/src/main/java/com/contoso/auth/SignUpRepository.kt',
      'app/src/main/java/com/contoso/auth/ResetPasswordRepository.kt',
    ],
    removed: [],
    required: [],
    newTests: false,
  },
  'behavior/sdk-android-migrate-install-fails': {
    fixture: 'android-kotlin-sdk-v1',
    changed: [],
    removed: [],
    required: [],
    mayChange: ['app/build.gradle'],
    newTests: false,
    report: false,
  },
  // The customer says the SDK is installed, but it is still the old version:
  // nothing changes.
  'behavior/sdk-android-migrate-resume-still-old': {
    fixture: 'android-kotlin-sdk-v1',
    changed: [],
    removed: [],
    required: [],
    newTests: false,
    report: false,
  },
  // The customer installed the SDK (customer-install.mjs changes package.json
  // and adds package-lock.json); the run resumes and finishes.
  'behavior/sdk-js-migrate-resume-installed': {
    fixture: 'spa-js-sdk-v1',
    changed: ['package.json', 'cors.js', 'src/auth/errors.js', 'src/auth/signIn.js', 'src/auth/resetPassword.js', 'test/fakeSdk.js', 'test/signIn.test.js', 'test/resetPassword.test.js'],
    removed: [],
    required: [],
  },
  // An approval with a decision still open: nothing may change, no report.
  'behavior/api-plan-approve-with-open-decision': {
    fixture: 'spa-js-v1',
    changed: [],
    removed: [],
    required: [],
    newTests: false,
    report: false,
  },
  // A plan from another patch version continues; one from another minor
  // version restarts. Neither changes code or writes a report.
  'behavior/api-plan-resume-patch-version': {
    fixture: 'spa-js-v1',
    changed: [],
    removed: [],
    required: [],
    newTests: false,
    report: false,
  },
  'behavior/api-plan-restart-minor-version': {
    fixture: 'spa-js-v1',
    changed: [],
    removed: [],
    required: [],
    newTests: false,
    report: false,
  },
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slug = (path) => path.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

function grader(fields, body = '') {
  const lines = ['---', '# Generated by scripts/generate-graders.mjs. Do not edit; re-run the script.'];
  for (const [key, value] of Object.entries(fields)) lines.push(`${key}: ${JSON.stringify(value)}`);
  lines.push('---');
  return `${lines.join('\n')}\n${body ? `${body.trim()}\n` : ''}`;
}

// Front matter keys, ## headings, and <placeholders> of a template.
export function templateParts(text) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  const frontMatter = match ? match[1] : '';
  const body = match ? match[2] : text;
  const fields = [...frontMatter.matchAll(/^([a-z][a-z-]*):/gm)].map((m) => m[1]);
  const sections = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  // Placeholders in the body only: front matter comments (for example
  // `<check ID>`) are kept as they are in a filled-in plan.
  const placeholders = [...new Set([...body.matchAll(/<[^<>\n]+>/g)].map((m) => m[0]))]
    .filter((placeholder) => !/^<(br|\/?[a-z]+)>$/.test(placeholder));
  return { fields, sections, placeholders };
}

const allOf = (patterns) => patterns.map((pattern) => `(?=[\\s\\S]*${pattern})`).join('');
// A section is matched by its number (if any) and the first word of its
// title, so a reworded title still counts (for example "5. Behavior changes
// and limitations" for "5. Behavior changes and known limitations"), while a
// missing or renumbered section doesn't.
export function headingKey(heading) {
  const numbered = /^(\d+)\.\s+([A-Za-z0-9-]+)/.exec(heading);
  if (numbered) return `${numbered[1]}\\.\\s+${escapeRegExp(numbered[2])}\\b`;
  return `${escapeRegExp(/^[A-Za-z0-9-]+/.exec(heading)[0])}\\b`;
}
const headingPattern = (heading) => `(?:^|\\n)##[ \\t]+${headingKey(heading)}`;

function templateGraders(prefix, path, template, { fields = true } = {}) {
  const target = { source: 'file', path };
  const graders = {};
  if (fields && template.fields.length) {
    graders[`gen-${prefix}-template-fields`] = grader({
      type: 'regex', target,
      pattern: `^${allOf(template.fields.map((field) => `\\n${escapeRegExp(field)}:`))}`,
    });
  }
  graders[`gen-${prefix}-template-sections`] = grader({
    type: 'regex', target, pattern: `^${allOf(template.sections.map(headingPattern))}`,
  });
  graders[`gen-${prefix}-no-template-placeholders`] = grader({
    type: 'regex', target, match: 'not_contains',
    pattern: template.placeholders.map(escapeRegExp).join('|'),
  });
  return graders;
}

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name !== '.DS_Store') files.push(relative(root, path).split(sep).join('/'));
    }
  }
  await walk(root);
  return files.sort();
}

export async function buildGraders() {
  const planTemplate = templateParts(await readFile(join(skillDir, 'assets/plan-template.md'), 'utf8'));
  const notesTemplate = templateParts(await readFile(join(skillDir, 'assets/working-notes-template.md'), 'utf8'));
  const reportTemplate = templateParts(await readFile(join(skillDir, 'assets/report-template.md'), 'utf8'));
  const byCase = {};

  for (const [casePath, spec] of Object.entries(PLAN_CASES)) {
    const plan = `${MIGRATION_FOLDER}/plan.md`;
    const notes = `${MIGRATION_FOLDER}/working-notes.md`;
    const graders = {
      ...templateGraders('plan', plan, planTemplate),
      ...templateGraders('notes', notes, notesTemplate),
    };
    graders['gen-notes-plan-revision'] = grader({
      type: 'regex', target: { source: 'file', path: notes }, pattern: '(?:^|\\n)plan-revision:\\s*1\\b',
    }, 'The working notes carry the plan\'s revision (1 for a new plan).');
    for (const [flows, decision] of [[spec.migrate, 'Migrate'], [spec.defer, 'Defer']]) {
      for (const flow of flows) {
        graders[`gen-plan-scope-table-${flow}`] = grader({
          type: 'regex', target: { source: 'file', path: plan },
          pattern: `(?:^|\\n)\\|\\s*\`?${escapeRegExp(flow)}\`?[^|\\n]*\\|(?:[^\\n]*\\|)?\\s*\\**${decision}\\**\\s*\\|`,
        });
      }
    }
    byCase[casePath] = graders;
  }

  for (const [casePath, spec] of Object.entries(FULL_CASES)) {
    const fixtureDir = join(evalDir, 'fixtures', spec.fixture);
    const files = await listFiles(fixtureDir);
    const unchecked = [...spec.removed, ...(spec.mayChange ?? [])];
    for (const path of [...spec.changed, ...unchecked]) {
      if (!files.includes(path)) throw new Error(`${casePath}: ${path} isn't in fixtures/${spec.fixture}`);
    }
    const graders = {};
    for (const path of files) {
      if (unchecked.includes(path)) continue;
      const original = await readFile(join(fixtureDir, path), 'utf8');
      const exact = `^${escapeRegExp(original)}$`;
      if (spec.changed.includes(path)) {
        graders[`gen-file-changed-${slug(path)}`] = grader({
          type: 'regex', target: { source: 'file', path }, pattern: exact, match: 'not_contains',
        }, `The plan changes ${path}: it must exist and differ from the original.`);
      } else {
        graders[`gen-file-unchanged-${slug(path)}`] = grader({
          type: 'regex', target: { source: 'file', path }, pattern: exact, weight: 2,
        }, `The plan doesn't change ${path}: its content must be exactly the original.`);
      }
    }
    for (const path of spec.required) {
      graders[`gen-file-new-${slug(path)}`] = grader({ type: 'file_exists', path });
    }
    const allowed = [
      `${escapeRegExp(MIGRATION_FOLDER)}/`,
      ...spec.required.map((path) => `${escapeRegExp(path)}(?:\\n|$)`),
      ...(spec.newTests === false ? [] : ['test/[^/\\n]+\\.test\\.js(?:\\n|$)']),
      ...(spec.allowedNew ?? []).map((pattern) => `${pattern}(?:\\n|$)`),
    ];
    graders['gen-files-no-unplanned-new-files'] = grader({
      type: 'regex', target: 'files', match: 'not_contains',
      pattern: `(?:^|\\n)(?!${allowed.join('|')})[^\\n]+`,
    }, 'New files are only the ones the plan adds, new test files, and the migration folder.');
    if (spec.report !== false) {
      Object.assign(graders, templateGraders('report', `${MIGRATION_FOLDER}/report.md`, reportTemplate, { fields: false }));
    }
    byCase[casePath] = graders;
  }
  return byCase;
}

async function main() {
  const check = process.argv.includes('--check');
  const byCase = await buildGraders();
  const problems = [];
  let written = 0;
  for (const [casePath, graders] of Object.entries(byCase)) {
    const graderDir = join(evalDir, casePath, 'graders');
    let existing = [];
    try {
      existing = (await readdir(graderDir)).filter((name) => name.startsWith('gen-'));
    } catch {
      // A new case has no graders folder yet.
    }
    for (const name of existing) {
      if (!(name.replace(/\.md$/, '') in graders)) {
        if (check) problems.push(`${casePath}/graders/${name} is stale`);
        else {
          await rm(join(graderDir, name));
          written++;
        }
      }
    }
    for (const [name, content] of Object.entries(graders)) {
      const path = join(graderDir, `${name}.md`);
      let current = null;
      try {
        current = await readFile(path, 'utf8');
      } catch {
        // Missing.
      }
      if (current === content) continue;
      if (check) problems.push(`${casePath}/graders/${name}.md is ${current === null ? 'missing' : 'out of date'}`);
      else {
        await mkdir(graderDir, { recursive: true });
        await writeFile(path, content);
        written++;
      }
    }
  }
  if (problems.length) {
    console.error(`Generated graders are out of date; run scripts/generate-graders.mjs:\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log(written ? `Updated ${written} generated grader file(s).` : 'Generated graders are up to date.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
