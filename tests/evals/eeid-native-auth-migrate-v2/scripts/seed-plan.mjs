#!/usr/bin/env node
// Writes a seeded migration plan into the current eval workspace (after
// seed-fixture.sh committed the app), filling in what is only known at run
// time: the installed skill version, today's date, the baseline commit, and
// each baseline file's `git hash-object`. The plan's working notes
// (<plan>.working-notes.md next to it) are written too, with the plan's
// revision. Both are left uncommitted, as a real migration leaves its working
// folder.
//   node seed-plan.mjs <plan file in ../fixtures/plans/> [--waiting "<error>"]
// --waiting seeds the plan as approved and stopped at its SDK step: status
// `applying`, the first shared step unticked with the note a failed SDK
// install leaves ("Waiting for the customer to install: <error>").
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillsRoot } from '../../../../scripts/lib/paths.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const [name, flag, waitingError] = process.argv.slice(2);
if (!name || (flag && (flag !== '--waiting' || !waitingError))) {
  throw new Error('usage: seed-plan.mjs <plan file> [--waiting "<error>"]');
}
const skillFile = join(skillsRoot, 'eeid-native-auth-migrate-v2/SKILL.md');
const version = /\n\s+version:\s*"?([^"\n]+)"?/.exec(readFileSync(skillFile, 'utf8'))?.[1];
if (!version) throw new Error(`no metadata.version in ${skillFile}`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

let plan = readFileSync(join(here, '../fixtures/plans', name), 'utf8')
  .replaceAll('{{SKILL_VERSION}}', version)
  .replaceAll('{{TODAY}}', new Date().toISOString().slice(0, 10))
  .replaceAll('{{COMMIT}}', git('rev-parse', 'HEAD'))
  .replace(/^(\s+)(\S+): \{\{HASH\}\}$/gm, (line, indent, path) => `${indent}${path}: ${git('hash-object', path)}`);
if (plan.includes('{{')) throw new Error(`unfilled placeholder in ${name}`);
if (waitingError) plan = waitingForInstall(plan, waitingError);
const revision = /^revision:\s*(\d+)/m.exec(plan)?.[1];
if (!revision) throw new Error(`no revision in ${name}`);
const notes = readFileSync(join(here, '../fixtures/plans', name.replace(/\.md$/, '.working-notes.md')), 'utf8')
  .replace(/^plan-revision:\s*\d+/m, `plan-revision: ${revision}`);
mkdirSync('.native-auth-v2-migration', { recursive: true });
writeFileSync('.native-auth-v2-migration/plan.md', plan);
writeFileSync('.native-auth-v2-migration/working-notes.md', notes);

// The plan as a run leaves it when the SDK install failed right after approval.
export function waitingForInstall(text, error) {
  const today = new Date().toISOString().slice(0, 10);
  const replaceOnce = (input, pattern, replacement) => {
    if (!pattern.test(input)) throw new Error(`seed-plan --waiting: no match for ${pattern}`);
    return input.replace(pattern, replacement);
  };
  let plan = replaceOnce(text, /^status: draft\b/m, 'status: applying');
  plan = replaceOnce(plan, /^approved: null\b/m, `approved: { revision: 1, date: ${today}, how: "confirmed in chat" }`);
  plan = replaceOnce(plan, /^validation-baseline: null\b/m, 'validation-baseline: skipped');
  plan = replaceOnce(plan, /(### Shared\n- \[ \] [^\n]*)/, `$1\n  Waiting for the customer to install: ${error}`);
  const rows = [...plan.matchAll(/^\| (\d+) \| /gm)];
  if (rows.length === 0) throw new Error('seed-plan --waiting: no "Decisions and revisions" rows');
  const last = rows[rows.length - 1];
  const lineEnd = plan.indexOf('\n', last.index);
  const row = `| ${Number(last[1]) + 1} | ${today} | Revision 1 approved | "Approved." | 1 |`;
  return lineEnd === -1 ? `${plan}\n${row}\n` : `${plan.slice(0, lineEnd + 1)}${row}\n${plan.slice(lineEnd + 1)}`;
}
