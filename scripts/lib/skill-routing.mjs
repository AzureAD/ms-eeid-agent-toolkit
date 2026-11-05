import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

// Folders whose files an agent loads on demand. Every file in them must be
// reachable from SKILL.md, or the agent can never find it.
const ROUTED_FOLDERS = ['references', 'assets', 'scripts'];

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function listFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile() && entry.name !== '.gitkeep') files.push(path);
  }
  return files;
}

function stripFencedCode(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
}

// Local Markdown link destinations: [text](dest), ![alt](dest), and [label]: dest.
export function markdownLinks(text) {
  const prose = stripFencedCode(text);
  const links = [];
  for (const match of prose.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"\n]*["'])?\s*\)/g)) {
    links.push(match[1] ?? match[2]);
  }
  for (const match of prose.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)) {
    links.push(match[1] ?? match[2]);
  }
  return links
    .filter((link) => !link.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(link))
    .map((link) => decodeURIComponent(link.split(/[?#]/)[0]))
    .filter(Boolean);
}

// File names written as inline code, such as `v2-api-core.md` or
// `references/flows-and-scope.md`. Globs and customer files (`plan.md`,
// `package.json`) are filtered out by the caller.
export function codeSpanPaths(text) {
  const prose = stripFencedCode(text);
  const paths = [];
  for (const match of prose.matchAll(/`([^`\s]+\.(?:md|json|ya?ml|sh|mjs|js|py|txt|html))`/g)) {
    if (!/[*?{}<>]/.test(match[1])) paths.push(match[1]);
  }
  return paths;
}

// Checks one skill folder. Returns { errors, reached }, where errors are
// human-readable strings and reached is the set of files reachable from
// SKILL.md (paths relative to the skill folder).
export async function checkSkillRouting(skillDir) {
  const errors = [];
  const skillFile = join(skillDir, 'SKILL.md');
  const rel = (path) => relative(skillDir, path).split(sep).join('/');
  if (!await exists(skillFile)) {
    return { errors: [`${basename(skillDir)}: SKILL.md is missing.`], reached: new Set() };
  }

  const allFiles = await listFiles(skillDir);
  const byName = new Map();
  for (const file of allFiles) {
    const name = basename(file);
    byName.set(name, [...(byName.get(name) ?? []), file]);
  }

  const reached = new Set([skillFile]);
  const queue = [skillFile];
  const follow = (target) => {
    if (!reached.has(target)) {
      reached.add(target);
      if (target.endsWith('.md')) queue.push(target);
    }
  };

  while (queue.length > 0) {
    const file = queue.shift();
    const text = await readFile(file, 'utf8');
    const where = rel(file);

    for (const link of markdownLinks(text)) {
      const target = resolve(dirname(file), link);
      if (!target.startsWith(skillDir + sep)) {
        errors.push(`${where}: link "${link}" points outside the skill.`);
      } else if (!await exists(target)) {
        errors.push(`${where}: link "${link}" points to a missing file.`);
      } else {
        follow(target);
      }
    }

    for (const path of codeSpanPaths(text)) {
      const isSkillPath = ROUTED_FOLDERS.some((folder) => path.startsWith(`${folder}/`));
      if (isSkillPath) {
        const fromRoot = resolve(skillDir, path);
        const fromHere = resolve(dirname(file), path);
        if (await exists(fromRoot)) follow(fromRoot);
        else if (await exists(fromHere)) follow(fromHere);
        else errors.push(`${where}: \`${path}\` names a missing file.`);
        continue;
      }
      if (path.includes('/') || path === 'SKILL.md') continue;
      // A bare file name: a skill file when one with that name exists in the
      // skill. It must sit next to the file that names it, so the reader
      // knows where to find it; anything else is a customer or project file.
      const matches = byName.get(path) ?? [];
      if (matches.length === 0) continue;
      const sibling = join(dirname(file), path);
      if (matches.includes(sibling)) {
        follow(sibling);
      } else {
        errors.push(`${where}: \`${path}\` isn't next to this file; name it by its path from the skill folder (${matches.map(rel).join(', ')}).`);
      }
    }
  }

  for (const file of allFiles) {
    const path = rel(file);
    const routed = ROUTED_FOLDERS.some((folder) => path.startsWith(`${folder}/`));
    if (routed && !reached.has(file)) {
      errors.push(`${path} isn't reachable from SKILL.md; link it from SKILL.md or a file SKILL.md reaches.`);
    }
  }

  return { errors, reached: new Set([...reached].map(rel)) };
}
