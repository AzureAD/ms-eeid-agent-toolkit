// Repository layout, in one place. Skills ship inside the plugin folder,
// following the microsoft/skills layout: .github/plugins/<plugin>/skills/<skill>/.
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const pluginName = 'eeid-toolkit';
export const pluginDir = join(repoRoot, '.github/plugins', pluginName);
export const skillsRoot = join(pluginDir, 'skills');

// Repository-relative form of a path, with forward slashes, for messages.
export function repoPath(path) {
  return relative(repoRoot, path).split('\\').join('/');
}
