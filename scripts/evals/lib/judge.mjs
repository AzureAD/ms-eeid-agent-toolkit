// LLM judge for `llm` graders. Each vote is one model call with no tools that
// must end with "VERDICT: PASS" or "VERDICT: FAIL".
import { spawn } from 'node:child_process';

export function judgePrompt(criteria, evidence) {
  return [
    'You are grading the output of an AI coding agent against a rubric.',
    'Read the rubric and the evidence, then decide.',
    '',
    '## Rubric',
    criteria.trim(),
    '',
    '## Evidence',
    evidence.trim() || '(empty)',
    '',
    'Reply with one or two sentences of reasoning, then a last line that is exactly',
    '"VERDICT: PASS" or "VERDICT: FAIL".',
  ].join('\n');
}

export function parseVerdict(output) {
  const matches = [...output.matchAll(/VERDICT:\s*(PASS|FAIL)/gi)];
  if (matches.length === 0) return false;
  return matches[matches.length - 1][1].toUpperCase() === 'PASS';
}

// The judge's reasoning: the text before its last VERDICT line, on one line,
// shortened so reports stay readable.
export function parseReason(output, maxLength = 400) {
  const matches = [...output.matchAll(/VERDICT:\s*(PASS|FAIL)/gi)];
  const end = matches.length ? matches[matches.length - 1].index : output.length;
  const reason = output.slice(0, end).replace(/\s+/g, ' ').trim();
  if (!reason) return matches.length ? '(no reasoning given)' : '(no verdict given)';
  return reason.length > maxLength ? `${reason.slice(0, maxLength - 1)}…` : reason;
}

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error.code === 'ENOENT'
        ? new Error(`judge command "${command}" not found; pass --judge with another judge, or put it on your PATH (for claude, or set CLAUDE_BIN)`)
        : error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else if (timedOut) reject(new Error(`judge timed out after ${Math.round(timeoutMs / 1000)} s`));
      else reject(new Error(`judge exited ${code ?? `on signal ${signal}`}: ${stderr.trim().slice(-300)}`));
    });
  });
}

// kind: "claude" (Claude Code CLI, `claude -p`), "copilot" (Copilot CLI with
// every tool denied), or "none" (llm graders are skipped). Each vote returns
// { pass, reason }.
export function createJudge(kind, { model, claudeBin = process.env.CLAUDE_BIN ?? 'claude', copilotBin = 'copilot' } = {}) {
  if (kind === 'none') return null;
  return async (criteria, evidence) => {
    const prompt = judgePrompt(criteria, evidence);
    let output;
    if (kind === 'claude') {
      const args = ['-p', prompt, '--output-format', 'text', '--max-turns', '1'];
      if (model) args.push('--model', model);
      output = await runCommand(claudeBin, args, 120_000);
    } else if (kind === 'copilot') {
      const args = ['-p', prompt, '-s', '--no-auto-update', '--deny-tool', 'shell', '--deny-tool', 'write', '--deny-tool', 'url'];
      if (model) args.push('--model', model);
      output = await runCommand(copilotBin, args, 120_000);
    } else {
      throw new Error(`unknown judge "${kind}"`);
    }
    return { pass: parseVerdict(output), reason: parseReason(output) };
  };
}
