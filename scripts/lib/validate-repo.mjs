// Repository rules checked by `npm run validate`. Every rule adds a message
// to `errors` instead of stopping, so one run reports every problem.
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseDocument } from 'yaml';
import { layout as repoLayout, pluginName, repoPath } from './paths.mjs';
import { checkSkillRouting } from './skill-routing.mjs';

export const COPYRIGHT = 'Microsoft Corporation. All rights reserved.';
export const AUTHOR = 'Microsoft';
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
// The Agent Skills specification recommends keeping SKILL.md under 500 lines
// and about 5,000 tokens; we enforce the line count and warn on length.
export const MAX_SKILL_LINES = 500;
export const WARN_SKILL_CHARS = 20000;
export const MAX_DESCRIPTION = 1024;

async function exists(path) {
  return Boolean(await lstat(path).catch(() => null));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function isInside(base, path) {
  const part = relative(base, path);
  return !isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`);
}

// Reads a skill's SKILL.md front matter. Returns { data, body, errors }.
export function parseSkillFile(name, text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(text);
  if (!match) return { errors: [`${name}: SKILL.md must begin with YAML frontmatter.`] };
  const document = parseDocument(match[1]);
  if (document.errors.length || document.warnings.length) {
    return { errors: [`${name}: invalid YAML: ${[...document.errors, ...document.warnings].map((e) => e.message).join('; ')}`] };
  }
  const data = document.toJS();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { errors: [`${name}: frontmatter must be a mapping.`] };
  }
  return { data, body: match[2], errors: [] };
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

export async function validateRepository({ root, release = false } = {}) {
  const paths = repoLayout(root);
  const rel = (path) => repoPath(path, paths.root);
  const errors = [];
  const warnings = [];
  const notes = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
    return Boolean(condition);
  };

  async function filesIn(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (!check(!entry.isSymbolicLink(), `Symlinks are not allowed in skills: ${rel(path)}`)) continue;
      if (entry.isDirectory()) files.push(...await filesIn(path));
      else if (entry.isFile()) files.push(path);
      else errors.push(`Unsupported skill filesystem entry: ${rel(path)}`);
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
      check(definitions.has(label), `${rel(file)}: undefined link reference [${label}].`);
    }
    for (const destination of destinations) {
      if (destination.startsWith('#') || /^(?:https?:|mailto:)/i.test(destination)) continue;
      if (!check(!/^[a-z][a-z0-9+.-]*:/i.test(destination), `${rel(file)}: unsupported local link: ${destination}`)) continue;
      const pathPart = decodeURIComponent(destination.split(/[?#]/)[0]);
      if (!check(!isAbsolute(pathPart), `${rel(file)}: absolute runtime link is not allowed: ${destination}`)) continue;
      const target = resolve(dirname(file), pathPart);
      if (!check(isInside(skillRoot, target), `${rel(file)}: runtime link escapes skill: ${destination}`)) continue;
      const actual = await realpath(target).catch(() => null);
      if (!check(actual, `${rel(file)}: link target does not exist: ${destination}`)) continue;
      check(isInside(skillRoot, actual), `${rel(file)}: runtime link resolves outside skill: ${destination}`);
    }
  }

  // Lists each new skill must appear in, so nothing ships undocumented or unowned.
  const rootReadme = await readFile(paths.rootReadme, 'utf8').catch(() => '');
  const pluginReadme = await readFile(paths.pluginReadme, 'utf8').catch(() => '');
  const codeowners = await readFile(paths.codeowners, 'utf8').catch(() => '');
  const skillsRel = rel(paths.skillsRoot);

  async function validateSkill(name) {
    const directory = join(paths.skillsRoot, name);
    check(name.length <= 64 && /^eeid-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name), `Invalid repository skill name: ${name}`);
    const skillFile = join(directory, 'SKILL.md');
    const text = await readFile(skillFile, 'utf8').catch(() => null);
    if (!check(text !== null, `${name}: SKILL.md is missing.`)) return;
    const parsed = parseSkillFile(name, text);
    if (parsed.errors.length) {
      errors.push(...parsed.errors);
      return;
    }
    const { data, body } = parsed;
    check(data.name === name, `${name}: frontmatter name must match its directory.`);
    check(typeof data.description === 'string' && data.description.trim().length > 0 &&
      data.description.length <= MAX_DESCRIPTION,
      `${name}: description must be 1-${MAX_DESCRIPTION} characters (it has ${String(data.description ?? '').length}).`);
    check(data.license === 'MIT', `${name}: license must be MIT.`);
    if (!check(data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata),
      `${name}: metadata must be a mapping.`)) return;
    const metadata = data.metadata;
    check(Object.values(metadata).every((value) => typeof value === 'string'), `${name}: metadata values must be strings.`);
    check(metadata.author === AUTHOR, `${name}: metadata.author must be "${AUTHOR}".`);
    check(metadata.copyright === COPYRIGHT, `${name}: copyright metadata is missing or incorrect.`);
    check(['draft', 'ready'].includes(metadata.status), `${name}: metadata.status must be draft or ready.`);
    check(SEMVER.test(metadata.version ?? ''),
      `${name}: metadata.version (the skill version) must be a numeric semantic version, optionally with a prerelease suffix.`);
    check(/^## Version[ \t]*$/m.test(body),
      `${name}: SKILL.md must have a "## Version" section (see templates/skill/SKILL.md.template).`);
    if (data.compatibility !== undefined) {
      check(typeof data.compatibility === 'string' && data.compatibility.trim().length > 0 &&
        data.compatibility.length <= 500, `${name}: compatibility must be 1-500 characters.`);
    }
    check(body.trim().length > 0, `${name}: instructions must not be empty.`);
    const lines = text.split('\n').length;
    check(lines <= MAX_SKILL_LINES,
      `${name}: SKILL.md has ${lines} lines; keep it at ${MAX_SKILL_LINES} or fewer and move detail into references/.`);
    if (text.length > WARN_SKILL_CHARS) {
      warnings.push(`${name}: SKILL.md has ${text.length} characters (about ${Math.round(text.length / 4)} tokens); the specification suggests about 5,000 tokens.`);
    }
    check(!release || metadata.status === 'ready', `${name}: draft skills cannot be released.`);

    // Documentation and ownership for every skill.
    const link = `${skillsRel}/${name}/SKILL.md`;
    check(rootReadme.split('\n').some((line) => line.startsWith('|') && line.includes(`(${link})`)),
      `${name}: add a row for it to the skills table in README.md, linking ${link}.`);
    check(pluginReadme.split('\n').some((line) => line.startsWith('|') && line.includes(`(skills/${name}/SKILL.md)`)),
      `${name}: add a row for it to the skills table in ${rel(paths.pluginReadme)}, linking skills/${name}/SKILL.md.`);
    check(codeowners.split('\n').some((line) => line.trim().split(/\s+/)[0] === `/${skillsRel}/${name}/` &&
      line.trim().split(/\s+/).length > 1),
      `${name}: add an owner for /${skillsRel}/${name}/ to .github/CODEOWNERS.`);

    for (const file of await filesIn(directory)) {
      if (!file.endsWith('.md')) continue;
      await validateLinks(file, await readFile(file, 'utf8'), directory);
    }
    const routing = await checkSkillRouting(directory);
    check(routing.errors.length === 0, `${name}: routing check failed:\n  ${routing.errors.join('\n  ')}`);
    for (const type of ['triggering', 'behavior']) {
      const cases = await countEvalCases(join(paths.evals, name, type));
      check(cases > 0 || metadata.status !== 'ready',
        `${name}: a ready skill needs at least one ${type} eval case in tests/evals/${name}/${type}/.`);
      if (cases === 0) warnings.push(`${name} has no ${type} eval cases (tests/evals/${name}/${type}/).`);
    }
    notes.push(`Validated ${name} (${metadata.status}, skill version ${metadata.version})`);
    if (metadata.status === 'draft') {
      warnings.push(`${name} is a draft: it is discoverable but not a working customer capability.`);
    }
  }

  // Manifests.
  const ajv = new Ajv2020({ allErrors: true });
  async function validateJson(path, schemaName) {
    let value;
    try {
      value = await readJson(path);
    } catch (error) {
      errors.push(`${rel(path)}: ${error.code === 'ENOENT' ? 'missing' : error.message}`);
      return null;
    }
    if (schemaName) {
      const validator = ajv.compile(await readJson(join(paths.schemas, schemaName)));
      check(validator(value), `${rel(path)}: ${ajv.errorsText(validator.errors)}`);
    }
    return value;
  }
  const plugin = await validateJson(paths.pluginManifest, 'plugin.schema.json');
  await validateJson(paths.mcpManifest, 'mcp.schema.json');
  const claude = await validateJson(paths.claudeManifest);
  const packageJson = await validateJson(paths.packageJson);
  if (plugin) {
    check(plugin.name === pluginName, `${rel(paths.pluginManifest)}: name must be ${pluginName}.`);
    check(SEMVER.test(plugin.version ?? ''),
      `${rel(paths.pluginManifest)}: the plugin version must be a numeric semantic version, optionally with a prerelease suffix.`);
    check(plugin.license === 'MIT', `${rel(paths.pluginManifest)}: license must be MIT.`);
    if (packageJson) {
      check(plugin.version === packageJson.version,
        `package.json version (${packageJson.version}) must match the plugin version in ${rel(paths.pluginManifest)} (${plugin.version}). Run npm run release to sync them.`);
      check(packageJson.license === 'MIT', 'package.json: license must be MIT.');
    }
    if (claude) {
      for (const field of ['name', 'version', 'description', 'license']) {
        check(JSON.stringify(claude[field]) === JSON.stringify(plugin[field]),
          `${rel(paths.claudeManifest)}: ${field} must match ${rel(paths.pluginManifest)}. Run npm run release to sync them.`);
      }
    }
  }

  // Catalogs: each lists the plugin by name and points at its folder. They
  // carry no version: agents read it from the plugin's own manifest.
  const pluginRel = rel(paths.pluginDir);
  for (const [agent, path] of Object.entries(paths.catalogs)) {
    const catalog = await validateJson(path);
    if (!catalog) continue;
    const entries = Array.isArray(catalog.plugins) ? catalog.plugins : [];
    const entry = entries.find((item) => item?.name === pluginName);
    if (!check(entry, `${rel(path)} (${agent} catalog) must list the ${pluginName} plugin.`)) continue;
    const source = typeof entry.source === 'string' ? entry.source : entry.source?.path;
    check(typeof source === 'string' && source.replace(/^\.\//, '').replace(/\/$/, '') === pluginRel,
      `${rel(path)}: the ${pluginName} source must be ./${pluginRel}.`);
    check(entry.version === undefined && catalog.metadata?.version === undefined,
      `${rel(path)}: don't set a version in the catalog; agents read the plugin version from the plugin's manifest.`);
  }

  for (const path of [paths.pluginReadme, paths.changelog]) {
    check(await exists(path), `${rel(path)} is missing.`);
  }

  // Skills.
  check(!(await exists(join(paths.root, 'skills'))),
    `skills/ at the repository root is not used; skills go in ${skillsRel}/.`);
  const skillsStat = await lstat(paths.skillsRoot).catch(() => null);
  let count = 0;
  if (check(skillsStat?.isDirectory() && !skillsStat.isSymbolicLink(), `${skillsRel}/ must be a real directory.`)) {
    for (const entry of await readdir(paths.skillsRoot, { withFileTypes: true })) {
      if (!check(!entry.isSymbolicLink(), `Symlink is not allowed: ${skillsRel}/${entry.name}`)) continue;
      if (entry.isDirectory()) {
        await validateSkill(entry.name);
        count++;
      } else {
        check(entry.name === '.gitkeep', `Unexpected file in ${skillsRel}/: ${entry.name}`);
      }
    }
  }
  check(count > 0, 'No skills found.');
  return { errors, warnings, notes, skills: count };
}
