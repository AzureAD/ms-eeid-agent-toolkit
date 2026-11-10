// Routing check for every skill in the repository: links and file names
// resolve, and every file under references/, assets/, or scripts/ is
// reachable from SKILL.md. New skills are picked up automatically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { checkSkillRouting } from '../../scripts/lib/skill-routing.mjs';
import { skillsRoot } from '../../scripts/lib/paths.mjs';

const skills = (await readdir(skillsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

test('the repository has at least one skill', () => {
  assert.ok(skills.length > 0);
});

for (const name of skills) {
  test(`${name}: every route resolves and every reference is reachable`, async () => {
    const { errors } = await checkSkillRouting(join(skillsRoot, name));
    assert.deepEqual(errors, []);
  });
}
