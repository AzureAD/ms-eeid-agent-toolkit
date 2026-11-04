import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases, selectCases, splitFrontMatter } from '../../scripts/evals/lib/cases.mjs';
import { gradeRun } from '../../scripts/evals/lib/graders.mjs';
import { parseVerdict } from '../../scripts/evals/lib/judge.mjs';
import { normalizeCopilotEvents, permissionArgs } from '../../scripts/evals/adapters/copilot.mjs';
import { parseArgs, runSuite } from '../../scripts/evals/run.mjs';

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
  assert.equal(cases.length, 16);
  const plan = cases.find((testCase) => testCase.name === 'plan-sign-in-sspr');
  assert.equal(plan.path, 'behavior/plan-sign-in-sspr');
  assert.ok(plan.scaffoldScript.endsWith('scaffold.sh'));
  assert.ok(plan.allowedTools.includes('Write'));
  assert.deepEqual(plan.graders.find((grader) => grader.name === 'plan-is-draft').target,
    { source: 'file', path: PLAN });
  assert.match(plan.graders.find((grader) => grader.name === 'stops-for-approval').criteria, /^PASS if/);
});

test('selects cases by tag and by name glob', async () => {
  const cases = await loadCases(evalDir);
  assert.equal(selectCases(cases, { tags: ['smoke'] }).length, 3);
  assert.deepEqual(selectCases(cases, { caseGlob: 'plan-sign-*' }).map((testCase) => testCase.name).sort(),
    ['plan-sign-in-only', 'plan-sign-in-sspr', 'plan-sign-up-only']);
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

test('Copilot permissions deny URLs, and deny writes and shell unless the case allows them', () => {
  const readOnly = permissionArgs(['Read', 'Skill']);
  assert.deepEqual(readOnly, ['--deny-tool', 'url', '--deny-tool', 'write', '--deny-tool', 'shell']);
  const writing = permissionArgs(['Read', 'Write', 'Bash']);
  assert.ok(writing.includes('write') && writing.includes('shell(git:*)'));
  assert.ok(!writing.includes('--allow-all-tools'));
});

test('parses runner arguments', () => {
  const options = parseArgs(['--agent', 'copilot', '--skill', 'x', '--tag', 'smoke', '--tag', 'plan', '--runs', '1', '--baseline']);
  assert.deepEqual(options.tags, ['smoke', 'plan']);
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
      await mkdir(join(workspace, '.native-auth-v2-migration'), { recursive: true });
      await writeFile(join(workspace, PLAN), GOOD_PLAN);
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
      { skill: 'eeid-native-auth-migrate-v2', caseGlob: 'plan-sign-in-sspr', runs: 1, threshold: 1, tags: [], outDir },
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
    { tags: ['smoke', 'plan'], caseGlob: 'plan-*', runs: 1, threshold: 0.8, model: 'm', judgeModel: 'j', keep: true },
    { evalDirRel: 'tests/evals/x', outDir: '/out' },
  );
  assert.deepEqual(args.slice(0, 5), ['plugin', 'eval', '.', '--eval-dir', 'tests/evals/x']);
  for (const expected of [['--ablation', 'none'], ['--threshold', '0.8'], ['--case', 'plan-*'], ['--runs', '1'],
    ['--model', 'm'], ['--judge-model', 'j'], ['--output-dir', '/out']]) {
    const at = args.indexOf(expected[0]);
    assert.equal(args[at + 1], expected[1], expected[0]);
  }
  assert.deepEqual(args.filter((arg, i) => args[i - 1] === '--tag'), ['smoke', 'plan']);
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
      name: 'plan-sign-in-sspr',
      dir: 'tests/evals/eeid-native-auth-migrate-v2/behavior/plan-sign-in-sspr',
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
  assert.equal(document.cases[0].path, 'behavior/plan-sign-in-sspr');
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
    "writeFileSync(out + '/aggregate-result.json', JSON.stringify({ cases: [{ name: 'trigger-upgrade-native-auth',",
    "  dir: 'tests/evals/eeid-native-auth-migrate-v2/triggering/trigger-upgrade-native-auth', aggregates: { score: 1 },",
    "  arms: { with: [{ score: 1, error: null, graders: [] }] } }] }));",
  ].join('\n'));
  await import('node:fs/promises').then(({ chmod }) => chmod(fakeClaude, 0o755));
  const outDir = join(work, 'out');
  try {
    const document = await runSuite(
      { skill: 'eeid-native-auth-migrate-v2', caseGlob: 'trigger-upgrade-native-auth', threshold: 1, tags: [], outDir, claudeBin: fakeClaude },
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
      { skill: 'eeid-native-auth-migrate-v2', caseGlob: 'trigger-upgrade-native-auth', runs: 1, threshold: 1, tags: [], baseline: true, outDir },
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
