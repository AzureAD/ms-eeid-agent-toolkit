import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases, selectCases, splitFrontMatter } from '../../scripts/evals/lib/cases.mjs';
import { gradeRun } from '../../scripts/evals/lib/graders.mjs';
import { parseReason, parseVerdict } from '../../scripts/evals/lib/judge.mjs';
import { normalizeCopilotEvents, permissionArgs } from '../../scripts/evals/adapters/copilot.mjs';
import { parseArgs, runSuite, writeReport } from '../../scripts/evals/run.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const evalDir = join(root, 'tests/evals/eeid-native-auth-migrate-v2');
const PLAN = '.native-auth-v2-migration/plan.md';
const GOOD_PLAN = [
  '---',
  'skill-version: "0.1.0"',
  'approach: api',
  'status: draft',
  'scope: [sign-in, sspr]',
  'deferred:',
  '  sign-up: "customer keeps it on V1"',
  '---',
  'Error map: user_not_found, invalid_oob_value.',
].join('\n');

async function tempWorkspace(files = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'eval-runner-test-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

test('splits front matter from the body', () => {
  assert.deepEqual(splitFrontMatter('---\ntype: llm\nweight: 2\n---\n\nPASS if ok.\n'), {
    data: { type: 'llm', weight: 2 },
    body: 'PASS if ok.',
  });
});

test('loads every case in the native auth suite with its settings and graders', async () => {
  const cases = await loadCases(evalDir);
  assert.equal(cases.length, 34);
  const plan = cases.find((testCase) => testCase.name === 'api-plan-sign-in-sspr');
  assert.equal(plan.path, 'behavior/api-plan-sign-in-sspr');
  assert.ok(plan.scaffoldScript.endsWith('scaffold.sh'));
  assert.ok(plan.allowedTools.includes('Write'));
  assert.deepEqual(plan.graders.find((grader) => grader.name === 'plan-is-draft').target,
    { source: 'file', path: PLAN });
  assert.match(plan.graders.find((grader) => grader.name === 'stops-for-approval').criteria, /^PASS if/);
});

test('selects cases by tag and by name glob', async () => {
  const cases = await loadCases(evalDir);
  assert.equal(selectCases(cases, { tags: ['triggering'] }).length, 19);
  assert.equal(selectCases(cases, { tags: ['behavior'] }).length, 15);
  for (const testCase of cases) assert.equal(testCase.tags.length, 1, `${testCase.name} has exactly one tag, its type`);
  // Approach prefixes: api-* (raw API), sdk-js-* (MSAL JS SDK), sdk-ios-* (MSAL iOS/macOS SDK); no-trigger-* are shared.
  assert.equal(selectCases(cases, { caseGlob: 'api-*' }).length, 13);
  assert.equal(selectCases(cases, { caseGlob: 'api-plan-*' }).length, 6);
  assert.equal(selectCases(cases, { caseGlob: 'sdk-js-*' }).length, 9);
  assert.equal(selectCases(cases, { caseGlob: 'no-trigger-*' }).length, 6);
  assert.equal(selectCases(cases, { caseGlob: '*no-trigger-*' }).length, 10);
  assert.equal(selectCases(cases, { caseGlob: 'api-trigger-*' }).length, 5);
  assert.equal(selectCases(cases, { caseGlob: 'sdk-js-trigger-*' }).length, 2);
  assert.equal(selectCases(cases, { caseGlob: '*-migrate-*' }).length, 4);
  assert.equal(selectCases(cases, { caseGlob: 'sdk-js-plan-*' }).length, 3);
  assert.equal(selectCases(cases, { caseGlob: 'sdk-ios-*' }).length, 6);
  assert.equal(selectCases(cases, { caseGlob: 'sdk-ios-trigger-*' }).length, 2);
  assert.equal(selectCases(cases, { caseGlob: 'sdk-ios-plan-*' }).length, 2);
  assert.deepEqual(selectCases(cases, { caseGlob: 'api-plan-sign-*' }).map((testCase) => testCase.name).sort(),
    ['api-plan-sign-in-only', 'api-plan-sign-in-sspr', 'api-plan-sign-up-only']);
});

test('grades files, tools, created files, and judged rubrics', async () => {
  const workspace = await tempWorkspace({ [PLAN]: GOOD_PLAN, 'src/app.js': 'unchanged' });
  try {
    const run = {
      workspace,
      createdFiles: [PLAN],
      transcript: {
        finalMessage: 'Please approve the plan.',
        events: [],
        tools: [
          { name: 'Skill', input: { skill: 'eeid-native-auth-migrate-v2' } },
          { name: 'Write', input: { file_path: `${workspace}/${PLAN}` } },
        ],
      },
    };
    const graders = [
      { name: 'draft', type: 'regex', target: { source: 'file', path: PLAN }, pattern: '(?:^|\\n)status:\\s*draft\\b' },
      { name: 'no-sign-up-in-scope', type: 'regex', target: { source: 'file', path: PLAN }, pattern: 'scope:[^\\n]*sign-up', match: 'not_contains' },
      { name: 'skill', type: 'tool_used', tool: 'Skill', input_match: '"skill"\\s*:\\s*"eeid-native-auth-migrate-v2"' },
      { name: 'no-src-writes', type: 'tool_used', tool: 'Write', input_match: '"file_path"\\s*:\\s*"[^"]*/src/', min: 0, max: 0, weight: 2 },
      { name: 'order', type: 'tool_order', before: 'Skill', after: 'Write' },
      { name: 'created', type: 'file_exists', path: PLAN },
      { name: 'judge', type: 'llm', criteria: 'PASS if it asks for approval.' },
    ];
    const graded = await gradeRun(graders, run, { judge: async () => true });
    assert.equal(graded.score, 1);
    assert.ok(graded.results.every((result) => result.passed));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('a missing file fails its grader, and llm graders without a judge are skipped', async () => {
  const workspace = await tempWorkspace();
  try {
    const graded = await gradeRun([
      { name: 'draft', type: 'regex', target: { source: 'file', path: PLAN }, pattern: 'status' },
      { name: 'judge', type: 'llm', criteria: 'PASS if anything.' },
    ], { workspace, createdFiles: [], transcript: { finalMessage: '', tools: [], events: [] } });
    assert.equal(graded.score, 0);
    assert.match(graded.results[0].detail, /does not exist/);
    assert.equal(graded.results[1].skipped, true);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('parses the judge verdict from the last VERDICT line', () => {
  assert.equal(parseVerdict('It asks.\nVERDICT: PASS'), true);
  assert.equal(parseVerdict('VERDICT: PASS would be wrong.\nVERDICT: FAIL'), false);
  assert.equal(parseVerdict('no verdict'), false);
});

test('keeps the judge reasoning before the last VERDICT line', () => {
  assert.equal(parseReason('It only says the plan\n awaits approval.\nVERDICT: FAIL'), 'It only says the plan awaits approval.');
  assert.equal(parseReason('VERDICT: PASS'), '(no reasoning given)');
  assert.equal(parseReason('no verdict here'), 'no verdict here');
  assert.equal(parseReason('x'.repeat(50), 10).length, 10);
});

test('records each judge vote with its reason, and the summary lists failed checks', async () => {
  const workspace = await tempWorkspace();
  const outDir = await mkdtemp(join(tmpdir(), 'eval-report-'));
  try {
    const verdicts = [
      { pass: false, reason: 'No direct question.' },
      { pass: true, reason: 'Asks for approval.' },
      { pass: false, reason: 'Status line only.' },
    ];
    const graded = await gradeRun([{ name: 'stops-for-approval', type: 'llm', criteria: 'PASS if it asks.' }],
      { workspace, createdFiles: [], transcript: { finalMessage: 'The plan awaits approval.', tools: [], events: [] } },
      { judge: async () => verdicts.shift() });
    const [result] = graded.results;
    assert.equal(result.passed, false);
    assert.equal(result.detail, 'judge votes: FAIL PASS FAIL');
    assert.deepEqual(result.votes.map((vote) => vote.reason), ['No direct question.', 'Asks for approval.', 'Status line only.']);

    const document = {
      skill: 's', agent: 'copilot', threshold: 1, passed: 0, total: 1,
      cases: [{ name: 'api-plan-sspr-only', score: 0, runs: [{ n: 1, score: 0, ...graded }] }],
    };
    await writeReport(document, outDir, () => {});
    const summary = await readFile(join(outDir, 'summary.md'), 'utf8');
    assert.match(summary, /## Failed checks/);
    assert.match(summary, /\*\*api-plan-sspr-only\*\*, run 1, `stops-for-approval`: judge votes: FAIL PASS FAIL/);
    assert.match(summary, /Vote 3 \(FAIL\): Status line only\./);
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(outDir, { recursive: true, force: true });
  }
});

test('normalizes Copilot events into the shared transcript', () => {
  const lines = [
    JSON.stringify({ type: 'tool.execution_start', data: { toolCallId: 't1', toolName: 'view', arguments: { path: '/h/skills/eeid-native-auth-migrate-v2/SKILL.md' } } }),
    JSON.stringify({ type: 'tool.execution_complete', data: { toolCallId: 't1', toolName: 'view' } }),
    JSON.stringify({ type: 'tool.execution_start', data: { toolCallId: 't2', toolName: 'create', arguments: '{"path":"/w/.native-auth-v2-migration/plan.md"}' } }),
    JSON.stringify({ type: 'assistant.message', data: { content: 'Plan written. Approve it?' } }),
    'not json',
  ];
  const transcript = normalizeCopilotEvents(lines, 'eeid-native-auth-migrate-v2');
  assert.deepEqual(transcript.tools.map((call) => call.name), ['Read', 'Write', 'Skill']);
  assert.equal(transcript.tools[1].input.file_path, '/w/.native-auth-v2-migration/plan.md');
  assert.deepEqual(transcript.tools[2].input, { skill: 'eeid-native-auth-migrate-v2' });
  assert.equal(transcript.finalMessage, 'Plan written. Approve it?');
  assert.equal(transcript.events.length, 5);
});

test('Copilot final message ignores reasoning that arrives after the reply', () => {
  const lines = [
    { type: 'assistant.message', data: { content: 'Plan written. Do you approve revision 1?' } },
    { type: 'assistant.reasoning', data: { content: 'Preparing the final overview.' } },
    { type: 'assistant.turn_end', data: {} },
    { type: 'assistant.idle', data: {} },
  ].map((event) => JSON.stringify(event));
  assert.equal(normalizeCopilotEvents(lines, 'x').finalMessage, 'Plan written. Do you approve revision 1?');
});

test('Copilot permissions deny URLs, and deny writes and shell unless the case allows them', () => {
  const readOnly = permissionArgs(['Read', 'Skill']);
  assert.deepEqual(readOnly, ['--deny-tool', 'url', '--deny-tool', 'write', '--deny-tool', 'shell']);
  const writing = permissionArgs(['Read', 'Write', 'Bash']);
  assert.ok(writing.includes('write') && writing.includes('shell(git:*)'));
  assert.ok(!writing.includes('--allow-all-tools'));
});

test('parses runner arguments', () => {
  const options = parseArgs(['--agent', 'copilot', '--skill', 'x', '--tag', 'triggering', '--tag', 'behavior', '--runs', '1', '--baseline']);
  assert.deepEqual(options.tags, ['triggering', 'behavior']);
  assert.equal(options.runs, 1);
  assert.equal(options.baseline, true);
  assert.equal(parseArgs(['--agent', 'claude-code', '--list-models']).listModels, true);
  assert.throws(() => parseArgs(['--agent', 'nope', '--skill', 'x']), /--agent must be one of/);
  assert.throws(() => parseArgs(['--agent', 'copilot', '--skill', 'x', '--judge', 'none']), /Unknown option --judge/);
});

test('runs a case end to end with a fake agent', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'eval-runner-out-'));
  const prepared = [];
  const fakeAgent = {
    name: 'fake',
    async prepare(args) { prepared.push(args); },
    async run({ workspace, outDir: runDir }) {
      // A complete plan: the seeded sign-in + SSPR plan with its run-time
      // values filled in.
      const plan = (await readFile(join(evalDir, 'fixtures/plans/spa-js-v1-sign-in-sspr.md'), 'utf8'))
        .replaceAll('{{SKILL_VERSION}}', '0.1.0').replaceAll('{{TODAY}}', '2026-11-05')
        .replaceAll('{{COMMIT}}', '0000000').replaceAll('{{HASH}}', '0000000');
      await mkdir(join(workspace, '.native-auth-v2-migration'), { recursive: true });
      await writeFile(join(workspace, PLAN), plan);
      await writeFile(join(runDir, 'events.jsonl'), '');
      return {
        error: null,
        transcript: {
          finalMessage: 'Sign-in and password reset plan ready; sign-up stays on V1. Please approve.',
          events: [],
          tools: [
            { name: 'Skill', input: { skill: 'eeid-native-auth-migrate-v2' } },
            { name: 'Write', input: { file_path: join(workspace, PLAN) } },
          ],
        },
      };
    },
  };
  try {
    const document = await runSuite(
      { skill: 'eeid-native-auth-migrate-v2', caseGlob: 'api-plan-sign-in-sspr', runs: 1, threshold: 1, tags: [], outDir },
      { adapter: fakeAgent, judge: async () => true, log: () => {} },
    );
    assert.equal(document.total, 1);
    assert.equal(document.cases[0].score, 1);
    assert.equal(prepared[0].withSkill, true);
    assert.match(await readFile(join(outDir, 'summary.md'), 'utf8'), /1 of 1 cases passed/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('builds the claude plugin eval command from runner options', async () => {
  const { buildClaudeArgs } = await import('../../scripts/evals/adapters/claude-code.mjs');
  const args = buildClaudeArgs(
    { tags: ['triggering', 'behavior'], caseGlob: 'plan-*', runs: 1, threshold: 0.8, model: 'm', judgeModel: 'j', keep: true },
    { evalDirRel: 'tests/evals/x', outDir: '/out' },
  );
  assert.deepEqual(args.slice(0, 5), ['plugin', 'eval', '.', '--eval-dir', 'tests/evals/x']);
  for (const expected of [['--ablation', 'none'], ['--threshold', '0.8'], ['--case', 'plan-*'], ['--runs', '1'],
    ['--model', 'm'], ['--judge-model', 'j'], ['--output-dir', '/out']]) {
    const at = args.indexOf(expected[0]);
    assert.equal(args[at + 1], expected[1], expected[0]);
  }
  assert.deepEqual(args.filter((arg, i) => args[i - 1] === '--tag'), ['triggering', 'behavior']);
  assert.ok(args.includes('--scaffold') && args.includes('--no-publish') && args.includes('--keep-temp'));
  assert.ok(args.includes('--trust-plugin'));
  const baseline = buildClaudeArgs({ baseline: true }, { evalDirRel: 'e', outDir: '/o' });
  assert.equal(baseline[baseline.indexOf('--ablation') + 1], 'with-without');
});

test('converts claude plugin eval results into the runner report', async () => {
  const { convertAggregate } = await import('../../scripts/evals/adapters/claude-code.mjs');
  const document = convertAggregate({
    startedAt: '2026-11-04T00:00:00Z',
    costUsd: 1.5,
    cases: [{
      name: 'api-plan-sign-in-sspr',
      dir: 'tests/evals/eeid-native-auth-migrate-v2/behavior/api-plan-sign-in-sspr',
      aggregates: { score: 0.5 },
      arms: {
        with: [{ score: 0.5, error: null, graders: [
          { name: 'plan-created', weight: 2, passed: true, explanation: 'exists', scored: true },
          { name: 'skill-fired', weight: 1, passed: false, explanation: 'Skill called 0x', scored: false },
        ] }],
        without: [{ score: 0, error: null, graders: [] }],
      },
    }],
  }, { root, evalDir, skill: 'eeid-native-auth-migrate-v2', threshold: 1 });
  assert.equal(document.agent, 'claude-code');
  assert.equal(document.cases[0].path, 'behavior/api-plan-sign-in-sspr');
  assert.equal(document.cases[0].passed, false);
  assert.equal(document.cases[0].withoutScore, 0);
  assert.equal(document.cases[0].runs[0].results[1].skipped, true);
  assert.equal(document.passed, 0);
});

test('delegates a suite to the claude command and reports its results', async () => {
  const { claudeCodeAdapter } = await import('../../scripts/evals/adapters/claude-code.mjs');
  const work = await mkdtemp(join(tmpdir(), 'eval-claude-fake-'));
  const fakeClaude = join(work, 'fake-claude.mjs');
  await writeFile(fakeClaude, [
    '#!/usr/bin/env node',
    "import { writeFileSync } from 'node:fs';",
    "const args = process.argv.slice(2);",
    "const out = args[args.indexOf('--output-dir') + 1];",
    "writeFileSync(out + '/aggregate-result.json', JSON.stringify({ cases: [{ name: 'api-trigger-upgrade-native-auth',",
    "  dir: 'tests/evals/eeid-native-auth-migrate-v2/triggering/api-trigger-upgrade-native-auth', aggregates: { score: 1 },",
    "  arms: { with: [{ score: 1, error: null, graders: [] }] } }] }));",
  ].join('\n'));
  await import('node:fs/promises').then(({ chmod }) => chmod(fakeClaude, 0o755));
  const outDir = join(work, 'out');
  try {
    const document = await runSuite(
      { skill: 'eeid-native-auth-migrate-v2', caseGlob: 'api-trigger-upgrade-native-auth', threshold: 1, tags: [], outDir, claudeBin: fakeClaude },
      { adapter: claudeCodeAdapter, judge: null, log: () => {} },
    );
    assert.equal(document.total, 1);
    assert.equal(document.passed, 1);
    assert.match(await readFile(join(outDir, 'summary.md'), 'utf8'), /on claude-code/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('keeps the arguments Copilot sends after argument-less streaming events', () => {
  const lines = [
    JSON.stringify({ type: 'assistant.tool_call_delta', data: { toolCallId: 'c1', toolName: 'skill', inputDelta: '{"' } }),
    JSON.stringify({ type: 'assistant.message_delta', data: { content: 'partial' } }),
    JSON.stringify({ type: 'tool.execution_start', data: { toolCallId: 'c1', toolName: 'skill', arguments: { skill: 'eeid-native-auth-migrate-v2' } } }),
    JSON.stringify({ type: 'tool.execution_complete', data: { toolCallId: 'c1', success: true } }),
    JSON.stringify({ type: 'assistant.message', data: { content: 'Here is the plan.' } }),
  ];
  const transcript = normalizeCopilotEvents(lines, 'eeid-native-auth-migrate-v2');
  assert.deepEqual(transcript.tools.map((call) => [call.name, call.input.skill]), [['Skill', 'eeid-native-auth-migrate-v2']]);
  assert.equal(transcript.finalMessage, 'Here is the plan.');
  assert.equal(transcript.events.length, 3);
});

test('reads Copilot model names from its config help', async () => {
  const { parseCopilotModels } = await import('../../scripts/evals/adapters/copilot.mjs');
  const help = '  `model`: AI model to use for Copilot CLI; can be changed.\n    - "claude-sonnet-5.5"\n    - "gpt-6.1-sol"\n\n  `contextTier`: other';
  assert.deepEqual(parseCopilotModels(help), ['claude-sonnet-5.5', 'gpt-6.1-sol']);
});

test('--baseline runs each case with and without the skill', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'eval-runner-baseline-'));
  const arms = [];
  const fakeAgent = {
    name: 'fake',
    async prepare({ withSkill }) { arms.push(withSkill); },
    async run() {
      const withSkill = arms[arms.length - 1];
      return { error: null, transcript: { finalMessage: '', events: [], tools: withSkill ? [{ name: 'Skill', input: { skill: 'eeid-native-auth-migrate-v2' } }] : [] } };
    },
  };
  try {
    const document = await runSuite(
      { skill: 'eeid-native-auth-migrate-v2', caseGlob: 'api-trigger-upgrade-native-auth', runs: 1, threshold: 1, tags: [], baseline: true, outDir },
      { adapter: fakeAgent, judge: null, log: () => {} },
    );
    assert.deepEqual(arms, [true, false]);
    assert.equal(document.cases[0].score, 1);
    assert.equal(document.cases[0].withoutScore, 0);
    assert.match(await readFile(join(outDir, 'summary.md'), 'utf8'), /Without skill/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('in a baseline comparison, skill-loaded checks are shown but not scored', async () => {
  const empty = { workspace: '/nonexistent', createdFiles: [], transcript: { finalMessage: 'hi', events: [], tools: [] } };
  const skillFired = { name: 'skill-fired', type: 'tool_used', tool: 'Skill' };
  const message = { name: 'says-hi', type: 'regex', pattern: 'hi' };
  const graded = await gradeRun([skillFired, message], empty, { baseline: true });
  assert.equal(graded.score, 1);
  assert.equal(graded.results[0].indicator, true);
  assert.equal((await gradeRun([skillFired, message], empty)).score, 0.5);
  // A must-not-load check marked arm: both still counts.
  const notUsed = { name: 'skill-not-used', type: 'tool_used', tool: 'Skill', min: 0, max: 0, arm: 'both' };
  assert.equal((await gradeRun([notUsed], empty, { baseline: true })).results[0].indicator, undefined);
  // When every check would be excluded, they are scored normally.
  assert.equal((await gradeRun([skillFired], empty, { baseline: true })).score, 0);
});

test('retries a judge vote once when the call fails, and fails the check on a second failure', async () => {
  const grader = { name: 'final-message', type: 'llm', criteria: 'PASS if it reports.' };
  const run = { workspace: tmpdir(), createdFiles: [], transcript: { finalMessage: 'Done.', tools: [], events: [] } };

  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new Error('judge timed out after 120 s');
    return { pass: true, reason: 'Reports the outcome.' };
  };
  const [retried] = (await gradeRun([grader], run, { judge: flaky })).results;
  assert.equal(calls, 4, 'the failed first vote is retried once, then two more votes');
  assert.equal(retried.passed, true);
  assert.equal(retried.detail, 'judge votes: PASS PASS PASS');

  const broken = async () => { throw new Error('judge timed out after 120 s'); };
  const [failed] = (await gradeRun([grader], run, { judge: broken })).results;
  assert.equal(failed.passed, false);
  assert.match(failed.detail, /judge timed out after 120 s/);
});
