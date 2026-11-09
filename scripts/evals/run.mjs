// Runs a skill's eval cases (the `claude plugin eval` layout) on an agent
// through an adapter and writes the same report for every agent.
//
//   npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2 --tag triggering --runs 1
//
// Most adapters run the agent case by case and the runner grades each run.
// An adapter with runSuite() (claude-code) hands the whole suite to the
// agent's own eval tool and converts its results.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeCodeAdapter } from './adapters/claude-code.mjs';
import { copilotAdapter } from './adapters/copilot.mjs';
import { loadCases, selectCases } from './lib/cases.mjs';
import { gradeRun } from './lib/graders.mjs';
import { createJudge } from './lib/judge.mjs';
import { createWorkspace } from './lib/workspace.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const ADAPTERS = { 'claude-code': claudeCodeAdapter, copilot: copilotAdapter };

const USAGE = `Usage: npm run eval:agent -- --agent <agent> --skill <skill> [options]

  --agent <agent>        ${Object.keys(ADAPTERS).join(' | ')}
  --skill <skill>        Skill folder name under skills/

Options:
  --tag <tag>            Only cases of this type: triggering or behavior (repeatable)
  --case <name>          Only this case (* matches any text)
  --runs <n>             Runs per case (default: the case's runs, else 3)
  --threshold <0..1>     Score a case needs to pass (default 1)
  --model <model>        Model for the agent (see --list-models)
  --judge-model <model>  Model that grades rubric checks (see --list-models)
  --baseline             Also run each case without the skill and report both scores
  --keep                 Keep each run's workspace
  --list-models          List the model names the agent accepts`;

export function parseArgs(argv) {
  const options = { tags: [], threshold: 1 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} needs a value.\n\n${USAGE}`);
      return argv[++i];
    };
    if (arg === '--agent') options.agent = next();
    else if (arg === '--skill') options.skill = next();
    else if (arg === '--case') options.caseGlob = next();
    else if (arg === '--tag') options.tags.push(next());
    else if (arg === '--runs') options.runs = Number(next());
    else if (arg === '--threshold') options.threshold = Number(next());
    else if (arg === '--model') options.model = next();
    else if (arg === '--judge-model') options.judgeModel = next();
    else if (arg === '--baseline') options.baseline = true;
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--list-models') options.listModels = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option ${arg}.\n\n${USAGE}`);
  }
  if (options.help) return options;
  if (!options.agent || !ADAPTERS[options.agent]) throw new Error(`--agent must be one of: ${Object.keys(ADAPTERS).join(', ')}.\n\n${USAGE}`);
  if (options.listModels) return options;
  if (!options.skill) throw new Error(`--skill is required.\n\n${USAGE}`);
  if (Number.isNaN(options.threshold) || options.threshold < 0 || options.threshold > 1) throw new Error('--threshold must be between 0 and 1.');
  if (options.runs !== undefined && !(options.runs >= 1)) throw new Error('--runs must be 1 or more.');
  return options;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function average(runs) {
  return runs.reduce((sum, run) => sum + run.score, 0) / runs.length;
}

// Runs every selected case and returns the result document. `adapter` and
// `judge` can be injected (tests use a fake adapter).
export async function runSuite(options, { adapter, judge, log = console.log } = {}) {
  const skill = options.skill;
  const evalDir = resolve(root, options.evalDir ?? join('tests/evals', skill));
  const skillDir = options.skillDir ?? join(root, 'skills', skill);
  const cases = selectCases(await loadCases(evalDir), options);
  if (cases.length === 0) throw new Error('No eval cases matched.');
  const outDir = options.outDir ?? join(evalDir, 'results', `${adapter.name}-${timestamp()}`);
  await mkdir(outDir, { recursive: true });

  if (adapter.runSuite) {
    const delegated = await adapter.runSuite({ options, root, evalDir, outDir, skill });
    return writeReport(delegated, outDir, log);
  }

  const document = {
    agent: adapter.name, skill, baseline: Boolean(options.baseline), threshold: options.threshold,
    startedAt: new Date().toISOString(), cases: [],
  };
  const arms = options.baseline ? [true, false] : [true];
  for (const testCase of cases) {
    const runsByArm = { true: [], false: [] };
    const count = options.runs ?? testCase.runs;
    for (let n = 1; n <= count; n++) {
      for (const withSkill of arms) {
        const runDir = join(outDir, testCase.path, `${withSkill ? '' : 'without-skill-'}run-${n}`);
        await mkdir(runDir, { recursive: true });
        let workspace;
        let run;
        try {
          await adapter.prepare({ skillName: skill, skillDir, withSkill });
          workspace = await createWorkspace(testCase);
          const result = await adapter.run({
            prompt: testCase.prompt, workspace: workspace.workspace, allowedTools: testCase.allowedTools,
            maxTurns: testCase.maxTurns, timeoutSeconds: testCase.timeoutSeconds, skillName: skill, outDir: runDir, options,
          });
          const graded = await gradeRun(testCase.graders, {
            transcript: result.transcript, workspace: workspace.workspace, createdFiles: await workspace.createdFiles(),
          }, { judge, baseline: Boolean(options.baseline) });
          run = { n, error: result.error, ...graded, workspace: options.keep ? workspace.workspace : undefined };
          await writeFile(join(runDir, 'transcript.json'), JSON.stringify(result.transcript, null, 2));
        } catch (error) {
          run = { n, error: error.message, score: 0, results: [] };
        } finally {
          if (workspace && !options.keep) await workspace.dispose();
        }
        runsByArm[withSkill].push(run);
        const label = withSkill ? '' : ' (without skill)';
        log(`  ${testCase.name} run ${n}/${count}${label}: score ${run.score.toFixed(2)}${run.error ? `  error: ${run.error}` : ''}`);
        for (const result of run.results) {
          const mark = result.skipped ? '-' : result.passed ? '✓' : '✗';
          log(`    ${mark} ${result.name}: ${result.detail}${result.indicator ? ' (not scored in a baseline comparison)' : ''}`);
        }
      }
    }
    const runs = runsByArm.true;
    const score = average(runs);
    const entry = { name: testCase.name, path: testCase.path, tags: testCase.tags, score, passed: score >= options.threshold, runs };
    if (options.baseline) {
      entry.withoutRuns = runsByArm.false;
      entry.withoutScore = average(runsByArm.false);
    }
    document.cases.push(entry);
    log(`${entry.passed ? '✓' : '✗'} ${testCase.name}  score ${score.toFixed(2)}${options.baseline ? `, without skill ${entry.withoutScore.toFixed(2)}` : ''}`);
  }
  document.finishedAt = new Date().toISOString();
  document.passed = document.cases.filter((testCase) => testCase.passed).length;
  document.total = document.cases.length;
  return writeReport(document, outDir, log);
}

// Writes results.json and summary.md, the same for every agent.
// Lists every scored check that failed, per run, with the judge's reasoning
// for rubric checks, so a failure can be understood without the raw files.
function failedChecks(document) {
  const lines = [];
  for (const testCase of document.cases) {
    testCase.runs.forEach((run, index) => {
      for (const result of run.results ?? []) {
        if (result.passed || result.skipped || result.indicator) continue;
        lines.push(`- **${testCase.name}**, run ${index + 1}, \`${result.name}\`: ${result.detail}`);
        (result.votes ?? []).forEach((vote, voteIndex) => {
          if (vote.reason) lines.push(`  - Vote ${voteIndex + 1} (${vote.pass ? 'PASS' : 'FAIL'}): ${vote.reason}`);
        });
      }
    });
  }
  return lines.length ? ['## Failed checks', '', ...lines, ''] : [];
}

export async function writeReport(document, outDir, log = console.log) {
  const baseline = document.cases.some((testCase) => testCase.withoutScore !== undefined);
  const lines = [
    `# Eval results: ${document.skill} on ${document.agent}`,
    '',
    `${document.passed} of ${document.total} cases passed (threshold ${document.threshold}).${document.partial ? ' Partial run: not every case finished.' : ''}`,
    '',
    baseline ? '| Case | Score | Without skill | Runs | Errors |' : '| Case | Score | Runs | Errors |',
    baseline ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |',
    ...document.cases.map((testCase) => {
      const errors = testCase.runs.filter((run) => run.error).map((run) => run.error).join('; ');
      const without = baseline ? ` ${testCase.withoutScore === undefined ? '—' : testCase.withoutScore.toFixed(2)} |` : '';
      return `| ${testCase.name} | ${testCase.score.toFixed(2)} |${without} ${testCase.runs.length} | ${errors} |`;
    }),
    '',
    ...failedChecks(document),
  ];
  await writeFile(join(outDir, 'results.json'), JSON.stringify(document, null, 2));
  await writeFile(join(outDir, 'summary.md'), lines.join('\n'));
  log(`\n${document.passed} of ${document.total} case(s) passed. Report: ${relative(process.cwd(), join(outDir, 'summary.md'))}`);
  return document;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }
  const adapter = ADAPTERS[options.agent];
  if (options.listModels) {
    console.log((await adapter.listModels()).join('\n'));
    return;
  }
  // The agent under test also grades rubric checks, so no second tool is needed.
  const judge = adapter.runSuite ? null : createJudge(adapter.name, { model: options.judgeModel });
  const document = await runSuite(options, { adapter, judge });
  if (document.passed < document.total) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Eval run failed: ${error.message}`);
    process.exitCode = 1;
  });
}
