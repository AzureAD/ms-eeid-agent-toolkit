// Repository layout, in one place. Skills ship inside the plugin folder,
// following the microsoft/skills layout: .github/plugins/<plugin>/skills/<skill>/.
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const pluginName = 'eeid-toolkit';

// Every path the tooling reads, for a repository at `root` (tests pass a
// temporary copy).
export function layout(root = repoRoot) {
  const pluginDir = join(root, '.github/plugins', pluginName);
  return {
    root,
    pluginDir,
    skillsRoot: join(pluginDir, 'skills'),
    // The portable manifest (Agent Plugins 1.0), read by Copilot CLI, Codex, and Cursor.
    pluginManifest: join(pluginDir, 'plugin.json'),
    // Claude Code's manifest. Holds the same plugin version as plugin.json.
    claudeManifest: join(pluginDir, '.claude-plugin/plugin.json'),
    mcpManifest: join(pluginDir, 'mcp.json'),
    changelog: join(pluginDir, 'CHANGELOG.md'),
    pluginReadme: join(pluginDir, 'README.md'),
    packageJson: join(root, 'package.json'),
    packageLock: join(root, 'package-lock.json'),
    rootReadme: join(root, 'README.md'),
    codeowners: join(root, '.github/CODEOWNERS'),
    // Marketplace catalogs, one per agent that reads its own location.
    catalogs: {
      'Claude Code': join(root, '.claude-plugin/marketplace.json'),
      'Copilot CLI': join(root, '.github/plugin/marketplace.json'),
      Codex: join(root, '.agents/plugins/marketplace.json'),
    },
    schemas: join(root, 'packaging/schemas'),
    evals: join(root, 'tests/evals'),
  };
}

const defaults = layout();
export const pluginDir = defaults.pluginDir;
export const skillsRoot = defaults.skillsRoot;

// Repository-relative form of a path, with forward slashes, for messages.
export function repoPath(path, root = repoRoot) {
  return relative(root, path).split('\\').join('/');
}
