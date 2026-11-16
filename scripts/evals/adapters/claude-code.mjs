// Claude Code adapter. Instead of driving Claude Code run by run, it hands the
// whole suite to `claude plugin eval`, which gives every run a fresh config,
// Claude Code's OS sandbox, and its own grading. The adapter translates the
// runner's options, then converts Claude's aggregate-result.json into the
// runner's result document so every agent reports the same way.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { agentEnv } from '../lib/env.mjs';

export function buildClaudeArgs(options, { evalDirRel, outDir }) {
  const args = [
    'plugin', 'eval', '.',
    '--eval-dir', evalDirRel,
    '--scaffold',
    '--allow-tools', 'Bash', 'Write', 'Edit',
    '--no-publish',
    // The runner only evaluates this repository's own skills and cases, so it
    // answers Claude Code's "trust this directory" prompt for the user.
    '--trust-plugin',
    '--output-dir', outDir,
    '--threshold', String(options.threshold ?? 1),
    // --baseline adds Claude Code's no-skill arm; both scores are reported.
    '--ablation', options.baseline ? 'with-without' : 'none',
  ];
  for (const tag of options.tags ?? []) args.push('--tag', tag);
  if (options.caseGlob) args.push('--case', options.caseGlob);
  if (options.runs) args.push('--runs', String(options.runs));
  if (options.model) args.push('--model', options.model);
  if (options.judgeModel) args.push('--judge-model', options.judgeModel);
  if (options.keep) args.push('--keep-temp');
  return args;
}

function convertRun(run, n) {
  return {
    n,
    score: run.score ?? 0,
    error: run.error ?? null,
    results: (run.graders ?? []).map((grader) => ({
      name: grader.name,
      weight: grader.weight ?? 1,
      passed: Boolean(grader.passed),
      skipped: grader.scored === false,
      detail: grader.explanation ?? '',
    })),
  };
}

// Converts `claude plugin eval`'s aggregate-result.json to the runner's
// result document.
export function convertAggregate(aggregate, { root, evalDir, skill, threshold }) {
  const cases = (aggregate.cases ?? []).map((testCase) => {
    const withRuns = (testCase.arms?.with ?? []).map(convertRun);
    const withoutRuns = (testCase.arms?.without ?? []).map(convertRun);
    const score = testCase.aggregates?.score ?? 0;
    const converted = {
      name: testCase.name,
      path: testCase.dir ? relative(evalDir, join(root, testCase.dir)).split(sep).join('/') : testCase.name,
      score,
      passed: score >= threshold,
      runs: withRuns,
    };
    if (withoutRuns.length > 0) {
      converted.withoutRuns = withoutRuns;
      converted.withoutScore = withoutRuns.reduce((sum, run) => sum + run.score, 0) / withoutRuns.length;
    }
    return converted;
  });
  return {
    agent: 'claude-code',
    skill,
    baseline: cases.some((testCase) => testCase.withoutScore !== undefined),
    threshold,
    startedAt: aggregate.startedAt,
    finishedAt: new Date().toISOString(),
    costUsd: aggregate.costUsd,
    partial: Boolean(aggregate.partial),
    cases,
    passed: cases.filter((testCase) => testCase.passed).length,
    total: cases.length,
  };
}

// Claude Code accepts these aliases (always the latest model of that family)
// as well as full model names.
const CLAUDE_MODEL_ALIASES = ['fable', 'opus', 'sonnet', 'haiku'];

export const claudeCodeAdapter = {
  name: 'claude-code',

  async listModels() {
    return [
      ...CLAUDE_MODEL_ALIASES,
      '(or a full model name, for example claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5)',
    ];
  },

  // Runs the whole suite through `claude plugin eval`. Its progress and its
  // first-run "trust this directory" prompt show in your terminal.
  async runSuite({ options, root, evalDir, outDir, skill }) {
    const evalDirRel = relative(root, evalDir).split(sep).join('/');
    const args = buildClaudeArgs(options, { evalDirRel, outDir });
    const claudeBin = options.claudeBin ?? process.env.CLAUDE_BIN ?? 'claude';
    await new Promise((resolve, reject) => {
      const child = spawn(claudeBin, args, { cwd: root, stdio: 'inherit', env: agentEnv() });
      child.on('error', (error) => reject(new Error(`could not start ${claudeBin}: ${error.message}`)));
      // Exit 1 (a case below the threshold) and 2 (partial run) still write
      // results; the runner reads them below.
      child.on('close', () => resolve());
    });
    let aggregate;
    try {
      aggregate = JSON.parse(await readFile(join(outDir, 'aggregate-result.json'), 'utf8'));
    } catch {
      throw new Error(`claude plugin eval wrote no results to ${outDir}; see its output above.`);
    }
    return convertAggregate(aggregate, { root, evalDir, skill, threshold: options.threshold ?? 1 });
  },
};
