// CHANGELOG.md entries: one per plugin version, newest first. No package
// dependencies, so the tag workflow can use it without npm ci.

const ENTRY_HEADING = /^## (\S+)/gm;

export function changelogVersions(text) {
  return [...text.matchAll(ENTRY_HEADING)].map((match) => match[1]);
}

// The body of one version's entry, without its heading.
export function changelogEntry(text, version) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
  if (start === -1) return null;
  let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

export function formatEntry({ version, date, note, action, skills }) {
  const lines = [`## ${version} - ${date}`, '', note.trim(), ''];
  if (action) lines.push(`**Action needed for work done with an earlier version:** ${action.trim()}`, '');
  if (skills.length) {
    lines.push('| Skill | Skill version |', '| --- | --- |');
    for (const skill of skills) lines.push(`| \`${skill.name}\` | ${skill.version} |`);
    lines.push('');
  }
  return lines.join('\n');
}

// Puts `entry` at the top of the changelog, replacing any entry this branch
// added before (headings that aren't in the base changelog).
export function insertEntry(changelog, baseChangelog, entry) {
  const known = new Set(changelogVersions(baseChangelog));
  let text = changelog.replace(/\nNo version has been released yet\.\n?/, '\n');
  for (const version of changelogVersions(text)) {
    if (known.has(version)) continue;
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.startsWith(`## ${version}`));
    let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
    if (end === -1) end = lines.length;
    lines.splice(start, end - start);
    text = lines.join('\n');
  }
  const lines = text.replace(/\n+$/, '\n').split('\n');
  const first = lines.findIndex((line) => line.startsWith('## '));
  const at = first === -1 ? lines.length : first;
  const head = lines.slice(0, at).join('\n').replace(/\n+$/, '');
  const rest = lines.slice(at).join('\n').replace(/^\n+/, '');
  return `${head}\n\n${entry.replace(/\n+$/, '')}\n${rest ? `\n${rest}` : ''}`.replace(/\n+$/, '\n');
}
