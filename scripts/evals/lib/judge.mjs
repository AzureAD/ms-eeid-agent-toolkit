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

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error.code === 'ENOENT'
        ? new Error(`judge command "${command}" not found; pass --judge with another judge, or put it on your PATH (for claude, or set CLAUDE_BIN)`)
        : error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`judge exited ${code}: ${stderr.trim().slice(-300)}`));
    });
  });
}

// kind: "claude" (Claude Code CLI, `claude -p`), "copilot" (Copilot CLI with
// every tool denied), or "none" (llm graders are skipped).
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
    return parseVerdict(output);
  };
}
