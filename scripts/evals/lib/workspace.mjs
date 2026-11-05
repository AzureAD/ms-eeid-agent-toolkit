// A fresh workspace per run: an empty temporary folder, seeded by the case's
// scaffold script, with a snapshot of its files so graders can tell which
// files the agent created.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

export async function listWorkspaceFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(relative(root, path).split(sep).join('/'));
    }
  }
  await walk(root);
  return files.sort();
}

function runScript(script, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [script], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`scaffold failed (exit ${code}): ${output.trim().slice(-500)}`));
    });
  });
}

export async function createWorkspace(testCase) {
  const root = await mkdtemp(join(tmpdir(), 'eeid-eval-'));
  const workspace = join(root, 'workspace');
  await mkdir(workspace);
  if (testCase.scaffoldScript) await runScript(testCase.scaffoldScript, workspace, 120_000);
  const seededFiles = new Set(await listWorkspaceFiles(workspace));
  return {
    root,
    workspace,
    async createdFiles() {
      return (await listWorkspaceFiles(workspace)).filter((file) => !seededFiles.has(file));
    },
    async dispose() {
      await rm(root, { recursive: true, force: true });
    },
  };
}
