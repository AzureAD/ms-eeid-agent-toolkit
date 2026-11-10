import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pluginDir, repoPath, repoRoot as root, skillsRoot } from './lib/paths.mjs';

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
  if (await realpath(skillsRoot) !== join(await realpath(pluginDir), 'skills')) {
    throw new Error(`${repoPath(skillsRoot)} must not be a symlink.`);
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
  const evalsDestination = join(root, 'tests/evals', name);
  await mkdir(evalsDestination);
  const evalsReadme = (await readFile(join(root, 'templates/evals/README.md.template'), 'utf8'))
    .replace(/\{\{name\}\}/g, name);
  await writeFile(join(evalsDestination, 'README.md'), evalsReadme, { flag: 'wx' });
  for (const type of ['triggering', 'behavior']) {
    await mkdir(join(evalsDestination, type));
    await writeFile(join(evalsDestination, type, '.gitkeep'), '', { flag: 'wx' });
  }
  console.log(`Created draft skill: ${repoPath(join(destination, 'SKILL.md'))}`);
  console.log(`Created eval folders: tests/evals/${name}/triggering and behavior`);
  console.log('Next: add rows for it to the skills tables in README.md and the plugin README,');
  console.log('an owner in .github/CODEOWNERS, then write the skill and its evals (see CONTRIBUTING.md).');
}

main().catch((error) => {
  console.error(`Skill creation failed: ${error.message}`);
  process.exitCode = 1;
});
