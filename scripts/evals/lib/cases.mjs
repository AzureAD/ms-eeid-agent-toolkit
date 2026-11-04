// Loads eval cases in the `claude plugin eval` layout so every agent runs the
// same files: <case>/prompt.md (front matter + prompt), optional case.yaml
// (context.scaffold_script), and graders/*.md (front matter + optional body).
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { parse } from 'yaml';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontMatter(text) {
  const match = FRONT_MATTER.exec(text);
  if (!match) return { data: {}, body: text.trim() };
  return { data: parse(match[1]) ?? {}, body: match[2].trim() };
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function loadCase(directory, evalDir) {
  const promptFile = join(directory, 'prompt.md');
  const caseFile = join(directory, 'case.yaml');
  const prompt = await isFile(promptFile) ? splitFrontMatter(await readFile(promptFile, 'utf8')) : { data: {}, body: '' };
  const yamlCase = await isFile(caseFile) ? parse(await readFile(caseFile, 'utf8')) ?? {} : {};
  const execution = yamlCase.execution ?? {};
  const settings = { ...yamlCase, ...execution, ...prompt.data };

  const graders = [...(yamlCase.graders ?? [])].map((grader) => ({ ...grader, criteria: grader.criteria ?? '' }));
  const graderDir = join(directory, 'graders');
  let graderFiles = [];
  try {
    graderFiles = (await readdir(graderDir)).filter((name) => name.endsWith('.md')).sort();
  } catch {
    // A case with only case.yaml graders has no graders/ folder.
  }
  for (const name of graderFiles) {
    const { data, body } = splitFrontMatter(await readFile(join(graderDir, name), 'utf8'));
    graders.push({ name: basename(name, '.md'), ...data, criteria: data.criteria ?? body });
  }
  if (graders.length === 0) throw new Error(`${relative(evalDir, directory)}: a case needs at least one grader.`);

  const scaffold = yamlCase.context?.scaffold_script;
  return {
    name: settings.name ?? basename(directory),
    path: relative(evalDir, directory).split(sep).join('/'),
    directory,
    prompt: prompt.body || execution.prompt || '',
    tags: settings.tags ?? [],
    runs: settings.runs ?? 3,
    maxTurns: settings.max_turns ?? 10,
    timeoutSeconds: settings.timeout_seconds ?? 300,
    allowedTools: settings.allowed_tools ?? [],
    scaffoldScript: scaffold ? join(directory, scaffold) : null,
    graders,
  };
}

// Every folder under evalDir holding a prompt.md or case.yaml is a case.
// Folders named fixtures, scripts, or results are skipped.
export async function loadCases(evalDir) {
  const cases = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const names = entries.map((entry) => entry.name);
    if (names.includes('prompt.md') || names.includes('case.yaml')) {
      cases.push(await loadCase(directory, evalDir));
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !['fixtures', 'scripts', 'results', 'node_modules'].includes(entry.name)) {
        await walk(join(directory, entry.name));
      }
    }
  }
  await walk(evalDir);
  return cases.sort((a, b) => a.path.localeCompare(b.path));
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*');
  return new RegExp(`^${escaped}$`);
}

// Filters by --case glob (matched against name or path) and --tag (any match).
export function selectCases(cases, { caseGlob, tags = [] } = {}) {
  const pattern = caseGlob ? globToRegExp(caseGlob) : null;
  return cases.filter((testCase) =>
    (!pattern || pattern.test(testCase.name) || pattern.test(testCase.path)) &&
    (tags.length === 0 || tags.some((tag) => testCase.tags.includes(tag))));
}

export { globToRegExp };
