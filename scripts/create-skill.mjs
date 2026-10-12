import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);

async function main() {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: npm run skill:create -- <eeid-name> [--description "<description>"]');
    return;
  }
  const [name, flag, suppliedDescription] = args;
  if (
    !name ||
    name.length > 64 ||
    !/^eeid-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ||
    (args.length !== 1 && (args.length !== 3 || flag !== '--description'))
  ) {
    throw new Error('Usage: npm run skill:create -- <eeid-name> [--description "<description>"]');
  }
  const description = suppliedDescription ??
    `Draft scaffold for ${name}. Not implemented; do not use for customer changes.`;
  if (!description.trim() || description.length > 1024 || /[\r\n]/.test(description)) {
    throw new Error('Description must be a nonempty single line of at most 1024 characters.');
  }
  const template = await readFile(join(root, 'templates/skill/SKILL.md.template'), 'utf8');
  const values = {
    name: JSON.stringify(name),
    description: JSON.stringify(description),
    title: name.split('-').join(' '),
  };
  for (const key of Object.keys(values)) {
    if (!template.includes(`{{${key}}}`)) {
      throw new Error(`Skill template is missing {{${key}}}.`);
    }
  }
  const content = template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${placeholder}`);
    return values[key];
  });
  const skillsRoot = join(root, 'skills');
  if (await realpath(skillsRoot) !== skillsRoot) {
    throw new Error('The skills directory must not be a symlink.');
  }
  const destination = join(skillsRoot, name);
  try {
    await mkdir(destination);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Refusing to overwrite ${destination}.`);
    throw error;
  }
  await writeFile(join(destination, 'SKILL.md'), content, { flag: 'wx' });
  await Promise.all(['references', 'scripts', 'assets'].map(
    (directory) => mkdir(join(destination, directory)),
  ));
  console.log(`Created draft skill: skills/${name}/SKILL.md`);
  console.log('Complete the instructions and evaluations before marking it ready.');
}

main().catch((error) => {
  console.error(`Skill creation failed: ${error.message}`);
  process.exitCode = 1;
});
