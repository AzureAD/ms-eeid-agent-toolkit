import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkSkillRouting, codeSpanPaths, markdownLinks } from '../../scripts/lib/skill-routing.mjs';

async function makeSkill(files) {
  const dir = await mkdtemp(join(tmpdir(), 'skill-routing-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

async function check(files) {
  const dir = await makeSkill(files);
  try {
    return await checkSkillRouting(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('extracts local Markdown links and skips anchors, URLs, and code blocks', () => {
  const text = [
    'See [a](references/a.md), [b](<references/b c.md>), [web](https://x.test), [top](#top).',
    '[ref]: references/d.md',
    '```',
    '[ignored](references/ignored.md)',
    '```',
  ].join('\n');
  assert.deepEqual(markdownLinks(text), ['references/a.md', 'references/b c.md', 'references/d.md']);
});

test('extracts file names in code spans and skips globs', () => {
  assert.deepEqual(codeSpanPaths('Read `v2-api-core.md`, `references/x.md`, `v2-*.md`, `src/app.ts`.'),
    ['v2-api-core.md', 'references/x.md']);
});

test('a skill whose files are all reachable passes', async () => {
  const result = await check({
    'SKILL.md': 'Load [the guide](references/api/guide.md) and `assets/plan.md`.',
    'references/api/guide.md': 'Then read `detail.md` and `references/shared.md`.',
    'references/api/detail.md': 'Details.',
    'references/shared.md': 'Shared.',
    'assets/plan.md': 'Template.',
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.reached.size, 5);
});

test('a broken Markdown link is reported', async () => {
  const result = await check({ 'SKILL.md': 'See [missing](references/missing.md).' });
  assert.match(result.errors.join('\n'), /points to a missing file/);
});

test('a link that leaves the skill is reported', async () => {
  const result = await check({ 'SKILL.md': 'See [outside](../other/SKILL.md).' });
  assert.match(result.errors.join('\n'), /outside the skill/);
});

test('a missing skill path in a code span is reported', async () => {
  const result = await check({ 'SKILL.md': 'Read `references/nope.md`.' });
  assert.match(result.errors.join('\n'), /`references\/nope.md` names a missing file/);
});

test('a bare file name that lives in another folder is reported', async () => {
  const result = await check({
    'SKILL.md': 'Read [guide](references/api/guide.md) and [patterns](references/patterns.md).',
    'references/api/guide.md': 'Use `patterns.md`.',
    'references/patterns.md': 'Patterns.',
  });
  assert.match(result.errors.join('\n'), /`patterns.md` isn't next to this file/);
});

test('an orphan reference file is reported', async () => {
  const result = await check({
    'SKILL.md': 'No links.',
    'references/orphan.md': 'Nobody links here.',
  });
  assert.match(result.errors.join('\n'), /references\/orphan.md isn't reachable from SKILL.md/);
});

test('customer file names and SKILL.md in code spans are ignored', async () => {
  const result = await check({
    'SKILL.md': 'Write `plan.md` and `report.md`; read `package.json`; see `SKILL.md`.',
  });
  assert.deepEqual(result.errors, []);
});

test('a missing SKILL.md is reported', async () => {
  const result = await check({ 'references/a.md': 'A.' });
  assert.match(result.errors.join('\n'), /SKILL.md is missing/);
});
