// Grades one run. A run is described by an agent-neutral transcript that the
// adapters produce:
//   { finalMessage: string, tools: [{ name, input }], events: [...] }
// Tool names use the Claude Code vocabulary (Read, Write, Edit, Bash, Skill,
// Glob, Grep) so the same graders work for every agent; each adapter maps its
// own tool names and normalizes file paths to `file_path`.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { globToRegExp } from './cases.mjs';

const FREE_TYPES = new Set(['regex', 'tool_used', 'tool_order', 'file_exists']);

async function targetText(target, run) {
  if (!target || target === 'last_message') return run.transcript.finalMessage ?? '';
  if (target === 'trace') return run.transcript.events.map((event) => JSON.stringify(event)).join('\n');
  if (target === 'files') return run.createdFiles.join('\n');
  if (typeof target === 'object' && target.source === 'file') {
    try {
      return await readFile(join(run.workspace, target.path), 'utf8');
    } catch {
      throw new Error(`file "${target.path}" does not exist`);
    }
  }
  throw new Error(`unsupported target ${JSON.stringify(target)}`);
}

function matchingCalls(run, spec) {
  const tool = typeof spec === 'string' ? spec : spec.tool;
  const inputMatch = typeof spec === 'string' ? null : spec.input_match;
  const pattern = inputMatch ? new RegExp(inputMatch) : null;
  return run.transcript.tools
    .map((call, index) => ({ ...call, index }))
    .filter((call) => call.name === tool && (!pattern || pattern.test(JSON.stringify(call.input ?? {}))));
}

async function gradeRegex(grader, run) {
  const text = await targetText(grader.target, run);
  const regex = new RegExp(grader.pattern, `${grader.flags ?? ''}g`.replace(/g+/g, 'g'));
  const count = [...text.matchAll(regex)].length;
  const mode = grader.match ?? 'contains';
  if (mode === 'not_contains') return { passed: count === 0, detail: count === 0 ? 'absent as expected' : `found ${count}x` };
  const exact = /^count:(\d+)$/.exec(mode);
  if (exact) return { passed: count === Number(exact[1]), detail: `found ${count}x, expected ${exact[1]}` };
  return { passed: count > 0, detail: count > 0 ? `matched ${grader.pattern}` : `no match for ${grader.pattern}` };
}

function gradeToolUsed(grader, run) {
  const count = matchingCalls(run, grader).length;
  const min = grader.min ?? 1;
  const max = grader.max ?? Infinity;
  return { passed: count >= min && count <= max, detail: `${grader.tool} called ${count}x (expected ${min}..${max === Infinity ? '∞' : max})` };
}

function gradeToolOrder(grader, run) {
  const before = matchingCalls(run, grader.before)[0];
  const after = matchingCalls(run, grader.after)[0];
  const passed = Boolean(before && after && before.index < after.index);
  return { passed, detail: passed ? 'order as expected' : 'tools missing or out of order' };
}

function gradeFileExists(grader, run) {
  const pattern = globToRegExp(grader.path);
  const found = run.createdFiles.some((file) => pattern.test(file));
  const expected = grader.exists ?? true;
  return { passed: found === expected, detail: `${grader.path} ${found ? 'created' : 'not created'}` };
}

async function gradeLlm(grader, run, judge) {
  if (!judge) return { skipped: true, detail: 'no judge configured' };
  const evidence = await targetText(grader.focus, run);
  const votes = [];
  for (let i = 0; i < 3; i++) {
    // A judge returns { pass, reason }; a plain boolean is accepted too. A
    // call that times out or errors is retried once; a second failure fails
    // the check with that error.
    let vote;
    try {
      vote = await judge(grader.criteria, evidence);
    } catch {
      vote = await judge(grader.criteria, evidence);
    }
    votes.push(typeof vote === 'object' && vote !== null
      ? { pass: Boolean(vote.pass), reason: vote.reason ?? '' }
      : { pass: Boolean(vote), reason: '' });
  }
  const passes = votes.filter((vote) => vote.pass).length;
  return {
    passed: passes >= 2,
    detail: `judge votes: ${votes.map((vote) => (vote.pass ? 'PASS' : 'FAIL')).join(' ')}`,
    votes,
  };
}

// In a with/without-skill comparison, a check that the skill loaded can never
// pass without the skill, so (as `claude plugin eval` does) it is reported in
// both arms but left out of both scores. `arm: both` keeps a check scored
// (for example "the skill must not load"); `arm: with-only` excludes any check.
export function excludedFromBaseline(grader) {
  if (grader.arm === 'both') return false;
  return grader.arm === 'with-only' || (grader.type === 'tool_used' && grader.tool === 'Skill');
}

// Returns { score, results }. Graders that can't be evaluated here (a missing
// judge, the reference-transcript `baseline` type) are reported as skipped and
// left out of the score; so are excluded checks in a baseline comparison
// (unless every check would be excluded). A grader that throws scores as a
// failure.
export async function gradeRun(graders, run, { judge, baseline = false } = {}) {
  const excludeAll = baseline && graders.every(excludedFromBaseline);
  const results = [];
  for (const grader of graders) {
    let outcome;
    try {
      if (grader.type === 'regex') outcome = await gradeRegex(grader, run);
      else if (grader.type === 'tool_used') outcome = gradeToolUsed(grader, run);
      else if (grader.type === 'tool_order') outcome = gradeToolOrder(grader, run);
      else if (grader.type === 'file_exists') outcome = gradeFileExists(grader, run);
      else if (grader.type === 'llm') outcome = await gradeLlm(grader, run, judge);
      else outcome = { skipped: true, detail: `grader type "${grader.type}" isn't supported by this runner` };
    } catch (error) {
      outcome = { passed: false, detail: `grader threw: ${error.message}` };
    }
    const indicator = baseline && !excludeAll && excludedFromBaseline(grader);
    results.push({
      name: grader.name, type: grader.type, weight: grader.weight ?? 1, free: FREE_TYPES.has(grader.type),
      ...outcome, ...(indicator ? { indicator: true } : {}),
    });
  }
  const scored = results.filter((result) => !result.skipped && !result.indicator);
  const total = scored.reduce((sum, result) => sum + result.weight, 0);
  const earned = scored.reduce((sum, result) => sum + (result.passed ? result.weight : 0), 0);
  return { score: total === 0 ? 0 : earned / total, results };
}
