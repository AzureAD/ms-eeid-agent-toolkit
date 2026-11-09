// GitHub Copilot CLI adapter.
//
// Isolation: every run uses a dedicated COPILOT_HOME (default
// ~/.cache/eeid-agent-evals/copilot-home, override with
// EEID_EVAL_COPILOT_HOME), so personal skills, settings, and memories don't
// leak in. The skill under test is the only skill in $COPILOT_HOME/skills.
// Sign in once into that home: COPILOT_HOME=<home> copilot login
//
// Safety defaults: URLs are denied; writes are allowed only when the case
// lists Write or Edit (Copilot keeps writes inside the working directory);
// shell access is limited to SAFE_COMMANDS when the case lists Bash.
import { execFile, spawn } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SAFE_COMMANDS = ['git', 'node', 'npm', 'ls', 'cat', 'head', 'tail', 'wc', 'find', 'grep', 'rg', 'pwd', 'diff', 'mkdir'];

const TOOL_NAMES = new Map(Object.entries({
  view: 'Read', read: 'Read', read_file: 'Read',
  create: 'Write', write: 'Write', write_file: 'Write', create_file: 'Write',
  edit: 'Edit', str_replace: 'Edit', str_replace_editor: 'Edit', apply_patch: 'Edit', replace: 'Edit', edit_file: 'Edit',
  bash: 'Bash', shell: 'Bash', powershell: 'Bash', run_in_terminal: 'Bash',
  glob: 'Glob', find_files: 'Glob',
  grep: 'Grep', search: 'Grep', rg: 'Grep',
  skill: 'Skill', use_skill: 'Skill', load_skill: 'Skill',
}));

export function copilotHome() {
  return process.env.EEID_EVAL_COPILOT_HOME ?? join(homedir(), '.cache', 'eeid-agent-evals', 'copilot-home');
}

export function permissionArgs(allowedTools) {
  const args = ['--deny-tool', 'url'];
  const tools = new Set(allowedTools);
  if (tools.has('Write') || tools.has('Edit')) args.push('--allow-tool', 'write');
  else args.push('--deny-tool', 'write');
  if (tools.has('Bash')) {
    for (const command of SAFE_COMMANDS) args.push('--allow-tool', `shell(${command}:*)`);
  } else {
    args.push('--deny-tool', 'shell');
  }
  return args;
}

function parseArguments(value) {
  if (typeof value !== 'string') return value ?? {};
  try {
    return JSON.parse(value);
  } catch {
    return { command: value };
  }
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object') return {};
  const normalized = { ...input };
  const path = input.file_path ?? input.path ?? input.filePath ?? input.filename;
  if (typeof path === 'string') normalized.file_path = path;
  return normalized;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('');
  }
  return '';
}

// Turns Copilot's JSONL events into the agent-neutral transcript. The event
// schema isn't documented, so this walks every object looking for tool calls
// (an object naming a tool plus its arguments) and assistant messages.
export function normalizeCopilotEvents(lines, skillName) {
  const events = [];
  const tools = [];
  const calls = new Map();
  let finalMessage = '';

  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const rawName = value.toolName ?? value.tool_name ??
      (typeof value.name === 'string' && ('arguments' in value || 'input' in value || 'args' in value || /tool/i.test(value.type ?? '')) ? value.name : undefined);
    if (typeof rawName === 'string') {
      const input = normalizeInput(parseArguments(value.arguments ?? value.input ?? value.args ?? value.parameters));
      const id = value.toolCallId ?? value.tool_call_id ?? value.callId ?? value.id;
      const key = id ? `id:${id}` : `${rawName}:${JSON.stringify(input)}`;
      const name = TOOL_NAMES.get(rawName.toLowerCase()) ?? rawName;
      if (name === 'Skill') input.skill = input.skill ?? input.name ?? input.skillName ?? input.skill_name;
      const existing = calls.get(key);
      if (!existing) {
        const call = { name, input, rawName };
        calls.set(key, call);
        tools.push(call);
      } else if (Object.values(existing.input).every((field) => field === undefined)) {
        // A later event for the same call (for example tool.execution_start
        // after argument-less events) carries the arguments.
        existing.input = input;
      }
    }
    // Only a real assistant message counts; reasoning, deltas, and turn or
    // idle events also have "assistant" in their type but aren't the reply.
    const type = value.type ?? '';
    const isAssistant = (value.role === 'assistant' || /assistant/i.test(type)) &&
      !/reasoning|delta|turn|idle|message_start|intent/i.test(type);
    const text = textOf(value.content ?? value.text ?? value.message ?? value.data?.content ?? value.data?.text);
    if (isAssistant && text.trim()) finalMessage = text;
    for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child);
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      // Streaming fragments (assistant.tool_call_delta, assistant.message_delta,
      // ...) repeat what the complete events say, without arguments or with
      // partial text. Skip them.
      if (typeof event.type === 'string' && event.type.endsWith('_delta')) continue;
      events.push(event);
      visit(event);
    } catch {
      events.push({ type: 'text', text: line });
    }
  }

  // A skill counts as loaded when the agent used a skill tool for it or read
  // its SKILL.md from the skills folder.
  const marker = `skills/${skillName}/SKILL.md`;
  if (skillName && !tools.some((call) => call.name === 'Skill' && call.input.skill === skillName) &&
      tools.some((call) => JSON.stringify(call.input).includes(marker))) {
    tools.push({ name: 'Skill', input: { skill: skillName }, rawName: '(read SKILL.md)' });
  }
  return { finalMessage, tools, events };
}

// Reads the model list from `copilot help config` (the `model` setting).
export function parseCopilotModels(helpText) {
  const section = /`model`:[^\n]*\n((?:\s+- "[^"]+"\n?)+)/.exec(helpText);
  return section ? [...section[1].matchAll(/- "([^"]+)"/g)].map((match) => match[1]) : [];
}

export const copilotAdapter = {
  name: 'copilot',

  listModels() {
    return new Promise((resolve, reject) => {
      execFile('copilot', ['help', 'config'], { env: { ...process.env, NO_COLOR: '1' } }, (error, stdout) => {
        if (error) reject(new Error(`could not run copilot: ${error.message}`));
        else resolve(['auto (Copilot picks)', ...parseCopilotModels(stdout)]);
      });
    });
  },

  async prepare({ skillName, skillDir, withSkill }) {
    const home = copilotHome();
    const skillsDir = join(home, 'skills');
    await rm(skillsDir, { recursive: true, force: true });
    await mkdir(skillsDir, { recursive: true });
    if (withSkill) await cp(skillDir, join(skillsDir, skillName), { recursive: true });
  },

  run({ prompt, workspace, allowedTools, timeoutSeconds, skillName, outDir, options = {} }) {
    const args = [
      '-p', prompt,
      '-C', workspace,
      '--output-format', 'json',
      '--no-auto-update',
      '--share', join(outDir, 'transcript.md'),
      ...permissionArgs(allowedTools),
    ];
    if (options.model) args.push('--model', options.model);
    const env = { ...process.env, COPILOT_HOME: copilotHome(), COPILOT_AUTO_UPDATE: 'false', NO_COLOR: '1' };

    return new Promise((resolve) => {
      const child = spawn(options.copilotBin ?? 'copilot', args, { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutSeconds * 1000);
      const finish = async (code, spawnError) => {
        clearTimeout(timer);
        await writeFile(join(outDir, 'events.jsonl'), stdout);
        await writeFile(join(outDir, 'stderr.txt'), stderr);
        const transcript = normalizeCopilotEvents(stdout.split('\n'), skillName);
        let error = null;
        if (spawnError) error = `could not start copilot: ${spawnError.message}`;
        else if (timedOut) error = `timed out after ${timeoutSeconds}s`;
        else if (code !== 0) error = `exit ${code}: ${stderr.trim().split('\n').slice(-3).join(' ')}`;
        resolve({ transcript, error });
      };
      child.on('error', (spawnError) => finish(null, spawnError));
      child.on('close', (code) => finish(code));
    });
  },
};
