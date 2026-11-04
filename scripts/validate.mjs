import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseDocument } from 'yaml';
import { checkSkillRouting } from './lib/skill-routing.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const release = args.includes('--release');
const copyright = 'Microsoft Corporation. All rights reserved.';
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function validateJson(filename, schemaName, ajv) {
  const schema = await readJson(join(root, 'packaging/schemas', schemaName));
  const value = await readJson(join(root, filename));
  const validator = ajv.compile(schema);
  check(validator(value), `${filename}: ${ajv.errorsText(validator.errors)}`);
  return value;
}

function isInside(base, path) {
  const part = relative(base, path);
  return !isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`);
}

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    check(!entry.isSymbolicLink(), `Symlinks are not allowed in skills: ${relative(root, path)}`);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported skill filesystem entry: ${relative(root, path)}`);
  }
  return files;
}

async function validateLinks(file, text, skillRoot) {
  const definitions = new Map();
  for (const match of text.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gm)) {
    definitions.set(match[1].trim().toLowerCase(), match[2] ?? match[3]);
  }
  const destinations = [...definitions.values()];
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"\n]*["'])?\s*\)/g)) {
    destinations.push(match[1] ?? match[2]);
  }
  for (const match of text.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const label = (match[2] || match[1]).trim().toLowerCase();
    check(definitions.has(label), `${relative(root, file)}: undefined link reference [${label}].`);
  }
  for (const destination of destinations) {
    if (destination.startsWith('#') || /^(?:https?:|mailto:)/i.test(destination)) continue;
    check(!/^[a-z][a-z0-9+.-]*:/i.test(destination), `Unsupported local link: ${destination}`);
    const pathPart = decodeURIComponent(destination.split(/[?#]/)[0]);
    check(!isAbsolute(pathPart), `Absolute runtime link is not allowed: ${destination}`);
    const target = resolve(dirname(file), pathPart);
    check(isInside(skillRoot, target), `Runtime link escapes skill: ${destination}`);
    const actual = await realpath(target);
    check(isInside(skillRoot, actual), `Runtime link resolves outside skill: ${destination}`);
  }
}

// Eval cases are folders holding a prompt.md or case.yaml, under
// tests/evals/<skill>/<type>/ (nested folders allowed).
async function countEvalCases(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }
  if (entries.some((entry) => entry.isFile() && ['prompt.md', 'case.yaml'].includes(entry.name))) return 1;
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) count += await countEvalCases(join(directory, entry.name));
  }
  return count;
}

async function validateSkill(name) {
  const directory = join(root, 'skills', name);
  check(name.length <= 64 && /^eeid-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name),
    `Invalid repository skill name: ${name}`);
  const skillFile = join(directory, 'SKILL.md');
  const text = await readFile(skillFile, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(text);
  check(match, `${name}: SKILL.md must begin with YAML frontmatter.`);
  const document = parseDocument(match[1]);
  check(document.errors.length === 0 && document.warnings.length === 0,
    `${name}: invalid YAML: ${[...document.errors, ...document.warnings].map((error) => error.message).join('; ')}`);
  const data = document.toJS();
  check(data && typeof data === 'object' && !Array.isArray(data), `${name}: frontmatter must be a mapping.`);
  check(data.name === name, `${name}: frontmatter name must match its directory.`);
  check(typeof data.description === 'string' && data.description.trim().length > 0 &&
    data.description.length <= 1024, `${name}: description must be 1-1024 characters.`);
  check(data.license === 'MIT', `${name}: license must be MIT.`);
  check(data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata),
    `${name}: metadata must be a mapping.`);
  check(Object.values(data.metadata).every((value) => typeof value === 'string'),
    `${name}: metadata values must be strings.`);
  check(data.metadata.copyright === copyright, `${name}: copyright metadata is missing or incorrect.`);
  check(['draft', 'ready'].includes(data.metadata.status), `${name}: metadata.status must be draft or ready.`);
  check(semver.test(data.metadata.version ?? ''),
    `${name}: metadata.version must be a numeric semantic version, optionally with a prerelease suffix.`);
  check(data.metadata.status !== 'ready' || Number(semver.exec(data.metadata.version)[1]) >= 1,
    `${name}: a ready skill must be at version 1.0.0 or higher.`);
  check(/^## Version[ \t]*$/m.test(match[2]),
    `${name}: SKILL.md must have a "## Version" section (see templates/skill/SKILL.md.template).`);
  if (data.compatibility !== undefined) {
    check(typeof data.compatibility === 'string' && data.compatibility.trim().length > 0 &&
      data.compatibility.length <= 500, `${name}: compatibility must be 1-500 characters.`);
  }
  check(match[2].trim().length > 0, `${name}: instructions must not be empty.`);
  check(!release || data.metadata.status === 'ready', `${name}: draft skills cannot be released.`);
  for (const file of await filesIn(directory)) {
    if (!file.endsWith('.md')) continue;
    const content = await readFile(file, 'utf8');
    await validateLinks(file, content, directory);
  }
  const routing = await checkSkillRouting(directory);
  check(routing.errors.length === 0, `${name}: routing check failed:\n  ${routing.errors.join('\n  ')}`);
  for (const type of ['triggering', 'behavior']) {
    const cases = await countEvalCases(join(root, 'tests/evals', name, type));
    check(cases > 0 || data.metadata.status !== 'ready',
      `${name}: a ready skill needs at least one ${type} eval case in tests/evals/${name}/${type}/.`);
    if (cases === 0) console.warn(`Eval warning: ${name} has no ${type} eval cases (tests/evals/${name}/${type}/).`);
  }
  console.log(`Validated ${name} (${data.metadata.status})`);
  if (data.metadata.status === 'draft') {
    console.warn(`Draft warning: ${name} is discoverable but not a working customer capability.`);
  }
}

async function main() {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: npm run validate [-- --release]');
    return;
  }
  check(args.length === 0 || (args.length === 1 && release), 'Unknown arguments. Use --release or --help.');
  const ajv = new Ajv2020({ allErrors: true });
  const plugin = await validateJson('plugin.json', 'plugin.schema.json', ajv);
  await validateJson('mcp.json', 'mcp.schema.json', ajv);
  const packageJson = await readJson(join(root, 'package.json'));
  check(semver.test(plugin.version),
    'plugin.json: use a numeric semantic version, optionally with a prerelease suffix.');
  check(plugin.version === packageJson.version, 'package.json and plugin.json versions must match.');
  check(plugin.license === 'MIT' && packageJson.license === 'MIT', 'Plugin and package licenses must be MIT.');
  const skillsRoot = join(root, 'skills');
  check(!(await lstat(skillsRoot)).isSymbolicLink(), 'skills/ must not be a symlink.');
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    check(!entry.isSymbolicLink(), `Symlink is not allowed: skills/${entry.name}`);
    if (entry.isDirectory()) {
      await validateSkill(entry.name);
      count++;
    } else {
      check(entry.name === '.gitkeep', `Unexpected file in skills/: ${entry.name}`);
    }
  }
  check(count > 0, 'No skills found.');
  console.log(`Validated portable manifests and ${count} skill(s)${release ? ' with release checks' : ''}.`);
}

main().catch((error) => {
  console.error(`Validation failed: ${error.message}`);
  process.exitCode = 1;
});
