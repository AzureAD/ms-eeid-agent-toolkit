// Each repository rule in scripts/lib/validate-repo.mjs, checked against a
// small sample repository built in a temporary folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { layout, repoRoot } from '../../scripts/lib/paths.mjs';
import { validateRepository } from '../../scripts/lib/validate-repo.mjs';

const SKILL = 'eeid-sample';
const PLUGIN_DIR = '.github/plugins/eeid-toolkit';

function skillFile({ status = 'draft', version = '0.1.0', author = 'Microsoft', description = 'Sample skill.', extraLines = 0 } = {}) {
  return [
    '---',
    `name: ${SKILL}`,
    `description: ${JSON.stringify(description)}`,
    'license: MIT',
    'metadata:',
    ...(author ? [`  author: ${author}`] : []),
    '  copyright: Microsoft Corporation. All rights reserved.',
    `  status: ${status}`,
    `  version: "${version}"`,
    '---',
    '',
    '# Sample',
    '',
    '## Version',
    '',
    'The skill version is `metadata.version`.',
    ...Array.from({ length: extraLines }, () => 'More text.'),
    '',
  ].join('\n');
}

// Writes a valid sample repository; `change` edits the file map first.
async function sampleRepo(change = () => {}) {
  const root = await mkdtemp(join(tmpdir(), 'eeid-validate-'));
  const plugin = {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'eeid-toolkit',
    version: '0.1.0',
    description: 'Sample plugin.',
    license: 'MIT',
  };
  const { $schema, ...claude } = plugin;
  const catalog = { name: 'sample', owner: { name: 'Microsoft' }, plugins: [{ name: 'eeid-toolkit', source: `./${PLUGIN_DIR}` }] };
  const files = {
    'package.json': { name: 'sample', version: '0.1.0', license: 'MIT' },
    [`${PLUGIN_DIR}/plugin.json`]: plugin,
    [`${PLUGIN_DIR}/.claude-plugin/plugin.json`]: claude,
    [`${PLUGIN_DIR}/mcp.json`]: { $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json', mcpServers: {} },
    [`${PLUGIN_DIR}/README.md`]: `| Skill | What |\n| --- | --- |\n| [\`${SKILL}\`](skills/${SKILL}/SKILL.md) | Sample |\n`,
    [`${PLUGIN_DIR}/CHANGELOG.md`]: '# Changelog\n',
    [`${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`]: skillFile(),
    'README.md': `| Skill | What |\n| --- | --- |\n| [\`${SKILL}\`](${PLUGIN_DIR}/skills/${SKILL}/SKILL.md) | Sample |\n`,
    '.github/CODEOWNERS': `* @team\n/${PLUGIN_DIR}/skills/${SKILL}/ @owner\n`,
    '.claude-plugin/marketplace.json': catalog,
    '.github/plugin/marketplace.json': catalog,
    '.agents/plugins/marketplace.json': { name: 'sample', plugins: [{ name: 'eeid-toolkit', source: { source: 'local', path: `./${PLUGIN_DIR}` } }] },
  };
  change(files);
  for (const [path, content] of Object.entries(files)) {
    if (content === undefined) continue;
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  }
  await cp(layout().schemas, layout(root).schemas, { recursive: true });
  return root;
}

async function errorsFor(change, options = {}) {
  const root = await sampleRepo(change);
  try {
    return (await validateRepository({ root, ...options })).errors;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function addEvalCases(root) {
  for (const type of ['triggering', 'behavior']) {
    await mkdir(join(root, 'tests/evals', SKILL, type, 'case-1'), { recursive: true });
    await writeFile(join(root, 'tests/evals', SKILL, type, 'case-1', 'prompt.md'), 'Do it.');
  }
}

test('the sample repository passes', async () => {
  assert.deepEqual(await errorsFor(), []);
});

test('this repository passes', async () => {
  assert.deepEqual((await validateRepository({ root: repoRoot })).errors, []);
});

test('a ready skill at skill version 0.x passes release checks; a draft fails them', async () => {
  const root = await sampleRepo((files) => {
    files[`${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`] = skillFile({ status: 'ready', version: '0.3.0' });
  });
  try {
    await addEvalCases(root);
    assert.deepEqual((await validateRepository({ root, release: true })).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  const errors = await errorsFor(undefined, { release: true });
  assert.ok(errors.some((e) => e.includes('draft skills cannot be released')), errors.join('\n'));
});

test('a skill needs metadata.author: Microsoft', async () => {
  const errors = await errorsFor((files) => {
    files[`${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`] = skillFile({ author: null });
  });
  assert.ok(errors.some((e) => e.includes('metadata.author')), errors.join('\n'));
});

test('description and SKILL.md size limits', async () => {
  let errors = await errorsFor((files) => {
    files[`${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`] = skillFile({ description: 'x'.repeat(1025) });
  });
  assert.ok(errors.some((e) => e.includes('description must be 1-1024 characters')), errors.join('\n'));
  assert.deepEqual(await errorsFor((files) => {
    files[`${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`] = skillFile({ description: 'x'.repeat(1024) });
  }), []);
  errors = await errorsFor((files) => {
    files[`${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`] = skillFile({ extraLines: 500 });
  });
  assert.ok(errors.some((e) => e.includes('lines; keep it at 500 or fewer')), errors.join('\n'));
});

test('the plugin version is the same in plugin.json, .claude-plugin/plugin.json, and package.json', async () => {
  let errors = await errorsFor((files) => {
    files[`${PLUGIN_DIR}/.claude-plugin/plugin.json`].version = '0.2.0';
  });
  assert.ok(errors.some((e) => e.includes('.claude-plugin/plugin.json: version must match')), errors.join('\n'));
  errors = await errorsFor((files) => {
    files['package.json'].version = '0.2.0';
  });
  assert.ok(errors.some((e) => e.startsWith('package.json version (0.2.0) must match')), errors.join('\n'));
});

test('a new skill needs README rows and a CODEOWNERS entry', async () => {
  const errors = await errorsFor((files) => {
    files['README.md'] = '# Readme\n';
    files[`${PLUGIN_DIR}/README.md`] = '# Plugin\n';
    files['.github/CODEOWNERS'] = '* @team\n';
  });
  assert.ok(errors.some((e) => e.includes('skills table in README.md')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes(`skills table in ${PLUGIN_DIR}/README.md`)), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('.github/CODEOWNERS')), errors.join('\n'));
});

test('catalogs point at the plugin folder and carry no version', async () => {
  let errors = await errorsFor((files) => {
    files['.github/plugin/marketplace.json'].plugins[0].version = '0.1.0';
    files['.claude-plugin/marketplace.json'] = { ...files['.claude-plugin/marketplace.json'], plugins: [{ name: 'eeid-toolkit', source: './elsewhere' }] };
  });
  assert.ok(errors.some((e) => e.includes("don't set a version in the catalog")), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('source must be')), errors.join('\n'));
  errors = await errorsFor((files) => {
    files['.agents/plugins/marketplace.json'] = undefined;
  });
  assert.ok(errors.some((e) => e === '.agents/plugins/marketplace.json: missing'), errors.join('\n'));
});

test('skills/ at the repository root is rejected', async () => {
  const errors = await errorsFor((files) => {
    files['skills/eeid-old/SKILL.md'] = skillFile();
  });
  assert.ok(errors.some((e) => e.startsWith('skills/ at the repository root')), errors.join('\n'));
});

// Rules that existed before the release tooling. Each case breaks one thing in
// the sample repository and expects the matching error.
const SKILL_PATH = `${PLUGIN_DIR}/skills/${SKILL}/SKILL.md`;
const editSkill = (from, to) => (files) => {
  assert.ok(files[SKILL_PATH].includes(from), `sample SKILL.md has no ${JSON.stringify(from)}`);
  files[SKILL_PATH] = files[SKILL_PATH].replace(from, to);
};

const ruleCases = [
  ['frontmatter name must match the folder', editSkill(`name: ${SKILL}`, 'name: eeid-other'), 'frontmatter name must match'],
  ['license must be MIT', editSkill('license: MIT', 'license: Apache-2.0'), 'license must be MIT'],
  ['copyright must be the standard text', editSkill('Microsoft Corporation. All rights reserved.', 'Someone.'), 'copyright metadata'],
  ['status must be draft or ready', editSkill('status: draft', 'status: beta'), 'metadata.status must be draft or ready'],
  ['skill version must be semantic', editSkill('version: "0.1.0"', 'version: "1.0"'), 'metadata.version (the skill version)'],
  ['metadata values must be strings', editSkill('  status: draft', '  status: draft\n  count: 3'), 'metadata values must be strings'],
  ['metadata must be a mapping', (files) => {
    files[SKILL_PATH] = files[SKILL_PATH].replace(/metadata:\n(?:  .*\n)+/, 'metadata: none\n');
  }, 'metadata must be a mapping'],
  ['a ## Version section is required', editSkill('## Version', '## About'), '"## Version" section'],
  ['compatibility, when set, is 1-500 characters', editSkill('license: MIT', `license: MIT\ncompatibility: "${'x'.repeat(501)}"`), 'compatibility must be 1-500'],
  ['links must point inside the skill', editSkill('# Sample', '# Sample\n\nSee [x](../../README.md).'), 'runtime link escapes skill'],
  ['links must resolve', editSkill('# Sample', '# Sample\n\nSee [x](references/missing.md).'), 'link target does not exist'],
  ['absolute links are not allowed', editSkill('# Sample', '# Sample\n\nSee [x](/etc/hosts).'), 'absolute runtime link'],
  ['reference-style links need a definition', editSkill('# Sample', '# Sample\n\nSee [x][nowhere].'), 'undefined link reference'],
  ['the skill folder name is checked', (files) => {
    files[`${PLUGIN_DIR}/skills/Bad_Name/SKILL.md`] = files[SKILL_PATH];
  }, 'Invalid repository skill name: Bad_Name'],
  ['a skill folder needs SKILL.md', (files) => {
    files[`${PLUGIN_DIR}/skills/eeid-empty/notes.md`] = 'Notes.';
  }, 'eeid-empty: SKILL.md is missing'],
  ['only folders go directly under skills/', (files) => {
    files[`${PLUGIN_DIR}/skills/notes.md`] = 'Notes.';
  }, 'Unexpected file in'],
  ['the plugin needs at least one skill', (files) => {
    files[SKILL_PATH] = undefined;
    files[`${PLUGIN_DIR}/skills/.gitkeep`] = '';
  }, 'No skills found.'],
  ['plugin.json name must be eeid-toolkit', (files) => {
    files[`${PLUGIN_DIR}/plugin.json`].name = 'other';
  }, 'name must be eeid-toolkit'],
  ['plugin.json license must be MIT', (files) => {
    files[`${PLUGIN_DIR}/plugin.json`].license = 'ISC';
  }, 'plugin.json: license must be MIT'],
  ['plugin version must be semantic', (files) => {
    for (const path of [`${PLUGIN_DIR}/plugin.json`, `${PLUGIN_DIR}/.claude-plugin/plugin.json`, 'package.json']) files[path].version = 'one';
  }, 'the plugin version must be a numeric semantic version'],
  ['plugin.json must match the Agent Plugins schema', (files) => {
    files[`${PLUGIN_DIR}/plugin.json`].keywords = 'not-a-list';
  }, 'plugin.json: data/keywords'],
  ['mcp.json must match its schema', (files) => {
    files[`${PLUGIN_DIR}/mcp.json`].mcpServers = 'none';
  }, 'mcp.json: '],
  ['package.json license must be MIT', (files) => {
    files['package.json'].license = 'ISC';
  }, 'package.json: license must be MIT'],
  ['the plugin README is required', (files) => {
    files[`${PLUGIN_DIR}/README.md`] = undefined;
  }, `${PLUGIN_DIR}/README.md is missing`],
  ['the changelog is required', (files) => {
    files[`${PLUGIN_DIR}/CHANGELOG.md`] = undefined;
  }, `${PLUGIN_DIR}/CHANGELOG.md is missing`],
  ['each catalog must list the plugin', (files) => {
    files['.claude-plugin/marketplace.json'] = { ...files['.claude-plugin/marketplace.json'], plugins: [] };
  }, 'must list the eeid-toolkit plugin'],
  ['a ready skill needs eval cases', editSkill('status: draft', 'status: ready'), 'a ready skill needs at least one triggering eval case'],
];

for (const [name, change, expected] of ruleCases) {
  test(`rule: ${name}`, async () => {
    const errors = await errorsFor(change);
    assert.ok(errors.some((e) => e.includes(expected)), `expected "${expected}" in:\n${errors.join('\n')}`);
  });
}

test('rule: an empty skill body is rejected', async () => {
  const errors = await errorsFor((files) => {
    files[SKILL_PATH] = files[SKILL_PATH].replace(/\n---\n[\s\S]*$/, '\n---\n');
  });
  assert.ok(errors.some((e) => e.includes('instructions must not be empty')), errors.join('\n'));
});

test('rule: symlinks are not allowed in a skill or in skills/', async () => {
  const root = await sampleRepo();
  try {
    const skillsDir = join(root, PLUGIN_DIR, 'skills');
    await symlink('../SKILL.md', join(skillsDir, SKILL, 'linked.md'));
    await symlink(SKILL, join(skillsDir, 'eeid-alias'));
    const { errors } = await validateRepository({ root });
    assert.ok(errors.some((e) => e.startsWith('Symlinks are not allowed in skills:') && e.endsWith('linked.md')), errors.join('\n'));
    assert.ok(errors.some((e) => e.startsWith('Symlink is not allowed:') && e.endsWith('eeid-alias')), errors.join('\n'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
