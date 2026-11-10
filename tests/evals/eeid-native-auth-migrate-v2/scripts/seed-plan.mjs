#!/usr/bin/env node
// Writes a seeded migration plan into the current eval workspace (after
// seed-fixture.sh committed the app), filling in what is only known at run
// time: the installed skill version, today's date, the baseline commit, and
// each baseline file's `git hash-object`. The plan is left uncommitted, as a
// real migration leaves its working folder.
//   node seed-plan.mjs <plan file in ../fixtures/plans/>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillsRoot } from '../../../../scripts/lib/paths.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name) throw new Error('usage: seed-plan.mjs <plan file>');
const skillFile = join(skillsRoot, 'eeid-native-auth-migrate-v2/SKILL.md');
const version = /\n\s+version:\s*"?([^"\n]+)"?/.exec(readFileSync(skillFile, 'utf8'))?.[1];
if (!version) throw new Error(`no metadata.version in ${skillFile}`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const plan = readFileSync(join(here, '../fixtures/plans', name), 'utf8')
  .replaceAll('{{SKILL_VERSION}}', version)
  .replaceAll('{{TODAY}}', new Date().toISOString().slice(0, 10))
  .replaceAll('{{COMMIT}}', git('rev-parse', 'HEAD'))
  .replace(/^(\s+)(\S+): \{\{HASH\}\}$/gm, (line, indent, path) => `${indent}${path}: ${git('hash-object', path)}`);
if (plan.includes('{{')) throw new Error(`unfilled placeholder in ${name}`);
mkdirSync('.native-auth-v2-migration', { recursive: true });
writeFileSync('.native-auth-v2-migration/plan.md', plan);
